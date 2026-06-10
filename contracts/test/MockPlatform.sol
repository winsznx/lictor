// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/ISomniaAgents.sol";

/**
 * @notice Minimal mock of the Somnia Agents Platform for Hardhat unit tests.
 *         Records createAdvancedRequest calls and lets tests dispatch callbacks.
 */
contract MockPlatform {
    uint256 private _nextRequestId = 1;

    uint256 public lastRequestId;

    mapping(uint256 => bool) public knownRequests;

    event RequestCreated(
        uint256 indexed requestId,
        uint256 indexed agentId,
        uint256 perAgentBudget,
        bytes payload,
        address[] subcommittee
    );

    // ── IAgentRequester surface ───────────────────────────────────────────────

    function createRequest(
        uint256 agentId,
        address,
        bytes4,
        bytes calldata payload
    ) external payable returns (uint256 requestId) {
        return _create(agentId, payload);
    }

    function createAdvancedRequest(
        uint256 agentId,
        address,
        bytes4,
        bytes calldata payload,
        uint256,
        uint256,
        ConsensusType,
        uint256
    ) external payable returns (uint256 requestId) {
        return _create(agentId, payload);
    }

    function getRequestDeposit() external pure returns (uint256) {
        return 0.03 ether;
    }

    function getAdvancedRequestDeposit(uint256) external pure returns (uint256) {
        return 0.03 ether;
    }

    function getRequest(uint256) external pure returns (Request memory) {
        revert("MockPlatform: not implemented");
    }

    function hasRequest(uint256 requestId) external view returns (bool) {
        return knownRequests[requestId];
    }

    receive() external payable {}

    // ── Dispatch helpers for tests ────────────────────────────────────────────

    /**
     * @dev Calls lictor.handleDecomposition(requestId, responses, status, emptyRequest).
     *      The 4th argument (Request memory) must be present but is ignored by Lictor.
     */
    function dispatchDecomposition(
        address lictor,
        uint256 requestId,
        bytes calldata encodedResult,
        ResponseStatus status
    ) external {
        Response[] memory responses = new Response[](1);
        responses[0].validator    = msg.sender;
        responses[0].result       = encodedResult;
        responses[0].status       = status;
        responses[0].receipt      = 0;
        responses[0].timestamp    = block.timestamp;
        responses[0].executionCost = 0;

        Request memory dummy = _dummyRequest(requestId);

        (bool ok, bytes memory ret) = lictor.call(
            abi.encodeCall(
                IHandlers(lictor).handleDecomposition,
                (requestId, responses, status, dummy)
            )
        );
        if (!ok) _bubble(ret);
    }

    /**
     * @dev Calls lictor.handleExecution(requestId, responses, status, emptyRequest).
     */
    function dispatchExecution(
        address lictor,
        uint256 requestId,
        bytes calldata encodedResult,
        ResponseStatus status
    ) external {
        Response[] memory responses = new Response[](1);
        responses[0].validator    = msg.sender;
        responses[0].result       = encodedResult;
        responses[0].status       = status;
        responses[0].receipt      = 0;
        responses[0].timestamp    = block.timestamp;
        responses[0].executionCost = 0;

        Request memory dummy = _dummyRequest(requestId);

        (bool ok, bytes memory ret) = lictor.call(
            abi.encodeCall(
                IHandlers(lictor).handleExecution,
                (requestId, responses, status, dummy)
            )
        );
        if (!ok) _bubble(ret);
    }

    /**
     * @dev Calls lictor.handleSignalUpdate(requestId, responses, status, emptyRequest).
     */
    function dispatchSignalUpdate(
        address lictor,
        uint256 requestId,
        bytes calldata encodedResult,
        ResponseStatus status
    ) external {
        Response[] memory responses = new Response[](1);
        responses[0].validator    = msg.sender;
        responses[0].result       = encodedResult;
        responses[0].status       = status;
        responses[0].receipt      = 0;
        responses[0].timestamp    = block.timestamp;
        responses[0].executionCost = 0;

        Request memory dummy = _dummyRequest(requestId);

        (bool ok, bytes memory ret) = lictor.call(
            abi.encodeCall(
                IHandlers(lictor).handleSignalUpdate,
                (requestId, responses, status, dummy)
            )
        );
        if (!ok) _bubble(ret);
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    function _create(uint256 agentId, bytes calldata payload) internal returns (uint256 requestId) {
        requestId = _nextRequestId++;
        lastRequestId = requestId;
        knownRequests[requestId] = true;
        address[] memory sub = new address[](0);
        emit RequestCreated(requestId, agentId, msg.value / 3, payload, sub);
    }

    function _dummyRequest(uint256 requestId) internal view returns (Request memory r) {
        r.id              = requestId;
        r.requester       = msg.sender;
        r.callbackAddress = address(0);
        r.callbackSelector = bytes4(0);
        r.subcommittee    = new address[](0);
        r.responses       = new Response[](0);
        r.responseCount   = 0;
        r.failureCount    = 0;
        r.threshold       = 0;
        r.createdAt       = block.timestamp;
        r.deadline        = block.timestamp + 600;
        r.status          = ResponseStatus.Pending;
        r.consensusType   = ConsensusType.Majority;
        r.remainingBudget = 0;
    }

    function _bubble(bytes memory ret) internal pure {
        if (ret.length == 0) revert("MockPlatform: call reverted with no reason");
        assembly { revert(add(ret, 32), mload(ret)) }
    }
}

// Minimal interface so MockPlatform can encode calls to Lictor handlers
interface IHandlers {
    function handleDecomposition(
        uint256 requestId,
        Response[] calldata responses,
        ResponseStatus status,
        Request calldata details
    ) external;

    function handleSignalUpdate(
        uint256 requestId,
        Response[] calldata responses,
        ResponseStatus status,
        Request calldata details
    ) external;

    function handleExecution(
        uint256 requestId,
        Response[] calldata responses,
        ResponseStatus status,
        Request calldata details
    ) external;
}
