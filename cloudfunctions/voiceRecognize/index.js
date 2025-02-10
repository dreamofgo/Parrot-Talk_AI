const cloud = require('wx-server-sdk');
cloud.init();
const axios = require('axios');

exports.main = async (event) => {
  const { filePath } = event;
  const file = await cloud.downloadFile({ fileID: filePath });
  
  const response = await axios.post('https://api.deepseek.com/v1/speech', file.fileContent, {
    headers: {
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      'Content-Type': 'audio/wav'
    }
  });

  return response.data.text;
}; 