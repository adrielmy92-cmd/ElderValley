const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account. Set PRIVATE_KEY in .env before deploying.");
  }

  const treasury = process.env.TREASURY_ADDRESS;
  if (!treasury || !hre.ethers.isAddress(treasury)) {
    throw new Error("Set a valid TREASURY_ADDRESS in .env before deploying.");
  }

  const feeBps = Number(process.env.MARKETPLACE_FEE_BPS || "250");
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 1000) {
    throw new Error("MARKETPLACE_FEE_BPS must be an integer from 0 to 1000.");
  }

  console.log("Deploying ElderValley contracts");
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("Treasury:", treasury);

  const Houses = await hre.ethers.getContractFactory("ElderValleyHouses");
  const houses = await Houses.deploy(treasury);
  await houses.waitForDeployment();
  const housesAddress = await houses.getAddress();
  console.log("ElderValleyHouses:", housesAddress);

  const Marketplace = await hre.ethers.getContractFactory("ElderValleyHouseMarketplace");
  const marketplace = await Marketplace.deploy(housesAddress, treasury, feeBps);
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("ElderValleyHouseMarketplace:", marketplaceAddress);

  console.log("");
  console.log("Add these to Railway after deploy:");
  console.log(`ELDERVALLEY_HOUSES_CONTRACT=${housesAddress}`);
  console.log(`ELDERVALLEY_MARKETPLACE_CONTRACT=${marketplaceAddress}`);
  console.log(`ELDERVALLEY_CHAIN_ID=8453`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
