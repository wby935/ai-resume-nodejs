const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Resume } = require('../models');
const { analyzeResume } = require('../services/aiService');
const { parseResume } = require('../services/resumeParser');
const { generateQRCode } = require('../services/qrService');
const config = require('../config');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const resumeId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${resumeId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.docx', '.doc'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 PDF 和 DOCX 格式'), false);
    }
  }
});

/**
 * POST /api/resume/upload
 * 上传简历文件并解析
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传简历文件' });
    }

    const resumeId = uuidv4();
    const filePath = req.file.path;
    const originalFilename = req.file.originalname;

    // 解析简历
    let resumeText;
    try {
      resumeText = await parseResume(filePath, originalFilename);
    } catch (parseError) {
      // 清理临时文件
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: parseError.message });
    }

    // AI分析简历
    let analysisResult;
    try {
      analysisResult = await analyzeResume(resumeText);
    } catch (aiError) {
      // 清理临时文件
      fs.unlinkSync(filePath);
      return res.status(500).json({ error: `AI分析失败: ${aiError.message}` });
    }

    // 保存到数据库
    const resumeData = {
      resume_id: resumeId,
      original_filename: originalFilename,
      resume_text: resumeText,
      extracted_info: analysisResult.extracted_info || {},
      missing_fields: analysisResult.missing_fields || [],
      questions: analysisResult.questions || []
    };

       console.log('准备保存到数据库，resume_id:', resumeId);
    try {
      const result = Resume.create(resumeData);
      console.log('数据库保存成功，影响行数:', result.changes);
      const verify = Resume.findByResumeId(resumeId);
      console.log('验证查询结果:', verify ? '找到' : '未找到');
    } catch (dbError) {
      console.error('数据库保存失败:', dbError);
      fs.unlinkSync(filePath);
      return res.status(500).json({ error: `数据库保存失败: ${dbError.message}` });
    }

    res.json({
      resume_id: resumeId,
      message: '简历上传成功，请查看AI分析结果并补充信息'
    });

  } catch (error) {
    console.error('上传简历错误:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/resume/analysis/:resume_id
 * 获取AI分析结果
 */
router.get('/analysis/:resume_id', async (req, res) => {
  try {
    const { resume_id } = req.params;
    const resume = Resume.findByResumeId(resume_id);

    if (!resume) {
      return res.status(404).json({ error: '简历不存在' });
    }

    res.json({
      resume_id: resume.resume_id,
      extracted_info: resume.extracted_info,
      missing_fields: resume.missing_fields,
      questions: resume.questions
    });

  } catch (error) {
    console.error('获取分析结果错误:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/resume/supplement
 * 用户补充信息
 */
router.post('/supplement', async (req, res) => {
  try {
    const { resume_id, supplementary_info } = req.body;

    if (!resume_id) {
      return res.status(400).json({ error: '缺少resume_id参数' });
    }

    const resume = Resume.findByResumeId(resume_id);
    if (!resume) {
      return res.status(404).json({ error: '简历不存在' });
    }

    // 合并补充信息
    const existingSupplement = resume.supplementary_info || {};
    const mergedSupplement = { ...existingSupplement, ...supplementary_info };

    Resume.update(resume_id, { supplementary_info: mergedSupplement });

    res.json({ message: '补充信息已保存' });

  } catch (error) {
    console.error('补充信息错误:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/resume/generate/:resume_id
 * 生成数字简历和二维码
 */
router.post('/generate/:resume_id', async (req, res) => {
  try {
    const { resume_id } = req.params;
    const resume = Resume.findByResumeId(resume_id);

    if (!resume) {
      return res.status(404).json({ error: '简历不存在' });
    }

    // 生成数字简历URL
    const digitalUrl = `${config.FRONTEND_URL}/?mode=hr&resume_id=${resume_id}`;

    // 生成二维码
    const qrFilename = `${resume_id}_qr.png`;
    let qrPath;
    try {
      qrPath = await generateQRCode(digitalUrl, UPLOAD_DIR, qrFilename);
    } catch (qrError) {
      console.error('生成二维码失败:', qrError);
      qrPath = null;
    }

    // 更新数据库
    Resume.update(resume_id, {
      digital_resume_url: digitalUrl,
      qr_code_path: qrPath ? `/uploads/${qrFilename}` : null
    });

    res.json({
      resume_id: resume_id,
      digital_resume_url: digitalUrl,
      qr_code_url: qrPath ? `/uploads/${qrFilename}` : null
    });

  } catch (error) {
    console.error('生成数字简历错误:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/resume/digital/:resume_id
 * 获取数字简历数据（给前端展示用）
 */
router.get('/digital/:resume_id', async (req, res) => {
  try {
    const { resume_id } = req.params;
    const resume = Resume.findByResumeId(resume_id);

    if (!resume) {
      return res.status(404).json({ error: '简历不存在' });
    }

    res.json({
      resume_id: resume.resume_id,
      extracted_info: resume.extracted_info,
      supplementary_info: resume.supplementary_info
    });

  } catch (error) {
    console.error('获取数字简历错误:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
