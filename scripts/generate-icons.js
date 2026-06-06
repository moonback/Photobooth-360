// Script pour générer les icônes PWA
// Nécessite : npm install sharp --save-dev

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [192, 512];
const inputFile = path.join(__dirname, '../public/logo.png');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  if (!fs.existsSync(inputFile)) {
    console.error('❌ Fichier logo.png introuvable dans /public');
    console.log('💡 Placez votre logo dans /public/logo.png et relancez ce script');
    return;
  }

  console.log('🚀 Génération des icônes PWA...');

  for (const size of sizes) {
    const outputFile = path.join(outputDir, `icon-${size}.png`);
    
    try {
      await sharp(inputFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputFile);
      
      console.log(`✅ Icône ${size}x${size} générée : ${outputFile}`);
    } catch (error) {
      console.error(`❌ Erreur lors de la génération de l'icône ${size}x${size}:`, error.message);
    }
  }

  console.log('✨ Génération terminée !');
}

generateIcons().catch(console.error);
