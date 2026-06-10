// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ISomniaReactivity
 * @notice Minimal interface for the Somnia Reactivity precompile at 0x0100, matching the
 *         wire format of the somnia-chain/reactivity-contracts v0.2.0 package. Lets a contract
 *         schedule an on-chain self-call at a future timestamp — no external keeper.
 *
 * Schedule-at-timestamp: subscribe with a SubscriptionData whose eventTopics filter the
 * precompile's own `Schedule(uint256)` event at a specific millisecond. When the chain clock
 * reaches it, the precompile calls `handlerFunctionSelector` on `handlerContractAddress`.
 *
 * The subscribing contract must hold >= 32 ether (SUBSCRIPTION_OWNER_MINIMUM_BALANCE).
 */
interface ISomniaReactivity {
    struct SubscriptionData {
        bytes32[4] eventTopics;          // [0]=event sig, [1..3]=indexed filters (0 = wildcard)
        address origin;                  // tx.origin filter; 0 = wildcard
        address caller;                  // reserved; always address(0)
        address emitter;                 // event-emitting contract; for Schedule = precompile
        address handlerContractAddress;  // callback target
        bytes4  handlerFunctionSelector; // callback selector
        uint64  priorityFeePerGas;
        uint64  maxFeePerGas;
        uint64  gasLimit;
        bool    isGuaranteed;            // retry next block if current is full
        bool    isCoalesced;             // batch multiple events per block
    }

    function subscribe(SubscriptionData calldata subscriptionData) external returns (uint256 subscriptionId);
    function unsubscribe(uint256 subscriptionId) external;
    function getSubscriptionInfo(uint256 subscriptionId)
        external view returns (SubscriptionData memory subscriptionData, address owner);
}

/**
 * @notice Callback the Reactivity precompile invokes on the handler contract (0.2.0 ABI).
 *         msg.sender is always the precompile (0x0100).
 */
interface ISomniaEventHandler {
    function onEvent(address emitter, bytes32[] calldata eventTopics, bytes calldata data) external;
}
