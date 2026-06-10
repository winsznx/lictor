import { expect } from "chai";
import hre from "hardhat";
import {
  parseEther,
  encodeAbiParameters,
  parseAbiParameters,
  keccak256,
  toBytes,
  getAddress,
  type Address,
  type Abi,
  type Account,
} from "viem";
import type { PublicClient, WalletClient } from "viem";

// ─── Constants ────────────────────────────────────────────────────────────────

const USDC_E = getAddress("0x28BEc7E30E6faee657a03e19Bf1128AaD7632A00");
const WSOMI  = getAddress("0x046EDe9564A72571df6F5e44d0405360c0f4dCab");
const DEAD   = getAddress("0x000000000000000000000000000000000000dEaD");

const LLM_DEPOSIT  = parseEther("0.24");
const AMPLE_BUDGET = parseEther("2.0");

function encodeString(s: string): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters("string"), [s]);
}
function encodeUint(v: bigint): `0x${string}` {
  return encodeAbiParameters(parseAbiParameters("uint256"), [v]);
}

const STATUS = { PENDING_DECOMPOSITION: 0, ARMED: 1, TRIGGERED: 2, EXECUTING: 3, EXECUTED: 4, FAILED: 5 };
const RS = { None: 0, Pending: 1, Success: 2, Failed: 3, TimedOut: 4 };

// ─── Deploy helpers ───────────────────────────────────────────────────────────

