/**
 * Task H — full mainnet E2E for one live mandate with a real swap.
 *
 * Thesis: "Buy WSOMI if BTC price falls below $70000" (threshold above spot → triggers).
 * Flow: preflight → approve → submitMandate (custody) → decompose → tick → signal →
 *       executeIfReady → inferToolsChat → Algebra swap → MandateExecuted.
 *
 * HARD GATES (will stop before broadcasting any tx):
 *   - SOMI balance must cover budget + gas.
 *   - USDC.e balance must be >= amountIn (the contract pulls it into custody).
 *
 * Usage: npx hardhat run scripts/22-mainnet-e2e.ts --network somnia_mainnet
 */
import hre from "hardhat";
import {
  parseEther, parseUnits, parseEventLogs, formatUnits, encodeFunctionData, decodeAbiParameters,
  type Abi, type Account, type PublicClient,
} from "viem";

const EXPLORER     = "https://explorer.somnia.network";
const RECEIPT_BASE = "https://agents.somnia.network/receipts";
const PLATFORM     = "0x5E5205CF39E766118C01636bED000A54D93163E6" as const;
const QUOTER_V2    = "0xcB68373404a835268D3ED76255C8148578A82b77" as const;
const USDC_E       = "0x28BEc7E30E6faee657a03e19Bf1128AaD7632A00" as const;
const WSOMI        = "0x046EDe9564A72571df6F5e44d0405360c0f4dCab" as const;
const ZERO         = "0x0000000000000000000000000000000000000000" as const;

const THESIS    = "Buy WSOMI if BTC price falls below 70000 USD";
const AMOUNT_IN = parseUnits(process.env.AMOUNT_IN_USDC ?? "1", 6);   // override e.g. AMOUNT_IN_USDC=0.05
const BUDGET    = parseEther(process.env.BUDGET_SOMI ?? "1.5");        // override e.g. BUDGET_SOMI=1.2
const SLIPPAGE_BPS = 50n;

const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;

const QUOTE_ABI = [{
  type: "function", name: "quoteExactInputSingle", stateMutability: "nonpayable",
  inputs: [{ type: "tuple", name: "p", components: [
    { name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" },
    { name: "deployer", type: "address" }, { name: "amountIn", type: "uint256" },
    { name: "limitSqrtPrice", type: "uint160" },
  ]}],
  outputs: [{ name: "amountOut", type: "uint256" }],
}] as const;

const PLATFORM_EVENT_ABI = [{
  type: "event", name: "RequestCreated", inputs: [
    { name: "requestId", type: "uint256", indexed: true },
    { name: "agentId", type: "uint256", indexed: true },
    { name: "perAgentBudget", type: "uint256", indexed: false },
    { name: "payload", type: "bytes", indexed: false },
    { name: "subcommittee", type: "address[]", indexed: false },
  ],
}] as const;

async function getQuote(pub: PublicClient): Promise<bigint | null> {
  try {
    const data = encodeFunctionData({
      abi: QUOTE_ABI, functionName: "quoteExactInputSingle",
      args: [{ tokenIn: USDC_E, tokenOut: WSOMI, deployer: ZERO, amountIn: AMOUNT_IN, limitSqrtPrice: 0n }],
    });
    const res = await pub.call({ to: QUOTER_V2, data });
    if (!res.data || res.data.length < 66) return null;
    const [out] = decodeAbiParameters([{ type: "uint256" }], ("0x" + res.data.slice(2, 66)) as `0x${string}`);
    return out as bigint;
  } catch { return null; }
}

function watchOne<T>(pub: PublicClient, abi: Abi, address: `0x${string}`, eventName: string, pred: (a: Record<string, unknown>) => boolean, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => { unwatch(); resolve(null); }, timeoutMs);
    const unwatch = pub.watchContractEvent({
      address, abi, eventName: eventName as never, pollingInterval: 4000,
      onLogs: (logs) => { for (const l of logs) { const a = (l as { args?: Record<string, unknown> }).args ?? {}; if (pred(a)) { clearTimeout(timer); unwatch(); resolve(a as T); } } },
    });
  });
}

