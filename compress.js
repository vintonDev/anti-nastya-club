const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// --- НАСТРОЙКИ ---
const inputFolder = './raw_images'; // Создай эту папку и положи туда свои тяжелые картинки
const outputFolder = './public/rotating black sequence'; // Куда сохранять готовые
const newFileName = 'frame'; // Будет frame0001.png, frame0002.png...
const targetWidth = 1000; // Ширина 1000px (оптимально для веба)
const quality = 80; // Качество (от 1 до 100). 80 - идеал.
// -----------------

async function processImages() {
    // 1. Создаем папку для готовых, если нет
    if (!fs.existsSync(outputFolder)){
        fs.mkdirSync(outputFolder, { recursive: true });
    }

    // 2. Читаем файлы
    const files = fs.readdirSync(inputFolder).filter(file => {
        return file.toLowerCase().endsWith('.png') || file.toLowerCase().endsWith('.jpg');
    });

    // 3. Сортируем их правильно (чтобы 10 шло после 9, а не после 1)
    // Это важно для секвенции!
    files.sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });

    console.log(`Найдено ${files.length} файлов. Начинаю магию...`);

    // 4. Обрабатываем каждый файл
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Формируем новое имя: 0001, 0002...
        // i + 1, чтобы начиналось с 1, а не с 0
        const paddedNum = String(i + 1).padStart(4, '0'); 
        const newName = `${newFileName}${paddedNum}.png`;
        
        const inputPath = path.join(inputFolder, file);
        const outputPath = path.join(outputFolder, newName);

        await sharp(inputPath)
            .resize({ width: targetWidth }) // Ресайз (высота авто)
            .png({ 
                quality: quality, 
                compressionLevel: 9, // Максимальное сжатие
                palette: true // Сильно уменьшает вес, если цветов не миллион
            })
            .toFile(outputPath);

        console.log(`Готово: ${file} -> ${newName}`);
    }

    console.log(`\n🎉 УСПЕХ! Все файлы лежат в ${outputFolder}`);
    console.log(`Не забудь обновить настройки в main.js:`);
    console.log(`fileNamePrefix: '${newFileName}',`);
}

processImages();