/**
 * Extrai frames de animated WebP e cria sprite sheet PNG horizontal (200px por frame).
 * Uso: node scripts/extract-webp-frames.mjs <input.webp> <output-sheet.png>
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const [,, inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("Uso: node extract-webp-frames.mjs <input.webp> <output-sheet.png>");
  process.exit(1);
}

const buf = readFileSync(inputPath);
const tmpDir = path.join(os.tmpdir(), "webp-frames-" + Date.now());
mkdirSync(tmpDir, { recursive: true });

// Lê uint24 little-endian
function readU24(buf, offset) {
  return buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16);
}

// Lê canvas size do VP8X
function readCanvasSize(buf) {
  let i = 12;
  while (i < buf.length - 8) {
    const chunk = buf.slice(i, i + 4).toString("ascii");
    const size = buf.readUInt32LE(i + 4);
    if (chunk === "VP8X") {
      return {
        w: readU24(buf, i + 12) + 1,
        h: readU24(buf, i + 15) + 1
      };
    }
    i += 8 + size + (size % 2);
  }
  return { w: 200, h: 200 };
}

const canvas = readCanvasSize(buf);
console.log(`Canvas: ${canvas.w}x${canvas.h}`);

// Extrai ANMF chunks com offset x, y
function extractFrames(buf) {
  const frames = [];
  let i = 12;
  while (i < buf.length - 8) {
    const chunk = buf.slice(i, i + 4).toString("ascii");
    const size = buf.readUInt32LE(i + 4);
    if (chunk === "ANMF") {
      const dataStart = i + 8;
      const fx = readU24(buf, dataStart) * 2;
      const fy = readU24(buf, dataStart + 3) * 2;
      const fw = readU24(buf, dataStart + 6) + 1;
      const fh = readU24(buf, dataStart + 9) + 1;
      const framePayload = buf.slice(dataStart + 16, i + 8 + size);
      const fileSize = 4 + framePayload.length;
      const riff = Buffer.alloc(12);
      riff.write("RIFF", 0);
      riff.writeUInt32LE(fileSize, 4);
      riff.write("WEBP", 8);
      frames.push({ data: Buffer.concat([riff, framePayload]), fx, fy, fw, fh });
    }
    i += 8 + size + (size % 2);
  }
  return frames;
}

const frames = extractFrames(buf);
console.log(`Extraídos ${frames.length} frames de ${path.basename(inputPath)}`);

// Para cada frame: extrai webp → png parcial, depois composta no canvas completo
const compositedPaths = [];
for (let idx = 0; idx < frames.length; idx++) {
  const { data, fx, fy } = frames[idx];
  const webpPath = path.join(tmpDir, `raw-${idx}.webp`);
  const partialPng = path.join(tmpDir, `partial-${idx}.png`);
  const fullPng = path.join(tmpDir, `full-${idx}.png`);

  writeFileSync(webpPath, data);
  // Converte frame parcial para PNG preservando alpha
  execSync(`ffmpeg -y -i "${webpPath}" -update 1 -frames:v 1 "${partialPng}"`, { stdio: "ignore" });

  // Padding transparente para posicionar no canvas completo
  execSync(
    `ffmpeg -y -i "${partialPng}" -vf "format=rgba,pad=${canvas.w}:${canvas.h}:${fx}:${fy}:color=0x00000000" -update 1 -frames:v 1 "${fullPng}"`,
    { stdio: "ignore" }
  );
  compositedPaths.push(fullPng);
  process.stdout.write(`  frame ${idx + 1}/${frames.length}\r`);
}
console.log("\nFrames compostos.");

// Monta sprite sheet horizontal
const inputs = compositedPaths.map((p) => `-i "${p}"`).join(" ");
const filterStr = compositedPaths.length > 1
  ? `${compositedPaths.map((_, i) => `[${i}:v]`).join("")}hstack=inputs=${compositedPaths.length}[out]`
  : `[0:v]copy[out]`;
execSync(
  `ffmpeg -y ${inputs} -filter_complex "${filterStr}" -map "[out]" -update 1 -frames:v 1 "${outputPath}"`,
  { stdio: "ignore" }
);

console.log(`Sprite sheet: ${outputPath} (${frames.length} frames × ${canvas.w}px)`);

try { rmSync(tmpDir, { recursive: true }); } catch {}
