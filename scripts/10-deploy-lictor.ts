// Deploy Lictor.sol to Somnia (testnet 50312 or mainnet 5031).
// Usage: npx hardhat run scripts/10-deploy-lictor.ts --network somnia_testnet
//        npx hardhat run scripts/10-deploy-lictor.ts --network somnia_mainnet
import hre from "hardhat";

const PLATFORM_BY_CHAIN: Record<number, `0x${string}`> = {
  50312: "0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776", // Shannon testnet
  5031:  "0x5E5205CF39E766118C01636bED000A54D93163E6", // Somnia mainnet
};

async function main() {
  const publicClient = await hre.viem.getPublicClient();
  const [wallet] = await hre.viem.getWalletClients();

  const chainId = await publicClient.getChainId();
  const platform = PLATFORM_BY_CHAIN[chainId];
  if (!platform) throw new Error(`No platform address configured for chainId ${chainId}`);

  const deployer = wallet.account!.address;
  console.log(`Deploying Lictor from ${deployer}...`);
  console.log(`Chain:    ${chainId}`);
  console.log(`Platform: ${platform}`);

  const artifact = await hre.artifacts.readArtifact("Lictor");

  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [platform],
  });

  console.log(`Deploy tx: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log(`─────────────────────────────────────────`);
  console.log(`Lictor deployed:`);
  console.log(`  address:  ${receipt.contractAddress}`);
  console.log(`  txHash:   ${hash}`);
  console.log(`  block:    ${receipt.blockNumber}`);
  console.log(`  gasUsed:  ${receipt.gasUsed}`);
  console.log(`─────────────────────────────────────────`);
  const explorer = chainId === 5031
    ? "https://explorer.somnia.network"
    : "https://shannon-explorer.somnia.network";
  console.log(`Explorer: ${explorer}/address/${receipt.contractAddress}`);
  const envKey = chainId === 5031 ? "LICTOR_MAINNET_ADDRESS" : "LICTOR_ADDRESS";
  console.log(`\nNext: add to .env → ${envKey}=${receipt.contractAddress}`);
  console.log(`Deploy block: ${receipt.blockNumber}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(`\nFAILED: ${e.message}`);
    process.exit(1);
  });
