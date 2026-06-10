// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// QuickSwap V4 / Algebra Integral SwapRouter on Somnia
// Deployed: 0x1582f6f3D26658F7208A799Be46e34b1f366CE44 (mainnet 5031)
// Confirmed selector: 0x1679c792
// exactInputSingle((address,address,address,address,uint256,uint256,uint256,uint160))
// No pluginData in deployed struct — verified against mainnet bytecode 2026-06-05.
interface IAlgebraRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        address deployer;         // AlgebraPoolDeployer: 0x0361B4883FfD676BB0a4642B3139D38A33e452f5
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 limitSqrtPrice;  // 0 = no price limit
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}
