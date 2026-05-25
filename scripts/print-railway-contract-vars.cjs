const fs = require("node:fs/promises");
const path = require("node:path");

async function main() {
  const manifestPath = path.join(process.cwd(), "deployments", "base.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

  if (!manifest.houses || !manifest.marketplace) {
    throw new Error("deployments/base.json is missing houses or marketplace deployment data.");
  }

  console.log("Copy these variables to Railway:");
  console.log("");
  console.log(`ELDERVALLEY_CHAIN_ID=${manifest.chainId}`);
  console.log(`ELDERVALLEY_HOUSES_CONTRACT=${manifest.houses.address}`);
  console.log(`ELDERVALLEY_MARKETPLACE_CONTRACT=${manifest.marketplace.address}`);
  console.log(`ELDERVALLEY_HOUSE_INDEXER_START_BLOCK=${manifest.houses.deploymentBlock || 0}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
