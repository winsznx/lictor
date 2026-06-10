// Probe 3: validates inferString returns parseable structured JSON
// Calls probeInferString() → watches for ProbeCompleted → prints raw LLM response
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
const PROBE_VALUE = parseEther("0.24"); // covers getRequestDeposit() + 0.07*3
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

  console.log(`Probe 3: inferString — structured JSON output`);
  console.log(`Sending ${Number(PROBE_VALUE) / 1e18} STT to probeInferString()...`);

  // Watch BEFORE sending to avoid missing callback
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
        // Filter to INFER_STRING kind (1) only — avoids picking up JSON_API events
        const typed = logs as unknown as Array<{ args: ProbeCompletedArgs }>;
        const match = typed.find((l) => l.args.kind === 1);
        if (match) {
          clearTimeout(timer);
          unwatch();
          resolve(match.args);
        }
      },
      onError: (err) => {
        console.error("Watch error:", err.message);
      },
    });
  });

  const hash = await wallet.writeContract({
    address: probeAddress,
    abi,
    functionName: "probeInferString",
    value: PROBE_VALUE,
  });
  console.log(`Probe tx: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Mined: block ${receipt.blockNumber}  gasUsed: ${receipt.gasUsed}`);

  const platformLogs = parseEventLogs({
    abi: [REQUEST_CREATED_EVENT],
    logs: receipt.logs.filter(
      (l) => l.address.toLowerCase() === PLATFORM_ADDRESS.toLowerCase()
    ),
    eventName: "RequestCreated",
  });
  if (platformLogs.length > 0) {
    requestId = platformLogs[0].args.requestId;
    console.log(`Request ID: ${requestId}`);
    console.log(`Receipt URL: ${RECEIPT_BASE}${requestId}`);
  }

  console.log(`\nWaiting for ProbeCompleted callback (up to 10 min)...`);
  const { requestId: callbackRequestId, success, rawData } = await watchPromise;
  console.log(`\n═══════════════════════════════════════`);
  console.log(`PROBE 3 COMPLETED`);
  console.log(`  requestId: ${callbackRequestId}`);
  console.log(`  success:   ${success}`);

  if (success && rawData && rawData !== "0x") {
    // inferString returns `string memory` → result is abi.encode(string)
    try {
      const [text] = decodeAbiParameters([{ type: "string" }], rawData);
      console.log(`\nRaw LLM response:`);
      console.log(`  "${text}"`);

      // Validate: is it parseable JSON?
      try {
        const parsed = JSON.parse(text);
        console.log(`\nParsed JSON:`);
        console.log(JSON.stringify(parsed, null, 2));
        const hasSignals = Array.isArray(parsed?.signals);
        console.log(`\nASSUMPTION 3 (inferString returns parseable JSON):`);
        if (hasSignals) {
          console.log(`  ✓ CONFIRMED — signals array present, schema matches`);
        } else {
          console.log(`  ⚠ PARTIAL — valid JSON but schema differs from expected`);
          console.log(`  → May need to adjust decomposition prompt in PRD §4.5`);
        }
      } catch {
        console.log(`\nASSUMPTION 3: ✗ FAILED — LLM returned non-JSON or wrapped text`);
        console.log(`  → System prompt adjustment needed before Phase 1 decompose step`);
      }
    } catch (e) {
      console.log(`  Could not decode as string. Raw hex: ${rawData}`);
      console.log(`  → inferString return encoding may differ from expected`);
    }
  } else {
    console.log(`  rawData: ${rawData}`);
    if (!success) {
      console.log(`\nDISCREPANCY: Request came back failed or timed out.`);
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
