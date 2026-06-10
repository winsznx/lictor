// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @notice Minimal Algebra router stub for Hardhat unit tests.
 *         Planted at the real ALGEBRA_ROUTER address via hardhat_setCode.
 *         Fallback answers any call with abi.encode(MOCK_AMOUNT_OUT), covering
 *         all function selectors without relying on the compiler's dispatcher.
 */
contract MockAlgebraRouter {
    uint256 public constant MOCK_AMOUNT_OUT = 99_000_000;

    fallback(bytes calldata) external payable returns (bytes memory) {
        return abi.encode(MOCK_AMOUNT_OUT);
    }

    receive() external payable {}
}
