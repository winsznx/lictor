/**
 * Probe Algebra Integral Quoter/QuoterV2 on Somnia mainnet.
 * Tries several candidate ABIs for quoteExactInputSingle and reports which returns
 * data + the live USDC.e→WSOMI quote.
 *
 * Usage: npx hardhat run scripts/23-test-quoter.ts --network somnia_mainnet
 */
import hre from "hardhat";
import {
  formatUnits, encodeAbiParameters, parseAbiParameters,
  decodeAbiParameters, toFunctionSelector,
} from "viem";

const QUOTER_V2        = "0xcB68373404a835268D3ED76255C8148578A82b77" as const;
const ALGEBRA_DEPLOYER = "0x0361B4883FfD676BB0a4642B3139D38A33e452f5" as const;
const USDC_E           = "0x28BEc7E30E6faee657a03e19Bf1128AaD7632A00" as const;
const WSOMI            = "0x046EDe9564A72571df6F5e44d0405360c0f4dCab" as const;

const AMOUNT_IN = 1_000_000n; // 1 USDC.e (6 dec)

type Candidate = {
  name: string;
  sig: string;
  encode: () => `0x${string}`;
};

const candidates: Candidate[] = [
  {
    name: "flat: (tokenIn,tokenOut,deployer,amountIn,limitSqrtPrice)",
    sig: "quoteExactInputSingle(address,address,address,uint256,uint160)",
    encode: () => encodeAbiParameters(
      parseAbiParameters("address,address,address,uint256,uint160"),
      [USDC_E, WSOMI, ALGEBRA_DEPLOYER, AMOUNT_IN, 0n]
    ),
  },
  {
    name: "flat: (tokenIn,tokenOut,amountIn,limitSqrtPrice)",
    sig: "quoteExactInputSingle(address,address,uint256,uint160)",
    encode: () => encodeAbiParameters(
      parseAbiParameters("address,address,uint256,uint160"),
      [USDC_E, WSOMI, AMOUNT_IN, 0n]
    ),
  },
  {
    name: "struct: ((tokenIn,tokenOut,deployer,amountIn,limitSqrtPrice))",
    sig: "quoteExactInputSingle((address,address,address,uint256,uint160))",
    encode: () => encodeAbiParameters(
      parseAbiParameters("(address,address,address,uint256,uint160)"),
      [[USDC_E, WSOMI, ALGEBRA_DEPLOYER, AMOUNT_IN, 0n]]
    ),
  },
  {
    name: "path: quoteExactInput(bytes,uint256)",
    sig: "quoteExactInput(bytes,uint256)",
    encode: () => encodeAbiParameters(
      parseAbiParameters("bytes,uint256"),
      [(USDC_E + WSOMI.slice(2)) as `0x${string}`, AMOUNT_IN]
    ),
  },
];

async function main() {
  const pub = await hre.viem.getPublicClient();
  console.log(`Quoter: ${QUOTER_V2}\nIn:     ${formatUnits(AMOUNT_IN, 6)} USDC.e\n`);

  function tryDecodeAmount(raw: string, label: string): boolean {
    if (!raw || raw === "0x" || raw.length < 66) return false;
    try {
      const [amountOut] = decodeAbiParameters(
        parseAbiParameters("uint256"), ("0x" + raw.slice(2, 66)) as `0x${string}`
      );
      const minOut = ((amountOut as bigint) * 9950n) / 10000n;
      console.log(`    ${label} amountOut word0: ${formatUnits(amountOut as bigint, 18)} WSOMI (raw ${amountOut})`);
      console.log(`    minOut@.5%: ${formatUnits(minOut, 18)} WSOMI`);
      return (amountOut as bigint) > 0n;
    } catch { return false; }
  }

  for (const c of candidates) {
    const selector = toFunctionSelector(c.sig);
    const data = (selector + c.encode().slice(2)) as `0x${string}`;
    try {
      const raw = await pub.request({ method: "eth_call", params: [{ to: QUOTER_V2, data }, "latest"] }) as string;
      console.log(`RETURN ${c.name} [${selector}] bytes=${(raw.length - 2) / 2}`);
      if (tryDecodeAmount(raw, "return")) { console.log(`\nWORKING_SIG=${c.sig}\nWORKING_SELECTOR=${selector}\nMODE=return`); return; }
    } catch (e) {
      const err = e as { data?: string; cause?: { data?: string; cause?: { data?: string } }; details?: string };
      const revertData = err.data ?? err.cause?.data ?? err.cause?.cause?.data ?? "";
      console.log(`REVERT ${c.name} [${selector}] data=${revertData ? (revertData.length - 2) / 2 + "b" : "none"} ${err.details ?? ""}`);
      if (revertData && tryDecodeAmount(revertData, "revert")) { console.log(`\nWORKING_SIG=${c.sig}\nWORKING_SELECTOR=${selector}\nMODE=revert`); return; }
    }
  }
  console.log("\nNo candidate ABI returned a usable quote.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(`\nFAILED: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
