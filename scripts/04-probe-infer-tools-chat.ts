// Probe 4 (retry 3): inferToolsChat with correct interface
// Corrected: string[] roles/messages, mcpServerUrls, maxIterations parameters added.
// rawData from callback is abi.encode(finishReason, firstToolCall bytes).
import hre from "hardhat";
import {
  parseEther,
  decodeAbiParameters,
  parseEventLogs,
  type Abi,
  type Account,
} from "viem";

type ProbeCompletedArgs = {
  requestId: bigint;
  kind: number;
  success: boolean;
  rawData: `0x${string}`;
};

const PLATFORM_ADDRESS = "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776" as const;
const RECEIPT_BASE = "https://receipts.testnet.agents.somnia.host?requestId=";
const PROBE_VALUE = parseEther("0.3"); // extra headroom — more complex inference
const TIMEOUT_MS = 900_000; // 15 min (heavier inference)

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
    throw new Error("Set PROBE_ADDRESS env var (redeploy with script 01 first — interface changed)");
  }

  const artifact = await hre.artifacts.readArtifact("Day0Probe");
  const abi = artifact.abi as Abi;
  const publicClient = await hre.viem.getPublicClient();
  const [wallet] = await hre.viem.getWalletClients();
  const account = (wallet.account as Account).address;

  console.log(`Probe 4 (retry 3): inferToolsChat — corrected interface`);
  console.log(`  roles/messages: string[]`);
  console.log(`  added: mcpServerUrls (empty), maxIterations=1, chainOfThought=false`);
  console.log(`Sending ${Number(PROBE_VALUE) / 1e18} STT to probeInferToolsChat()...`);

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
        const typed = logs as unknown as Array<{ args: ProbeCompletedArgs }>;
        const match = typed.find((l) => l.args.kind === 2);
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
    functionName: "probeInferToolsChat",
    value: PROBE_VALUE,
    account,
  } as unknown as Parameters<typeof wallet.writeContract>[0]);
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

  console.log(`\nWaiting for ProbeCompleted callback (up to ${TIMEOUT_MS / 60_000} min)...`);
  const { requestId: callbackRequestId, success, rawData } = await watchPromise;

  console.log(`\n═══════════════════════════════════════`);
  console.log(`PROBE 4 RESULT`);
  console.log(`  requestId: ${callbackRequestId}`);
  console.log(`  success:   ${success}`);
  console.log(`  rawData:   ${rawData ?? "0x (empty)"}`);

  if (!success) {
    console.log(`\nRESULT: ✗ FAILED — ResponseStatus was not Success`);
    console.log(`  inferToolsChat is still not reachable with this interface.`);
    const finalRequestId = callbackRequestId ?? requestId;
    if (finalRequestId) console.log(`  Receipt: ${RECEIPT_BASE}${finalRequestId}`);
    console.log(`═══════════════════════════════════════`);
    process.exit(1);
  }

  // rawData is abi.encode(finishReason, firstToolCall) — set by handleResponse in probe contract
  if (!rawData || rawData === "0x") {
    console.log(`\nRESULT: ⚠ SUCCESS status but empty rawData`);
    console.log(`  The callback fired but the decode in handleResponse produced nothing.`);
    console.log(`  Manual inspection needed.`);
    console.log(`═══════════════════════════════════════`);
    process.exit(1);
  }

  try {
    const [finishReason, firstToolCall] = decodeAbiParameters(
      [{ type: "string" }, { type: "bytes" }],
      rawData
    ) as [string, `0x${string}`];

    console.log(`\n  finishReason:    "${finishReason}"`);
    console.log(`  firstToolCall:   ${firstToolCall || "0x (empty)"}`);

    const finalRequestId = callbackRequestId ?? requestId;
    if (finalRequestId) console.log(`  Receipt URL: ${RECEIPT_BASE}${finalRequestId}`);

    if (finishReason === "tool_calls" && firstToolCall && firstToolCall !== "0x") {
      console.log(`\nRESULT: ✓ PASS — inferToolsChat is live and yielded calldata`);
      console.log(`  → Proceed to Task B: update Lictor.sol execution path.`);
    } else if (finishReason === "tool_calls") {
      console.log(`\nRESULT: ⚠ PARTIAL — finishReason="tool_calls" but pendingToolCalls was empty`);
      console.log(`  → LLM did not issue a tool call. Prompt may need tuning.`);
    } else {
      console.log(`\nRESULT: ⚠ PARTIAL — decoded but finishReason="${finishReason}"`);
      console.log(`  → inferToolsChat responded but did not trigger a tool call.`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`\nRESULT: ⚠ Could not decode rawData as (string, bytes): ${msg}`);
    console.log(`  The handleResponse fallback may have stored the raw 6-tuple.`);
    console.log(`  Attempting fallback decode as 6-tuple...`);
    try {
      const [finishReason,,,,, pendingToolCalls] = decodeAbiParameters(
        [
          { type: "string" },
          { type: "string" },
          { type: "string[]" },
          { type: "string[]" },
          { type: "string[]" },
          { type: "bytes[]" },
        ],
        rawData
      ) as [string, string, string[], string[], string[], `0x${string}`[]];
      console.log(`  6-tuple decoded:`);
      console.log(`    finishReason:    "${finishReason}"`);
      console.log(`    pendingToolCalls.length: ${pendingToolCalls.length}`);
      if (pendingToolCalls.length > 0) {
        console.log(`    pendingToolCalls[0]: ${pendingToolCalls[0]}`);
      }
    } catch {
      console.log(`  Fallback decode also failed. Raw hex logged above.`);
    }
  }

  console.log(`═══════════════════════════════════════`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(`\nFAILED: ${e.message}`);
    process.exit(1);
  });
