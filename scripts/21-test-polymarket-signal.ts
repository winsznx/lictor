/**
 * Task A — validate Polymarket gamma-api as a Somnia JSON API signal source.
 * Deploys JsonProbe, fires fetchUint against a live Polymarket market and a Coinbase
 * fallback, waits for the validator callbacks, and prints raw results + working selector.
 *
 * Usage: npx hardhat run scripts/21-test-polymarket-signal.ts --network somnia_testnet
 */
import hre from "hardhat";
import { parseEther, parseEventLogs, formatUnits, type Abi, type Account } from "viem";

const TIMEOUT_MS = 4 * 60_000;

async function pickPolymarketSlug(): Promise<string> {
  // Find a live, liquid market so the URL resolves for the validators.
  const res = await fetch("https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=1&order=volumeNum&ascending=false");
  const arr = await res.json() as Array<{ slug?: string; bestAsk?: number }>;
  if (!arr.length || !arr[0].slug) throw new Error("no live Polymarket market found");
  return arr[0].slug;
}

async function main() {
  const pub = await hre.viem.getPublicClient();
  const [wallet] = await hre.viem.getWalletClients();
  const account = (wallet.account as Account).address;
  const PLATFORM = "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776";

  const slug = await pickPolymarketSlug();
  const pmUrl = `https://gamma-api.polymarket.com/markets?slug=${slug}`;
  console.log(`Polymarket live slug: ${slug}`);
  console.log(`URL: ${pmUrl}\n`);

  const art = await hre.artifacts.readArtifact("JsonProbe");
  const abi = art.abi as Abi;
  const deployHash = await wallet.deployContract({ abi, bytecode: art.bytecode as `0x${string}`, args: [PLATFORM] });
  const deployRcpt = await pub.waitForTransactionReceipt({ hash: deployHash });
  const probe = deployRcpt.contractAddress as `0x${string}`;
  console.log(`JsonProbe deployed: ${probe}\n`);

  // Fund the probe so it can pay the agent deposit on each call.
  await pub.waitForTransactionReceipt({
    hash: await wallet.sendTransaction({ to: probe, value: parseEther("0.6"), account } as never),
  });

  const cases: { label: string; url: string; selector: string; decimals: number }[] = [
    { label: "Polymarket 0.bestAsk",     url: pmUrl, selector: "0.bestAsk",       decimals: 4 },
    { label: "Polymarket 0.lastTradePrice", url: pmUrl, selector: "0.lastTradePrice", decimals: 4 },
    { label: "Coinbase data.amount (fallback)", url: "https://api.coinbase.com/v2/prices/BTC-USD/spot", selector: "data.amount", decimals: 0 },
  ];

  const pending: { label: string; requestId: bigint; decimals: number }[] = [];
  const deposit = parseEther("0.12");

  for (const c of cases) {
    try {
      const hash = await wallet.writeContract({
        address: probe, abi, functionName: "probe", args: [c.url, c.selector, c.decimals], value: deposit, account,
      } as never);
      const rcpt = await pub.waitForTransactionReceipt({ hash });
      const logs = parseEventLogs({
        abi: [{ type: "event", name: "RequestCreated", inputs: [
          { name: "requestId", type: "uint256", indexed: true },
          { name: "agentId", type: "uint256", indexed: true },
          { name: "perAgentBudget", type: "uint256", indexed: false },
          { name: "payload", type: "bytes", indexed: false },
          { name: "subcommittee", type: "address[]", indexed: false },
        ]}],
        logs: rcpt.logs.filter((l) => l.address.toLowerCase() === PLATFORM.toLowerCase()),
        eventName: "RequestCreated",
      });
      const requestId = logs[0]?.args.requestId as bigint;
      console.log(`→ ${c.label}: requestId ${requestId}`);
      pending.push({ label: c.label, requestId, decimals: c.decimals });
    } catch (e) {
      console.log(`✗ ${c.label}: dispatch failed — ${(e instanceof Error ? e.message : String(e)).slice(0, 100)}`);
    }
  }

  console.log(`\nWaiting for callbacks (up to ${TIMEOUT_MS / 60_000} min)...\n`);
  const seen = new Set<string>();
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => { unwatch(); resolve(); }, TIMEOUT_MS);
    const unwatch = pub.watchContractEvent({
      address: probe, abi, eventName: "Result" as never, pollingInterval: 4000,
      onLogs: (ls) => {
        for (const l of ls) {
          const a = (l as { args?: Record<string, unknown> }).args ?? {};
          const rid = (a.requestId as bigint)?.toString();
          if (!rid || seen.has(rid)) continue;
          seen.add(rid);
          const match = pending.find((p) => p.requestId.toString() === rid);
          const label = match?.label ?? rid;
          const ok = a.success as boolean;
          const value = a.value as bigint;
          const dec = match?.decimals ?? 0;
          console.log(`✓ ${label}`);
          console.log(`    status: ${a.status}  success: ${ok}`);
          if (ok) console.log(`    value: ${value} (= ${formatUnits(value, dec)} at ${dec} dec)`);
          if (seen.size >= pending.length) { clearTimeout(timer); unwatch(); resolve(); }
        }
      },
    });
  });

  console.log(`\nDone. ${seen.size}/${pending.length} callbacks received.`);
  console.log(`Probe: ${probe}`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(`\nFAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
