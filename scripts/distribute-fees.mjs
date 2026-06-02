/**
 * ElderValley — Daily Fee Distribution
 *
 * Distributes 100% of the fee pool balance to house owners,
 * proportional to each token's tier weight (Common=1x Uncommon=2x Rare=4x Legendary=8x).
 *
 * The fee pool wallet receives 50% of token trading fees via Flaunch fee split.
 * The other 50% stays in the treasury for the project.
 *
 * Run daily via cron or Railway scheduled job:
 *   node scripts/distribute-fees.mjs
 *
 * Required env vars:
 *   ELDERVALLEY_HOUSES_CONTRACT   — deployed ERC-721 contract address
 *   ELDERVALLEY_FEE_POOL_ADDRESS  — wallet that receives 50% of token fees
 *   ELDERVALLEY_FEE_POOL_PRIVATE_KEY — private key of the fee pool wallet
 *   ELDERVALLEY_BASE_RPC_URL      — Base RPC endpoint
 */

import { JsonRpcProvider, Wallet, Contract, formatEther, parseEther } from "ethers";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR   = path.join(__dirname, "../.distribution-logs");
const LOG_FILE  = path.join(LOG_DIR, "history.json");

const HOUSES_ABI = [
  "function totalSupply() view returns (uint256)",
  "function tokenByIndex(uint256 index) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function feeWeightOf(uint256 tokenId) view returns (uint256)"
];

const MIN_DISTRIBUTE_ETH = 0.001; // skip distribution if pool has less than this

function requireEnv(name) {
  const val = process.env[name];
  if (!val || val.startsWith("0x_")) {
    throw new Error(`Missing env: ${name}`);
  }
  return val;
}

async function loadHistory() {
  try {
    return JSON.parse(await readFile(LOG_FILE, "utf8"));
  } catch {
    return [];
  }
}

async function saveHistory(history) {
  await mkdir(LOG_DIR, { recursive: true });
  await writeFile(LOG_FILE, JSON.stringify(history, null, 2), "utf8");
}

async function main() {
  const rpcUrl       = process.env.ELDERVALLEY_BASE_RPC_URL || "https://mainnet.base.org";
  const housesAddr   = requireEnv("ELDERVALLEY_HOUSES_CONTRACT");
  const poolAddr     = requireEnv("ELDERVALLEY_FEE_POOL_ADDRESS");
  const poolKey      = requireEnv("ELDERVALLEY_FEE_POOL_PRIVATE_KEY");

  const provider = new JsonRpcProvider(rpcUrl, 8453);
  const poolWallet = new Wallet(poolKey, provider);

  if (poolWallet.address.toLowerCase() !== poolAddr.toLowerCase()) {
    throw new Error(`ELDERVALLEY_FEE_POOL_PRIVATE_KEY resolves to ${poolWallet.address}, expected ${poolAddr}`);
  }

  // ── Pool balance ────────────────────────────────────────────────────────────
  const poolBalance = await provider.getBalance(poolAddr);
  const poolEth     = Number(formatEther(poolBalance));

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  ElderValley Fee Distribution`);
  console.log(`  ${new Date().toISOString()}`);
  console.log(`═══════════════════════════════════════════`);
  console.log(`  Pool wallet : ${poolAddr}`);
  console.log(`  Pool balance: ${poolEth.toFixed(6)} ETH`);

  if (poolEth < MIN_DISTRIBUTE_ETH) {
    console.log(`  Pool below minimum (${MIN_DISTRIBUTE_ETH} ETH). Skipping.`);
    return;
  }

  // ── Read house owners from contract ────────────────────────────────────────
  const houses    = new Contract(housesAddr, HOUSES_ABI, provider);
  const supply    = Number(await houses.totalSupply());
  console.log(`  Houses minted: ${supply}`);

  if (supply === 0) {
    console.log("  No houses minted yet. Skipping.");
    return;
  }

  // Build owner → total weight map
  const ownerWeights = new Map();
  let   totalWeight  = 0n;

  for (let i = 0; i < supply; i++) {
    const tokenId = await houses.tokenByIndex(i);
    const owner   = (await houses.ownerOf(tokenId)).toLowerCase();
    const weight  = await houses.feeWeightOf(tokenId);
    ownerWeights.set(owner, (ownerWeights.get(owner) ?? 0n) + weight);
    totalWeight += weight;
  }

  console.log(`  Unique owners : ${ownerWeights.size}`);
  console.log(`  Total weight  : ${totalWeight}`);

  // ── Estimate gas reserve ────────────────────────────────────────────────────
  const gasPrice   = (await provider.getFeeData()).gasPrice ?? parseEther("0.000000001");
  const gasPerTx   = 21000n;
  const gasReserve = gasPrice * gasPerTx * BigInt(ownerWeights.size + 2);
  const available  = poolBalance - gasReserve;

  if (available <= 0n) {
    console.log("  Not enough ETH to cover gas. Skipping.");
    return;
  }

  console.log(`  Gas reserve   : ${formatEther(gasReserve)} ETH`);
  console.log(`  Distributable : ${formatEther(available)} ETH`);
  console.log(`\n  Sending...`);

  // ── Send proportional ETH to each owner ────────────────────────────────────
  const txRecords = [];
  let   nonce     = await provider.getTransactionCount(poolAddr, "pending");

  for (const [owner, weight] of ownerWeights) {
    const share  = (available * weight) / totalWeight;
    if (share === 0n) continue;

    try {
      const tx = await poolWallet.sendTransaction({
        to:    owner,
        value: share,
        nonce: nonce++
      });
      console.log(`  → ${owner}  +${formatEther(share)} ETH  (tx: ${tx.hash})`);
      txRecords.push({ owner, eth: formatEther(share), weight: weight.toString(), txHash: tx.hash });
    } catch (err) {
      console.error(`  ✗ ${owner}: ${err.message}`);
      txRecords.push({ owner, eth: formatEther(share), weight: weight.toString(), error: err.message });
    }
  }

  // ── Log ────────────────────────────────────────────────────────────────────
  const record = {
    date:           new Date().toISOString(),
    poolBalance:    poolEth.toFixed(6),
    distributed:    formatEther(available),
    gasReserve:     formatEther(gasReserve),
    supply,
    totalWeight:    totalWeight.toString(),
    uniqueOwners:   ownerWeights.size,
    distributions:  txRecords
  };

  const history = await loadHistory();
  history.push(record);
  await saveHistory(history);

  console.log(`\n  Done. Distributed ${formatEther(available)} ETH to ${ownerWeights.size} owners.`);
  console.log(`  Log saved to .distribution-logs/history.json`);
  console.log(`═══════════════════════════════════════════\n`);
}

main().catch(err => {
  console.error("\n[distribute-fees] ERROR:", err.message);
  process.exit(1);
});
