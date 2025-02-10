const cloud = require('wx-server-sdk');
cloud.init();

// 云函数入口函数
exports.main = async (event, context) => {
  const { message } = event;
  // 这里可以调用第三方API或自定义逻辑来生成回复
  const reply = `Echo: ${message}`; // 示例回复
  return {
    reply
  }
}; 