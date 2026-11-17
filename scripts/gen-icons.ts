// Generate PNG icons (192x192 and 512x512) from the SVG for the PWA manifest.
import sharp from "sharp";
import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";

async function main() {
  const svgPath = path.join(process.cwd(), "public", "icon.svg");
  const appleSvgPath = path.join(process.cwd(), "public", "apple-icon.svg");
  const svgBuffer = readFileSync(svgPath);
  const appleBuffer = readFileSync(appleSvgPath);
  const out192 = path.join(process.cwd(), "public", "icon-192.png");
  const out512 = path.join(process.cwd(), "public", "icon-512.png");
  const appleIcon = path.join(process.cwd(), "public", "apple-touch-icon.png");

  await sharp(svgBuffer).resize(192, 192).png().toFile(out192);
  await sharp(svgBuffer).resize(512, 512).png().toFile(out512);
  await sharp(appleBuffer).resize(180, 180).png().toFile(appleIcon);

  console.log("Icons generated: icon-192.png, icon-512.png, apple-touch-icon.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
