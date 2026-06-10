// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ISomniaAgents.sol";

/**
 * @notice Parameterized JSON API probe — calls the Somnia JSON API agent with an
 *         arbitrary URL/selector/decimals so we can validate real signal sources
 *         (e.g. Polymarket gamma-api) and the agent's dot-notation selector support.
 */
contract JsonProbe {
    IAgentRequester public immutable PLATFORM;
    uint256 public constant JSON_API_AGENT_ID = 13174292974160097713;
    uint256 public constant PRICE = 0.03 ether;
    uint8   public constant SUBCOMMITTEE = 3;

    event Result(uint256 indexed requestId, bool success, uint8 status, uint256 value, bytes raw);

    constructor(address platform) { PLATFORM = IAgentRequester(platform); }
    receive() external payable {}

    function _deposit() internal view returns (uint256) {
        return PLATFORM.getRequestDeposit() + PRICE * SUBCOMMITTEE;
    }

    function probe(string calldata url, string calldata selector, uint8 decimals)
        external payable returns (uint256 requestId)
    {
        bytes memory payload = abi.encodeCall(IJsonApiAgent.fetchUint, (url, selector, decimals));
        requestId = PLATFORM.createAdvancedRequest{value: msg.value}(
            JSON_API_AGENT_ID, address(this), this.cb.selector,
            payload, SUBCOMMITTEE, 2, ConsensusType.Majority, 600
        );
    }

    function cb(uint256 requestId, Response[] memory responses, ResponseStatus status, Request memory) external {
        require(msg.sender == address(PLATFORM), "only platform");
        bool ok = status == ResponseStatus.Success && responses.length > 0;
        uint256 v;
        if (ok) {
            try this.dec(responses[0].result) returns (uint256 x) { v = x; } catch { ok = false; }
        }
        emit Result(requestId, ok, uint8(status), v, ok ? responses[0].result : bytes(""));
    }

    function dec(bytes calldata r) external pure returns (uint256) { return abi.decode(r, (uint256)); }
}
