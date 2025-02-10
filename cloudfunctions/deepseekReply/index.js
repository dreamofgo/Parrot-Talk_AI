const cloud = require('wx-server-sdk');
const axios = require('axios');

// 明确指定环境
cloud.init({
  env: 'llm-deploy-6g57q5hueb6d38ff'  // 使用相同的环境ID
});

exports.main = async (event, context) => {
  try {
    const { message } = event;
    
    // 从环境变量获取配置
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    
    // 根据文档，API 端点应该是 https://api.deepseek.com/v1/chat/completions
    const response = await axios({
      method: 'POST',
      url: 'https://api.deepseek.com/v1/chat/completions',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: "deepseek-chat", // 使用 DeepSeek-V3 模型
        messages: [
          {"role": "system", "content": "You are a helpful assistant."},
          {"role": "user", "content": message}
        ],
        temperature: 0.7,
        stream: false
      }
    });

    // 根据文档返回格式提取回复内容
    return {
      reply: response.data.choices[0].message.content
    };
  } catch (error) {
    console.error('DeepSeek API 调用失败：', error);
    return {
      error: '抱歉，我现在无法回答，请稍后再试。'
    };
  }
}; 