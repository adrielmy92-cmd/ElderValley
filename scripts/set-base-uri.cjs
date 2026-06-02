const hre = require("hardhat");
const fs = require("node:fs/promises");
const path = require("node:path");

// Sets the ERC-721 token base URI so tokenURI(id) = BASE_URI + id, pointing at
// the game server's /metadata/:id endpoint (the source OpenSea reads).
//   tokenURI(1) -> https://<host>/metadata/1
const BASE_URI =
  process.env.METADATA_BASE_URI ||
  "https://eldervalley-production.up.railway.app/metadata/";

async function main() {
  const manifestPath = path.join(process.cwd(), "deployments", `${hre.network.name}.json`);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const address = manifest.houses.address;

  const contract = await hre.ethers.getContractAt("ElderValleyHouses", address);
  console.log(`Setting base URI on ${address}`);
  console.log(`Base URI: ${BASE_URI}`);

  const tx = await contract.setBaseURI(BASE_URI);
  console.log(`Tx sent: ${tx.hash}`);
  await tx.wait();
  console.log("Base URI set. tokenURI(1) ->", `${BASE_URI}1`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
