const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 确保数据目录存在
const dataDir = path.join(__dirname);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'app.db');
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 初始化数据库表
function initDatabase() {
  // 创建简历表
  db.exec(`
    CREATE TABLE IF NOT EXISTS resumes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resume_id TEXT UNIQUE NOT NULL,
      original_filename TEXT,
      resume_text TEXT,
      extracted_info TEXT,
      missing_fields TEXT,
      questions TEXT,
      supplementary_info TEXT DEFAULT '{}',
      digital_resume_url TEXT,
      qr_code_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建聊天消息表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resume_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (resume_id) REFERENCES resumes(resume_id) ON DELETE CASCADE
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_resumes_resume_id ON resumes(resume_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_resume_id ON chat_messages(resume_id);
  `);

  console.log('数据库初始化完成');
}

// 初始化
initDatabase();

module.exports = db;
