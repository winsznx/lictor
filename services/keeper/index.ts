/**
 * Lictor Keeper — polls each configured Somnia chain every 60s.
 *
 * For each ARMED mandate:
 *   - Any signal with lastUpdated older than REFRESH_INTERVAL → tick(mandateId)
 *   - All signals triggered → executeIfReady(mandateId)
 *
 * Runs one independent loop per chain (testnet + mainnet) when both are configured.
 * Exposes a health endpoint on PORT (default 3001) for Railway.
 *
 * Env:
 *   PRIVATE_KEY              deployer key (no 0x). Absent → read-only (no txs).
 *   LICTOR_ADDRESS          testnet Lictor (chainId 50312)
 *   LICTOR_MAINNET_ADDRESS  mainnet Lictor (chainId 5031)
 *   SOMNIA_TESTNET_RPC / SOMNIA_MAINNET_RPC   RPC overrides
 *   TESTNET_DEPLOY_BLOCK / MAINNET_DEPLOY_BLOCK   log scan start blocks
 */
import * as http from "http";
import {
  createPublicClient,
  createWalletClient,
  http as viemHttp,
  parseAbi,
  type Address,
  type PublicClient,
  type WalletClient,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

// ─── Chain targets ──────────────────────────────────────────────────────────

type Target = {
  key: string;
  chain: Chain;
  lictor: Address;
  deployBlock: bigint;
};

function makeChain(id: number, name: string, symbol: string, rpc: string): Chain {
  return {
    id,
    name,
    nativeCurrency: { name: symbol, symbol, decimals: 18 },
    rpcUrls: { default: { http: [rpc] }, public: { http: [rpc] } },
  };
}

function buildTargets(): Target[] {
  const targets: Target[] = [];

  const testnetLictor = process.env.LICTOR_ADDRESS as Address | undefined;
  if (testnetLictor) {
    targets.push({
      key: "testnet",
      chain: makeChain(50312, "Somnia Shannon Testnet", "STT",
        process.env.SOMNIA_TESTNET_RPC ?? "https://api.infra.testnet.somnia.network"),
      lictor: testnetLictor,
      deployBlock: BigInt(process.env.TESTNET_DEPLOY_BLOCK ?? process.env.DEPLOY_BLOCK ?? "401410492"),
    });
  }

  const mainnetLictor = process.env.LICTOR_MAINNET_ADDRESS as Address | undefined;
  if (mainnetLictor) {
    targets.push({
      key: "mainnet",
      chain: makeChain(5031, "Somnia", "SOMI",
        process.env.SOMNIA_MAINNET_RPC ?? "https://api.infra.mainnet.somnia.network"),
      lictor: mainnetLictor,
      deployBlock: BigInt(process.env.MAINNET_DEPLOY_BLOCK ?? "328480687"),
    });
  }

  return targets;
}

// ─── ABI (minimal surface — only what the keeper calls) ──────────────────────

const LICTOR_ABI = parseAbi([
  "event MandateArmed(uint256 indexed mandateId, uint256 signalCount, bool conjunctive)",
  "function getMandate(uint256 mandateId) external view returns ((address owner, string thesis, uint256 budgetWei, (uint8 sourceType, string sourceUrl, string parseSelector, uint8 comparator, uint256 threshold, uint8 decimals, uint256 latestValue, uint256 lastUpdated, bool triggered, uint256 lastRequestId)[] signals, bool conjunctive, address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, uint8 status, uint256 createdAt, uint256 triggeredAt, uint256 executedAt))",
  "function getSignals(uint256 mandateId) external view returns ((uint8 sourceType, string sourceUrl, string parseSelector, uint8 comparator, uint256 threshold, uint8 decimals, uint256 latestValue, uint256 lastUpdated, bool triggered, uint256 lastRequestId)[])",
  "function tick(uint256 mandateId) external",
  "function executeIfReady(uint256 mandateId) external",
]);

// ─── Config ──────────────────────────────────────────────────────────────────

const PRIVATE_KEY      = (process.env.PRIVATE_KEY ?? "") as string;
const PORT             = parseInt(process.env.PORT ?? "3001", 10);
const POLL_INTERVAL_MS = 60_000;
const REFRESH_INTERVAL_S = 5 * 60; // mirror of contract REFRESH_INTERVAL
const STATUS_ARMED     = 1;        // MandateStatus.ARMED (enum: PENDING,ARMED,TRIGGERED,EXECUTING,EXECUTED,FAILED)

// ─── Health state ──────────────────────────────────────────────────────────

const health: Record<string, { lastRun: number; mandatesChecked: number }> = {};

// ─── Per-target keeper ───────────────────────────────────────────────────────

type SignalTuple = { lastUpdated: bigint; triggered: boolean };
type MandateTuple = { status: number };

async function discoverArmedMandateIds(pub: PublicClient, t: Target): Promise<Set<bigint>> {
  const latest = await pub.getBlockNumber();
  const logs = await pub.getLogs({
    address: t.lictor,
    event: LICTOR_ABI.find((x) => x.type === "event" && x.name === "MandateArmed") as never,
    fromBlock: t.deployBlock,
    toBlock: latest,
  });
  const ids = new Set<bigint>();
  for (const log of logs) {
    const args = (log as { args?: { mandateId?: bigint } }).args;
    if (args?.mandateId !== undefined) ids.add(args.mandateId);
  }
  return ids;
}

async function runOnce(t: Target, pub: PublicClient, wallet: WalletClient): Promise<void> {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] [${t.key}] keeper tick`);

  const ids = await discoverArmedMandateIds(pub, t);
  console.log(`  [${t.key}] found ${ids.size} mandate(s)`);
  let checked = 0;

  for (const mandateId of ids) {
    try {
      const mandate = await pub.readContract({
        address: t.lictor, abi: LICTOR_ABI, functionName: "getMandate", args: [mandateId],
      }) as MandateTuple;

      if (mandate.status !== STATUS_ARMED) continue;
      checked++;

      const signals = await pub.readContract({
        address: t.lictor, abi: LICTOR_ABI, functionName: "getSignals", args: [mandateId],
      }) as unknown as SignalTuple[];

      const nowSec = BigInt(Math.floor(Date.now() / 1000));
      const stale = signals.filter((s) => nowSec - s.lastUpdated >= BigInt(REFRESH_INTERVAL_S));
      const allTriggered = signals.length > 0 && signals.every((s) => s.triggered);

      if (stale.length > 0) {
        console.log(`  [${t.key}] mandate ${mandateId}: ${stale.length} stale → tick()`);
        try {
          const hash = await wallet.writeContract({
            address: t.lictor, abi: LICTOR_ABI, functionName: "tick", args: [mandateId], chain: t.chain,
          } as never);
          console.log(`    [${t.key}] tick tx: ${hash}`);
        } catch (e) {
          console.warn(`    [${t.key}] tick failed (non-fatal): ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`);
        }
      } else if (allTriggered) {
        console.log(`  [${t.key}] mandate ${mandateId}: all triggered → executeIfReady()`);
        try {
          const hash = await wallet.writeContract({
            address: t.lictor, abi: LICTOR_ABI, functionName: "executeIfReady", args: [mandateId], chain: t.chain,
          } as never);
          console.log(`    [${t.key}] executeIfReady tx: ${hash}`);
        } catch (e) {
          console.warn(`    [${t.key}] executeIfReady failed (non-fatal): ${(e instanceof Error ? e.message : String(e)).slice(0, 120)}`);
        }
      } else {
        console.log(`  [${t.key}] mandate ${mandateId}: ${signals.filter((s) => s.triggered).length}/${signals.length} triggered — waiting`);
      }
    } catch (e) {
      console.error(`  [${t.key}] mandate ${mandateId}: ERROR (skipping): ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`);
    }
  }

  health[t.key] = { lastRun: Date.now(), mandatesChecked: checked };
  console.log(`  [${t.key}] done. checked ${checked} in ${Date.now() - start}ms\n`);
}

function startTargetLoop(t: Target): void {
  const pub = createPublicClient({ chain: t.chain, transport: viemHttp() });

  if (!PRIVATE_KEY) {
    console.warn(`[${t.key}] PRIVATE_KEY not set — read-only, no transactions.`);
    return;
  }
  const account = privateKeyToAccount(`0x${PRIVATE_KEY.replace(/^0x/, "")}`);
  const wallet = createWalletClient({ account, chain: t.chain, transport: viemHttp() });

  const tick = () => runOnce(t, pub, wallet).catch((e) =>
    console.error(`[${t.key}] loop error: ${e instanceof Error ? e.message : String(e)}`));
  tick();
  setInterval(tick, POLL_INTERVAL_MS);
}

// ─── Health endpoint ──────────────────────────────────────────────────────────

function startHealthServer(): void {
  http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", chains: health }));
    } else {
      res.writeHead(404);
      res.end();
    }
  }).listen(PORT, () => console.log(`Health endpoint on port ${PORT}`));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  const targets = buildTargets();
  console.log(`Lictor Keeper starting`);
  console.log(`  Targets: ${targets.map((t) => `${t.key}(${t.chain.id})`).join(", ") || "(none)"}`);
  console.log(`  Interval: ${POLL_INTERVAL_MS / 1000}s\n`);

  startHealthServer(); // always reachable, even with no targets / read-only

  if (targets.length === 0) {
    console.warn("No Lictor addresses configured — nothing to poll.");
    return;
  }
  for (const t of targets) startTargetLoop(t);
}

main();
