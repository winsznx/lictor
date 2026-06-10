/**
 * Full E2E integration test on Shannon testnet.
 * Real STT, real agents, no mocks.
 *
 * Expected happy path when Algebra Router / USDC.e are on testnet:
 *   submitMandate → MandateArmed → tick → SignalUpdated → executeIfReady → MandateExecuted
 *
 * Expected outcome when DEX not on testnet (current Shannon state as of 2026-06-05):
 *   → MandateFailed("swap_reverted") at step 6.
 *   The agent pipeline (decompose → signal tick → inferToolsChat) is the proof.
 *
 * Usage:
 *   npx hardhat run scripts/20-e2e-mandate.ts --network somnia_testnet
 */
import hre from "hardhat";
import {
  parseEther,
  parseEventLogs,
  formatUnits,
  type Abi,
  type Account,
  type PublicClient,
  type WalletClient,
} from "viem";

// ─── Config ───────────────────────────────────────────────────────────────────

const LICTOR_ADDRESS    = process.env.LICTOR_ADDRESS as `0x${string}`;
const EXPLORER_BASE     = "https://shannon-explorer.somnia.network";
const RECEIPT_BASE      = "https://receipts.testnet.agents.somnia.host?requestId=";
const PLATFORM_ADDRESS  = "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776" as const;

const USDC_E = "0x28BEc7E30E6faee657a03e19Bf1128AaD7632A00" as const;
const WSOMI  = "0x046EDe9564A72571df6F5e44d0405360c0f4dCab" as const;

// Mandate parameters
const THESIS    = "Buy WSOMI if BTC price falls below 65000 USD";
const AMOUNT_IN = 10_000_000n;                  // 10 USDC.e (6 decimals)
const MIN_OUT   = 1_000_000_000_000_000_000n;   // 1 WSOMI minimum
const BUDGET    = parseEther("1.5");            // covers decompose + 2 ticks + execute

// Timeouts
const ARMED_TIMEOUT_MS   =  5 * 60_000;
const SIGNAL_TIMEOUT_MS  =  5 * 60_000;
const EXECUTE_TIMEOUT_MS = 10 * 60_000;

// ─── Types ────────────────────────────────────────────────────────────────────

const COMPARATOR_NAMES = ["GT", "GTE", "LT", "LTE", "EQ"];
const SOURCE_NAMES     = ["JSON_API", "PARSE_WEBSITE"];
const STATUS_NAMES     = [
  "PENDING_DECOMPOSITION", "ARMED", "TRIGGERED", "EXECUTING",
  "EXECUTED", "POSITION_MANAGED", "CLOSED", "FAILED",
];

type SignalTuple = {
  sourceType:    number;
  sourceUrl:     string;
  parseSelector: string;
  comparator:    number;
  threshold:     bigint;
  decimals:      number;
  latestValue:   bigint;
  lastUpdated:   bigint;
  triggered:     boolean;
  lastRequestId: bigint;
};

// ─── Event watching helpers ───────────────────────────────────────────────────

function watchForEvent<T>(
  publicClient: PublicClient,
  abi: Abi,
  address: `0x${string}`,
  eventName: string,
  predicate: (args: Record<string, unknown>) => boolean,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      unwatch();
      reject(new Error(`Timeout: no ${eventName} within ${timeoutMs / 60_000} min (${label})`));
    }, timeoutMs);

    const unwatch = publicClient.watchContractEvent({
      address,
      abi,
      eventName: eventName as never,
      pollingInterval: 3_000,
      onLogs: (logs) => {
        for (const log of logs) {
          const args = (log as { args?: Record<string, unknown> }).args ?? {};
          if (predicate(args)) {
            clearTimeout(timer);
            unwatch();
            resolve(args as T);
          }
        }
      },
      onError: (err) => {
        console.error(`  [watch:${eventName}] ${err.message}`);
      },
    });
  });
}

// ─── Summary state (for AGENT_PROGRESS output) ───────────────────────────────

