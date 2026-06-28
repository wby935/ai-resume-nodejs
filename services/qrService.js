const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// 生成二维码图片
async function generateQRCode(url, outputDir = 'uploads', filename = 'qr.png') {
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filePath = path.join(outputDir, filename);
  
  // 生成二维码
  await QRCode.toFile(filePath, url, {
    version: 1,
    errorCorrectionLevel: 'L',
    boxSize: 10,
    border: 4,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });
  
  return filePath;
}

module.exports = {
  generateQRCode
};
