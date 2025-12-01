import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, '../public/icons');

// SVG source - green gradient FitFlow logo
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10B981"/>
      <stop offset="100%" style="stop-color:#06B6D4"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="80" fill="url(#bg)"/>
  <text x="256" y="340" font-family="Arial Black, sans-serif" font-size="280" font-weight="bold" fill="white" text-anchor="middle">F</text>
</svg>`;

async function generateIcons() {
  console.log('Generating PWA icons...');
  
  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Generate 192x192 PNG
  await sharp(Buffer.from(svgIcon))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, 'icon-192x192.png'));
  console.log('✓ Generated icon-192x192.png');

  // Generate 512x512 PNG
  await sharp(Buffer.from(svgIcon))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, 'icon-512x512.png'));
  console.log('✓ Generated icon-512x512.png');

  // Generate 180x180 for Apple Touch Icon
  await sharp(Buffer.from(svgIcon))
    .resize(180, 180)
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('✓ Generated apple-touch-icon.png');

  // Generate favicon 32x32
  await sharp(Buffer.from(svgIcon))
    .resize(32, 32)
    .png()
    .toFile(path.join(iconsDir, 'favicon-32x32.png'));
  console.log('✓ Generated favicon-32x32.png');

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
