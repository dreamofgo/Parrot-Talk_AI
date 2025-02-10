const cloud = require('wx-server-sdk');
const axios = require('axios');
const mammoth = require('mammoth'); // 用于处理 Word 文档
const iconv = require('iconv-lite'); // 用于处理编码
const pdf = require('pdf-parse');

cloud.init();

exports.main = async (event, context) => {
  const { fileID } = event;
  
  try {
    // 1. 下载文件
    const res = await cloud.downloadFile({
      fileID: fileID,
    });
    const buffer = res.fileContent;
    
    // 2. 根据文件类型处理内容
    let content = '';
    const fileName = fileID.toLowerCase();
    
    if (fileName.endsWith('.docx')) {
      // 处理 Word 文档
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } else if (fileName.endsWith('.pdf')) {
      // 处理 PDF 文件
      const data = await pdf(buffer);
      content = data.text;
    } else if (fileName.endsWith('.txt')) {
      // 处理文本文件，尝试处理编码
      try {
        content = buffer.toString('utf8');
      } catch (e) {
        // 如果 UTF-8 失败，尝试 GBK
        content = iconv.decode(buffer, 'gbk');
      }
    } else {
      throw new Error('不支持的文件格式');
    }
    
    // 清理文本内容
    content = cleanText(content);
    
    // 3. 文本分块
    const chunks = splitIntoChunks(content);
    
    // 4. 为每个文本块生成向量嵌入
    const embeddings = await Promise.all(
      chunks.map(chunk => generateEmbedding(chunk))
    );
    
    // 5. 保存向量化后的文档块
    const db = cloud.database();
    await Promise.all(
      chunks.map((chunk, index) => {
        return db.collection('document_vectors').add({
          data: {
            fileID,
            content: chunk,
            vector: embeddings[index],
            timestamp: new Date()
          }
        });
      })
    );
    
    return { success: true };
  } catch (error) {
    console.error('处理文档失败：', error);
    return { success: false, error: error.message };
  }
};

// 清理文本内容
function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')           // 合并多个空白字符
    .replace(/\n+/g, ' ')           // 处理换行
    .replace(/[^\S\r\n]+/g, ' ')    // 合并多个空格
    .trim();                        // 去除首尾空白
}

// 文本分块函数
function splitIntoChunks(text, maxChunkSize = 1000) {
  // 首先按句子分割
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+/g) || [text];
  const chunks = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxChunkSize) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  
  return chunks;
}

// 生成文本向量嵌入
async function generateEmbedding(text) {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.siliconflow.com/v1/embeddings', // SiliconFlow API 端点
      headers: {
        'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: "BAAI/bge-m3",  // 使用 BAAI/bge-m3 模型
        input: text,           // 输入文本
        encoding_format: "float" // 返回浮点数格式的向量
      }
    });
    
    return response.data.data[0].embedding;
  } catch (error) {
    console.error('生成向量嵌入失败：', error);
    throw error;
  }
}