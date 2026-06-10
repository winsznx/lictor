// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ISomniaAgents.sol";
import "./interfaces/IAlgebraRouter.sol";
import "./interfaces/IERC20Minimal.sol";
import "./interfaces/ISomniaReactivity.sol";

/**
 * @title LictorReactive
 * @notice v2 of Lictor — KEEPER-LESS. Identical mandate pipeline to Lictor.sol, but the
 *         contract schedules its own monitoring + execution heartbeat on-chain via Somnia
 *         Reactivity (precompile 0x0100). No external poker: when a mandate arms, it schedules
 *         a `tick` ~REACTIVE_INTERVAL out; the reactivity callback refreshes signals, executes
 *         when they fire, and reschedules until terminal.
 *
 * @dev Requires the contract to hold >= 32 ether (Reactivity's anti-spam minimum) to schedule.
 *      Scheduling is wrapped in try/catch: if the precompile is unavailable or the balance is
 *      short, it degrades gracefully and the permissionless tick/executeIfReady (or a keeper)
 *      still drive the mandate. The flagship Lictor.sol deployment uses the keeper; this
 *      variant is the self-driving evolution and is documented in the README.
 */
contract LictorReactive is ISomniaEventHandler {
    // ─── Enums ────────────────────────────────────────────────────────────────

    enum MandateStatus {
        PENDING_DECOMPOSITION,
        ARMED,
        TRIGGERED,
        EXECUTING,
        EXECUTED,
        FAILED
    }

    enum SourceType { JSON_API, PARSE_WEBSITE }

    enum Comparator { GT, GTE, LT, LTE, EQ }

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct Signal {
        SourceType sourceType;
        string sourceUrl;
        string parseSelector;
        Comparator comparator;
        uint256 threshold;
        uint8 decimals;
        uint256 latestValue;
        uint256 lastUpdated;
        bool triggered;
        uint256 lastRequestId;
    }

    struct Mandate {
        address owner;
        string thesis;
        uint256 budgetWei;
        Signal[] signals;
        bool conjunctive;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minOut;
        MandateStatus status;
        uint256 createdAt;
        uint256 triggeredAt;
        uint256 executedAt;
    }

    // ─── Constants ────────────────────────────────────────────────────────────

    IAgentRequester public immutable PLATFORM;

    address public constant ALGEBRA_ROUTER   = 0x1582f6f3D26658F7208A799Be46e34b1f366CE44;
    // Base Algebra Integral pools expect the zero address as the `deployer` param; the
    // periphery substitutes the canonical pool deployer internally. Passing the
    // AlgebraPoolDeployer (0x0361…) explicitly derives a custom-pool address that does
    // not exist and reverts — confirmed against the live USDC.e/WSOMI QuoterV2 quote.
    address public constant ALGEBRA_DEPLOYER = address(0);
    address public constant USDC_E           = 0x28BEc7E30E6faee657a03e19Bf1128AaD7632A00;
    address public constant WSOMI            = 0x046EDe9564A72571df6F5e44d0405360c0f4dCab;

    uint256 public constant JSON_API_AGENT_ID = 13174292974160097713;
    uint256 public constant LLM_AGENT_ID      = 12847293847561029384;

    uint256 public constant JSON_API_PRICE  = 0.03 ether;
    uint256 public constant LLM_PRICE       = 0.07 ether;
    uint256 public constant PARSE_PRICE     = 0.10 ether;
    uint8   public constant SUBCOMMITTEE_SIZE = 3;
    uint256 public constant REFRESH_INTERVAL  = 5 minutes;

    // Selector for the on-chain tool the LLM is instructed to call at execution time.
    // Must match the signature string passed in ILLMAgent.OnchainTool.signature.
    bytes4 public constant EXECUTE_SWAP_SELECTOR =
        bytes4(keccak256(bytes("executeSwap(address,address,uint256,uint256)")));
    uint256 public constant MAX_ITERATIONS = 1;

    string public constant DECOMPOSE_SYSTEM =
        "You are a trading signal parser. Output ONLY a JSON object, no preamble, no markdown. "
        "Schema: {\"conjunctive\":bool,\"signals\":[{\"sourceType\":\"JSON_API\"|\"PARSE_WEBSITE\","
        "\"sourceUrl\":string,\"parseSelector\":string,\"comparator\":\"GT\"|\"GTE\"|\"LT\"|\"LTE\"|\"EQ\","
        "\"threshold\":number,\"decimals\":number}]}. "
        "If you cannot parse clear signals, return {\"signals\":[]}.";

    // ─── State ────────────────────────────────────────────────────────────────

    address public immutable owner;
    bool public paused;

    uint256 private _nextMandateId;

    mapping(uint256 => Mandate) private _mandates;
    mapping(uint256 => uint256) private _requestToMandate;   // requestId → mandateId
    mapping(uint256 => uint256) private _requestToSignal;    // requestId → signalIdx

    mapping(address => bool) internal allowedTokens;

    // Per-mandate native budget (SOMI) available for agent calls + refund. Isolated per
    // mandate so closing or ticking one mandate can never spend another's escrow.
    mapping(uint256 => uint256) private _remainingBudget;
    // Guards against double-refunding custody tokens across repeated closeMandate calls.
    mapping(uint256 => bool) private _tokenRefunded;

    // ─── Reactivity (v2 keeper-less self-scheduling) ──────────────────────────
    // The Somnia Reactivity precompile lives at 0x0100 in production; it is constructor-set
    // (immutable) so the scheduling + callback path is unit-testable against a mock.
    ISomniaReactivity private immutable REACTIVITY;
    uint256 private constant REACTIVE_INTERVAL = 60;          // seconds between heartbeats
    uint64  private constant REACTIVE_GAS      = 10_000_000;  // gas budget for the callback

    // Scheduled tick timestamp (ms) → mandateId + 1 (0 = none), so a fired callback maps
    // back to the mandate that scheduled it.
    mapping(uint256 => uint256) private _tickMandate;

    event TickScheduled(uint256 indexed mandateId, uint256 timestampMs, uint256 subscriptionId);
    event TickScheduleFailed(uint256 indexed mandateId);
    error OnlyReactivity();

    // ─── Events ───────────────────────────────────────────────────────────────

    event MandateSubmitted(
        uint256 indexed mandateId,
        address indexed owner,
        string thesis,
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    );
    event MandateArmed(uint256 indexed mandateId, uint256 signalCount, bool conjunctive);
    event SignalUpdated(
        uint256 indexed mandateId,
        uint256 indexed signalIdx,
        uint256 latestValue,
        bool triggered
    );
    event MandateTriggered(uint256 indexed mandateId, uint256 triggeredAt);
    event MandateExecuted(uint256 indexed mandateId, uint256 amountOut, uint256 executedAt);
    event MandateFailed(uint256 indexed mandateId, string reason);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error TokenNotAllowed(address token);
    error SameToken();
    error ZeroAmount();
    error InsufficientDeposit(uint256 required, uint256 provided);
    error NotOwner();
    error WrongStatus(MandateStatus current);
    error OnlyPlatform();
    error NotSelf();
    error Paused();
    error TransferFailed();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address platform, address reactivity) {
        PLATFORM = IAgentRequester(platform);
        REACTIVITY = ISomniaReactivity(reactivity); // 0x0000000000000000000000000000000000000100 in production
        owner = msg.sender;

        allowedTokens[USDC_E] = true;
        allowedTokens[WSOMI]  = true;
    }

    receive() external payable {}

    // ─── Owner admin ──────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Paused();
        _;
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }

    // ─── Public functions ─────────────────────────────────────────────────────

    /**
     * @notice Set a thesis. Agents decompose it into conditions. When conditions fire, the
     *         trade executes automatically.
     * @param thesis Plain-English trade condition (e.g. "Buy SOMI if BTC > $100k")
     * @param tokenIn Token to sell (must be USDC.e or WSOMI)
     * @param tokenOut Token to receive (must be USDC.e or WSOMI)
     * @param amountIn Amount of tokenIn to swap (in token base units)
     * @param minOut Minimum acceptable output — sets your slippage tolerance
     * @return mandateId Unique identifier for this mandate
     */
    function submitMandate(
        string calldata thesis,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut
    ) external payable whenNotPaused returns (uint256 mandateId) {
        if (!allowedTokens[tokenIn])  revert TokenNotAllowed(tokenIn);
        if (!allowedTokens[tokenOut]) revert TokenNotAllowed(tokenOut);
        if (tokenIn == tokenOut)      revert SameToken();
        if (amountIn == 0 || minOut == 0) revert ZeroAmount();

        uint256 required = _deposit(LLM_PRICE);
        if (msg.value < required) revert InsufficientDeposit(required, msg.value);

        mandateId = _nextMandateId++;

        Mandate storage m = _mandates[mandateId];
        m.owner      = msg.sender;
        m.thesis     = thesis;
        m.budgetWei  = msg.value;
        m.conjunctive = true;
        m.tokenIn    = tokenIn;
        m.tokenOut   = tokenOut;
        m.amountIn   = amountIn;
        m.minOut     = minOut;
        m.status     = MandateStatus.PENDING_DECOMPOSITION;
        m.createdAt  = block.timestamp;
        _remainingBudget[mandateId] = msg.value;

        // Take custody of the input tokens up front. The owner must approve this contract
        // for `amountIn` first. Without this, the contract would hold no tokenIn and the
        // DEX swap at execution time would always revert.
        _safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);

        bytes memory payload = abi.encodeCall(
            ILLMAgent.inferString,
            (thesis, DECOMPOSE_SYSTEM, false, new string[](0))
        );

        // Spend only the decomposition deposit from this mandate's budget; the remainder
        // stays earmarked for this mandate's monitoring + execution.
        _remainingBudget[mandateId] -= required;
        uint256 requestId = PLATFORM.createAdvancedRequest{value: required}(
            LLM_AGENT_ID,
            address(this),
            this.handleDecomposition.selector,
            payload,
            SUBCOMMITTEE_SIZE,
            2,
            ConsensusType.Majority,
            600
        );

        _requestToMandate[requestId] = mandateId + 1;

        emit MandateSubmitted(mandateId, msg.sender, thesis, tokenIn, tokenOut, amountIn);
    }

    /**
     * @notice Refresh stale signals for an armed mandate.
     *         Permissionless — anyone can call to keep mandates current.
     */
    function tick(uint256 mandateId) external whenNotPaused {
        Mandate storage m = _mandates[mandateId];
        if (m.status != MandateStatus.ARMED) revert WrongStatus(m.status);
        _tickSignals(mandateId);
    }

    /// @dev Shared by the permissionless tick() and the reactivity heartbeat.
    function _tickSignals(uint256 mandateId) internal {
        Mandate storage m = _mandates[mandateId];

        for (uint256 i = 0; i < m.signals.length; i++) {
            Signal storage s = m.signals[i];
            if (block.timestamp < s.lastUpdated + REFRESH_INTERVAL) continue;

            uint256 requestId;
            if (s.sourceType == SourceType.JSON_API) {
                bytes memory payload = abi.encodeCall(
                    IJsonApiAgent.fetchUint,
                    (s.sourceUrl, s.parseSelector, s.decimals)
                );
                uint256 depositAmt = _deposit(JSON_API_PRICE);
                if (_remainingBudget[mandateId] < depositAmt) continue;
                _remainingBudget[mandateId] -= depositAmt;

                requestId = PLATFORM.createAdvancedRequest{value: depositAmt}(
                    JSON_API_AGENT_ID,
                    address(this),
                    this.handleSignalUpdate.selector,
                    payload,
                    SUBCOMMITTEE_SIZE,
                    2,
                    ConsensusType.Majority,
                    600
                );
            } else {
                // PARSE_WEBSITE — dispatch ExtractANumber
                uint256 parseAgentId = 0; // populated via PARSE_WEBSITE_AGENT_ID once confirmed
                if (parseAgentId == 0) continue; // skip until agent ID confirmed

                bytes memory payload = abi.encodeCall(
                    IParseWebsiteAgent.ExtractANumber,
                    (s.parseSelector, "", 0, type(uint256).max, s.sourceUrl, s.sourceUrl, false, 1)
                );
                uint256 depositAmt = _deposit(PARSE_PRICE);
                if (_remainingBudget[mandateId] < depositAmt) continue;
                _remainingBudget[mandateId] -= depositAmt;

                requestId = PLATFORM.createAdvancedRequest{value: depositAmt}(
                    parseAgentId,
                    address(this),
                    this.handleSignalUpdate.selector,
                    payload,
                    SUBCOMMITTEE_SIZE,
                    2,
                    ConsensusType.Majority,
                    600
                );
            }

            s.lastRequestId = requestId;
            _requestToMandate[requestId] = mandateId + 1;
            _requestToSignal[requestId]  = i;
        }
    }

    /**
     * @notice Execute the trade if all conditions are met.
     *         Permissionless — anyone can call once signals have fired.
     *         Sets status to EXECUTING before the async LLM dispatch (CEI).
     */
    function executeIfReady(uint256 mandateId) external whenNotPaused {
        Mandate storage m = _mandates[mandateId];
        if (m.status != MandateStatus.ARMED) revert WrongStatus(m.status);
        if (!_allSignalsFired(m)) return;
        _dispatchExecution(mandateId);
    }

    /// @dev Shared by executeIfReady() and the reactivity heartbeat. Caller guarantees
    ///      the mandate is ARMED and all signals have fired.
    function _dispatchExecution(uint256 mandateId) internal {
        Mandate storage m = _mandates[mandateId];

        // CEI: commit state change before any external call
        m.status      = MandateStatus.EXECUTING;
        m.triggeredAt = block.timestamp;
        emit MandateTriggered(mandateId, block.timestamp);

        uint256 required = _deposit(LLM_PRICE);
        if (_remainingBudget[mandateId] < required) {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "insufficient_budget");
            return;
        }
        _remainingBudget[mandateId] -= required;

        string[] memory roles = new string[](2);
        roles[0] = "system";
        roles[1] = "user";

        string[] memory messages = new string[](2);
        messages[0] = "You are a trading execution assistant. When instructed, call executeSwap with the exact parameters provided. Do not modify the amounts.";
        messages[1] = string.concat(
            "Execute mandate swap: tokenIn=",  _toHexString(uint160(m.tokenIn)),
            " tokenOut=", _toHexString(uint160(m.tokenOut)),
            " amountIn=", _uintToString(m.amountIn),
            " minOut=",   _uintToString(m.minOut),
            ". Call executeSwap now with these exact values."
        );

        string[] memory mcpUrls = new string[](0);

        ILLMAgent.OnchainTool[] memory tools = new ILLMAgent.OnchainTool[](1);
        tools[0] = ILLMAgent.OnchainTool({
            signature:   "executeSwap(address,address,uint256,uint256)",
            description: "Execute a token swap. tokenIn=source token, tokenOut=destination token, amountIn=input amount, minOut=minimum output amount"
        });

        bytes memory payload = abi.encodeWithSelector(
            ILLMAgent.inferToolsChat.selector,
            roles, messages, mcpUrls, tools, MAX_ITERATIONS, false
        );

        uint256 requestId = PLATFORM.createAdvancedRequest{value: required}(
            LLM_AGENT_ID,
            address(this),
            this.handleExecution.selector,
            payload,
            SUBCOMMITTEE_SIZE,
            2,
            ConsensusType.Majority,
            900
        );

        _requestToMandate[requestId] = mandateId + 1;
    }

    /**
     * @notice Close an armed or failed mandate and reclaim the remaining native budget
     *         plus the custody tokens that were never swapped. Owner only.
     */
    function closeMandate(uint256 mandateId) external {
        Mandate storage m = _mandates[mandateId];
        if (msg.sender != m.owner) revert NotOwner();
        if (
            m.status != MandateStatus.ARMED &&
            m.status != MandateStatus.FAILED
        ) revert WrongStatus(m.status);

        // Effects first (CEI): zero out before any external transfer so a reentrant
        // close refunds nothing.
        uint256 nativeRefund = _remainingBudget[mandateId];
        _remainingBudget[mandateId] = 0;

        uint256 tokenRefund;
        if (!_tokenRefunded[mandateId]) {
            _tokenRefunded[mandateId] = true;
            tokenRefund = m.amountIn;
        }

        m.status = MandateStatus.FAILED;

        if (tokenRefund > 0) _safeTransfer(m.tokenIn, m.owner, tokenRefund);
        if (nativeRefund > 0) {
            (bool ok,) = m.owner.call{value: nativeRefund}("");
            if (!ok) emit MandateFailed(mandateId, "refund_failed");
        }
    }

    // ─── Callback handlers ────────────────────────────────────────────────────

    /**
     * @notice Called by the Somnia Agents platform when the LLM finishes decomposing the thesis.
     */
    function handleDecomposition(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory
    ) external {
        if (msg.sender != address(PLATFORM)) revert OnlyPlatform();

        uint256 packed = _requestToMandate[requestId];
        if (packed == 0) return; // unknown or already-consumed request — never touch mandate 0
        uint256 mandateId = packed - 1;
        delete _requestToMandate[requestId];

        Mandate storage m = _mandates[mandateId];

        if (status != ResponseStatus.Success || responses.length == 0) {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "decomposition_failed");
            return;
        }

        bytes memory raw = responses[0].result;
        string memory json;
        try this._decodeString(raw) returns (string memory s) {
            json = s;
        } catch {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "decomposition_decode_failed");
            return;
        }

        bool ok = _parseSignals(mandateId, json);
        if (!ok) {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "decomposition_parse_failed");
            return;
        }

        m.status = MandateStatus.ARMED;
        emit MandateArmed(mandateId, m.signals.length, m.conjunctive);

        // v2: start the on-chain heartbeat so the mandate drives itself (keeper-less).
        // Graceful — if scheduling fails (e.g. contract < 32 SOMI), a keeper/manual still works.
        _scheduleTick(mandateId);
    }

    /**
     * @notice Called by the Somnia Agents platform when a signal-monitoring request resolves.
     */
    function handleSignalUpdate(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory
    ) external {
        if (msg.sender != address(PLATFORM)) revert OnlyPlatform();

        uint256 packed = _requestToMandate[requestId];
        if (packed == 0) return; // unknown or already-consumed request
        uint256 mandateId = packed - 1;
        uint256 signalIdx = _requestToSignal[requestId];
        delete _requestToMandate[requestId];
        delete _requestToSignal[requestId];

        if (status != ResponseStatus.Success || responses.length == 0) return;

        Mandate storage m = _mandates[mandateId];
        if (signalIdx >= m.signals.length) return;

        Signal storage s = m.signals[signalIdx];

        uint256 value;
        try this._decodeUint(responses[0].result) returns (uint256 v) {
            value = v;
        } catch {
            return;
        }

        s.latestValue = value;
        s.lastUpdated = block.timestamp;
        s.triggered   = _evaluate(s.comparator, value, s.threshold);

        emit SignalUpdated(mandateId, signalIdx, value, s.triggered);
    }

    /**
     * @notice Called by the Somnia Agents platform when the LLM returns swap calldata.
     */
    function handleExecution(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory
    ) external {
        if (msg.sender != address(PLATFORM)) revert OnlyPlatform();

        uint256 packed = _requestToMandate[requestId];
        if (packed == 0) return; // unknown or already-consumed request
        uint256 mandateId = packed - 1;
        delete _requestToMandate[requestId];

        Mandate storage m = _mandates[mandateId];

        if (status != ResponseStatus.Success || responses.length == 0) {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "execution_failed");
            return;
        }

        string memory finishReason;
        bytes[] memory pendingToolCalls;
        try this._decodeToolsResult(responses[0].result) returns (
            string memory fr,
            bytes[] memory ptc
        ) {
            finishReason     = fr;
            pendingToolCalls = ptc;
        } catch {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "execution_decode_failed");
            return;
        }

        if (keccak256(bytes(finishReason)) != keccak256(bytes("tool_calls"))) {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "unexpected_finish_reason");
            return;
        }

        if (pendingToolCalls.length == 0) {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "no_tool_calls");
            return;
        }

        bytes memory calldata_ = pendingToolCalls[0];
        if (calldata_.length < 4) {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "calldata_too_short");
            return;
        }

        bytes4 sel;
        assembly { sel := mload(add(calldata_, 32)) }

        if (sel != EXECUTE_SWAP_SELECTOR) {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "invalid_selector");
            return;
        }

        address tIn;
        address tOut;
        uint256 aIn;
        uint256 minOut;
        try this._decodeSwapParams(_sliceAfter4(calldata_)) returns (
            address _tIn, address _tOut, uint256 _aIn, uint256 _minOut
        ) {
            tIn    = _tIn;
            tOut   = _tOut;
            aIn    = _aIn;
            minOut = _minOut;
        } catch {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "params_decode_failed");
            return;
        }

        if (!allowedTokens[tIn] || !allowedTokens[tOut]) {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "token_disallowed");
            return;
        }

        if (tIn != m.tokenIn || tOut != m.tokenOut) {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "token_mismatch");
            return;
        }

        if (aIn > m.amountIn) {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "amount_exceeded");
            return;
        }

        if (minOut < m.minOut) {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "slippage_below_mandate");
            return;
        }

        // CEI: status already EXECUTING (set in executeIfReady before LLM dispatch)
        try this._executeAlgebraSwap(tIn, tOut, aIn, minOut, m.owner) returns (uint256 amountOut) {
            m.status     = MandateStatus.EXECUTED;
            m.executedAt = block.timestamp;
            emit MandateExecuted(mandateId, amountOut, block.timestamp);
        } catch {
            m.status = MandateStatus.FAILED;
            emit MandateFailed(mandateId, "swap_reverted");
        }
    }

    // ─── External decode helpers (called via try/catch) ───────────────────────

    function _decodeString(bytes calldata raw) external pure returns (string memory) {
        return abi.decode(raw, (string));
    }

    function _decodeUint(bytes calldata raw) external pure returns (uint256) {
        return abi.decode(raw, (uint256));
    }

    function _decodeToolsResult(bytes calldata raw)
        external pure
        returns (string memory finishReason, bytes[] memory pendingToolCalls)
    {
        (finishReason,,,,,pendingToolCalls) =
            abi.decode(raw, (string,string,string[],string[],string[],bytes[]));
    }

    function _decodeSwapParams(bytes calldata params)
        external pure
        returns (address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut)
    {
        (tokenIn, tokenOut, amountIn, minOut) =
            abi.decode(params, (address, address, uint256, uint256));
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function getMandate(uint256 mandateId) external view returns (Mandate memory) {
        return _mandates[mandateId];
    }

    function getSignals(uint256 mandateId) external view returns (Signal[] memory) {
        return _mandates[mandateId].signals;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _deposit(uint256 perAgentPrice) internal view returns (uint256) {
        return PLATFORM.getRequestDeposit() + perAgentPrice * SUBCOMMITTEE_SIZE;
    }

    function _allSignalsFired(Mandate storage m) internal view returns (bool) {
        if (m.signals.length == 0) return false;

        if (m.conjunctive) {
            for (uint256 i = 0; i < m.signals.length; i++) {
                if (!m.signals[i].triggered) return false;
            }
            return true;
        } else {
            for (uint256 i = 0; i < m.signals.length; i++) {
                if (m.signals[i].triggered) return true;
            }
            return false;
        }
    }

    function _evaluate(Comparator comp, uint256 value, uint256 threshold)
        internal pure returns (bool)
    {
        if (comp == Comparator.GT)  return value >  threshold;
        if (comp == Comparator.GTE) return value >= threshold;
        if (comp == Comparator.LT)  return value <  threshold;
        if (comp == Comparator.LTE) return value <= threshold;
        return value == threshold; // EQ
    }

    /**
     * @dev ERC20 transferFrom that tolerates both standard (bool-returning) and
     *      non-standard (USDT-style, no return) tokens. Reverts on failure.
     */
    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        // solhint-disable-next-line avoid-low-level-calls
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20Minimal.transferFrom.selector, from, to, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    /**
     * @dev ERC20 transfer with the same non-standard-token tolerance as _safeTransferFrom.
     */
    function _safeTransfer(address token, address to, uint256 amount) internal {
        // solhint-disable-next-line avoid-low-level-calls
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20Minimal.transfer.selector, to, amount)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    /**
     * @dev Pure mechanical swap — approve then call Algebra. Called via this._ for try/catch.
     *      Allowance failure is swallowed; the DEX will revert if allowance is insufficient.
     *      Must only be called by the contract itself.
     */
    function _executeAlgebraSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minOut,
        address recipient
    ) external returns (uint256 amountOut) {
        if (msg.sender != address(this)) revert NotSelf();

        // Low-level approve — avoids ABI-decode-of-bool-from-empty-returndata failure on
        // no-code addresses (test env) and non-standard ERC20s (USDT pattern). DEX reverts
        // on its own transferFrom if the allowance is insufficient.
        bytes memory approveCall = abi.encodeWithSelector(
            bytes4(keccak256("approve(address,uint256)")),
            ALGEBRA_ROUTER,
            amountIn
        );
        // solhint-disable-next-line avoid-low-level-calls
        tokenIn.call(approveCall); // return value intentionally ignored

        IAlgebraRouter.ExactInputSingleParams memory params = IAlgebraRouter.ExactInputSingleParams({
            tokenIn:          tokenIn,
            tokenOut:         tokenOut,
            deployer:         ALGEBRA_DEPLOYER,
            recipient:        recipient,
            deadline:         block.timestamp + 300,
            amountIn:         amountIn,
            amountOutMinimum: minOut,
            limitSqrtPrice:   0
        });

        amountOut = IAlgebraRouter(ALGEBRA_ROUTER).exactInputSingle(params);
    }

    function _toHexString(uint160 value) internal pure returns (string memory) {
        bytes memory buf = new bytes(42);
        buf[0] = '0';
        buf[1] = 'x';
        for (uint256 i = 41; i >= 2; i--) {
            uint8 nibble = uint8(value & 0xf);
            buf[i] = nibble < 10 ? bytes1(nibble + 48) : bytes1(nibble + 87);
            value >>= 4;
        }
        return string(buf);
    }

    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buf = new bytes(digits);
        while (value != 0) {
            digits--;
            buf[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buf);
    }

    function _sliceAfter4(bytes memory data) internal pure returns (bytes memory result) {
        if (data.length <= 4) return new bytes(0);
        result = new bytes(data.length - 4);
        assembly {
            let src := add(add(data, 0x20), 4)
            let dst := add(result, 0x20)
            let len := sub(mload(data), 4)
            for { let i := 0 } lt(i, len) { i := add(i, 32) } {
                mstore(add(dst, i), mload(add(src, i)))
            }
        }
    }

    /**
     * @dev Parses the LLM's JSON response and populates mandate.signals[].
     *      Expected format (from DECOMPOSE_SYSTEM prompt):
     *      {"conjunctive":true,"signals":[{"sourceType":"JSON_API","sourceUrl":"...","parseSelector":"...","comparator":"GT","threshold":90000,"decimals":8}]}
     *
     *      This is a minimal parser that handles the fixed schema. It uses string operations
     *      rather than a full JSON library — safe for the constrained LLM output format.
     */
    function _parseSignals(uint256 mandateId, string memory json) internal returns (bool) {
        bytes memory b = bytes(json);
        if (b.length == 0) return false;

        Mandate storage m = _mandates[mandateId];

        // Parse conjunctive flag: look for "conjunctive":true or "conjunctive":false
        m.conjunctive = _containsSubstring(b, bytes('"conjunctive":true'));

        // Count signal objects (each starts with {"sourceType")
        uint256 signalCount = _countOccurrences(b, bytes('"sourceType"'));
        if (signalCount == 0) return false;

        // Parse each signal using field extraction
        uint256 cursor = 0;
        uint256 parsed  = 0;

        while (parsed < signalCount && cursor < b.length) {
            uint256 signalStart = _findSubstring(b, bytes('"sourceType"'), cursor);
            if (signalStart == type(uint256).max) break;

            // Move cursor past this signal's sourceType key to parse remaining fields
            cursor = signalStart + 12;

            string memory sourceTypeStr = _extractStringValue(b, signalStart);
            string memory sourceUrl     = _extractStringValue(b, _findSubstring(b, bytes('"sourceUrl"'), signalStart));
            string memory selector      = _extractStringValue(b, _findSubstring(b, bytes('"parseSelector"'), signalStart));
            string memory comparatorStr = _extractStringValue(b, _findSubstring(b, bytes('"comparator"'), signalStart));
            uint256 threshold           = _extractUintValue(b,   _findSubstring(b, bytes('"threshold"'), signalStart));
            uint256 decimals            = _extractUintValue(b,   _findSubstring(b, bytes('"decimals"'), signalStart));

            if (bytes(sourceUrl).length == 0 || bytes(selector).length == 0) break;

            uint8 dec = uint8(decimals > 18 ? 18 : decimals);

            // Scale threshold to match fetchUint/fetchInt agent output.
            // Agent returns value * 10^decimals, so threshold must be in the same unit.
            // e.g. threshold=90000, decimals=8 → stored as 9_000_000_000_000
            uint256 scaledThreshold = threshold;
            for (uint8 d = 0; d < dec; d++) scaledThreshold *= 10;

            Signal memory s;
            s.sourceType    = _parseSourceType(sourceTypeStr);
            s.sourceUrl     = sourceUrl;
            s.parseSelector = selector;
            s.comparator    = _parseComparator(comparatorStr);
            s.threshold     = scaledThreshold;
            s.decimals      = dec;

            m.signals.push(s);
            parsed++;
        }

        return m.signals.length > 0;
    }

    // ─── String parsing helpers ───────────────────────────────────────────────

    function _containsSubstring(bytes memory haystack, bytes memory needle) internal pure returns (bool) {
        return _findSubstring(haystack, needle, 0) != type(uint256).max;
    }

    function _countOccurrences(bytes memory haystack, bytes memory needle) internal pure returns (uint256 count) {
        uint256 pos = 0;
        while (true) {
            uint256 found = _findSubstring(haystack, needle, pos);
            if (found == type(uint256).max) break;
            count++;
            pos = found + 1;
        }
    }

    function _findSubstring(bytes memory haystack, bytes memory needle, uint256 start)
        internal pure returns (uint256)
    {
        if (needle.length == 0 || haystack.length < needle.length) return type(uint256).max;
        uint256 limit = haystack.length - needle.length;
        for (uint256 i = start; i <= limit; i++) {
            bool found = true;
            for (uint256 j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) { found = false; break; }
            }
            if (found) return i;
        }
        return type(uint256).max;
    }

    function _extractStringValue(bytes memory b, uint256 keyPos) internal pure returns (string memory) {
        if (keyPos == type(uint256).max) return "";
        // Skip to the colon, then find opening quote
        uint256 i = keyPos;
        while (i < b.length && b[i] != ':') i++;
        i++; // skip ':'
        while (i < b.length && (b[i] == ' ' || b[i] == '\t')) i++;
        if (i >= b.length || b[i] != '"') return "";
        i++; // skip opening quote
        uint256 start = i;
        while (i < b.length && b[i] != '"') i++;
        bytes memory val = new bytes(i - start);
        for (uint256 j = 0; j < val.length; j++) val[j] = b[start + j];
        return string(val);
    }

    function _extractUintValue(bytes memory b, uint256 keyPos) internal pure returns (uint256) {
        if (keyPos == type(uint256).max) return 0;
        uint256 i = keyPos;
        while (i < b.length && b[i] != ':') i++;
        i++;
        while (i < b.length && (b[i] == ' ' || b[i] == '\t')) i++;
        uint256 val = 0;
        bool found = false;
        while (i < b.length && b[i] >= '0' && b[i] <= '9') {
            val = val * 10 + (uint8(b[i]) - 48);
            found = true;
            i++;
        }
        return found ? val : 0;
    }

    function _parseSourceType(string memory s) internal pure returns (SourceType) {
        bytes32 h = keccak256(bytes(s));
        if (h == keccak256(bytes("PARSE_WEBSITE"))) return SourceType.PARSE_WEBSITE;
        return SourceType.JSON_API; // default
    }

    function _parseComparator(string memory s) internal pure returns (Comparator) {
        bytes32 h = keccak256(bytes(s));
        if (h == keccak256(bytes("GTE"))) return Comparator.GTE;
        if (h == keccak256(bytes("LT")))  return Comparator.LT;
        if (h == keccak256(bytes("LTE"))) return Comparator.LTE;
        if (h == keccak256(bytes("EQ")))  return Comparator.EQ;
        return Comparator.GT; // default
    }

    // ─── Reactivity heartbeat ──────────────────────────────────────────────────

    /**
     * @notice Reactivity precompile callback — fired on-chain when a scheduled tick's
     *         timestamp is reached. msg.sender is always the precompile (0x0100).
     */
    function onEvent(address, bytes32[] calldata eventTopics, bytes calldata) external override {
        if (msg.sender != address(REACTIVITY)) revert OnlyReactivity();
        if (eventTopics.length < 2) return;
        uint256 tMs = uint256(eventTopics[1]);
        uint256 packed = _tickMandate[tMs];
        if (packed == 0) return;            // not ours / already handled
        delete _tickMandate[tMs];
        _reactiveAdvance(packed - 1);
    }

    /// @dev One heartbeat: refresh stale signals, execute if ready, else reschedule.
    function _reactiveAdvance(uint256 mandateId) internal {
        Mandate storage m = _mandates[mandateId];
        if (m.status != MandateStatus.ARMED) return; // terminal — stop the heartbeat

        _tickSignals(mandateId);

        if (_allSignalsFired(m)) {
            _dispatchExecution(mandateId);          // status → EXECUTING; no reschedule
            return;
        }
        _scheduleTick(mandateId);                   // keep the heartbeat going
    }

    /// @dev Schedule the next heartbeat via Reactivity. Graceful: never reverts the caller.
    function _scheduleTick(uint256 mandateId) internal {
        uint256 tMs = (block.timestamp + REACTIVE_INTERVAL) * 1000;
        while (_tickMandate[tMs] != 0) { tMs += 1; } // ensure a unique slot

        bytes32[4] memory topics;
        topics[0] = keccak256("Schedule(uint256)");
        topics[1] = bytes32(tMs);

        ISomniaReactivity.SubscriptionData memory d = ISomniaReactivity.SubscriptionData({
            eventTopics:             topics,
            origin:                  address(0),
            caller:                  address(0),
            emitter:                 address(REACTIVITY),
            handlerContractAddress:  address(this),
            handlerFunctionSelector: ISomniaEventHandler.onEvent.selector,
            priorityFeePerGas:       uint64(2 gwei),
            maxFeePerGas:            uint64(20 gwei),
            gasLimit:                REACTIVE_GAS,
            isGuaranteed:            true,
            isCoalesced:             false
        });

        // Low-level call so scheduling NEVER reverts the caller — degrades gracefully if the
        // precompile is absent (e.g. local test without the mock) or the contract is under the
        // 32-ether minimum. A typed try/catch would not catch a return-decode failure on an
        // empty/no-code response (viaIR), so we check the returndata ourselves.
        // solhint-disable-next-line avoid-low-level-calls
        (bool ok, bytes memory ret) = address(REACTIVITY).call(
            abi.encodeWithSelector(ISomniaReactivity.subscribe.selector, d)
        );
        if (ok && ret.length >= 32) {
            _tickMandate[tMs] = mandateId + 1;
            emit TickScheduled(mandateId, tMs, abi.decode(ret, (uint256)));
        } else {
            emit TickScheduleFailed(mandateId);
        }
    }
}
