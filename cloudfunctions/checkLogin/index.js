const cloud = require('wx-server-sdk');
cloud.init();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  
  try {
    // 获取用户信息
    const db = cloud.database();
    const userInfo = await db.collection('users')
      .where({
        _openid: wxContext.OPENID
      })
      .get();

    // 如果找到用户信息，说明已登录
    if (userInfo.data.length > 0) {
      return {
        isLoggedIn: true,
        userInfo: {
          _openid: wxContext.OPENID,
          ...userInfo.data[0]
        }
      };
    }

    // 未找到用户信息，说明未登录
    return {
      isLoggedIn: false
    };
  } catch (error) {
    console.error('检查登录状态失败:', error);
    return {
      isLoggedIn: false,
      error: error.message
    };
  }
}; 