require("dotenv").config();

const { formatEther, isAddress, JsonRpcProvider, Wallet } = require("ethers");

const MIN_RECOMMENDED_ETH = 0.002;

function assertEnv(name) {
  const value = process.env[name];
  if (!value || value === "never_commit_your_private_key_here") {
    throw new Error(`Missing ${name}. Fill it manually in .env before deploying.`);
  }
  return value;
}

async function main() {
  const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  const privateKey = assertEnv("PRIVATE_KEY");
  const treasury = assertEnv("TREASURY_ADDRESS");

  if (!isAddress(treasury)) {
    throw new Error("TREASURY_ADDRESS is not a valid EVM address.");
  }

  const feeBps = Number(process.env.MARKETPLACE_FEE_BPS || "250");
  if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 1000) {
    throw new Error("MARKETPLACE_FEE_BPS must be an integer from 0 to 1000.");
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 8453) {
    throw new Error(`BASE_RPC_URL must point to Base mainnet chainId 8453. Current chainId: ${network.chainId}`);
  }

  const deployer = new Wallet(privateKey, provider);
  const balanceWei = await provider.getBalance(deployer.address);
  const balanceEth = Number(formatEther(balanceWei));

  if (balanceWei === 0n) {
    throw new Error(`Deployer ${deployer.address} has 0 ETH on Base. Add Base ETH before deploying.`);
  }

  console.log("Base deploy preflight OK");
  console.log("Network: Base mainnet (8453)");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", `${formatEther(balanceWei)} ETH`);
  console.log("Treasury:", treasury);
  console.log("Marketplace fee:", `${feeBps / 100}%`);
  console.log("BaseScan verification:", process.env.BASESCAN_API_KEY ? "ready" : "missing API key");

  if (balanceEth < MIN_RECOMMENDED_ETH) {
    console.warn(`Warning: deployer balance is below ${MIN_RECOMMENDED_ETH} ETH. Base is cheap, but deploy may still fail if gas spikes.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
