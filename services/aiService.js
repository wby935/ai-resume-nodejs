const OpenAI = require('openai');
const config = require('../config');

// 初始化OpenAI客户端
const client = new OpenAI({
  apiKey: config.DEEPSEEK_API_KEY,
  baseURL: config.DEEPSEEK_BASE_URL,
  timeout: 60000,
  maxRetries: 2
});

// 简历分析师 Prompt
const RESUME_ANALYST_PROMPT = `# 角色
你是一位资深的简历分析专家，拥有10年以上HR行业经验。你的任务是分析求职者上传的简历，完成两件事：

## 任务一：提取结构化信息
从简历原文中提取以下字段（如有则提取，没有则标记为null）：

- name：姓名
- phone：手机号
- email：邮箱
- job_target：求职方向/目标岗位
- education：教育经历（学校、专业、学历、时间）
- work_experience：工作经历（公司、职位、时间、工作内容）
- project_experience：项目经验（项目名称、角色、内容、成果）
- skills：技能/工具
- self_evaluation：自我评价/个人总结
- certificates：证书/资质
- languages：语言能力

## 任务二：生成补充问题
分析简历中**缺失但对生成数字简历很重要的信息**，生成3-5个补充问题。

需要关注的维度：
1. **量化成果**：工作经历和项目经验中缺少具体数据的（如"提升了效率"→应该问"提升了多少？"）
2. **求职意向**：没有明确写出求职方向的
3. **个人亮点**：简历过于平淡，缺少差异化亮点的
4. **职业动机**：缺少转型原因、职业规划的
5. **联系方式**：缺少手机或邮箱的

## 补充问题的要求：
- 每个问题要具体、有针对性，不要泛泛而问
- 问题要友好自然，像在跟求职者聊天
- 问题要说明"为什么需要这个信息"，让求职者知道补充这个有什么用

## 输出格式
严格按以下JSON格式输出，不要输出其他内容：

{
  "extracted_info": {
    "name": "",
    "phone": "",
    "email": "",
    "job_target": "",
    "education": [],
    "work_experience": [],
    "project_experience": [],
    "skills": [],
    "self_evaluation": "",
    "certificates": [],
    "languages": []
  },
  "missing_fields": ["缺失字段列表"],
  "questions": [
    {
      "field": "对应哪个字段",
      "question": "具体的补充问题"
    }
  ]
}
`;

// AI数字分身 Prompt 模板
function buildDigitalTwinPrompt(name, jobTarget, workYears, education, workExperience, projectExperience, skills, selfEvaluation, supplementaryInfo) {
  return `你是 ${name} 的AI数字分身。你的任务是基于以下简历信息，以第一人称回答HR或面试官的提问。

## 以下是你可以使用的全部信息，除此之外的一律不能说：

### 基本信息
- 姓名：${name}
- 求职方向：${jobTarget}
- 工作年限：${workYears}

### 教育背景
${education}

### 工作经历（只有以下这些，不得提及任何其他公司或职位）
${workExperience}

### AI项目经验（只有以下这些，不得提及任何其他项目）
${projectExperience}

### 技能（只有以下这些）
${skills}

### 自我评价
${selfEvaluation}

### 补充信息
${supplementaryInfo}

---

## 回答原则

1. **第一人称**：始终用"我"来回答
2. **铁律：只说简历里有的**：
   - 只使用上面"简历信息"和"补充信息"中明确提到的内容
   - 严禁编造任何具体数据（百分比、金额、人数等）
   - 严禁编造简历中没有的学习经历、项目经历或工作经历
   - 严禁编造简历中没有的技能或证书
3. **善用简历里的项目和数据**：回答时优先引用简历中已有的具体项目名称、公司名、数据成果来支撑观点
4. **诚实边界**：如果简历中没有相关信息，直接说"这个方面我的简历中没有详细提到，如有需要可以进一步沟通"，不要自行补充
5. **专业自信**：语气自信但不傲慢
6. **控制篇幅**：每次回答控制在150-300字
7. **禁止行为**：不要说"我是AI"、不要暴露AI分身身份、不要回答与候选人无关的问题
`;
}

