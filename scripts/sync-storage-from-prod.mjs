/**
 * Baixa todos os dados de storage do servidor de produção e salva em data/storage-seed.json.
 * Uso: node scripts/sync-storage-from-prod.mjs
 */

import { writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROD_URL = process.env.ELDERVALLEY_PROD_URL ?? "https://eldervalley-production.up.railway.app";

const STORAGE_KEYS = [
  // WorldScene
  "market-village-editable-houses-v1",
  "market-village-manual-fences-v1",
  "market-village-manual-trees-v1",
  "eldervalley-manual-floors-v1",
  "eldervalley-village-manual-structures-v1",
  "eldervalley-village-manual-window-lights-v1",
  "eldervalley-village-manual-collisions-v1",
  // CityScene
  "eldervalley-city-editable-houses-v1",
  "eldervalley-city-manual-fences-v1",
  "eldervalley-city-manual-trees-v1",
  "eldervalley-city-manual-floors-v1",
  "eldervalley-city-manual-structures-v1",
  "eldervalley-city-manual-window-lights-v1",
  "eldervalley-city-manual-collisions-v1",
  // Interiores
  "eldervalley-alchemist-house-manual-collisions-v1",
  "eldervalley-windmill-manual-collisions-v1",
  // Swamp
  "swamp-editable-houses-v1",
  "swamp-manual-fences-v1",
  "swamp-manual-trees-v1",
  "swamp-manual-floors-v1",
  "swamp-manual-structures-v1",
  "swamp-manual-window-lights-v1",
  "swamp-manual-collisions-v1",
  // Boss Arena
  "boss-arena-editable-houses-v1",
  "boss-arena-manual-fences-v1",
  "boss-arena-manual-trees-v1",
  "boss-arena-manual-floors-v1",
  "boss-arena-manual-structures-v1",
  "boss-arena-manual-window-lights-v1",
  "boss-arena-manual-collisions-v1",
];

async function fetchKey(key) {
  const url = `${PROD_URL}/api/storage/${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} para chave ${key}`);
  const json = await res.json();
  return json.data;
}

async function main() {
  console.log(`Sincronizando storage de ${PROD_URL}...\n`);
  const seed = {};
  let ok = 0;
  let empty = 0;

  for (const key of STORAGE_KEYS) {
    try {
      const data = await fetchKey(key);
      if (data !== null && data !== undefined) {
        seed[key] = data;
        const count = Array.isArray(data) ? data.length : "objeto";
        console.log(`  ✓ ${key} (${count})`);
        ok++;
      } else {
        console.log(`  - ${key} (vazio no servidor)`);
        empty++;
      }
    } catch (err) {
      console.error(`  ✗ ${key}: ${err.message}`);
    }
  }

  // Atualiza o storage-seed.json
  const seedPath = path.join(root, "data", "storage-seed.json");
  await mkdir(path.join(root, "data"), { recursive: true });
  await writeFile(seedPath, JSON.stringify(seed, null, 2), "utf8");

  // Sobrescreve os arquivos locais em .eldervalley-storage/ para o servidor local ficar igual ao prod
  const storageDir = path.join(root, ".eldervalley-storage");
  await mkdir(storageDir, { recursive: true });

  // Remove arquivos antigos que não vieram do servidor (evita dados obsoletos)
  const existingFiles = await readdir(storageDir).catch(() => []);
  for (const file of existingFiles) {
    if (!file.endsWith(".json")) continue;
    const key = file.slice(0, -5).replace(/_/g, (m, offset, str) => {
      // nome do arquivo usa _ no lugar de chars inválidos; verifica se a chave bate
      return m;
    });
    const filePath = path.join(storageDir, file);
    // Se não está no seed (veio do prod), apaga para não contaminar
    const normalizedKey = file.slice(0, -5);
    if (!seed[normalizedKey]) {
      await unlink(filePath).catch(() => {});
      console.log(`  🗑 removido local obsoleto: ${file}`);
    }
  }

  // Escreve cada chave do prod diretamente no .eldervalley-storage/
  for (const [key, data] of Object.entries(seed)) {
    const safeKey = key.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const filePath = path.join(storageDir, `${safeKey}.json`);
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  }

  console.log(`\nPronto: ${ok} chaves sincronizadas, ${empty} vazias no servidor.`);
  console.log(`Storage local: ${storageDir}`);
}

main().catch((err) => {
  console.error("Erro:", err.message);
  process.exit(1);
});
