const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a canvas for the logo (text-based "LuaMore" with lime "More")
const canvas = createCanvas(512, 128);
const ctx = canvas.getContext('2d');

// Background transparent
ctx.clearRect(0, 0, 512, 128);

// Font settings - using a monospace font similar to JetBrains Mono
ctx.font = 'bold 72px "JetBrains Mono", "Fira Code", "Consolas", monospace';
ctx.textBaseline = 'middle';
ctx.textAlign = 'left';

// Colors
const foregroundColor = '#ffffff'; // white
const primaryColor = '#84cc16'; // lime-500

// Calculate text positions
const text = 'LuaMore';
const luaWidth = ctx.measureText('Lua').width;
const moreWidth = ctx.measureText('More').width;
const totalWidth = luaWidth + moreWidth;
const startX = (512 - totalWidth) / 2;
const y = 64;

// Draw "Lua" in white
ctx.fillStyle = foregroundColor;
ctx.fillText('Lua', startX, y);

// Draw "More" in lime
ctx.fillStyle = primaryColor;
ctx.fillText('More', startX + luaWidth, y);

// Save as PNG
const buffer = canvas.toBuffer('image/png');
const outputPath = path.join(__dirname, 'public', 'brand', 'logo-text.png');
fs.writeFileSync(outputPath, buffer);

console.log('Logo PNG generated at:', outputPath);
console.log('Dimensions: 512x128');