// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ISomniaAgents.sol";

/// @title Day0Probe — throwaway contract to validate four architectural assumptions
/// @notice Do NOT use in production. Deploy once, probe, discard.
contract Day0Probe {
    enum RequestKind {
        JSON_API,          // assumption 1 + 2: round-trip + deposit math
        INFER_STRING,      // assumption 3: inferString returns parseable JSON
        INFER_TOOLS_CHAT   // assumption 4: inferToolsChat exists + yields calldata
    }

    IAgentRequester public immutable PLATFORM;

    uint256 public constant JSON_API_AGENT_ID   = 13174292974160097713;
    uint256 public constant LLM_AGENT_ID         = 12847293847561029384;
    uint256 public constant JSON_API_PRICE       = 0.03 ether;
    uint256 public constant LLM_INFERENCE_PRICE  = 0.07 ether;
    uint256 public constant SUBCOMMITTEE_SIZE    = 3;

    mapping(uint256 => RequestKind) public requestKind;

    bytes public lastJsonApiResult;
    bytes public lastInferStringResult;
    bytes public lastInferToolsChatResult;

    event ProbeCompleted(
        uint256 indexed requestId,
        RequestKind kind,
        bool success,
        bytes rawData
    );

    constructor() {
        PLATFORM = IAgentRequester(0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776);
    }

    receive() external payable {}

    // PRD §4.8: deposit = base + perAgentPrice * subcommitteeSize
    // Assumption 2 validates whether this formula gets requests picked up.
    function _deposit(uint256 perAgentPrice) internal view returns (uint256) {
        return PLATFORM.getRequestDeposit() + perAgentPrice * SUBCOMMITTEE_SIZE;
    }

    // ─── Probe 1+2: JSON API round-trip + deposit math ───────────────────────

    /// @notice Fetch BTC/USD price via JSON API agent. Validates assumptions 1 & 2.
    /// @dev Send at least 0.12 ether to cover getRequestDeposit() + 0.03*3 = 0.09 + base.
    function probeJsonApi() external payable {
        uint256 deposit = _deposit(JSON_API_PRICE);
        require(msg.value >= deposit, "insufficient: need getRequestDeposit() + 0.09 STT");

        bytes memory payload = abi.encodeCall(
            IJsonApiAgent.fetchUint,
            (
                "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
                "bitcoin.usd",
                uint8(8)
            )
        );

        uint256 requestId = PLATFORM.createAdvancedRequest{value: msg.value}(
            JSON_API_AGENT_ID,
            address(this),
            this.handleResponse.selector,
            payload,
            SUBCOMMITTEE_SIZE,
            2,                      // threshold: 2-of-3
            ConsensusType.Majority,
            600                     // 600s timeout (InvalidTimeout() on 0)
        );

        requestKind[requestId] = RequestKind.JSON_API;
    }

    // ─── Probe 3: inferString returns parseable structured JSON ──────────────

    /// @notice Issue an LLM inference with a strict-JSON schema prompt.
    /// @dev Send at least 0.24 ether to cover getRequestDeposit() + 0.07*3 = 0.21 + base.
    function probeInferString() external payable {
        uint256 deposit = _deposit(LLM_INFERENCE_PRICE);
        require(msg.value >= deposit, "insufficient: need getRequestDeposit() + 0.21 STT");

        string[] memory allowedValues = new string[](0);

        bytes memory payload = abi.encodeCall(
            ILLMAgent.inferString,
            (
                // Structured prompt: forces LLM into exact JSON shape used in Phase 1 decomposition
                'Return a JSON object: {"signals":[{"sourceType":"JSON_API","sourceUrl":"https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd","parseSelector":".bitcoin.usd","comparator":"GT","threshold":90000,"decimals":0}],"conjunctive":true}. Return ONLY the JSON, no preamble, no markdown fences.',
                "You are a trading strategy parser. Output ONLY valid JSON matching the schema provided. No explanation.",
                false,
                allowedValues
            )
        );

        uint256 requestId = PLATFORM.createAdvancedRequest{value: msg.value}(
            LLM_AGENT_ID,
            address(this),
            this.handleResponse.selector,
            payload,
            SUBCOMMITTEE_SIZE,
            2,
            ConsensusType.Majority,
            600
        );

        requestKind[requestId] = RequestKind.INFER_STRING;
    }

    // ─── Probe 4: inferToolsChat yields ABI-encoded calldata ─────────────────

    /// @notice Issue an inferToolsChat request with corrected interface.
    /// @dev Retry 3: uses string[] for roles/messages, adds mcpServerUrls and maxIterations.
    ///      Prior failures used string (single) and were missing two parameters entirely.
    ///      Sourced from docs.somnia.network/agents/base-agents/llm-inference.
    ///      DO NOT execute yielded calldata — store only for inspection.
    function probeInferToolsChat() external payable {
        uint256 deposit = _deposit(LLM_INFERENCE_PRICE);
        require(msg.value >= deposit, "insufficient: need getRequestDeposit() + 0.21 STT");

        string[] memory roles = new string[](2);
        roles[0] = "system";
        roles[1] = "user";

        string[] memory messages = new string[](2);
        messages[0] = "You are a trading execution assistant. Use the executeSwap tool to execute swaps.";
        messages[1] = "Execute a swap of 100 USDC for WSOMI on Somnia. Call executeSwap now.";

        string[] memory mcpUrls = new string[](0);

        ILLMAgent.OnchainTool[] memory tools = new ILLMAgent.OnchainTool[](1);
        tools[0] = ILLMAgent.OnchainTool({
            signature: "executeSwap(address,address,uint256,uint256)",
            description: "Execute a token swap. tokenIn=source token address, tokenOut=destination token address, amountIn=input amount in token units, minOut=minimum output amount"
        });

        bytes memory payload = abi.encodeWithSelector(
            ILLMAgent.inferToolsChat.selector,
            roles, messages, mcpUrls, tools, uint256(1), false
        );

        uint256 requestId = PLATFORM.createAdvancedRequest{value: msg.value}(
            LLM_AGENT_ID,
            address(this),
            this.handleResponse.selector,
            payload,
            SUBCOMMITTEE_SIZE,
            2,
            ConsensusType.Majority,
            900
        );

        requestKind[requestId] = RequestKind.INFER_TOOLS_CHAT;
    }

    // ─── Callback ─────────────────────────────────────────────────────────────

    function handleResponse(
        uint256 requestId,
        Response[] memory responses,
        ResponseStatus status,
        Request memory
    ) external {
        require(msg.sender == address(PLATFORM), "only platform");

        bool success = status == ResponseStatus.Success;
        bytes memory rawData;

        if (success && responses.length > 0) {
            rawData = responses[0].result;
        }

        RequestKind kind = requestKind[requestId];

        if (kind == RequestKind.JSON_API) {
            lastJsonApiResult = rawData;
        } else if (kind == RequestKind.INFER_STRING) {
            lastInferStringResult = rawData;
        } else {
            // INFER_TOOLS_CHAT: decode 6-tuple, repack as (finishReason, firstToolCall)
            if (success && rawData.length > 0) {
                try this._decodeToolsResult(rawData) returns (
                    string memory finishReason,
                    bytes[] memory pendingToolCalls
                ) {
                    bytes memory firstCall = pendingToolCalls.length > 0
                        ? pendingToolCalls[0]
                        : bytes("");
                    rawData = abi.encode(finishReason, firstCall);
                } catch {
                    // keep rawData as-is for manual inspection
                }
            }
            lastInferToolsChatResult = rawData;
        }

        emit ProbeCompleted(requestId, kind, success, rawData);
    }

    // External so we can use try/catch across a call boundary
    function _decodeToolsResult(bytes calldata raw)
        external pure
        returns (string memory finishReason, bytes[] memory pendingToolCalls)
    {
        (finishReason,,,,,pendingToolCalls) =
            abi.decode(raw, (string,string,string[],string[],string[],bytes[]));
    }
}
