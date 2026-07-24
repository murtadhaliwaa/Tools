import sharp from "sharp";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const src = process.argv[2];

if (!src) {
  console.error("Usage: node scripts/generate-icons.mjs <source.png>");
  process.exit(1);
}

function roundedMask(size, radius) {
  const r = Math.round(radius);
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/></svg>`,
  );
}

async function makeIcon(
  size,
  out,
  { padRatio = 0.16, bg = "#F5F3EE", cornerRatio = 0.1 } = {},
) {
  const pad = Math.round(size * padRatio);
  const inner = size - pad * 2;
  const radius = size * cornerRatio;

  const glyph = await sharp(src)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const square = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: glyph, gravity: "centre" }])
    .png()
    .toBuffer();

  const mask = await sharp(roundedMask(size, radius)).png().toBuffer();

  await sharp(square)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toFile(out);

  console.log("wrote", out, "radius", Math.round(radius));
}

const copies = [
  ["public/icons/v2/icon-192.png", "public/icons/icon-192.png"],
  ["public/icons/v2/icon-512.png", "public/icons/icon-512.png"],
  ["public/icons/v2/icon-maskable-512.png", "public/icons/icon-maskable-512.png"],
  ["public/icons/v2/apple-touch-icon.png", "public/icons/apple-touch-icon.png"],
  ["public/icons/v2/icon-192.png", "public/icons/app-icon-192.png"],
  ["public/icons/v2/icon-512.png", "public/icons/app-icon-512.png"],
  [
    "public/icons/v2/icon-maskable-512.png",
    "public/icons/app-icon-maskable-512.png",
  ],
];

await makeIcon(192, "public/icons/v2/icon-192.png");
await makeIcon(512, "public/icons/v2/icon-512.png");
await makeIcon(512, "public/icons/v2/icon-maskable-512.png", {
  padRatio: 0.22,
});
await makeIcon(180, "public/icons/v2/apple-touch-icon.png");
await makeIcon(32, "public/favicon-32.png");
await makeIcon(16, "public/favicon-16.png");
await makeIcon(512, "src/app/icon.png");
await makeIcon(180, "src/app/apple-icon.png");

for (const [a, b] of copies) fs.copyFileSync(a, b);

try {
  const toIco = require("to-ico");
  const buf = await toIco([
    fs.readFileSync("public/favicon-16.png"),
    fs.readFileSync("public/favicon-32.png"),
    fs.readFileSync("public/icons/v2/icon-192.png"),
  ]);
  fs.writeFileSync("public/favicon.ico", buf);
  console.log("favicon.ico ok");
} catch (e) {
  console.log("skip ico", e.message);
}

console.log("done");
