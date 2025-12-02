import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Generate maskable icons with proper safe zone (10% padding on each side)
async function generateMaskableIcons() {
  console.log('Generating maskable icons with safe zone...');

  // For maskable icons, we need to add padding (10% on each side = 80% content)
  // This ensures the icon content is within the "safe zone"
  
  const sizes = [192, 512];
  
  for (const size of sizes) {
    const sourceIcon = path.join(iconsDir, `icon-${size}x${size}.png`);
    const maskableIcon = path.join(iconsDir, `icon-${size}x${size}-maskable.png`);
    
    if (!fs.existsSync(sourceIcon)) {
      console.log(`Source icon not found: ${sourceIcon}`);
      continue;
    }

    // Calculate the inner content size (80% of total)
    const contentSize = Math.floor(size * 0.75);
    const padding = Math.floor((size - contentSize) / 2);

    try {
      // Read the original icon
      const originalBuffer = fs.readFileSync(sourceIcon);
      
      // Resize the content to 75% and place on a colored background with padding
      await sharp(originalBuffer)
        .resize(contentSize, contentSize, {
          fit: 'contain',
          background: { r: 224, g: 242, b: 254, alpha: 1 } // #E0F2FE - light blue background
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 224, g: 242, b: 254, alpha: 1 } // #E0F2FE
        })
        .png()
        .toFile(maskableIcon);

      console.log(`✓ Created: icon-${size}x${size}-maskable.png`);
    } catch (error) {
      console.error(`Error creating maskable icon for ${size}x${size}:`, error.message);
    }
  }

  console.log('\nDone! Maskable icons created with proper safe zone padding.');
}

generateMaskableIcons().catch(console.error);
