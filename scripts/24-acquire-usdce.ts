/**
 * Acquire USDC.e from native SOMI on mainnet: wrap SOMI → WSOMI, then swap → USDC.e
 * on the Algebra router (deployer = address(0), 0.5% slippage). Output lands in the
 * caller's wallet so the mainnet E2E (scripts/22) can fund the swap.
 *
 * Env: WRAP_SOMI (default "2.0") — amount of SOMI to convert.
 * Usage: npx hardhat run scripts/24-acquire-usdce.ts --network somnia_mainnet
 */
import hre from "hardhat";
import {
  parseEther, formatEther, formatUnits, encodeFunctionData, decodeAbiParameters,
  type Account,
} from "viem";

const ROUTER  = "0x1582f6f3D26658F7208A799Be46e34b1f366CE44" as const;
const QUOTER  = "0xcB68373404a835268D3ED76255C8148578A82b77" as const;
const USDC_E  = "0x28BEc7E30E6faee657a03e19Bf1128AaD7632A00" as const;
const WSOMI   = "0x046EDe9564A72571df6F5e44d0405360c0f4dCab" as const;
const ZERO    = "0x0000000000000000000000000000000000000000" as const;

const WSOMI_ABI = [
  { type: "function", name: "deposit", stateMutability: "payable", inputs: [], outputs: [] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
const USDC_ABI = [{ type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] }] as const;
const QUOTE_ABI = [{ type: "function", name: "quoteExactInputSingle", stateMutability: "nonpayable", inputs: [{ type: "tuple", name: "p", components: [
  { name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "deployer", type: "address" }, { name: "amountIn", type: "uint256" }, { name: "limitSqrtPrice", type: "uint160" },
]}], outputs: [{ name: "o", type: "uint256" }] }] as const;
const ROUTER_ABI = [{ type: "function", name: "exactInputSingle", stateMutability: "payable", inputs: [{ type: "tuple", name: "params", components: [
  { name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" }, { name: "deployer", type: "address" }, { name: "recipient", type: "address" }, { name: "deadline", type: "uint256" }, { name: "amountIn", type: "uint256" }, { name: "amountOutMinimum", type: "uint256" }, { name: "limitSqrtPrice", type: "uint160" },
]}], outputs: [{ name: "amountOut", type: "uint256" }] }] as const;

async function main() {
  const pub = await hre.viem.getPublicClient();
  const [wallet] = await hre.viem.getWalletClients();
  const account = (wallet.account as Account).address;

  const wrapAmt = parseEther(process.env.WRAP_SOMI ?? "2.0");
  const somi = await pub.getBalance({ address: account });
  console.log(`\nAcquire USDC.e from SOMI`);
  console.log(`  Wallet: ${account}`);
  console.log(`  SOMI:   ${formatEther(somi)}`);
  console.log(`  Wrap:   ${formatEther(wrapAmt)} SOMI`);
  if (somi < wrapAmt + parseEther("0.5")) { console.log(`\n⛔ STOP: keep >=0.5 SOMI for gas + budget.`); return; }

  // 1. wrap
  console.log(`\n[1/3] wrap SOMI → WSOMI`);
  const wTx = await wallet.writeContract({ address: WSOMI, abi: WSOMI_ABI, functionName: "deposit", value: wrapAmt, account } as never);
  await pub.waitForTransactionReceipt({ hash: wTx });
  const wsomiBal = await pub.readContract({ address: WSOMI, abi: WSOMI_ABI, functionName: "balanceOf", args: [account] }) as bigint;
  console.log(`  WSOMI balance: ${formatEther(wsomiBal)}  (tx ${wTx})`);

  // 2. quote → minOut
  const qData = encodeFunctionData({ abi: QUOTE_ABI, functionName: "quoteExactInputSingle", args: [{ tokenIn: WSOMI, tokenOut: USDC_E, deployer: ZERO, amountIn: wsomiBal, limitSqrtPrice: 0n }] });
  const qRes = await pub.call({ to: QUOTER, data: qData });
  if (!qRes.data || qRes.data.length < 66) { console.log(`\n⛔ STOP: no quote.`); return; }
  const [expected] = decodeAbiParameters([{ type: "uint256" }], ("0x" + qRes.data.slice(2, 66)) as `0x${string}`);
  const minOut = ((expected as bigint) * 9950n) / 10000n;
  console.log(`\n[2/3] approve router for ${formatEther(wsomiBal)} WSOMI`);
  const apTx = await wallet.writeContract({ address: WSOMI, abi: WSOMI_ABI, functionName: "approve", args: [ROUTER, wsomiBal], account } as never);
  await pub.waitForTransactionReceipt({ hash: apTx });
  console.log(`  approve tx: ${apTx}`);

  // 3. swap
  const blk = await pub.getBlock();
  const deadline = blk.timestamp + 600n;
  console.log(`\n[3/3] swap WSOMI → USDC.e (expected ${formatUnits(expected as bigint, 6)}, minOut ${formatUnits(minOut, 6)})`);
  const sTx = await wallet.writeContract({
    address: ROUTER, abi: ROUTER_ABI, functionName: "exactInputSingle",
    args: [{ tokenIn: WSOMI, tokenOut: USDC_E, deployer: ZERO, recipient: account, deadline, amountIn: wsomiBal, amountOutMinimum: minOut, limitSqrtPrice: 0n }],
    account,
  } as never);
  await pub.waitForTransactionReceipt({ hash: sTx });
  const usdce = await pub.readContract({ address: USDC_E, abi: USDC_ABI, functionName: "balanceOf", args: [account] }) as bigint;
  console.log(`  swap tx: https://explorer.somnia.network/tx/${sTx}`);
  console.log(`\n✅ USDC.e balance now: ${formatUnits(usdce, 6)}`);
  console.log(`   SOMI left: ${formatEther(await pub.getBalance({ address: account }))}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(`\nFAILED: ${e instanceof Error ? e.message : String(e)}`); process.exit(1); });
