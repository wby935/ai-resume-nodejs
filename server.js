require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config');

// 导入路由
const resumeRouter = require('./routes/resume');
const chatRouter = require('./routes/chat');

// 创建Express应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（二维码图片等）
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// 注册API路由
app.use('/api/resume', resumeRouter);
app.use('/api/chat', chatRouter);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 服务前端页面
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('<h1>前端页面未找到</h1>');
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

// 启动服务器
const PORT = config.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 AI数字简历服务已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📁 上传目录: ${uploadsDir}`);
  console.log(`🔗 前端URL: ${config.FRONTEND_URL}`);
});

module.exports = app;
