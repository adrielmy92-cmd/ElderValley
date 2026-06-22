/**
 * Gera a música de batalha do boss. A Music API dedicada exige plano pago, então
 * usamos a Sound Effects API (max ~22s) para um loop curto de batalha.
 * Uso: ELEVENLABS_API_KEY=sk_... node scripts/generate-music.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../assets/audio");

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) { console.error("ELEVENLABS_API_KEY não encontrada."); process.exit(1); }

const TRACKS = [
  {
    key: "golem-battle",
    duration: 22,
    prompt: "Epic intense orchestral boss battle music, relentless driving war drums and dramatic staccato low brass with a dark ominous choir, fast-paced heroic fantasy combat theme, menacing volcanic tone, high energy looping instrumental, steady tempo with no fade in or out"
  }
];

async function generateMusic({ prompt, duration }) {
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
    body: JSON.stringify({ text: prompt, duration_seconds: duration, prompt_influence: 0.3 })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

for (const t of TRACKS) {
  const outPath = path.join(OUT_DIR, `${t.key}.mp3`);
  if (fs.existsSync(outPath)) { console.log(`[skip] ${t.key}.mp3 (já existe)`); continue; }
  console.log(`[gen]  ${t.key} (${t.lengthMs / 1000}s)`);
  try {
    const buf = await generateMusic(t);
    fs.writeFileSync(outPath, buf);
    console.log(`[ok]   ${t.key}.mp3 (${(buf.length / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error(`[erro] ${t.key}: ${err.message}`);
  }
}
