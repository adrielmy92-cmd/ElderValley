/**
 * Gera efeitos sonoros do jogo usando ElevenLabs Sound Effects API.
 * Uso: ELEVENLABS_API_KEY=sk_... node scripts/generate-sfx.mjs
 */
import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = path.join(__dirname, "../assets/audio");

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY não encontrada.");
  console.error("Uso: ELEVENLABS_API_KEY=sk_... node scripts/generate-sfx.mjs");
  process.exit(1);
}

const SFX = [
  {
    key: "spell-lightning-cast",
    duration: 2.0,
    prompt_influence: 0.4,
    text: "Powerful arcane lightning bolt strike, crackling electric discharge, magical thunder crack with sharp initial impact and electric sizzle tail, fantasy RPG spell sound effect, high pitched electrical zap with deep thunder rumble underneath, cinematic game audio"
  },
  {
    key: "spell-lightning-loop",
    duration: 1.5,
    prompt_influence: 0.35,
    text: "Electric energy humming and crackling, sustained lightning field buzzing, continuous electrical discharge sizzle, magical energy field loop, fantasy game ambient electricity sound, arcing plasma crackle"
  },
  {
    key: "bee-honey-puddle-drop",
    duration: 1.8,
    prompt_influence: 0.4,
    text: "Thick viscous honey splashing and plopping onto ground, sticky liquid impact, heavy golden syrup drop landing with wet splat, gooey substance spreading sound, organic liquid impact effect for fantasy game"
  },
  {
    key: "bee-honey-puddle-loop",
    duration: 2.0,
    prompt_influence: 0.35,
    text: "Sticky honey bubbling and simmering on ground, thick viscous liquid slow bubbling loop, magical golden puddle gurgling, gooey substance pulsing ambient sound, fantasy game hazard zone audio loop"
  }
];

async function generateSfx({ text, duration, prompt_influence }) {
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "xi-api-key":   apiKey,
      "Content-Type": "application/json",
      "Accept":       "audio/mpeg"
    },
    body: JSON.stringify({
      text,
      duration_seconds:  duration,
      prompt_influence:  prompt_influence ?? 0.3
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function generate() {
  let generated = 0, skipped = 0;

  for (const sfx of SFX) {
    const outPath = path.join(OUT_DIR, `${sfx.key}.mp3`);

    if (fs.existsSync(outPath)) {
      console.log(`[skip]  ${sfx.key}.mp3  (já existe)`);
      skipped++;
      continue;
    }

    console.log(`[gen]   ${sfx.key}`);
    console.log(`        "${sfx.text.slice(0, 80)}..."`);

    try {
      const buffer = await generateSfx(sfx);
      fs.writeFileSync(outPath, buffer);
      console.log(`[ok]    ${sfx.key}.mp3  (${(buffer.length / 1024).toFixed(1)} KB)\n`);
      generated++;
    } catch (err) {
      console.error(`[erro]  ${sfx.key}: ${err.message}\n`);
    }
  }

  console.log(`Concluído: ${generated} gerados, ${skipped} ignorados.`);
}

generate();
