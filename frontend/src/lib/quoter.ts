import {
  encodeFunctionData, decodeAbiParameters, type Address, type PublicClient,
} from 'viem'
import { QUOTER_V2 } from './chain'

// Algebra Integral QuoterV2 single-hop quote. Confirmed live against the USDC.e/WSOMI
// pool on Somnia mainnet: struct param with deployer = address(0) (base pool), amountOut
// is the first return word. Passing the AlgebraPoolDeployer explicitly reverts.
const ZERO_DEPLOYER = '0x0000000000000000000000000000000000000000' as const

const quoteAbi = [{
  type: 'function',
  name: 'quoteExactInputSingle',
  stateMutability: 'nonpayable',
  inputs: [{
    type: 'tuple',
    name: 'params',
    components: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'deployer', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'limitSqrtPrice', type: 'uint160' },
    ],
  }],
  outputs: [{ name: 'amountOut', type: 'uint256' }],
}] as const

/**
 * Live expected-output quote for a single-hop swap. Returns the raw output amount
 * (in tokenOut base units). Throws if the quoter is unreachable (e.g. testnet, where
 * the DEX is not deployed) — callers should fall back to an unprotected minOut.
 */
export async function getQuote(
  client: PublicClient,
  tokenIn: Address,
  tokenOut: Address,
  amountIn: bigint,
): Promise<bigint> {
  const data = encodeFunctionData({
    abi: quoteAbi,
    functionName: 'quoteExactInputSingle',
    args: [{ tokenIn, tokenOut, deployer: ZERO_DEPLOYER, amountIn, limitSqrtPrice: 0n }],
  })
  const res = await client.call({ to: QUOTER_V2, data })
  if (!res.data || res.data.length < 66) throw new Error('Quoter returned no data')
  const [amountOut] = decodeAbiParameters(
    [{ type: 'uint256' }],
    ('0x' + res.data.slice(2, 66)) as `0x${string}`,
  )
  return amountOut as bigint
}

/** Apply a slippage tolerance (in basis points) to a quoted amount. */
export function applySlippage(amountOut: bigint, bps = 50): bigint {
  return (amountOut * BigInt(10_000 - bps)) / 10_000n
}

export const erc20Abi = [
  {
    type: 'function', name: 'allowance', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function', name: 'approve', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function', name: 'balanceOf', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const
