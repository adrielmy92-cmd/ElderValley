import sharp from "sharp";
import path from "node:path";

// Builds a 1400x400 OpenSea collection banner: dark fantasy gradient + title,
// the collection logo on the left, and a few house renders on the right.
const root = process.cwd();
const nft = (f) => path.join(root, "assets", "nft", f);
const W = 1400, H = 400;

const bg = Buffer.from(`
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0e1a26"/>
      <stop offset="0.55" stop-color="#0a121c"/>
      <stop offset="1" stop-color="#05080d"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.26" cy="0.5" r="0.55">
      <stop offset="0" stop-color="#22425f" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#22425f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="${H - 5}" width="${W}" height="5" fill="#d29643"/>
  <text x="378" y="162" font-family="Georgia, 'Times New Roman', serif" font-size="52" font-weight="bold" fill="#ffe0a0" stroke="#1d0d05" stroke-width="2">ElderValley Houses</text>
  <text x="381" y="206" font-family="Georgia, serif" font-size="24" fill="#cdb98f">Genesis Collection · 50 Houses on Base</text>
  <text x="381" y="242" font-family="Georgia, serif" font-size="20" fill="#8fb0c9">Holders earn daily yield from ElderValley token fees</text>
  <text x="381" y="288" font-family="Georgia, serif" font-size="17" fill="#7d6f57">Common 1× · Uncommon 2× · Rare 4× · Legendary 8×</text>
</svg>`);

async function fitH(file, h) {
  return sharp(nft(file)).resize({ height: h, fit: "inside" }).png().toBuffer();
}

async function main() {
  const logo = await sharp(nft("collection-logo.png"))
    .resize(300, 300, { fit: "inside" }).png().toBuffer();

  const manor = await fitH("creative-house-manor.png", 250);
  const tower = await fitH("creative-house-blue-gold-tower.png", 235);
  const teal = await fitH("creative-house-teal-roof-manor.png", 215);

  await sharp(bg)
    .composite([
      { input: logo, left: 44, top: 50 },
      { input: teal, left: 1010, top: 150 },
      { input: tower, left: 1130, top: 120 },
      { input: manor, left: 1240, top: 105 }
    ])
    .png()
    .toFile(nft("collection-banner.png"));

  console.log("Banner written: assets/nft/collection-banner.png (1400x400)");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
