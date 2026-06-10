// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/ISomniaReactivity.sol";

/**
 * @notice Test double for the Somnia Reactivity precompile. Planted at 0x0100 via
 *         hardhat_setCode so LictorReactive's scheduling + callback path runs in unit tests.
 */
contract MockReactivity {
    uint256 public lastSubId;
    uint256 public lastTimestampMs;

    function subscribe(ISomniaReactivity.SubscriptionData calldata d) external returns (uint256) {
        lastSubId += 1;
        lastTimestampMs = uint256(d.eventTopics[1]);
        return lastSubId;
    }

    function unsubscribe(uint256) external {}

    function getSubscriptionInfo(uint256)
        external pure
        returns (ISomniaReactivity.SubscriptionData memory s, address o)
    {}

    /// @dev Simulate the scheduled callback firing. Because tests plant this contract at the
    ///      precompile address (0x0100), the handler sees msg.sender == 0x0100 as required.
    function fire(address handler, uint256 tMs) external {
        bytes32[] memory topics = new bytes32[](2);
        topics[0] = keccak256("Schedule(uint256)");
        topics[1] = bytes32(tMs);
        ISomniaEventHandler(handler).onEvent(address(this), topics, "");
    }
}
