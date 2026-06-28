const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// 解析简历文件，支持PDF和DOCX格式
async function parseResume(filePath, filename) {
  const ext = path.extname(filename).toLowerCase();
  
  if (ext === '.pdf') {
    return await parsePdf(filePath);
  } else if (ext === '.docx' || ext === '.doc') {
    return await parseDocx(filePath);
  } else {
    throw new Error(`不支持的文件格式: ${ext}，仅支持 PDF 和 DOCX`);
  }
}

// 解析PDF文件
async function parsePdf(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`PDF解析失败: ${error.message}`);
  }
}

// 解析DOCX文件
async function parseDocx(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    throw new Error(`DOCX解析失败: ${error.message}`);
  }
}

module.exports = {
  parseResume
};
