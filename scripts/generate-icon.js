const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

async function generateIcon() {
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, '#152238');
  bgGrad.addColorStop(1, '#1a2744');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;

  const shieldGrad = ctx.createLinearGradient(cx - 200, cy - 250, cx + 200, cy + 250);
  shieldGrad.addColorStop(0, '#6BA39B');
  shieldGrad.addColorStop(0.5, '#5B8C85');
  shieldGrad.addColorStop(1, '#3d6b65');

  ctx.beginPath();
  const shieldTop = cy - 220;
  const shieldBottom = cy + 280;
  const shieldWidth = 300;
  ctx.moveTo(cx, shieldTop - 40);
  ctx.bezierCurveTo(cx + shieldWidth * 0.6, shieldTop - 40, cx + shieldWidth, shieldTop + 20, cx + shieldWidth, shieldTop + 100);
  ctx.lineTo(cx + shieldWidth, cy + 50);
  ctx.bezierCurveTo(cx + shieldWidth, cy + 200, cx + 80, shieldBottom - 20, cx, shieldBottom);
  ctx.bezierCurveTo(cx - 80, shieldBottom - 20, cx - shieldWidth, cy + 200, cx - shieldWidth, cy + 50);
  ctx.lineTo(cx - shieldWidth, shieldTop + 100);
  ctx.bezierCurveTo(cx - shieldWidth, shieldTop + 20, cx - shieldWidth * 0.6, shieldTop - 40, cx, shieldTop - 40);
  ctx.closePath();
  ctx.fillStyle = shieldGrad;
  ctx.fill();

  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 260px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.letterSpacing = '10px';
  ctx.fillText('HSK', cx, cy - 20);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const barY = cy + 160;
  const barWidth = 200;
  const barHeight = 6;
  const barGap = 18;
  const barColors = ['#E8956F', '#EAA882', '#ECBB96'];

  for (let i = 0; i < 3; i++) {
    const w = barWidth - i * 30;
    ctx.fillStyle = barColors[i];
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, barY + i * barGap, w, barHeight, 3);
    ctx.fill();
  }

  const cornerRadius = size * 0.18;
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, cornerRadius);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.resolve(__dirname, '..', 'assets', 'images', 'app-icon.png');
  fs.writeFileSync(outputPath, buffer);

  fs.copyFileSync(outputPath, path.resolve(__dirname, '..', 'assets', 'images', 'icon.png'));
  fs.copyFileSync(outputPath, path.resolve(__dirname, '..', 'assets', 'images', 'splash-icon.png'));
  fs.copyFileSync(outputPath, path.resolve(__dirname, '..', 'assets', 'images', 'favicon.png'));

  console.log('Icon generated successfully at', outputPath);
}

generateIcon().catch(console.error);
