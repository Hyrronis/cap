// Génère les icônes PWA (pastille avec un « C ») à partir d'un SVG, via sharp.
// Usage : npm run icons
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BG = "#1f2937"; // gris ardoise neutre (provisoire, à remplacer par la charte UI)
const FG = "#ffffff";
const OUT = new URL("../public/icons/", import.meta.url);

/** Pastille ronde sur fond transparent. */
function roundSvg(size) {
  const r = size / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <circle cx="${r}" cy="${r}" r="${r}" fill="${BG}"/>
  <text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-weight="700" font-size="${size * 0.58}" fill="${FG}">C</text>
</svg>`;
}

/** Version maskable : fond plein, lettre dans la zone de sécurité (80 %). */
function maskableSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-weight="700" font-size="${size * 0.42}" fill="${FG}">C</text>
</svg>`;
}

await mkdir(OUT, { recursive: true });
const jobs = [
  ["icon-192.png", roundSvg(192), 192],
  ["icon-512.png", roundSvg(512), 512],
  ["icon-maskable-192.png", maskableSvg(192), 192],
  ["icon-maskable-512.png", maskableSvg(512), 512],
  ["apple-touch-icon.png", maskableSvg(180), 180],
];
for (const [name, svg, size] of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(new URL(name, OUT).pathname);
  console.log(`✓ public/icons/${name}`);
}
