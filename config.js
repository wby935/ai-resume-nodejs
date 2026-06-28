require('dotenv').config();

// 从环境变量读取配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;

module.exports = {
  DEEPSEEK_API_KEY,
  DEEPSEEK_BASE_URL,
  FRONTEND_URL,
  PORT
};
