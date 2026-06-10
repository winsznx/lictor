// Probe 1+2: validates async round-trip AND deposit math
// Calls probeJsonApi() → watches for ProbeCompleted → decodes BTC/USD price (uint256)
import hre from "hardhat";
import {
  parseEther,
  decodeAbiParameters,
  parseEventLogs,
  type Abi,
} from "viem";

type ProbeCompletedArgs = {
  requestId: bigint;
  kind: number;
  success: boolean;
  rawData: `0x${string}`;
};

const PLATFORM_ADDRESS = "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776" as const;
const RECEIPT_BASE = "https://receipts.testnet.agents.somnia.host?requestId=";
const PROBE_VALUE = parseEther("0.12"); // covers getRequestDeposit() + 0.03*3
const TIMEOUT_MS = 600_000; // 10 min

const REQUEST_CREATED_EVENT = {
  type: "event",
  name: "RequestCreated",
  inputs: [
    { name: "requestId", type: "uint256", indexed: true },
    { name: "agentId", type: "uint256", indexed: true },
    { name: "perAgentBudget", type: "uint256", indexed: false },
    { name: "payload", type: "bytes", indexed: false },
    { name: "subcommittee", type: "address[]", indexed: false },
  ],
} as const;

async function main() {
  const probeAddress = (process.env.PROBE_ADDRESS || process.argv[2]) as `0x${string}` | undefined;
  if (!probeAddress || probeAddress === "0x...") {
    throw new Error("Set PROBE_ADDRESS env var (deploy with script 01 first)");
  }

  const artifact = await hre.artifacts.readArtifact("Day0Probe");
  const abi = artifact.abi as Abi;
  const publicClient = await hre.viem.getPublicClient();
  const [wallet] = await hre.viem.getWalletClients();

  // Read current deposit requirement from platform before sending
  const platformAbi = [
    { type: "function", name: "getRequestDeposit", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  ] as const;
  const baseDeposit = await publicClient.readContract({
    address: PLATFORM_ADDRESS,
    abi: platformAbi,
    functionName: "getRequestDeposit",
  });
  console.log(`Platform base deposit: ${baseDeposit} wei (${Number(baseDeposit) / 1e18} STT)`);
  console.log(`Expected total: ${baseDeposit + parseEther("0.09")} wei (base + 0.03*3)`);
  console.log(`Sending: ${PROBE_VALUE} wei (0.12 STT)`);

  // Start watching BEFORE sending tx — avoids missing the callback event
  let requestId: bigint | undefined;
  const watchPromise = new Promise<ProbeCompletedArgs>((resolve, reject) => {
    const timer = setTimeout(() => {
      unwatch();
      reject(new Error(`Timeout: no ProbeCompleted within ${TIMEOUT_MS / 60_000} minutes`));
    }, TIMEOUT_MS);

    const unwatch = publicClient.watchContractEvent({
      address: probeAddress,
      abi,
      eventName: "ProbeCompleted",
      pollingInterval: 3_000,
      onLogs: (logs) => {
        if (logs.length > 0) {
          clearTimeout(timer);
          unwatch();
          // Decoded args come back as `unknown` when ABI is dynamically typed — cast is intentional
          resolve((logs[0] as unknown as { args: ProbeCompletedArgs }).args);
        }
      },
      onError: (err) => {
        console.error("Watch error:", err.message);
      },
    });
  });

  console.log(`\nCalling probeJsonApi() on ${probeAddress}...`);
  const hash = await wallet.writeContract({
    address: probeAddress,
    abi,
    functionName: "probeJsonApi",
    value: PROBE_VALUE,
  });
  console.log(`Probe tx: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Mined: block ${receipt.blockNumber}  gasUsed: ${receipt.gasUsed}`);

  // Extract requestId from platform's RequestCreated event in the same tx
  const platformLogs = parseEventLogs({
    abi: [REQUEST_CREATED_EVENT],
    logs: receipt.logs.filter(
      (l) => l.address.toLowerCase() === PLATFORM_ADDRESS.toLowerCase()
    ),
    eventName: "RequestCreated",
  });
  if (platformLogs.length > 0) {
    requestId = platformLogs[0].args.requestId;
    const perAgentBudget = platformLogs[0].args.perAgentBudget;
    console.log(`Request ID: ${requestId}`);
    console.log(`Per-agent budget: ${perAgentBudget} wei (${Number(perAgentBudget) / 1e18} STT)`);
    console.log(`Receipt URL: ${RECEIPT_BASE}${requestId}`);
  } else {
    console.warn("No RequestCreated event found on platform — check platform address");
  }

  console.log(`\nWaiting for ProbeCompleted callback (up to 10 min)...`);
  const { requestId: callbackRequestId, success, rawData } = await watchPromise;
  console.log(`\n═══════════════════════════════════════`);
  console.log(`PROBE COMPLETED`);
  console.log(`  requestId: ${callbackRequestId}`);
  console.log(`  success:   ${success}`);

  if (success && rawData && rawData !== "0x") {
    // fetchUint returns uint256 → result is abi.encode(uint256)
    const [price] = decodeAbiParameters([{ type: "uint256" }], rawData);
    console.log(`  BTC/USD:   $${price} (raw uint256, decimals=0)`);
    console.log(`\nASSUMPTION 1 (round-trip): ✓ CONFIRMED`);
    console.log(`ASSUMPTION 2 (deposit math): ✓ CONFIRMED — 0.12 STT was sufficient`);
  } else {
    console.log(`  rawData: ${rawData}`);
    if (!success) {
      console.log(`\nDISCREPANCY: Request came back failed or timed out.`);
      console.log(`  → Check: is deposit math correct? Does CoinGecko endpoint work?`);
    }
  }

  const finalRequestId = callbackRequestId ?? requestId;
  if (finalRequestId) {
    console.log(`\nReceipt URL: ${RECEIPT_BASE}${finalRequestId}`);
  }
  console.log(`═══════════════════════════════════════`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(`\nFAILED: ${e.message}`);
    process.exit(1);
  });
