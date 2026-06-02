/**
 * Generates all Bee Queen voice lines using ElevenLabs TTS.
 * Usage: ELEVENLABS_API_KEY=sk_... node scripts/generate-queen-voice.mjs
 */
import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR   = path.join(__dirname, "../assets/audio");

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) {
  console.error("ELEVENLABS_API_KEY not found.");
  console.error("Usage: ELEVENLABS_API_KEY=sk_... node scripts/generate-queen-voice.mjs");
  process.exit(1);
}

const LINES = [
  { key: "bee-queen-aggro",       text: "Your presence here is an AFFRONT to the Hive!" },
  { key: "bee-queen-phase2",      text: "You dare hurt me?! The Swarm will DEVOUR you alive!" },
  { key: "bee-queen-phase3",      text: "ENOUGH!! I will TEAR you apart with my own stinger!!" },
  { key: "bee-queen-death-line",  text: "The Swarm... will never... forgive you..." },
  { key: "bee-queen-soldiers",    text: "SOLDIERS!! ATTACK!!" },
  { key: "bee-queen-t1",          text: "Foolish intruder! The Hive does not forgive invaders!" },
  { key: "bee-queen-t2",          text: "Your kind is nothing but a pest to be crushed!" },
  { key: "bee-queen-t3",          text: "Feel the wrath of the Hive, you little pest!" },
  { key: "bee-queen-t4",          text: "You are starting to IRRITATE me!" },
  { key: "bee-queen-t5",          text: "The entire Swarm watches as I destroy you!" },
  { key: "bee-queen-t6",          text: "Did you really think you could harm a queen?!" },
  { key: "bee-queen-t7",          text: "Look what you did! I will make you SUFFER!" },
  { key: "bee-queen-t8",          text: "Your screams will echo through this Hive forever!" },
  { key: "bee-queen-t9",          text: "Nothing can save you now. Not even the gods!" },
];

async function pickVoice() {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": apiKey }
  });
  if (!res.ok) throw new Error(`Failed to fetch voices: ${res.status}`);
  const { voices } = await res.json();

  // Priority: dramatic female villain > female > any
  const pick =
    voices.find(v => v.labels?.gender === "female" && /dramatic|villain|strong|evil|narrator/i.test(JSON.stringify(v.labels))) ??
    voices.find(v => v.labels?.gender === "female" && v.labels?.age === "middle-aged") ??
    voices.find(v => v.labels?.gender === "female") ??
    voices[0];

  console.log(`[voice]  Using: "${pick.name}" (${pick.voice_id})`);
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
        stability:         0.18,
        similarity_boost:  0.82,
        style:             0.90,
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
  let generated = 0, failed = 0;

  for (const { key, text } of LINES) {
    const outPath = path.join(OUT_DIR, `${key}.mp3`);
    console.log(`[gen]    ${key}  →  "${text}"`);
    try {
      const buffer = await generateLine(voiceId, text);
      fs.writeFileSync(outPath, buffer);
      console.log(`[ok]     ${key}.mp3  (${(buffer.length / 1024).toFixed(1)} KB)`);
      generated++;
    } catch (err) {
      console.error(`[error]  ${key}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${generated} generated, ${failed} failed.`);
  if (generated > 0) {
    console.log("Files saved to: assets/audio/");
    console.log("Commit and push to deploy the new voices.");
  }
}

generate();
