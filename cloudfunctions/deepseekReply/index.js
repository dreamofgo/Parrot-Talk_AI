const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({
  env: 'llm-deploy-6g57q5hueb6d38ff'
});

exports.main = async (event, context) => {
  try {
    const { message } = event;
    const db = cloud.database();
    let questionEmbedding; // 声明变量
    
    // 1. 为用户问题生成向量嵌入
    try {
      questionEmbedding = await generateEmbedding(message); // 赋值给变量
      console.log('向量嵌入生成成功:', questionEmbedding.length);
    } catch (error) {
      console.error('向量嵌入生成失败:', error);
      throw error;
    }
    
    // 2. 查找相关文档
    let relevantDocs; // 声明变量
    try {
      relevantDocs = await findSimilarDocuments(questionEmbedding, db);
      console.log('找到相关文档数量:', relevantDocs.length);
      console.log('相关文档:', JSON.stringify(relevantDocs, null, 2));
    } catch (error) {
      console.error('查找相关文档失败:', error);
      throw error;
    }
    
    // 如果没有找到相关文档，使用默认提示
    if (!relevantDocs || relevantDocs.length === 0) {
      console.log('未找到相关文档，使用默认回复');
      return await getDefaultResponse(message);
    }

    // 3. 构建更明确的系统提示
    const systemPrompt = buildPromptWithContext(relevantDocs, message);
    console.log('系统提示:', systemPrompt);
    
    // 4. 调用 DeepSeek API
    try {
      const response = await axios({
        method: 'POST',
        url: 'https://api.deepseek.com/v1/chat/completions',
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        data: {
          model: "deepseek-chat",
          messages: [
            {"role": "system", "content": systemPrompt},
            {"role": "user", "content": message}
          ],
          temperature: 0.3
        }
      });
      console.log('API 响应:', JSON.stringify(response.data, null, 2));
      return { reply: response.data.choices[0].message.content };
    } catch (error) {
      console.error('DeepSeek API 调用失败:', error.response ? error.response.data : error);
      throw error;
    }
  } catch (error) {
    console.error('完整错误信息:', error);
    return { 
      error: '抱歉，我现在无法回答，请稍后再试。',
      details: error.message || '未知错误'
    };
  }
};

// 生成向量嵌入
async function generateEmbedding(text) {
  try {
    console.log('正在生成向量嵌入，文本长度:', text.length);
    const response = await axios({
      method: 'POST',
      url: 'https://api.siliconflow.com/v1/embeddings',
      headers: {
        'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: "BAAI/bge-m3",
        input: text,
        encoding_format: "float"
      }
    });
    return response.data.data[0].embedding;
  } catch (error) {
    console.error('向量嵌入 API 调用失败:', error.response ? error.response.data : error);
    throw error;
  }
}

// 计算向量相似度
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (normA * normB);
}

// 查找相似文档
async function findSimilarDocuments(queryVector, db) {
  const docs = await db.collection('document_vectors').get();
  
  const scoredDocs = docs.data.map(doc => ({
    content: doc.content,
    similarity: cosineSimilarity(queryVector, doc.vector)
  }))
  .filter(doc => doc.similarity > 0.6); // 只保留相似度较高的文档
  
  return scoredDocs
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

// 构建系统提示
function buildPromptWithContext(relevantDocs, userQuestion) {
  let prompt = `You are a knowledgeable and friendly assistant. You have access to relevant information that will help you provide accurate and helpful answers. 

Here is the information you can reference:

`;
  
  relevantDocs.forEach((doc, index) => {
    prompt += `${doc.content}\n\n`;
  });
  
  prompt += `
Instructions for providing natural responses:
1. Use the provided information to give accurate answers, but respond in a natural, conversational way
2. Avoid phrases like "according to the context" or "based on the provided information"
3. Integrate the information smoothly into your responses as if it's your own knowledge
4. If you need to add general knowledge beyond the provided information, do so naturally
5. If you cannot answer completely, acknowledge what you know and what you're unsure about
6. Maintain a friendly, helpful tone throughout your response
7. Use simple, clear language that anyone can understand

Remember: You are having a natural conversation. The user doesn't need to know about the reference materials - just provide helpful, accurate answers in a conversational way.

Question: "${userQuestion}"`;

  return prompt;
}

// 获取默认回复
async function getDefaultResponse(message) {
  const response = await axios({
    method: 'POST',
    url: 'https://api.deepseek.com/v1/chat/completions',
    headers: {
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'application/json'
    },
    data: {
      model: "deepseek-chat",
      messages: [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": message}
      ],
      temperature: 0.7
    }
  });

  return { reply: response.data.choices[0].message.content };
}