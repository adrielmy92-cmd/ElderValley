/**
 * ElderValley — NFT Image Generator
 * Generates 1000×1000 NFT images for all 12 Genesis house types.
 * Each image has a tier-themed background + centered house sprite.
 *
 * Run: node scripts/generate-nft-images.mjs
 * Output: assets/nft/*.png
 */

import sharp from "sharp";
import { readFile, mkdir, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SPRITES    = path.join(__dirname, "../assets/sprites");
const OUT_DIR    = path.join(__dirname, "../assets/nft");
const SIZE       = 1000;

// ── Tier visual themes ────────────────────────────────────────────────────────
const THEMES = {
  0: { // Common — warm wood / stone
    bg1: "#1e0e06", bg2: "#3a1f0d",
    border: "#c8884a", innerBorder: "#7a4820",
    glow: "#ff9944", glowAlpha: 0.08,
    label: "COMMON", labelColor: "#e8c090",
    stars: 1, starColor: "#e8c090",
    cornerColor: "#a06030"
  },
  1: { // Uncommon — forest / emerald
    bg1: "#061209", bg2: "#0f2912",
    border: "#4aab5c", innerBorder: "#245c2e",
    glow: "#44ff88", glowAlpha: 0.09,
    label: "UNCOMMON", labelColor: "#88ffaa",
    stars: 2, starColor: "#7ed98a",
    cornerColor: "#2a7a3a"
  },
  2: { // Rare — arcane blue
    bg1: "#04091a", bg2: "#0a1433",
    border: "#4488ff", innerBorder: "#1a3a88",
    glow: "#4488ff", glowAlpha: 0.12,
    label: "RARE", labelColor: "#88bbff",
    stars: 3, starColor: "#61b7ff",
    cornerColor: "#1a4488"
  },
  3: { // Legendary — royal gold
    bg1: "#0d0700", bg2: "#2a1500",
    border: "#ffd574", innerBorder: "#8a5a00",
    glow: "#ffcc44", glowAlpha: 0.14,
    label: "LEGENDARY", labelColor: "#ffd574",
    stars: 4, starColor: "#ffd574",
    cornerColor: "#b87e28"
  }
};

// ── House definitions ─────────────────────────────────────────────────────────
const HOUSES = [
  { key: "creative-house-cottage",         name: "Tall House",     tier: 0 },
  { key: "creative-house-thatch-cottage",  name: "Thatch Cottage", tier: 0 },
  { key: "creative-house-red-lodge",       name: "Red Lodge",      tier: 0 },
  { key: "creative-house-green-cottage",   name: "Green House",    tier: 0 },
  { key: "creative-house-blue-cottage",    name: "Blue House",     tier: 1 },
  { key: "creative-house-ivy-manor",       name: "Emerald Manor",  tier: 1 },
  { key: "creative-house-elf-green-manor", name: "Elven Manor",    tier: 1 },
  { key: "creative-house-blue-arcane-manor","name": "Arcane Manor",tier: 2 },
  { key: "creative-house-blue-gold-tower", name: "Golden Tower",   tier: 2 },
  { key: "creative-house-teal-roof-manor", name: "Teal Manor",     tier: 2 },
  { key: "creative-house-manor",           name: "Grand Manor",    tier: 3 },
  { key: "creative-house-red-tower-cottage","name": "Red Tower",   tier: 3 }
];

// ── SVG background builder ────────────────────────────────────────────────────
function buildBackgroundSvg(theme, name) {
  const S = SIZE;
  const stars = "★".repeat(theme.stars);

  // Decorative corner ornament path (top-left, mirrored for others)
  const corner = `
    M 30 30 L 80 30 M 30 30 L 30 80
    M 30 40 L 55 40 M 40 30 L 40 55
  `;

  // Particle dots scattered in background
  const dots = [];
  const seed = name.charCodeAt(0) * 7 + name.charCodeAt(1) * 13;
  for (let i = 0; i < 28; i++) {
    const x = ((seed * (i + 1) * 137 + i * 293) % (S - 60)) + 30;
    const y = ((seed * (i + 1) * 197 + i * 173) % (S - 60)) + 30;
    const r = (i % 3 === 0) ? 2 : 1;
    const a = 0.12 + (i % 5) * 0.04;
    dots.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${theme.border}" opacity="${a}"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="${theme.bg2}"/>
      <stop offset="100%" stop-color="${theme.bg1}"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${theme.glow}" stop-opacity="${theme.glowAlpha * 2}"/>
      <stop offset="100%" stop-color="${theme.glow}" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>

  <!-- Base background -->
  <rect width="${S}" height="${S}" fill="url(#bg)"/>

  <!-- Subtle grid lines -->
  <g stroke="${theme.border}" stroke-opacity="0.04" stroke-width="1">
    ${Array.from({length: 20}, (_, i) => `<line x1="${i*53}" y1="0" x2="${i*53}" y2="${S}"/>`).join("")}
    ${Array.from({length: 20}, (_, i) => `<line x1="0" y1="${i*53}" x2="${S}" y2="${i*53}"/>`).join("")}
  </g>

  <!-- Central glow -->
  <ellipse cx="${S/2}" cy="${S*0.46}" rx="340" ry="300" fill="url(#glow)"/>

  <!-- Scattered particles -->
  ${dots.join("\n  ")}

  <!-- Outer border -->
  <rect x="14" y="14" width="${S-28}" height="${S-28}" rx="10"
    fill="none" stroke="${theme.border}" stroke-width="3" stroke-opacity="0.9"/>

  <!-- Inner border -->
  <rect x="26" y="26" width="${S-52}" height="${S-52}" rx="7"
    fill="none" stroke="${theme.innerBorder}" stroke-width="1.5" stroke-opacity="0.7"/>

  <!-- Corner ornaments — top left -->
  <g stroke="${theme.border}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-opacity="0.85">
    <path d="M 24 60 L 24 24 L 60 24"/>
    <path d="M 24 44 L 40 44 M 44 24 L 44 40"/>
  </g>
  <!-- top right -->
  <g stroke="${theme.border}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-opacity="0.85">
    <path d="M ${S-24} 60 L ${S-24} 24 L ${S-60} 24"/>
    <path d="M ${S-24} 44 L ${S-40} 44 M ${S-44} 24 L ${S-44} 40"/>
  </g>
  <!-- bottom left -->
  <g stroke="${theme.border}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-opacity="0.85">
    <path d="M 24 ${S-60} L 24 ${S-24} L 60 ${S-24}"/>
    <path d="M 24 ${S-44} L 40 ${S-44} M 44 ${S-24} L 44 ${S-40}"/>
  </g>
  <!-- bottom right -->
  <g stroke="${theme.border}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-opacity="0.85">
    <path d="M ${S-24} ${S-60} L ${S-24} ${S-24} L ${S-60} ${S-24}"/>
    <path d="M ${S-24} ${S-44} L ${S-40} ${S-44} M ${S-44} ${S-24} L ${S-44} ${S-40}"/>
  </g>

  <!-- Top label bar -->
  <rect x="50" y="42" width="${S-100}" height="36" rx="4"
    fill="${theme.bg1}" fill-opacity="0.85"
    stroke="${theme.border}" stroke-width="1" stroke-opacity="0.5"/>
  <text x="${S/2}" y="66" text-anchor="middle"
    font-family="Georgia, serif" font-size="18" letter-spacing="5"
    fill="${theme.labelColor}" fill-opacity="0.9">${theme.label}</text>

  <!-- Bottom name bar -->
  <rect x="50" y="${S-88}" width="${S-100}" height="58" rx="6"
    fill="${theme.bg1}" fill-opacity="0.92"
    stroke="${theme.border}" stroke-width="1.5" stroke-opacity="0.7"/>

  <!-- House name -->
  <text x="${S/2}" y="${S-58}" text-anchor="middle"
    font-family="Georgia, serif" font-size="28" font-weight="bold"
    fill="${theme.labelColor}">${name}</text>

  <!-- Stars -->
  <text x="${S/2}" y="${S-36}" text-anchor="middle"
    font-family="Arial" font-size="16"
    fill="${theme.starColor}" letter-spacing="6">${stars}</text>

  <!-- ElderValley watermark -->
  <text x="${S/2}" y="${S-16}" text-anchor="middle"
    font-family="Georgia, serif" font-size="11" letter-spacing="2"
    fill="${theme.border}" fill-opacity="0.5">ELDERVALLEY GENESIS</text>
</svg>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function generate() {
  await mkdir(OUT_DIR, { recursive: true });

  let ok = 0, failed = 0;

  for (const house of HOUSES) {
    const spritePath = path.join(SPRITES, `${house.key}.png`);
    const outPath    = path.join(OUT_DIR, `${house.key}.png`);
    const theme      = THEMES[house.tier];

    try {
      await access(spritePath);
    } catch {
      console.warn(`[skip]  ${house.key}.png — sprite not found`);
      failed++;
      continue;
    }

    try {
      // Build SVG background
      const svgBuf = Buffer.from(buildBackgroundSvg(theme, house.name));
      const bgBuf  = await sharp(svgBuf).png().toBuffer();

      // Load + resize sprite to fit in 640×580 center area
      const sprite = sharp(spritePath).png();
      const meta   = await sprite.metadata();
      const maxW   = 640, maxH = 570;
      const scale  = Math.min(maxW / (meta.width || 400), maxH / (meta.height || 400), 4);
      const sw     = Math.round((meta.width  || 400) * scale);
      const sh     = Math.round((meta.height || 400) * scale);
      const sx     = Math.round((SIZE - sw) / 2);
      const sy     = Math.round((SIZE - sh) / 2) - 18;

      const spriteBuf = await sharp(spritePath)
        .resize(sw, sh, { kernel: sharp.kernel.nearest })
        .png()
        .toBuffer();

      // Compose: background + sprite
      await sharp(bgBuf)
        .composite([{ input: spriteBuf, left: sx, top: sy }])
        .png()
        .toFile(outPath);

      console.log(`[ok]    ${house.name.padEnd(18)} → assets/nft/${house.key}.png  (${sw}×${sh})`);
      ok++;
    } catch (err) {
      console.error(`[error] ${house.key}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${ok} generated, ${failed} failed.`);
  console.log(`Output: assets/nft/`);
}

generate();
