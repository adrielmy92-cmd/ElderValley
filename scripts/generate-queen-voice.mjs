/**
 * Gera todas as falas da Rainha das Abelhas usando ElevenLabs TTS.
 * Uso: ELEVENLABS_API_KEY=sk_... node scripts/generate-queen-voice.mjs
 */
import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = path.join(__dirname, "../assets/audio");

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY não encontrada.");
  console.error("Uso: ELEVENLABS_API_KEY=sk_... node scripts/generate-queen-voice.mjs");
  process.exit(1);
}

const LINES = [
  { key: "bee-queen-aggro",  text: "Sua presença aqui é uma AFRONTA à Colmeia!" },
  { key: "bee-queen-phase2", text: "Você ousa me ferir?! O Enxame vai te DEVORAR vivo!" },
  { key: "bee-queen-phase3", text: "CHEGA!! Vou te RASGAR com o meu próprio ferrão!!" },
  { key: "bee-queen-t1",     text: "Intruso tolo! A Colmeia não perdoa invasores!" },
  { key: "bee-queen-t2",     text: "Sua espécie não é nada além de um inseto a ser esmagado!" },
  { key: "bee-queen-t3",     text: "Sinta a ira da Colmeia, sua pequena praga!" },
  { key: "bee-queen-t4",     text: "Você está começando a me IRRITAR!" },
  { key: "bee-queen-t5",     text: "Todo o Enxame observa enquanto eu te destruo!" },
  { key: "bee-queen-t6",     text: "Você realmente achou que poderia machucar uma rainha?!" },
  { key: "bee-queen-t7",     text: "Veja o que você fez! Vou te fazer SOFRER!" },
  { key: "bee-queen-t8",     text: "Seus gritos vão ecoar por esta Colmeia para sempre!" },
  { key: "bee-queen-t9",     text: "Nada pode te salvar agora. Nem mesmo os deuses!" },
];

async function pickVoice() {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey }
  });
  if (!res.ok) throw new Error(`Erro ao buscar vozes: ${res.status}`);
  const { voices } = await res.json();

  // Prioridade: feminina dramática > feminina > qualquer uma
  const pick =
    voices.find(v => v.labels?.gender === "female" && /dramatic|villain|strong|narration/i.test(JSON.stringify(v.labels))) ??
    voices.find(v => v.labels?.gender === "female") ??
    voices[0];

  console.log(`[voz]   Usando: "${pick.name}" (${pick.voice_id})`);
  return pick.voice_id;
}

async function generateLine(voiceId, text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key":   apiKey,
      "Content-Type": "application/json",
      "Accept":       "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability:         0.20,
        similarity_boost:  0.80,
        style:             0.85,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function generate() {
  const voiceId = await pickVoice();
  let generated = 0, skipped = 0;

  for (const { key, text } of LINES) {
    const outPath = path.join(OUT_DIR, `${key}.mp3`);

    if (fs.existsSync(outPath)) {
      console.log(`[skip]  ${key}.mp3  (já existe)`);
      skipped++;
      continue;
    }

    console.log(`[gen]   ${key}  →  "${text}"`);
    try {
      const buffer = await generateLine(voiceId, text);
      fs.writeFileSync(outPath, buffer);
      console.log(`[ok]    ${key}.mp3  (${(buffer.length / 1024).toFixed(1)} KB)`);
      generated++;
    } catch (err) {
      console.error(`[erro]  ${key}: ${err.message}`);
    }
  }

  console.log(`\nConcluído: ${generated} gerados, ${skipped} ignorados.`);
  if (generated > 0) {
    console.log("Arquivos salvos em: assets/audio/");
    console.log("Reinicie o servidor para carregar os novos áudios.");
  }
}

generate();
