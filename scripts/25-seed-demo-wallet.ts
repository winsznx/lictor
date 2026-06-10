/**
 * Seed a demo wallet with USDC.e + SOMI so it can run a live Lictor mandate for the video.
 * Ensures the deployer holds enough USDC.e (wrap SOMI → WSOMI → USDC.e for any shortfall),
 * then transfers USDC.e + native SOMI to the target.
 *
 * Env:
 *   DEMO_WALLET   (required) target address
 *   SEND_USDC     default "0.1"   USDC.e to send
 *   SEND_SOMI     default "2.0"   SOMI to send
 * Usage: DEMO_WALLET=0x… npx hardhat run scripts/25-seed-demo-wallet.ts --network somnia_mainnet
 */
import hre from "hardhat";
import {
  parseEther, parseUnits, formatEther, formatUnits, encodeFunctionData,
  decodeAbiParameters, isAddress, type Account,
} from "viem";

const ROUTER = "0x1582f6f3D26658F7208A799Be46e34b1f366CE44" as const;
const QUOTER = "0xcB68373404a835268D3ED76255C8148578A82b77" as const;
const USDC_E = "0x28BEc7E30E6faee657a03e19Bf1128AaD7632A00" as const;
const WSOMI  = "0x046EDe9564A72571df6F5e44d0405360c0f4dCab" as const;
const ZERO   = "0x0000000000000000000000000000000000000000" as const;

const WSOMI_ABI = [
  { type: "function", name: "deposit", stateMutability: "payable", inputs: [], outputs: [] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
const USDC_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "transfer", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;
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

  const target = process.env.DEMO_WALLET as `0x${string}`;
  if (!target || !isAddress(target)) throw new Error("DEMO_WALLET must be a valid address");
  const sendUsdc = parseUnits(process.env.SEND_USDC ?? "0.1", 6);
  const sendSomi = parseEther(process.env.SEND_SOMI ?? "2.0");

  console.log(`\nSeed demo wallet ${target}`);
  console.log(`  send: ${formatUnits(sendUsdc, 6)} USDC.e + ${formatEther(sendSomi)} SOMI`);

  let usdce = await pub.readContract({ address: USDC_E, abi: USDC_ABI, functionName: "balanceOf", args: [account] }) as bigint;
  const somi = await pub.getBalance({ address: account });
  console.log(`  deployer has: ${formatUnits(usdce, 6)} USDC.e, ${formatEther(somi)} SOMI`);

  // ── acquire USDC.e shortfall via wrap + swap ──────────────────────────────
  if (usdce < sendUsdc) {
    const shortUsdc = sendUsdc - usdce;
    // 1 USDC.e ≈ 9.7 SOMI (1 WSOMI ≈ 0.1033 USDC.e). Convert shortfall (6-dec) → SOMI (18-dec)
    // at ~10 SOMI/USDC.e (×1e13) and add 15% headroom for price drift + 0.5% slippage.
    const wrapAmt = (shortUsdc * 10n ** 13n * 115n) / 100n;
    console.log(`\n  shortfall ${formatUnits(shortUsdc, 6)} USDC.e → wrapping ${formatEther(wrapAmt)} SOMI`);
    if (somi < wrapAmt + sendSomi + parseEther("0.3")) throw new Error("insufficient SOMI to acquire USDC.e + send + gas");

    await pub.waitForTransactionReceipt({ hash: await wallet.writeContract({ address: WSOMI, abi: WSOMI_ABI, functionName: "deposit", value: wrapAmt, account } as never) });
    const wsBal = await pub.readContract({ address: WSOMI, abi: WSOMI_ABI, functionName: "balanceOf", args: [account] }) as bigint;
    await pub.waitForTransactionReceipt({ hash: await wallet.writeContract({ address: WSOMI, abi: WSOMI_ABI, functionName: "approve", args: [ROUTER, wsBal], account } as never) });

    const qData = encodeFunctionData({ abi: QUOTE_ABI, functionName: "quoteExactInputSingle", args: [{ tokenIn: WSOMI, tokenOut: USDC_E, deployer: ZERO, amountIn: wsBal, limitSqrtPrice: 0n }] });
    const qRes = await pub.call({ to: QUOTER, data: qData });
    const [expected] = decodeAbiParameters([{ type: "uint256" }], ("0x" + (qRes.data ?? "0x").slice(2, 66)) as `0x${string}`);
    const minOut = ((expected as bigint) * 9950n) / 10000n;
    const deadline = (await pub.getBlock()).timestamp + 600n;
    await pub.waitForTransactionReceipt({ hash: await wallet.writeContract({
      address: ROUTER, abi: ROUTER_ABI, functionName: "exactInputSingle",
      args: [{ tokenIn: WSOMI, tokenOut: USDC_E, deployer: ZERO, recipient: account, deadline, amountIn: wsBal, amountOutMinimum: minOut, limitSqrtPrice: 0n }], account,
    } as never) });
    usdce = await pub.readContract({ address: USDC_E, abi: USDC_ABI, functionName: "balanceOf", args: [account] }) as bigint;
    console.log(`  acquired → ${formatUnits(usdce, 6)} USDC.e`);
  }

  // ── transfer USDC.e ────────────────────────────────────────────────────────
  console.log(`\n  → sending ${formatUnits(sendUsdc, 6)} USDC.e`);
  const uTx = await wallet.writeContract({ address: USDC_E, abi: USDC_ABI, functionName: "transfer", args: [target, sendUsdc], account } as never);
  await pub.waitForTransactionReceipt({ hash: uTx });
  console.log(`    https://explorer.somnia.network/tx/${uTx}`);

  // ── transfer SOMI ──────────────────────────────────────────────────────────
  console.log(`  → sending ${formatEther(sendSomi)} SOMI`);
  const sTx = await wallet.sendTransaction({ to: target, value: sendSomi, account } as never);
  await pub.waitForTransactionReceipt({ hash: sTx });
  console.log(`    https://explorer.somnia.network/tx/${sTx}`);

  const dU = await pub.readContract({ address: USDC_E, abi: USDC_ABI, functionName: "balanceOf", args: [target] }) as bigint;
  const dS = await pub.getBalance({ address: target });
  console.log(`\n✅ demo wallet now: ${formatUnits(dU, 6)} USDC.e, ${formatEther(dS)} SOMI`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(`\nFAILED: ${e instanceof Error ? e.message : String(e)}`); process.exit(1); });
