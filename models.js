const db = require('./database');

// Resume 模型操作
const Resume = {
  /**
   * 创建简历记录
   */
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO resumes (
        resume_id, original_filename, resume_text,
        extracted_info, missing_fields, questions, supplementary_info
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.resume_id,
      data.original_filename,
      data.resume_text,
      JSON.stringify(data.extracted_info || {}),
      JSON.stringify(data.missing_fields || []),
      JSON.stringify(data.questions || []),
      JSON.stringify(data.supplementary_info || {})
    );
    
    return result;
  },

  /**
   * 根据resume_id查找简历
   */
  findByResumeId(resume_id) {
    const stmt = db.prepare('SELECT * FROM resumes WHERE resume_id = ?');
    const row = stmt.get(resume_id);
    return row ? this._parseRow(row) : null;
  },

  /**
   * 更新简历
   */
  update(resume_id, data) {
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      updates.push(`${key} = ?`);
      values.push(key === 'supplementary_info' ? JSON.stringify(value) : value);
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(resume_id);
    
    const stmt = db.prepare(`UPDATE resumes SET ${updates.join(', ')} WHERE resume_id = ?`);
    return stmt.run(...values);
  },

  /**
   * 删除简历
   */
  delete(resume_id) {
    const stmt = db.prepare('DELETE FROM resumes WHERE resume_id = ?');
    return stmt.run(resume_id);
  },

  /**
   * 解析数据库行数据
   */
  _parseRow(row) {
    return {
      ...row,
      extracted_info: row.extracted_info ? JSON.parse(row.extracted_info) : null,
      missing_fields: row.missing_fields ? JSON.parse(row.missing_fields) : [],
      questions: row.questions ? JSON.parse(row.questions) : [],
      supplementary_info: row.supplementary_info ? JSON.parse(row.supplementary_info) : {}
    };
  }
};

// ChatMessage 模型操作
const ChatMessage = {
  /**
   * 创建聊天消息
   */
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO chat_messages (resume_id, role, content)
      VALUES (?, ?, ?)
    `);
    
    return stmt.run(data.resume_id, data.role, data.content);
  },

  /**
   * 获取简历的聊天历史
   */
  getHistory(resume_id) {
    const stmt = db.prepare(`
      SELECT * FROM chat_messages 
      WHERE resume_id = ? 
      ORDER BY created_at ASC
    `);
    
    return stmt.all(resume_id);
  },

  /**
   * 删除简历的所有聊天记录
   */
  deleteByResumeId(resume_id) {
    const stmt = db.prepare('DELETE FROM chat_messages WHERE resume_id = ?');
    return stmt.run(resume_id);
  }
};

module.exports = {
  Resume,
  ChatMessage
};
