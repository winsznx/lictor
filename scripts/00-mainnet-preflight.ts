/**
 * Mainnet preflight — gates all mainnet operations.
 * Verifies deployer balance, token balances, and that the DEX + agent infra
 * actually has bytecode on Somnia mainnet (chainId 5031) before we spend gas.
 *
 * Usage: npx hardhat run scripts/00-mainnet-preflight.ts --network somnia_mainnet
 */
import hre from "hardhat";
import { formatUnits, type Account } from "viem";

const PLATFORM_MAINNET = "0x5E5205CF39E766118C01636bED000A54D93163E6" as const;
const ALGEBRA_ROUTER   = "0x1582f6f3D26658F7208A799Be46e34b1f366CE44" as const;
const ALGEBRA_DEPLOYER = "0x0361B4883FfD676BB0a4642B3139D38A33e452f5" as const;
const QUOTER_V2        = "0xcB68373404a835268D3ED76255C8148578A82b77" as const;
const USDC_E           = "0x28BEc7E30E6faee657a03e19Bf1128AaD7632A00" as const;
const WSOMI            = "0x046EDe9564A72571df6F5e44d0405360c0f4dCab" as const;

const ERC20_BALANCE_ABI = [{
  type: "function", name: "balanceOf", stateMutability: "view",
  inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }],
}, {
  type: "function", name: "decimals", stateMutability: "view",
  inputs: [], outputs: [{ name: "", type: "uint8" }],
}, {
  type: "function", name: "symbol", stateMutability: "view",
  inputs: [], outputs: [{ name: "", type: "string" }],
}] as const;

async function codePresent(pub: { getCode: (a: { address: `0x${string}` }) => Promise<`0x${string}` | undefined> }, address: `0x${string}`): Promise<boolean> {
  const code = await pub.getCode({ address });
  return !!code && code !== "0x";
}

async function main() {
  const pub = await hre.viem.getPublicClient();
  const [wallet] = await hre.viem.getWalletClients();
  const account = (wallet.account as Account).address;
  const chainId = await pub.getChainId();

  console.log(`\n${"═".repeat(64)}`);
  console.log(`LICTOR — MAINNET PREFLIGHT`);
  console.log(`${"─".repeat(64)}`);
  console.log(`  Chain:   ${chainId} ${chainId === 5031 ? "(Somnia mainnet ✓)" : "✗ WRONG CHAIN"}`);
  console.log(`  Wallet:  ${account}`);

  const somi = await pub.getBalance({ address: account });
  const gasPrice = await pub.getGasPrice();
  console.log(`  SOMI:    ${formatUnits(somi, 18)}`);
  console.log(`  GasPrice: ${formatUnits(gasPrice, 9)} gwei`);

  // Deploy on testnet used ~62M gas. Estimate mainnet deploy cost + headroom.
  const DEPLOY_GAS = 65_000_000n;
  const estDeployCost = gasPrice * DEPLOY_GAS;
  const E2E_BUDGET = 1_500_000_000_000_000_000n; // 1.5 SOMI mandate budget
  const estTotalNeeded = estDeployCost + E2E_BUDGET;
  console.log(`\n  Est. deploy cost:  ${formatUnits(estDeployCost, 18)} SOMI (${DEPLOY_GAS} gas)`);
  console.log(`  E2E mandate budget: ${formatUnits(E2E_BUDGET, 18)} SOMI`);
  console.log(`  Est. total needed:  ${formatUnits(estTotalNeeded, 18)} SOMI`);

  // ── Token balances ──────────────────────────────────────────────────────────
  console.log(`\n  Token balances:`);
  const tokens: { name: string; addr: `0x${string}` }[] = [
    { name: "USDC.e", addr: USDC_E },
    { name: "WSOMI",  addr: WSOMI },
  ];
  let usdceBal = 0n;
  let usdceDecimals = 6;
  for (const t of tokens) {
    const present = await codePresent(pub, t.addr);
    if (!present) {
      console.log(`    ${t.name.padEnd(8)} ✗ NO CODE at ${t.addr}`);
      continue;
    }
    const [bal, dec, sym] = await Promise.all([
      pub.readContract({ address: t.addr, abi: ERC20_BALANCE_ABI, functionName: "balanceOf", args: [account] }) as Promise<bigint>,
      pub.readContract({ address: t.addr, abi: ERC20_BALANCE_ABI, functionName: "decimals" }) as Promise<number>,
      pub.readContract({ address: t.addr, abi: ERC20_BALANCE_ABI, functionName: "symbol" }) as Promise<string>,
    ]);
    console.log(`    ${t.name.padEnd(8)} ${formatUnits(bal, dec)} ${sym} (${dec} dec)`);
    if (t.name === "USDC.e") { usdceBal = bal; usdceDecimals = dec; }
  }

  // ── Infra code presence ───────────────────────────────────────────────────────
  console.log(`\n  Infra bytecode:`);
  const infra: { name: string; addr: `0x${string}` }[] = [
    { name: "Platform (mainnet)", addr: PLATFORM_MAINNET },
    { name: "Algebra Router",     addr: ALGEBRA_ROUTER },
    { name: "Algebra Deployer",   addr: ALGEBRA_DEPLOYER },
    { name: "QuoterV2",           addr: QUOTER_V2 },
  ];
  const infraResults: Record<string, boolean> = {};
  for (const c of infra) {
    const present = await codePresent(pub, c.addr);
    infraResults[c.name] = present;
    console.log(`    ${c.name.padEnd(20)} ${present ? "✓ deployed" : "✗ NO CODE"}  ${c.addr}`);
  }

  // ── Gate decisions ────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(64)}`);
  console.log(`  GATE STATUS`);
  const canDeploy = somi >= estDeployCost;
  const canRunE2E = somi >= estTotalNeeded && usdceBal > 0n;
  console.log(`    Deploy (Task D):  ${canDeploy ? "✓ sufficient SOMI" : `✗ INSUFFICIENT — need ~${formatUnits(estDeployCost, 18)}, have ${formatUnits(somi, 18)}`}`);
  console.log(`    QuoterV2 (Task B): ${infraResults["QuoterV2"] ? "✓ present" : "✗ NOT FOUND — quotes will fail, fallback to 1n"}`);
  console.log(`    E2E swap (Task H): ${canRunE2E ? "✓ ready" : `✗ BLOCKED — USDC.e balance: ${formatUnits(usdceBal, usdceDecimals)}, SOMI sufficient: ${somi >= estTotalNeeded}`}`);
  console.log(`${"═".repeat(64)}\n`);

  // Machine-readable summary line for downstream parsing
  console.log(`PREFLIGHT_JSON=${JSON.stringify({
    chainId,
    account,
    somi: somi.toString(),
    gasPrice: gasPrice.toString(),
    usdceBal: usdceBal.toString(),
    quoterPresent: infraResults["QuoterV2"] ?? false,
    routerPresent: infraResults["Algebra Router"] ?? false,
    platformPresent: infraResults["Platform (mainnet)"] ?? false,
    canDeploy,
    canRunE2E,
  })}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(`\nPREFLIGHT FAILED: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