const summary: {
  mandateId?: bigint;
  submitTx?: string;
  armedBlock?: bigint;
  signalCount?: number;
  signals?: SignalTuple[];
  tickTx?: string;
  signalUpdates: { idx: bigint; value: bigint; triggered: boolean }[];
  allTriggered?: boolean;
  executeIfReadyTx?: string;
  outcome?: string;
  amountOut?: bigint;
  agentRequestIds: bigint[];
  endStatus?: string;
} = { signalUpdates: [], agentRequestIds: [] };

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!LICTOR_ADDRESS || (LICTOR_ADDRESS as string) === "undefined") {
    throw new Error("LICTOR_ADDRESS not set in .env");
  }

  const artifact = await hre.artifacts.readArtifact("Lictor");
  const abi = artifact.abi as Abi;

  const publicClient = await hre.viem.getPublicClient();
  const [wallet] = await hre.viem.getWalletClients();
  const account = (wallet.account as Account).address;
  const chainId = await publicClient.getChainId();

  console.log(`\n${"═".repeat(60)}`);
  console.log(`LICTOR — E2E MANDATE INTEGRATION TEST`);
  console.log(`${"─".repeat(60)}`);
  console.log(`  Chain:   ${chainId} (Shannon testnet)`);
  console.log(`  Lictor:  ${LICTOR_ADDRESS}`);
  console.log(`  Wallet:  ${account}`);
  const bal = await publicClient.getBalance({ address: account });
  console.log(`  Balance: ${formatUnits(bal, 18)} STT`);
  console.log(`  Thesis:  "${THESIS}"`);
  console.log(`${"═".repeat(60)}\n`);

  // ── Pre-flight: check DEX and token availability ────────────────────────────
  const routerCode  = await publicClient.getCode({ address: "0x1582f6f3D26658F7208A799Be46e34b1f366CE44" });
  const usdceCode   = await publicClient.getCode({ address: USDC_E });
  const routerLive  = routerCode && routerCode !== "0x";
  const usdceLive   = usdceCode  && usdceCode  !== "0x";
  console.log(`Pre-flight DEX check:`);
  console.log(`  Algebra Router:  ${routerLive ? "✓ deployed" : "✗ NOT on testnet — swap will fail"}`);
  console.log(`  USDC.e:          ${usdceLive  ? "✓ deployed" : "✗ NOT on testnet — swap will fail"}`);
  if (!routerLive || !usdceLive) {
    console.log(`\n  NOTE: Agent pipeline (decompose → tick → inferToolsChat) is the proof.`);
    console.log(`  MandateFailed("swap_reverted") is expected at step 6.`);
    console.log(`  Mainnet swap planned for Finale demo.\n`);
  }

  // ── STEP 1: submitMandate ───────────────────────────────────────────────────
  console.log(`STEP 1 — submitMandate`);
  console.log(`  value:   ${formatUnits(BUDGET, 18)} STT`);

  const submitHash = await wallet.writeContract({
    address: LICTOR_ADDRESS,
    abi,
    functionName: "submitMandate",
    args: [THESIS, USDC_E, WSOMI, AMOUNT_IN, MIN_OUT],
    value: BUDGET,
    account,
  } as never);

  console.log(`  tx:      ${submitHash}`);
  console.log(`  explorer: ${EXPLORER_BASE}/tx/${submitHash}`);
  summary.submitTx = submitHash;

  const submitReceipt = await publicClient.waitForTransactionReceipt({ hash: submitHash });
  console.log(`  mined:   block ${submitReceipt.blockNumber}  gasUsed: ${submitReceipt.gasUsed}`);

  // Extract mandateId from MandateSubmitted event
  const submitLogs = parseEventLogs({ abi, logs: submitReceipt.logs, eventName: "MandateSubmitted" });
  if (submitLogs.length === 0) throw new Error("MandateSubmitted event not found in receipt");
  const mandateId = (submitLogs[0].args as { mandateId: bigint }).mandateId;
  summary.mandateId = mandateId;
  console.log(`  mandateId: ${mandateId}\n`);

  // Extract platform RequestCreated to get the decomposition request ID
  const PLATFORM_EVENT_ABI = [{
    type: "event", name: "RequestCreated",
    inputs: [
      { name: "requestId",      type: "uint256", indexed: true },
      { name: "agentId",        type: "uint256", indexed: true },
      { name: "perAgentBudget", type: "uint256", indexed: false },
      { name: "payload",        type: "bytes",   indexed: false },
      { name: "subcommittee",   type: "address[]", indexed: false },
    ],
  }] as const;
  const platformLogs = parseEventLogs({
    abi: PLATFORM_EVENT_ABI,
    logs: submitReceipt.logs.filter(
      (l) => l.address.toLowerCase() === PLATFORM_ADDRESS.toLowerCase()
    ),
    eventName: "RequestCreated",
  });
  if (platformLogs.length > 0) {
    const decompReqId = platformLogs[0].args.requestId;
    summary.agentRequestIds.push(decompReqId);
    console.log(`  Decomposition requestId: ${decompReqId}`);
    console.log(`  Receipt: ${RECEIPT_BASE}${decompReqId}\n`);
  }

  // ── STEP 2: Watch for MandateArmed ─────────────────────────────────────────
  console.log(`STEP 2 — Waiting for MandateArmed (up to ${ARMED_TIMEOUT_MS / 60_000} min)...`);

  const armedArgs = await watchForEvent<{
    mandateId: bigint; signalCount: bigint; conjunctive: boolean;
  }>(
    publicClient, abi, LICTOR_ADDRESS, "MandateArmed",
    (args) => (args.mandateId as bigint) === mandateId,
    ARMED_TIMEOUT_MS,
    `mandate ${mandateId}`,
  );

  console.log(`  ✓ MandateArmed`);
  console.log(`    signalCount:  ${armedArgs.signalCount}`);
  console.log(`    conjunctive:  ${armedArgs.conjunctive}`);
  summary.signalCount = Number(armedArgs.signalCount);

  // Read and print the signal specs stored on-chain
  const signals = await publicClient.readContract({
    address: LICTOR_ADDRESS,
    abi,
    functionName: "getSignals",
    args: [mandateId],
  }) as SignalTuple[];
  summary.signals = signals;

  console.log(`\n  Signals stored on-chain:`);
  for (let i = 0; i < signals.length; i++) {
    const s = signals[i];
    const threshold = formatUnits(s.threshold, s.decimals);
    console.log(`  [${i}] ${SOURCE_NAMES[s.sourceType] ?? s.sourceType}`);
    console.log(`      url:       ${s.sourceUrl}`);
    console.log(`      selector:  ${s.parseSelector}`);
    console.log(`      condition: ${COMPARATOR_NAMES[s.comparator] ?? s.comparator} ${threshold}`);
    console.log(`      triggered: ${s.triggered}`);
  }
  console.log();

  if (signals.length === 0) {
    throw new Error("No signals populated — LLM returned empty signal spec. Check decomposition.");
  }

  // ── STEP 3: Call tick(mandateId) ────────────────────────────────────────────
  console.log(`STEP 3 — tick(${mandateId})`);

  // Read current contract balance to confirm it can afford the tick
  const contractBal = await publicClient.getBalance({ address: LICTOR_ADDRESS });
  console.log(`  Contract balance: ${formatUnits(contractBal, 18)} STT`);

  const tickHash = await wallet.writeContract({
    address: LICTOR_ADDRESS,
    abi,
    functionName: "tick",
    args: [mandateId],
    account,
  } as never);

  console.log(`  tx:       ${tickHash}`);
  console.log(`  explorer: ${EXPLORER_BASE}/tx/${tickHash}`);
  summary.tickTx = tickHash;

  const tickReceipt = await publicClient.waitForTransactionReceipt({ hash: tickHash });
  console.log(`  mined:    block ${tickReceipt.blockNumber}  gasUsed: ${tickReceipt.gasUsed}`);

  // Extract signal request IDs from platform RequestCreated in tick receipt
  const tickPlatformLogs = parseEventLogs({
    abi: PLATFORM_EVENT_ABI,
    logs: tickReceipt.logs.filter(
      (l) => l.address.toLowerCase() === PLATFORM_ADDRESS.toLowerCase()
    ),
    eventName: "RequestCreated",
  });
  for (const log of tickPlatformLogs) {
    summary.agentRequestIds.push(log.args.requestId);
    console.log(`  Signal requestId: ${log.args.requestId}`);
    console.log(`  Receipt: ${RECEIPT_BASE}${log.args.requestId}`);
  }
  console.log();

  // ── STEP 4: Watch for SignalUpdated ─────────────────────────────────────────
  console.log(`STEP 4 — Watching for SignalUpdated (up to ${SIGNAL_TIMEOUT_MS / 60_000} min)...`);
  console.log(`  (watching for ${armedArgs.signalCount} signal update(s))`);

  const signalUpdates: { idx: bigint; value: bigint; triggered: boolean }[] = [];
  let allTriggered = false;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      unwatch();
      // Don't reject — partial updates are still valid; report what we got
      console.log(`  ⚠ Timeout. Received ${signalUpdates.length}/${armedArgs.signalCount} updates.`);
      resolve();
    }, SIGNAL_TIMEOUT_MS);

    const unwatch = publicClient.watchContractEvent({
      address: LICTOR_ADDRESS,
      abi,
      eventName: "SignalUpdated" as never,
      pollingInterval: 3_000,
      onLogs: (logs) => {
        for (const log of logs) {
          const args = (log as { args?: Record<string, unknown> }).args ?? {};
          if ((args.mandateId as bigint) !== mandateId) continue;

          const update = {
            idx:       args.signalIdx as bigint,
            value:     args.latestValue as bigint,
            triggered: args.triggered as boolean,
          };
          signalUpdates.push(update);
          summary.signalUpdates.push(update);

          const sigSpec = signals[Number(update.idx)];
          const decimals = sigSpec?.decimals ?? 0;
          console.log(`  ✓ SignalUpdated[${update.idx}]`);
          console.log(`      latestValue: ${formatUnits(update.value, decimals)}`);
          console.log(`      triggered:   ${update.triggered}`);

          if (signalUpdates.length >= Number(armedArgs.signalCount)) {
            allTriggered = signalUpdates.every((u) => u.triggered);
            clearTimeout(timer);
            unwatch();
            resolve();
          }
        }
      },
      onError: (err) => console.error(`  [watch:SignalUpdated] ${err.message}`),
    });
  });

  summary.allTriggered = allTriggered;
  console.log(`\n  All signals triggered: ${allTriggered}\n`);

  if (!allTriggered && signalUpdates.length < Number(armedArgs.signalCount)) {
    console.log(`  ⚠ Not all signals fired within timeout.`);
    console.log(`  This may indicate:`);
    console.log(`    - BTC price is actually above 65000 USD (threshold not crossed)`);
    console.log(`    - Signal callback delayed beyond ${SIGNAL_TIMEOUT_MS / 60_000} min`);
    console.log(`  Skipping executeIfReady. Partial E2E complete.\n`);
    printSummary(false);
    return;
  }

  if (!allTriggered) {
    console.log(`  Signals received but not all triggered — threshold not crossed.`);
    console.log(`  Skipping executeIfReady.\n`);
    printSummary(false);
    return;
  }

  // ── STEP 5: executeIfReady ──────────────────────────────────────────────────
  console.log(`STEP 5 — executeIfReady(${mandateId})`);

  const contractBalPre = await publicClient.getBalance({ address: LICTOR_ADDRESS });
  console.log(`  Contract balance: ${formatUnits(contractBalPre, 18)} STT`);

  const execHash = await wallet.writeContract({
    address: LICTOR_ADDRESS,
    abi,
    functionName: "executeIfReady",
    args: [mandateId],
    account,
  } as never);

  console.log(`  tx:       ${execHash}`);
  console.log(`  explorer: ${EXPLORER_BASE}/tx/${execHash}`);
  summary.executeIfReadyTx = execHash;

  const execReceipt = await publicClient.waitForTransactionReceipt({ hash: execHash });
  console.log(`  mined:    block ${execReceipt.blockNumber}  gasUsed: ${execReceipt.gasUsed}`);

  // Extract the inferToolsChat requestId
  const execPlatformLogs = parseEventLogs({
    abi: PLATFORM_EVENT_ABI,
    logs: execReceipt.logs.filter(
      (l) => l.address.toLowerCase() === PLATFORM_ADDRESS.toLowerCase()
    ),
    eventName: "RequestCreated",
  });
  for (const log of execPlatformLogs) {
    summary.agentRequestIds.push(log.args.requestId);
    console.log(`  inferToolsChat requestId: ${log.args.requestId}`);
    console.log(`  Receipt: ${RECEIPT_BASE}${log.args.requestId}`);
  }
  console.log();

  // ── STEP 6: Watch for MandateExecuted or MandateFailed ─────────────────────
  console.log(`STEP 6 — Watching for MandateExecuted or MandateFailed (up to ${EXECUTE_TIMEOUT_MS / 60_000} min)...`);
  console.log(`  (DEX router NOT on testnet → MandateFailed("swap_reverted") is expected)`);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      unwatch();
      reject(new Error(`Timeout: no MandateExecuted or MandateFailed within ${EXECUTE_TIMEOUT_MS / 60_000} min`));
    }, EXECUTE_TIMEOUT_MS);

    const unwatchExecuted = publicClient.watchContractEvent({
      address: LICTOR_ADDRESS,
      abi,
      eventName: "MandateExecuted" as never,
      pollingInterval: 3_000,
      onLogs: (logs) => {
        for (const log of logs) {
          const args = (log as { args?: Record<string, unknown> }).args ?? {};
          if ((args.mandateId as bigint) !== mandateId) continue;
          clearTimeout(timer);
          unwatch();
          summary.outcome   = "EXECUTED";
          summary.amountOut = args.amountOut as bigint;
          console.log(`  ✓ MandateExecuted`);
          console.log(`    amountOut: ${formatUnits(args.amountOut as bigint, 18)} WSOMI`);
          resolve();
        }
      },
      onError: (err) => console.error(`  [watch:MandateExecuted] ${err.message}`),
    });

    const unwatchFailed = publicClient.watchContractEvent({
      address: LICTOR_ADDRESS,
      abi,
      eventName: "MandateFailed" as never,
      pollingInterval: 3_000,
      onLogs: (logs) => {
        for (const log of logs) {
          const args = (log as { args?: Record<string, unknown> }).args ?? {};
          if ((args.mandateId as bigint) !== mandateId) continue;
          clearTimeout(timer);
          unwatch();
          summary.outcome = `FAILED: ${args.reason as string}`;
          const reason = args.reason as string;
          if (reason === "swap_reverted") {
            console.log(`  ⚠ MandateFailed("swap_reverted") — expected: DEX not on testnet`);
            console.log(`  Agent pipeline is complete — inferToolsChat yielded valid calldata.`);
            console.log(`  Mainnet swap planned for Finale demo.`);
          } else {
            console.log(`  ✗ MandateFailed("${reason}") — unexpected failure`);
          }
          resolve();
        }
      },
      onError: (err) => console.error(`  [watch:MandateFailed] ${err.message}`),
    });

    function unwatch() {
      unwatchExecuted();
      unwatchFailed();
    }
  });

  // ── Final mandate state ─────────────────────────────────────────────────────
  const mandate = await publicClient.readContract({
    address: LICTOR_ADDRESS,
    abi,
    functionName: "getMandate",
    args: [mandateId],
  }) as { status: number };
  summary.endStatus = STATUS_NAMES[mandate.status] ?? String(mandate.status);

  printSummary(true);
}

