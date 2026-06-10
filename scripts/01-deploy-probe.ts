import hre from "hardhat";

async function main() {
  const publicClient = await hre.viem.getPublicClient();
  const [wallet] = await hre.viem.getWalletClients();

  const artifact = await hre.artifacts.readArtifact("Day0Probe");

  console.log(`Deploying Day0Probe from ${wallet.account.address}...`);

  const hash = await wallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode as `0x${string}`,
    args: [],
  });

  console.log(`Deploy tx: ${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) throw new Error("Deploy failed: no contract address in receipt");

  console.log("─────────────────────────────────────────");
  console.log(`Day0Probe deployed:`);
  console.log(`  address:  ${receipt.contractAddress}`);
  console.log(`  txHash:   ${hash}`);
  console.log(`  block:    ${receipt.blockNumber}`);
  console.log(`  gasUsed:  ${receipt.gasUsed}`);
  console.log("─────────────────────────────────────────");
  console.log(`Next: add to .env → PROBE_ADDRESS=${receipt.contractAddress}`);
  console.log(`Fund it with at least 1 STT before running probes.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
