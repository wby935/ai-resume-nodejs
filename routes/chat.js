const express = require('express');
const { Resume, ChatMessage } = require('../models');
const { chatAsDigitalTwin } = require('../services/aiService');

const router = express.Router();

/**
 * POST /api/chat/message
 * 与AI数字分身对话
 */
router.post('/message', async (req, res) => {
  try {
    const { resume_id, message, history } = req.body;

    if (!resume_id || !message) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 查找简历
    const resume = Resume.findByResumeId(resume_id);
    if (!resume) {
      return res.status(404).json({ error: '简历不存在' });
    }

    if (!resume.extracted_info) {
      return res.status(400).json({ error: '简历尚未分析完成' });
    }

    // 构建完整的简历数据
    const resumeData = {
      extracted_info: resume.extracted_info
    };

    const supplementaryInfo = resume.supplementary_info || {};

    // 调用AI生成回复
    let reply;
    try {
      reply = await chatAsDigitalTwin(
        resumeData,
        supplementaryInfo,
        message,
        history || []
      );
    } catch (aiError) {
      return res.status(500).json({ error: `AI对话失败: ${aiError.message}` });
    }

    // 保存聊天记录
    ChatMessage.create({
      resume_id,
      role: 'user',
      content: message
    });

    ChatMessage.create({
      resume_id,
      role: 'assistant',
      content: reply
    });

    res.json({ reply });

  } catch (error) {
    console.error('聊天错误:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/chat/history/:resume_id
 * 获取聊天记录
 */
router.get('/history/:resume_id', async (req, res) => {
  try {
    const { resume_id } = req.params;
    const messages = ChatMessage.getHistory(resume_id);

    res.json(messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      time: msg.created_at
    })));

  } catch (error) {
    console.error('获取聊天记录错误:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