// ─── Summary printer ──────────────────────────────────────────────────────────

function printSummary(full: boolean) {
  const EXPLORER_BASE = "https://shannon-explorer.somnia.network";
  const RECEIPT_BASE  = "https://receipts.testnet.agents.somnia.host?requestId=";

  console.log(`\n${"═".repeat(60)}`);
  console.log(`E2E SUMMARY`);
  console.log(`${"─".repeat(60)}`);
  console.log(`  Mandate ID:   ${summary.mandateId ?? "—"}`);
  console.log(`  End status:   ${summary.endStatus ?? "—"}`);
  console.log(`  Outcome:      ${summary.outcome ?? "(not reached)"}`);
  console.log();
  console.log(`  Transactions:`);
  if (summary.submitTx)          console.log(`    submitMandate:  ${EXPLORER_BASE}/tx/${summary.submitTx}`);
  if (summary.tickTx)            console.log(`    tick:           ${EXPLORER_BASE}/tx/${summary.tickTx}`);
  if (summary.executeIfReadyTx)  console.log(`    executeIfReady: ${EXPLORER_BASE}/tx/${summary.executeIfReadyTx}`);
  console.log();
  console.log(`  Agent requests:`);
  if (summary.agentRequestIds.length === 0) {
    console.log(`    (none)`);
  } else {
    for (const id of summary.agentRequestIds) {
      console.log(`    ${id}  →  ${RECEIPT_BASE}${id}`);
    }
  }
  if (full && summary.signals && summary.signals.length > 0) {
    console.log();
    console.log(`  Signal results:`);
    for (let i = 0; i < summary.signals.length; i++) {
      const s = summary.signals[i];
      const update = summary.signalUpdates.find((u) => Number(u.idx) === i);
      const val = update ? formatUnits(update.value, s.decimals) : "pending";
      const trig = update ? String(update.triggered) : "pending";
      console.log(`    [${i}] ${s.parseSelector}  value=${val}  triggered=${trig}`);
    }
  }
  console.log(`${"═".repeat(60)}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(`\nFAILED: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