async function main() {
  const pub = await hre.viem.getPublicClient();
  const [wallet] = await hre.viem.getWalletClients();
  const account = (wallet.account as Account).address;
  const abi = (await hre.artifacts.readArtifact("Lictor")).abi as Abi;
  const LICTOR = process.env.LICTOR_MAINNET_ADDRESS as `0x${string}`;

  console.log(`\n${"═".repeat(62)}\nLICTOR — MAINNET E2E\n${"─".repeat(62)}`);
  console.log(`  Lictor:  ${LICTOR}`);
  console.log(`  Wallet:  ${account}`);

  if (!LICTOR) throw new Error("LICTOR_MAINNET_ADDRESS not set");

  // ── GATE 1: balances ────────────────────────────────────────────────────────
  const somi = await pub.getBalance({ address: account });
  const usdce = await pub.readContract({ address: USDC_E, abi: ERC20_ABI, functionName: "balanceOf", args: [account] }) as bigint;
  console.log(`  SOMI:    ${formatUnits(somi, 18)}`);
  console.log(`  USDC.e:  ${formatUnits(usdce, 6)}`);

  if (somi < BUDGET + parseEther("0.2")) {
    console.log(`\n⛔ STOP: insufficient SOMI for budget (${formatUnits(BUDGET, 18)}) + gas.`); return;
  }
  if (usdce < AMOUNT_IN) {
    console.log(`\n⛔ STOP: USDC.e balance ${formatUnits(usdce, 6)} < required ${formatUnits(AMOUNT_IN, 6)}.`);
    console.log(`   The contract pulls amountIn into custody at submitMandate, so the swap`);
    console.log(`   cannot run without USDC.e. Fund ${account} with USDC.e on mainnet and re-run.`);
    return;
  }

  // ── GATE 2: live quote → minOut ─────────────────────────────────────────────
  const quote = await getQuote(pub);
  if (quote === null || quote === 0n) {
    console.log(`\n⛔ STOP: QuoterV2 returned no quote — refusing to submit with unprotected minOut on mainnet.`); return;
  }
  const minOut = (quote * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  console.log(`  Quote:   ${formatUnits(quote, 18)} WSOMI  →  minOut ${formatUnits(minOut, 18)} (0.5%)`);

  // ── STEP 0: approve ─────────────────────────────────────────────────────────
  const allowance = await pub.readContract({ address: USDC_E, abi: ERC20_ABI, functionName: "allowance", args: [account, LICTOR] }) as bigint;
  if (allowance < AMOUNT_IN) {
    console.log(`\nSTEP 0 — approve USDC.e`);
    const aTx = await wallet.writeContract({ address: USDC_E, abi: ERC20_ABI, functionName: "approve", args: [LICTOR, AMOUNT_IN], account } as never);
    await pub.waitForTransactionReceipt({ hash: aTx });
    console.log(`  approve tx: ${EXPLORER}/tx/${aTx}`);
  }

  // ── STEP 1: submitMandate ───────────────────────────────────────────────────
  console.log(`\nSTEP 1 — submitMandate (escrows ${formatUnits(BUDGET, 18)} SOMI, takes ${formatUnits(AMOUNT_IN, 6)} USDC.e custody)`);
  const sTx = await wallet.writeContract({ address: LICTOR, abi, functionName: "submitMandate", args: [THESIS, USDC_E, WSOMI, AMOUNT_IN, minOut], value: BUDGET, account } as never);
  const sRcpt = await pub.waitForTransactionReceipt({ hash: sTx });
  console.log(`  tx: ${EXPLORER}/tx/${sTx}  (block ${sRcpt.blockNumber})`);
  const mId = (parseEventLogs({ abi, logs: sRcpt.logs, eventName: "MandateSubmitted" })[0]?.args as { mandateId: bigint }).mandateId;
  console.log(`  mandateId: ${mId}`);
  const decompReq = parseEventLogs({ abi: PLATFORM_EVENT_ABI, logs: sRcpt.logs.filter((l) => l.address.toLowerCase() === PLATFORM.toLowerCase()), eventName: "RequestCreated" })[0]?.args.requestId;
  if (decompReq) console.log(`  decompose receipt: ${RECEIPT_BASE}/${decompReq}`);

  console.log(`\nSTEP 2 — waiting for MandateArmed...`);
  const armed = await watchOne<{ signalCount: bigint }>(pub, abi, LICTOR, "MandateArmed", (a) => a.mandateId === mId, 5 * 60_000);
  if (!armed) { console.log(`  timeout waiting for arm. Mandate ${mId} may still arm later.`); return; }
  console.log(`  ✓ armed with ${armed.signalCount} signal(s)`);

  // ── STEP 3: tick ────────────────────────────────────────────────────────────
  console.log(`\nSTEP 3 — tick(${mId})`);
  const tTx = await wallet.writeContract({ address: LICTOR, abi, functionName: "tick", args: [mId], account } as never);
  const tRcpt = await pub.waitForTransactionReceipt({ hash: tTx });
  console.log(`  tx: ${EXPLORER}/tx/${tTx}`);
  for (const lg of parseEventLogs({ abi: PLATFORM_EVENT_ABI, logs: tRcpt.logs.filter((l) => l.address.toLowerCase() === PLATFORM.toLowerCase()), eventName: "RequestCreated" }))
    console.log(`  signal receipt: ${RECEIPT_BASE}/${lg.args.requestId}`);

  console.log(`\nSTEP 4 — waiting for SignalUpdated...`);
  const sig = await watchOne<{ latestValue: bigint; triggered: boolean }>(pub, abi, LICTOR, "SignalUpdated", (a) => a.mandateId === mId, 5 * 60_000);
  if (!sig) { console.log(`  timeout waiting for signal.`); return; }
  console.log(`  ✓ value ${sig.latestValue} triggered=${sig.triggered}`);
  if (!sig.triggered) { console.log(`  Signal not triggered (BTC above threshold?). Stopping.`); return; }

  // ── STEP 5: executeIfReady ──────────────────────────────────────────────────
  console.log(`\nSTEP 5 — executeIfReady(${mId})`);
  const eTx = await wallet.writeContract({ address: LICTOR, abi, functionName: "executeIfReady", args: [mId], account } as never);
  const eRcpt = await pub.waitForTransactionReceipt({ hash: eTx });
  console.log(`  tx: ${EXPLORER}/tx/${eTx}`);
  for (const lg of parseEventLogs({ abi: PLATFORM_EVENT_ABI, logs: eRcpt.logs.filter((l) => l.address.toLowerCase() === PLATFORM.toLowerCase()), eventName: "RequestCreated" }))
    console.log(`  inferToolsChat receipt: ${RECEIPT_BASE}/${lg.args.requestId}`);

  console.log(`\nSTEP 6 — waiting for MandateExecuted / MandateFailed...`);
  const done = await new Promise<{ kind: string; data: Record<string, unknown> } | null>((resolve) => {
    const timer = setTimeout(() => { ux(); uf(); resolve(null); }, 10 * 60_000);
    const ux = pub.watchContractEvent({ address: LICTOR, abi, eventName: "MandateExecuted" as never, pollingInterval: 4000, onLogs: (ls) => { for (const l of ls) { const a = (l as { args?: Record<string, unknown> }).args ?? {}; if (a.mandateId === mId) { clearTimeout(timer); ux(); uf(); resolve({ kind: "EXECUTED", data: a }); } } } });
    const uf = pub.watchContractEvent({ address: LICTOR, abi, eventName: "MandateFailed" as never, pollingInterval: 4000, onLogs: (ls) => { for (const l of ls) { const a = (l as { args?: Record<string, unknown> }).args ?? {}; if (a.mandateId === mId) { clearTimeout(timer); ux(); uf(); resolve({ kind: "FAILED", data: a }); } } } });
  });

  console.log(`\n${"═".repeat(62)}`);
  if (!done) console.log(`  ⏱ timeout — no terminal event yet for mandate ${mId}`);
  else if (done.kind === "EXECUTED") console.log(`  ✅ MandateExecuted — amountOut ${formatUnits(done.data.amountOut as bigint, 18)} WSOMI`);
  else console.log(`  ❌ MandateFailed — reason: ${done.data.reason}`);
  console.log(`${"═".repeat(62)}\n`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(`\nFAILED: ${e instanceof Error ? e.message : String(e)}`); process.exit(1); });