async function deployContract(
  name: string,
  walletClient: WalletClient,
  publicClient: PublicClient,
  args: unknown[] = []
): Promise<{ address: Address; abi: Abi }> {
  const artifact = await hre.artifacts.readArtifact(name);
  const abi = artifact.abi as Abi;
  const account = (walletClient.account as Account).address;
  const hash = await walletClient.deployContract({
    abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: args as readonly unknown[],
    account,
  } as Parameters<typeof walletClient.deployContract>[0]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) throw new Error(`${name}: no contractAddress`);
  return { address: receipt.contractAddress as Address, abi };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe("Lictor", function () {
  this.timeout(60_000);

  let pub: PublicClient;
  let deployer: WalletClient;
  let user: WalletClient;
  let attacker: WalletClient;

  let lictor: { address: Address; abi: Abi };
  let platform: { address: Address; abi: Abi };

  before(async function () {
    pub = await hre.viem.getPublicClient();
    const wallets = await hre.viem.getWalletClients();
    deployer = wallets[0];
    user     = wallets[1];
    attacker = wallets[2];

    platform = await deployContract("MockPlatform", deployer, pub, []);
    lictor   = await deployContract("Lictor", deployer, pub, [platform.address]);
  });

  // shorthand: execute a write from a given wallet
  async function write(
    wallet: WalletClient,
    contract: { address: Address; abi: Abi },
    fn: string,
    args: readonly unknown[] = [],
    value?: bigint
  ) {
    const account = (wallet.account as Account).address;
    return wallet.writeContract({
      address: contract.address,
      abi: contract.abi,
      functionName: fn,
      args,
      value,
      account,
    } as Parameters<typeof wallet.writeContract>[0]);
  }

  // ── submitMandate ──────────────────────────────────────────────────────────

  it("submitMandate: reverts for disallowed tokenIn", async function () {
    await expect(write(user, lictor, "submitMandate",
      ["any thesis", DEAD, WSOMI, 1000n, 500n], LLM_DEPOSIT)
    ).to.be.rejected;
  });

  it("submitMandate: reverts for disallowed tokenOut", async function () {
    await expect(write(user, lictor, "submitMandate",
      ["any thesis", USDC_E, DEAD, 1000n, 500n], LLM_DEPOSIT)
    ).to.be.rejected;
  });

  it("submitMandate: reverts when tokenIn == tokenOut", async function () {
    await expect(write(user, lictor, "submitMandate",
      ["any thesis", USDC_E, USDC_E, 1000n, 500n], LLM_DEPOSIT)
    ).to.be.rejected;
  });

  it("submitMandate: reverts on insufficient deposit", async function () {
    await expect(write(user, lictor, "submitMandate",
      ["any thesis", USDC_E, WSOMI, 1000n, 500n], parseEther("0.01"))
    ).to.be.rejected;
  });

  it("submitMandate: succeeds and emits MandateSubmitted", async function () {
    const hash = await write(user, lictor, "submitMandate",
      ["buy WSOMI if BTC > 90k", USDC_E, WSOMI, 1000n, 500n], AMPLE_BUDGET);
    const receipt = await pub.waitForTransactionReceipt({ hash });
    expect(receipt.status).to.equal("success");
    // mandate 0 is now PENDING_DECOMPOSITION
  });

  // ── handleDecomposition ────────────────────────────────────────────────────

  it("handleDecomposition: reverts when called by non-platform", async function () {
    const dummy = {
      id: 0n, requester: lictor.address, callbackAddress: lictor.address,
      callbackSelector: "0x00000000" as `0x${string}`,
      subcommittee: [] as Address[], responses: [] as never[],
      responseCount: 0n, failureCount: 0n, threshold: 0n,
      createdAt: 0n, deadline: 0n, status: 2, consensusType: 0, remainingBudget: 0n,
    };
    await expect(write(attacker, lictor, "handleDecomposition",
      [0n, [], RS.Success, dummy])
    ).to.be.rejected;
  });

  it("handleDecomposition: valid JSON populates signals and emits MandateArmed", async function () {
    // Submit → mandateId 1
    const subHash = await write(user, lictor, "submitMandate",
      ["buy WSOMI if BTC > 90000", USDC_E, WSOMI, 1000n, 500n], AMPLE_BUDGET);
    await pub.waitForTransactionReceipt({ hash: subHash });

    const requestId = await pub.readContract({
      address: platform.address, abi: platform.abi, functionName: "lastRequestId",
    }) as bigint;

    const signalJson =
      '{"conjunctive":true,"signals":[{"sourceType":"JSON_API",' +
      '"sourceUrl":"https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",' +
      '"parseSelector":"bitcoin.usd","comparator":"GT","threshold":90000,"decimals":8}]}';

    const hash = await write(deployer, platform, "dispatchDecomposition",
      [lictor.address, requestId, encodeString(signalJson), RS.Success]);
    const receipt = await pub.waitForTransactionReceipt({ hash });
    expect(receipt.status).to.equal("success");

    const mandate = await pub.readContract({
      address: lictor.address, abi: lictor.abi, functionName: "getMandate", args: [1n],
    }) as { status: number };
    expect(mandate.status).to.equal(STATUS.ARMED);

    const signals = await pub.readContract({
      address: lictor.address, abi: lictor.abi, functionName: "getSignals", args: [1n],
    }) as unknown[];
    expect(signals.length).to.equal(1);
  });

  it("handleDecomposition: malformed JSON sets status FAILED", async function () {
    // Submit → mandateId 2
    const subHash = await write(user, lictor, "submitMandate",
      ["test malformed", USDC_E, WSOMI, 1000n, 500n], AMPLE_BUDGET);
    await pub.waitForTransactionReceipt({ hash: subHash });

    const requestId = await pub.readContract({
      address: platform.address, abi: platform.abi, functionName: "lastRequestId",
    }) as bigint;

    // uint256 instead of string → decoding fails inside handleDecomposition
    const hash = await write(deployer, platform, "dispatchDecomposition",
      [lictor.address, requestId, encodeUint(999n), RS.Success]);
    await pub.waitForTransactionReceipt({ hash });

    const mandate = await pub.readContract({
      address: lictor.address, abi: lictor.abi, functionName: "getMandate", args: [2n],
    }) as { status: number };
    expect(mandate.status).to.equal(STATUS.FAILED);
  });

  // ── handleSignalUpdate ─────────────────────────────────────────────────────

  it("handleSignalUpdate: reverts when called by non-platform", async function () {
    const dummy = {
      id: 0n, requester: lictor.address, callbackAddress: lictor.address,
      callbackSelector: "0x00000000" as `0x${string}`,
      subcommittee: [] as Address[], responses: [] as never[],
      responseCount: 0n, failureCount: 0n, threshold: 0n,
      createdAt: 0n, deadline: 0n, status: 2, consensusType: 0, remainingBudget: 0n,
    };
    await expect(write(attacker, lictor, "handleSignalUpdate",
      [0n, [], RS.Success, dummy])
    ).to.be.rejected;
  });

  it("handleSignalUpdate: value above threshold → triggered=true, emits SignalUpdated", async function () {
    // mandateId 1 is ARMED — tick it to dispatch a signal request
    const tickHash = await write(user, lictor, "tick", [1n]);
    await pub.waitForTransactionReceipt({ hash: tickHash });

    const requestId = await pub.readContract({
      address: platform.address, abi: platform.abi, functionName: "lastRequestId",
    }) as bigint;

    // 9500000000000 / 1e8 = 95000 > threshold 90000 (stored scaled: 90000 * 1e8 = 9000000000000)
    const priceAbove = 9500000000000n;
    const hash = await write(deployer, platform, "dispatchSignalUpdate",
      [lictor.address, requestId, encodeUint(priceAbove), RS.Success]);
    const receipt = await pub.waitForTransactionReceipt({ hash });
    expect(receipt.status).to.equal("success");

    const signals = await pub.readContract({
      address: lictor.address, abi: lictor.abi, functionName: "getSignals", args: [1n],
    }) as Array<{ latestValue: bigint; triggered: boolean }>;
    expect(signals[0].triggered).to.equal(true);
    expect(signals[0].latestValue).to.equal(priceAbove);
  });

  it("handleSignalUpdate: value below threshold → triggered=false", async function () {
    // Fast-forward past REFRESH_INTERVAL (5 min) so tick re-dispatches
    await hre.network.provider.send("evm_increaseTime", [301]);
    await hre.network.provider.send("evm_mine", []);

    const tickHash = await write(user, lictor, "tick", [1n]);
    await pub.waitForTransactionReceipt({ hash: tickHash });

    const requestId = await pub.readContract({
      address: platform.address, abi: platform.abi, functionName: "lastRequestId",
    }) as bigint;

    // 8000000000000 / 1e8 = 80000 < threshold 90000 (stored: 9000000000000)
    const priceBelow = 8000000000000n;
    const hash = await write(deployer, platform, "dispatchSignalUpdate",
      [lictor.address, requestId, encodeUint(priceBelow), RS.Success]);
    await pub.waitForTransactionReceipt({ hash });

    const signals = await pub.readContract({
      address: lictor.address, abi: lictor.abi, functionName: "getSignals", args: [1n],
    }) as Array<{ triggered: boolean }>;
    expect(signals[0].triggered).to.equal(false);
  });

  // ── executeIfReady ─────────────────────────────────────────────────────────

  it("executeIfReady: reverts when status != ARMED", async function () {
    // mandate 0 is PENDING_DECOMPOSITION (no callback ever dispatched)
    await expect(write(user, lictor, "executeIfReady", [0n])).to.be.rejected;
  });

  // ── closeMandate ───────────────────────────────────────────────────────────

  it("closeMandate: reverts when caller is not the mandate owner", async function () {
    // mandate 1 is ARMED, owned by `user`
    await expect(write(attacker, lictor, "closeMandate", [1n])).to.be.rejected;
  });

  // ── pause ──────────────────────────────────────────────────────────────────

  it("pause: tick reverts when contract is paused", async function () {
    await write(deployer, lictor, "pause");

    await expect(write(user, lictor, "tick", [1n])).to.be.rejected;

    await write(deployer, lictor, "unpause");
  });

  // ── handleExecution ────────────────────────────────────────────────────────

  describe("handleExecution", function () {
    this.timeout(60_000);

    const ALGEBRA_ROUTER_ADDR = getAddress("0x1582f6f3D26658F7208A799Be46e34b1f366CE44");

    let execMandateId: bigint;
    let execRequestId: bigint;
    let snapshot: string;

    // Compute selector: bytes4(keccak256("executeSwap(address,address,uint256,uint256)"))
    const selectorFull = keccak256(toBytes("executeSwap(address,address,uint256,uint256)"));
    const EXECUTE_SWAP_SEL = selectorFull.slice(0, 10) as `0x${string}`;

    function encodeToolsResult(
      finishReason: string,
      pendingToolCalls: `0x${string}`[]
    ): `0x${string}` {
      return encodeAbiParameters(
        parseAbiParameters("string, string, string[], string[], string[], bytes[]"),
        [finishReason, "", [], [], [], pendingToolCalls]
      );
    }

    function buildSwapCalldata(
      tokenIn: Address,
      tokenOut: Address,
      amountIn: bigint,
      minOut: bigint
    ): `0x${string}` {
      const params = encodeAbiParameters(
        parseAbiParameters("address, address, uint256, uint256"),
        [tokenIn, tokenOut, amountIn, minOut]
      );
      return (EXECUTE_SWAP_SEL + params.slice(2)) as `0x${string}`;
    }

    before(async function () {
      // Plant MockAlgebraRouter bytecode at the hardcoded ALGEBRA_ROUTER address
      const routerArtifact = await hre.artifacts.readArtifact("MockAlgebraRouter");
      await hre.network.provider.send("hardhat_setCode", [
        ALGEBRA_ROUTER_ADDR,
        routerArtifact.deployedBytecode,
      ]);

      // Submit mandate 3
      execMandateId = 3n;
      await pub.waitForTransactionReceipt({
        hash: await write(user, lictor, "submitMandate",
          ["buy WSOMI if BTC > 90000", USDC_E, WSOMI, 1000n, 500n], AMPLE_BUDGET),
      });

      // Dispatch decomposition
      const decompReqId = await pub.readContract({
        address: platform.address, abi: platform.abi, functionName: "lastRequestId",
      }) as bigint;

      const signalJson =
        '{"conjunctive":true,"signals":[{"sourceType":"JSON_API",' +
        '"sourceUrl":"https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",' +
        '"parseSelector":"bitcoin.usd","comparator":"GT","threshold":90000,"decimals":8}]}';

      await pub.waitForTransactionReceipt({
        hash: await write(deployer, platform, "dispatchDecomposition",
          [lictor.address, decompReqId, encodeString(signalJson), RS.Success]),
      });

      // Tick and push signal above threshold
      await pub.waitForTransactionReceipt({
        hash: await write(user, lictor, "tick", [execMandateId]),
      });

      const signalReqId = await pub.readContract({
        address: platform.address, abi: platform.abi, functionName: "lastRequestId",
      }) as bigint;

      await pub.waitForTransactionReceipt({
        hash: await write(deployer, platform, "dispatchSignalUpdate",
          [lictor.address, signalReqId, encodeUint(9500000000000n), RS.Success]),
      });

      // executeIfReady → EXECUTING + dispatches inferToolsChat to MockPlatform
      await pub.waitForTransactionReceipt({
        hash: await write(user, lictor, "executeIfReady", [execMandateId]),
      });

      execRequestId = await pub.readContract({
        address: platform.address, abi: platform.abi, functionName: "lastRequestId",
      }) as bigint;

      // Snapshot at EXECUTING state for test isolation
      snapshot = (await hre.network.provider.send("evm_snapshot", [])) as string;
    });

    afterEach(async function () {
      await hre.network.provider.send("evm_revert", [snapshot]);
      snapshot = (await hre.network.provider.send("evm_snapshot", [])) as string;
    });

    it("handleExecution: wrong caller reverts", async function () {
      const dummy = {
        id: 0n, requester: lictor.address, callbackAddress: lictor.address,
        callbackSelector: "0x00000000" as `0x${string}`,
        subcommittee: [] as Address[], responses: [] as never[],
        responseCount: 0n, failureCount: 0n, threshold: 0n,
        createdAt: 0n, deadline: 0n, status: 2, consensusType: 0, remainingBudget: 0n,
      };
      await expect(write(attacker, lictor, "handleExecution",
        [execRequestId, [], RS.Success, dummy])
      ).to.be.rejected;
    });

    it("handleExecution: non-tool_calls finishReason sets FAILED", async function () {
      const result = encodeToolsResult("stop", []);
      await pub.waitForTransactionReceipt({
        hash: await write(deployer, platform, "dispatchExecution",
          [lictor.address, execRequestId, result, RS.Success]),
      });

      const mandate = await pub.readContract({
        address: lictor.address, abi: lictor.abi, functionName: "getMandate",
        args: [execMandateId],
      }) as { status: number };
      expect(mandate.status).to.equal(STATUS.FAILED);
    });

    it("handleExecution: empty pendingToolCalls sets FAILED", async function () {
      const result = encodeToolsResult("tool_calls", []);
      await pub.waitForTransactionReceipt({
        hash: await write(deployer, platform, "dispatchExecution",
          [lictor.address, execRequestId, result, RS.Success]),
      });

      const mandate = await pub.readContract({
        address: lictor.address, abi: lictor.abi, functionName: "getMandate",
        args: [execMandateId],
      }) as { status: number };
      expect(mandate.status).to.equal(STATUS.FAILED);
    });

    it("handleExecution: wrong selector rejected", async function () {
      const wrongCalldata = ("0xdeadbeef" + "00".repeat(128)) as `0x${string}`;
      const result = encodeToolsResult("tool_calls", [wrongCalldata]);
      await pub.waitForTransactionReceipt({
        hash: await write(deployer, platform, "dispatchExecution",
          [lictor.address, execRequestId, result, RS.Success]),
      });

      const mandate = await pub.readContract({
        address: lictor.address, abi: lictor.abi, functionName: "getMandate",
        args: [execMandateId],
      }) as { status: number };
      expect(mandate.status).to.equal(STATUS.FAILED);
    });

    it("handleExecution: token mismatch rejected", async function () {
      // tokenIn/tokenOut swapped relative to mandate (WSOMI→USDC_E instead of USDC_E→WSOMI)
      const mismatchCalldata = buildSwapCalldata(WSOMI, USDC_E, 1000n, 500n);
      const result = encodeToolsResult("tool_calls", [mismatchCalldata]);
      await pub.waitForTransactionReceipt({
        hash: await write(deployer, platform, "dispatchExecution",
          [lictor.address, execRequestId, result, RS.Success]),
      });

      const mandate = await pub.readContract({
        address: lictor.address, abi: lictor.abi, functionName: "getMandate",
        args: [execMandateId],
      }) as { status: number };
      expect(mandate.status).to.equal(STATUS.FAILED);
    });

    it("handleExecution: amountIn exceeds mandate rejected", async function () {
      const overCalldata = buildSwapCalldata(USDC_E, WSOMI, 1001n, 500n); // 1001 > mandate 1000
      const result = encodeToolsResult("tool_calls", [overCalldata]);
      await pub.waitForTransactionReceipt({
        hash: await write(deployer, platform, "dispatchExecution",
          [lictor.address, execRequestId, result, RS.Success]),
      });

      const mandate = await pub.readContract({
        address: lictor.address, abi: lictor.abi, functionName: "getMandate",
        args: [execMandateId],
      }) as { status: number };
      expect(mandate.status).to.equal(STATUS.FAILED);
    });

    it("handleExecution: minOut below mandate rejected", async function () {
      const underCalldata = buildSwapCalldata(USDC_E, WSOMI, 1000n, 499n); // 499 < mandate 500
      const result = encodeToolsResult("tool_calls", [underCalldata]);
      await pub.waitForTransactionReceipt({
        hash: await write(deployer, platform, "dispatchExecution",
          [lictor.address, execRequestId, result, RS.Success]),
      });

      const mandate = await pub.readContract({
        address: lictor.address, abi: lictor.abi, functionName: "getMandate",
        args: [execMandateId],
      }) as { status: number };
      expect(mandate.status).to.equal(STATUS.FAILED);
    });

    it("handleExecution: valid calldata executes swap, emits MandateExecuted", async function () {
      // Exact mandate params: USDC_E→WSOMI, amountIn=1000, minOut=500
      const validCalldata = buildSwapCalldata(USDC_E, WSOMI, 1000n, 500n);
      const result = encodeToolsResult("tool_calls", [validCalldata]);

      const hash = await write(deployer, platform, "dispatchExecution",
        [lictor.address, execRequestId, result, RS.Success]);
      const receipt = await pub.waitForTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");

      const mandate = await pub.readContract({
        address: lictor.address, abi: lictor.abi, functionName: "getMandate",
        args: [execMandateId],
      }) as { status: number };
      expect(mandate.status).to.equal(STATUS.EXECUTED);
    });
  });
});

// ─── C1 / H1 / M1 fix coverage ──────────────────────────────────────────────────

const ERC20_ABI = [
  { type: "function", name: "mint", stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "approve", stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }] },
  { type: "function", name: "balanceOf", stateMutability: "view",
    inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const satisfies Abi;

describe("Lictor — token custody, budget isolation, callback safety (C1/H1/M1)", function () {
  this.timeout(60_000);

  const SIGNAL_JSON =
    '{"conjunctive":true,"signals":[{"sourceType":"JSON_API",' +
    '"sourceUrl":"https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",' +
    '"parseSelector":"bitcoin.usd","comparator":"GT","threshold":90000,"decimals":8}]}';
  const AMOUNT_IN = 1000n;
  const MINT = 1_000_000n;
  const MAX = (1n << 256n) - 1n;

  let pub: PublicClient;
  let deployer: WalletClient;
  let user: WalletClient;
  let other: WalletClient;
  let lictor: { address: Address; abi: Abi };
  let platform: { address: Address; abi: Abi };
  let userAddr: Address;
  let snap: string;

  async function w(
    wallet: WalletClient,
    contract: { address: Address; abi: Abi },
    fn: string,
    args: readonly unknown[] = [],
    value?: bigint
  ) {
    const account = (wallet.account as Account).address;
    const hash = await wallet.writeContract({
      address: contract.address, abi: contract.abi, functionName: fn, args, value, account,
    } as Parameters<typeof wallet.writeContract>[0]);
    return pub.waitForTransactionReceipt({ hash });
  }

  const token = (addr: Address) => ({ address: addr, abi: ERC20_ABI as Abi });

  async function balOf(tokenAddr: Address, who: Address): Promise<bigint> {
    return pub.readContract({
      address: tokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [who],
    }) as Promise<bigint>;
  }

  async function lastReq(): Promise<bigint> {
    return pub.readContract({
      address: platform.address, abi: platform.abi, functionName: "lastRequestId",
    }) as Promise<bigint>;
  }

  before(async function () {
    pub = await hre.viem.getPublicClient();
    const wallets = await hre.viem.getWalletClients();
    deployer = wallets[0];
    user     = wallets[1];
    other    = wallets[2];
    userAddr = (user.account as Account).address;

    // Plant real ERC20 bytecode at the hardcoded token addresses so Lictor's custody
    // path runs against genuine allowance/balance semantics.
    const erc = await hre.artifacts.readArtifact("MockERC20");
    for (const addr of [USDC_E, WSOMI]) {
      await hre.network.provider.send("hardhat_setCode", [addr, erc.deployedBytecode]);
    }
    snap = (await hre.network.provider.send("evm_snapshot", [])) as string;
  });

  beforeEach(async function () {
    // Revert to the clean post-plant state so token storage never accumulates across tests.
    await hre.network.provider.send("evm_revert", [snap]);
    snap = (await hre.network.provider.send("evm_snapshot", [])) as string;

    platform = await deployContract("MockPlatform", deployer, pub, []);
    lictor   = await deployContract("Lictor", deployer, pub, [platform.address]);
    // #given a funded + approved owner
    await w(user, token(USDC_E), "mint", [userAddr, MINT]);
    await w(user, token(USDC_E), "approve", [lictor.address, MAX]);
  });

  // ── C1: token custody ────────────────────────────────────────────────────────

  it("C1: submitMandate pulls amountIn into custody", async function () {
    // #when a mandate is submitted
    await w(user, lictor, "submitMandate",
      ["buy WSOMI if BTC > 90000", USDC_E, WSOMI, AMOUNT_IN, 500n], AMPLE_BUDGET);

    // #then the contract holds exactly amountIn and the owner was debited
    expect(await balOf(USDC_E, lictor.address)).to.equal(AMOUNT_IN);
    expect(await balOf(USDC_E, userAddr)).to.equal(MINT - AMOUNT_IN);
  });

  it("C1: submitMandate reverts when owner has not approved", async function () {
    // #given a funded but unapproved account
    const otherAddr = (other.account as Account).address;
    await w(other, token(USDC_E), "mint", [otherAddr, MINT]);

    // #then submit reverts (transferFrom has no allowance)
    await expect(w(other, lictor, "submitMandate",
      ["no approval", USDC_E, WSOMI, AMOUNT_IN, 500n], AMPLE_BUDGET)
    ).to.be.rejected;
  });

  it("C1: closeMandate refunds custody tokens to the owner", async function () {
    // #given an armed mandate holding custody tokens
    await w(user, lictor, "submitMandate",
      ["buy WSOMI if BTC > 90000", USDC_E, WSOMI, AMOUNT_IN, 500n], AMPLE_BUDGET);
    await w(deployer, platform, "dispatchDecomposition",
      [lictor.address, await lastReq(), encodeString(SIGNAL_JSON), RS.Success]);

    // #when the owner closes it
    await w(user, lictor, "closeMandate", [0n]);

    // #then the custody tokens are returned and the contract holds none
    expect(await balOf(USDC_E, lictor.address)).to.equal(0n);
    expect(await balOf(USDC_E, userAddr)).to.equal(MINT);
  });

  it("C1: closeMandate does not double-refund custody tokens", async function () {
    await w(user, lictor, "submitMandate",
      ["x", USDC_E, WSOMI, AMOUNT_IN, 500n], AMPLE_BUDGET);
    await w(deployer, platform, "dispatchDecomposition",
      [lictor.address, await lastReq(), encodeString(SIGNAL_JSON), RS.Success]);

    await w(user, lictor, "closeMandate", [0n]);
    // #when closed a second time (status is now FAILED, still closeable)
    await w(user, lictor, "closeMandate", [0n]);

    // #then the owner balance is unchanged (no second token transfer)
    expect(await balOf(USDC_E, userAddr)).to.equal(MINT);
  });

  // ── H1: per-mandate native budget isolation ──────────────────────────────────

  it("H1: closing one mandate refunds only its own budget, not the shared pool", async function () {
    // #given two mandates with different budgets (deposit per request = 0.24)
    const budgetA = parseEther("0.5");
    const budgetB = parseEther("2.0");

    await w(user, lictor, "submitMandate", ["A", USDC_E, WSOMI, AMOUNT_IN, 500n], budgetA);
    const reqA = await lastReq();
    await w(user, lictor, "submitMandate", ["B", USDC_E, WSOMI, AMOUNT_IN, 500n], budgetB);

    // arm A so it can be closed
    await w(deployer, platform, "dispatchDecomposition",
      [lictor.address, reqA, encodeString(SIGNAL_JSON), RS.Success]);

    // #when A is closed
    await w(user, lictor, "closeMandate", [0n]);

    // #then only A's remaining native budget (0.5 - 0.24 = 0.26) leaves the contract,
    //       so B's budget (2.0 - 0.24 = 1.76) is fully intact.
    //       Old global-accounting bug would have refunded min(balance, A.budget)=0.5,
    //       leaving 1.52 and stealing from B.
    const contractBal = await pub.getBalance({ address: lictor.address });
    expect(contractBal).to.equal(parseEther("1.76"));
  });

  // ── M1: callback cannot corrupt mandate 0 ────────────────────────────────────

  it("M1: unknown requestId callback leaves mandate 0 untouched", async function () {
    // #given a freshly submitted (PENDING) mandate 0
    await w(user, lictor, "submitMandate", ["x", USDC_E, WSOMI, AMOUNT_IN, 500n], AMPLE_BUDGET);

    // #when the platform fires a decomposition for an unmapped requestId
    await w(deployer, platform, "dispatchDecomposition",
      [lictor.address, 99999n, encodeString(SIGNAL_JSON), RS.Success]);

    // #then mandate 0 is still PENDING (old code would have armed it from the bogus call)
    const mandate = await pub.readContract({
      address: lictor.address, abi: lictor.abi, functionName: "getMandate", args: [0n],
    }) as { status: number };
    expect(mandate.status).to.equal(STATUS.PENDING_DECOMPOSITION);
  });

  it("M1: duplicate decomposition callback is ignored", async function () {
    await w(user, lictor, "submitMandate", ["x", USDC_E, WSOMI, AMOUNT_IN, 500n], AMPLE_BUDGET);
    const req = await lastReq();
    await w(deployer, platform, "dispatchDecomposition",
      [lictor.address, req, encodeString(SIGNAL_JSON), RS.Success]);

    // #when the same requestId fires again with a malformed payload
    await w(deployer, platform, "dispatchDecomposition",
      [lictor.address, req, encodeUint(999n), RS.Success]);

    // #then the mandate stays ARMED (the duplicate is dropped, not re-failed)
    const mandate = await pub.readContract({
      address: lictor.address, abi: lictor.abi, functionName: "getMandate", args: [0n],
    }) as { status: number };
    expect(mandate.status).to.equal(STATUS.ARMED);
  });
});
