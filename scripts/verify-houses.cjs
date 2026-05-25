const hre = require("hardhat");
const fs = require("node:fs/promises");
const path = require("node:path");

async function verifyContract(name, address, constructorArguments) {
  try {
    console.log(`Verifying ${name} at ${address}...`);
    await hre.run("verify:verify", { address, constructorArguments });
    console.log(`${name} verified.`);
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    if (message.toLowerCase().includes("already verified")) {
      console.log(`${name} already verified.`);
      return;
    }
    throw error;
  }
}

async function main() {
  if (!process.env.BASESCAN_API_KEY) {
    throw new Error("Set BASESCAN_API_KEY in .env before verifying contracts.");
  }

  const manifestPath = path.join(process.cwd(), "deployments", `${hre.network.name}.json`);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

  await verifyContract(
    "ElderValleyHouses",
    manifest.houses.address,
    manifest.houses.constructorArguments
  );

  await verifyContract(
    "ElderValleyHouseMarketplace",
    manifest.marketplace.address,
    manifest.marketplace.constructorArguments
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
