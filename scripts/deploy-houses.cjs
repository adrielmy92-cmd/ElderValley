const hre = require("hardhat");
const fs = require("node:fs/promises");
const path = require("node:path");

async function waitForDeployment(contract, name) {
  const tx = contract.deploymentTransaction();
  const receipt = tx ? await tx.wait() : null;
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  const deploymentBlock = receipt ? receipt.blockNumber : null;
  console.log(`${name}:`, address);
  if (deploymentBlock) {
    console.log(`${name} deployment block:`, deploymentBlock);
  }

  return { address, deploymentBlock };
}

async function verifyContract(name, address, constructorArguments) {
  try {
    console.log(`Verifying ${name} on BaseScan...`);
    await hre.run("verify:verify", { address, constructorArguments });
    console.log(`${name} verified.`);
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    if (message.toLowerCase().includes("already verified")) {
      console.log(`${name} already verified.`);
      return;
    }
    console.warn(`${name} verification failed: ${message}`);
    console.warn("Deploy is still valid. Run npm run contracts:verify:base after BaseScan indexes the bytecode.");
  }
}

async function saveDeploymentManifest(manifest) {
  const deploymentsDir = path.join(process.cwd(), "deployments");
  await fs.mkdir(deploymentsDir, { recursive: true });
  const filePath = path.join(deploymentsDir, `${manifest.network}.json`);
  await fs.writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("Deployment manifest saved:", filePath);
}

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
  const housesDeployment = await waitForDeployment(houses, "ElderValleyHouses");

  const Marketplace = await hre.ethers.getContractFactory("ElderValleyHouseMarketplace");
  const marketplace = await Marketplace.deploy(housesDeployment.address, treasury, feeBps);
  const marketplaceDeployment = await waitForDeployment(marketplace, "ElderValleyHouseMarketplace");

  const network = await hre.ethers.provider.getNetwork();
  const manifest = {
    network: hre.network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    treasury,
    marketplaceFeeBps: feeBps,
    houses: {
      address: housesDeployment.address,
      deploymentBlock: housesDeployment.deploymentBlock,
      constructorArguments: [treasury]
    },
    marketplace: {
      address: marketplaceDeployment.address,
      deploymentBlock: marketplaceDeployment.deploymentBlock,
      constructorArguments: [housesDeployment.address, treasury, feeBps]
    }
  };

  await saveDeploymentManifest(manifest);

  if (process.env.VERIFY_CONTRACTS === "true") {
    if (!process.env.BASESCAN_API_KEY) {
      console.warn("VERIFY_CONTRACTS=true, but BASESCAN_API_KEY is missing. Skipping verification.");
    } else {
      await verifyContract("ElderValleyHouses", housesDeployment.address, [treasury]);
      await verifyContract(
        "ElderValleyHouseMarketplace",
        marketplaceDeployment.address,
        [housesDeployment.address, treasury, feeBps]
      );
    }
  }

  console.log("");
  console.log("Add these to Railway after deploy:");
  console.log(`ELDERVALLEY_HOUSES_CONTRACT=${housesDeployment.address}`);
  console.log(`ELDERVALLEY_MARKETPLACE_CONTRACT=${marketplaceDeployment.address}`);
  console.log(`ELDERVALLEY_CHAIN_ID=${Number(network.chainId)}`);
  if (housesDeployment.deploymentBlock) {
    console.log(`ELDERVALLEY_HOUSE_INDEXER_START_BLOCK=${housesDeployment.deploymentBlock}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
