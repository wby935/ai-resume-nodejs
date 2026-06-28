# AI 数字简历生成器 - Node.js Express 版本

基于 Python FastAPI 后端转换的 Node.js Express 版本，可直接部署到 Glitch。

## 功能特性

- 📄 上传简历文件（PDF/DOCX），自动解析内容
- 🤖 调用 DeepSeek API 分析简历，提取结构化信息
- 💾 存储到 SQLite 数据库
- 📱 生成数字简历二维码
- 💬 AI 数字分身对话功能
- 🌐 前端页面服务

## 技术栈

- **Express** - Web 框架
- **better-sqlite3** - SQLite 数据库
- **openai** - DeepSeek API 调用
- **multer** - 文件上传
- **pdf-parse** - PDF 解析
- **mammoth** - DOCX 解析
- **qrcode** - 二维码生成
- **dotenv** - 环境变量

## 快速开始

### 本地运行

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 服务地址
# http://localhost:3000
```

### 部署到 Glitch

1. 在 Glitch 上创建新项目
2. 将所有文件导入到项目中
3. 在 `.env` 文件中配置环境变量：
   - `DEEPSEEK_API_KEY` - DeepSeek API 密钥
   - `DEEPSEEK_BASE_URL` - DeepSeek API 地址
   - `FRONTEND_URL` - 你的 Glitch 项目地址
4. Glitch 会自动安装依赖并启动服务

### 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | 必填 |
| `DEEPSEEK_BASE_URL` | DeepSeek API 地址 | https://api.deepseek.com |
| `FRONTEND_URL` | 前端访问地址 | http://localhost:3000 |
| `PORT` | 服务端口 | 3000 |

## API 接口

### 简历相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/resume/upload` | POST | 上传简历文件 |
| `/api/resume/analysis/:resume_id` | GET | 获取分析结果 |
| `/api/resume/supplement` | POST | 补充简历信息 |
| `/api/resume/generate/:resume_id` | POST | 生成数字简历和二维码 |
| `/api/resume/digital/:resume_id` | GET | 获取数字简历数据 |

### 聊天相关

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/chat/message` | POST | AI 数字分身对话 |
| `/api/chat/history/:resume_id` | GET | 获取聊天记录 |

### 其他

| 接口 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/` | GET | 前端页面 |

## 项目结构

```
ai-resume-nodejs/
├── server.js           # 主服务器入口
├── config.js           # 配置文件
├── database.js         # 数据库初始化
├── models.js           # 数据模型
├── routes/
│   ├── resume.js       # 简历相关路由
│   └── chat.js         # 聊天相关路由
├── services/
│   ├── aiService.js    # AI 服务
│   ├── resumeParser.js # 简历解析服务
│   └── qrService.js    # 二维码服务
├── uploads/            # 上传文件目录
├── index.html          # 前端页面
├── package.json        # 项目配置
└── .env                # 环境变量
```

## Glitch 部署注意事项

1. Glitch 的文件系统是临时的，重启后会清空。建议：
   - 每次启动时检查数据库是否存在
   - 上传的简历文件会在重启后丢失（但数据库中的记录可能保留元数据）

2. Glitch 免费版的限制：
   - 项目休眠后首次请求会有延迟
   - CPU 和内存有限制
   - 网络请求有超时限制

3. 如果需要持久化存储：
   - 考虑使用外部数据库服务
   - 使用云存储服务保存上传的文件

## License

MIT