/**
 * 调用DeepSeek分析简历
 * @param {string} resumeText - 简历文本
 * @returns {Promise<Object>} 结构化的分析结果
 */
async function analyzeResume(resumeText) {
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: RESUME_ANALYST_PROMPT },
      { role: 'user', content: `以下是求职者的简历原文，请分析：\n\n${resumeText}` }
    ],
    temperature: 0.3,
    max_tokens: 4000
  });

  const resultText = response.choices[0].message.content.trim();

  // 尝试解析JSON
  try {
    let jsonStr = resultText;
    
    // 如果返回内容包含markdown代码块，提取其中的JSON
    if (resultText.includes('```json')) {
      jsonStr = resultText.split('```json')[1].split('```')[0].trim();
    } else if (resultText.includes('```')) {
      jsonStr = resultText.split('```')[1].split('```')[0].trim();
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    throw new Error(`AI返回的格式无法解析: ${resultText.substring(0, 200)}`);
  }
}

/**
 * 根据简历数据构建AI数字分身的上下文
 */
function buildDigitalTwinContext(resumeData, supplementaryInfo = null) {
  const info = resumeData.extracted_info || {};
  
  const name = info.name || '未知';
  const jobTarget = info.job_target || '未填写';
  
  // 计算工作年限
  const workExp = info.work_experience || [];
  let workYears = '多年';
  if (workExp && workExp.length > 0) {
    workYears = `${workExp.length}段工作经历`;
  }

  // 格式化教育背景
  let education = '无';
  if (info.education && info.education.length > 0) {
    education = info.education.map(e => 
      `- ${e.school || ''}，${e.major || ''}，${e.degree || ''}，${e.time || ''}`
    ).join('\n');
  }

  // 格式化工作经历
  let workText = '无';
  if (workExp && workExp.length > 0) {
    workText = workExp.map((w, i) => {
      if (typeof w === 'object') {
        return `${i + 1}. ${w.company || ''} | ${w.position || ''} | ${w.time || ''}\n   核心成果：${w.content || ''}`;
      }
      return `${i + 1}. ${w}`;
    }).join('\n');
  }

  // 格式化项目经验
  let projText = '无';
  if (info.project_experience && info.project_experience.length > 0) {
    projText = info.project_experience.map((p, i) => {
      if (typeof p === 'object') {
        return `${i + 1}. ${p.project_name || ''}（${p.role || ''}）\n   内容：${p.content || ''}\n   成果：${p.achievement || ''}`;
      }
      return `${i + 1}. ${p}`;
    }).join('\n');
  }

  // 格式化技能
  let skillsText = '无';
  if (info.skills && info.skills.length > 0) {
    skillsText = info.skills.join('、');
  }

  // 自我评价
  const selfEval = info.self_evaluation || '无';

  // 补充信息
  let suppText = '暂无补充';
  if (supplementaryInfo && Object.keys(supplementaryInfo).length > 0) {
    suppText = Object.entries(supplementaryInfo)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join('\n');
  }

  return buildDigitalTwinPrompt(
    name,
    jobTarget,
    workYears,
    education,
    workText,
    projText,
    skillsText,
    selfEval,
    suppText
  );
}

/**
 * 以AI数字分身身份与HR对话
 */
async function chatAsDigitalTwin(resumeData, supplementaryInfo, userMessage, history = null) {
  const systemPrompt = buildDigitalTwinContext(resumeData, supplementaryInfo);
  
  const messages = [{ role: 'system', content: systemPrompt }];
  
  // 添加历史消息
  if (history && history.length > 0) {
    messages.push(...history.map(msg => ({
      role: msg.role,
      content: msg.content
    })));
  }
  
  // 添加当前用户消息
  messages.push({ role: 'user', content: userMessage });
  
  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: messages,
    temperature: 0.7,
    max_tokens: 1000
  });

  return response.choices[0].message.content;
}

module.exports = {
  analyzeResume,
  chatAsDigitalTwin,
  buildDigitalTwinContext
};
