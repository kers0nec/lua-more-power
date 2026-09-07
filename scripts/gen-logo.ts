import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const PRIMARY = "#c8f53e"; // oklch(84% 0.21 135) approx
const PRIMARY_FOREGROUND = "#121c0f"; // oklch(17% 0.03 140) approx
const RADIUS = 6;
const SIZES = [64, 128, 256];

function svgFor(size: number): string {
  const fontSize = Math.round(size * 0.44);
  const text = "</>";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect x="0" y="0" width="${size}" height="${size}" rx="${RADIUS}" fill="${PRIMARY}"/>
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
      font-family="monospace" font-weight="bold" font-size="${fontSize}"
      fill="${PRIMARY_FOREGROUND}">&lt;/&gt;</text>
  </svg>`;
}

const outDir = path.join(process.cwd(), "public", "brand");
fs.mkdirSync(outDir, { recursive: true });

for (const size of SIZES) {
  const svg = svgFor(size);
  const buf = Buffer.from(svg);
  const outPath = path.join(outDir, `logo-${size}.png`);
  await sharp(buf).png().toFile(outPath);
  console.log(`Wrote ${outPath}`);
}

// Also write the default logo.png (32px equivalent, but render at 64 for crispness)
const defaultSvg = svgFor(64);
const defaultBuf = Buffer.from(defaultSvg);
await sharp(defaultBuf).png().toFile(path.join(outDir, "logo.png"));
console.log("Wrote public/brand/logo.png");
