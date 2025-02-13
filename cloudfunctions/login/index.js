const cloud = require('wx-server-sdk');

cloud.init({
  env: 'llm-deploy-6g57q5hueb6d38ff'  // 使用相同的云环境ID
});

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const db = cloud.database();
  
  try {
    // 如果没有传入用户信息，只返回openid
    if (!event.userInfo) {
      return {
        success: true,
        isLoggedIn: false
      };
    }

    // 获取用户信息
    let userInfo;
    try {
      userInfo = await db.collection('users')
        .where({
          _openid: wxContext.OPENID
        })
        .get();
    } catch (error) {
      // 如果集合不存在，创建集合并返回空数组
      if (error.errCode === -502005) {
        userInfo = { data: [] };
      } else {
        throw error;
      }
    }

    // 如果是首次登录或更新用户信息
    if (!userInfo.data.length) {
      // 创建新用户
      const result = await db.collection('users').add({
        data: {
          _openid: wxContext.OPENID,
          avatarUrl: event.userInfo.avatarUrl,
          nickName: event.userInfo.nickName,
          createTime: db.serverDate(),
          lastLoginTime: db.serverDate()
        }
      });
      
      userInfo = await db.collection('users').doc(result._id).get();
    } else {
      // 更新用户信息
      await db.collection('users').doc(userInfo.data[0]._id).update({
        data: {
          avatarUrl: event.userInfo.avatarUrl,
          nickName: event.userInfo.nickName,
          lastLoginTime: db.serverDate()
        }
      });
      userInfo = await db.collection('users').doc(userInfo.data[0]._id).get();
    }

    // 如果有手机号信息，更新用户手机号
    if (event.phoneInfo) {
      // 解密手机号信息
      const res = await cloud.openapi.security.getPhoneNumber({
        code: event.phoneInfo.code
      });
      
      await db.collection('users').doc(userInfo.data[0]._id).update({
        data: {
          phoneNumber: res.phoneInfo.phoneNumber,
          lastLoginTime: db.serverDate()
        }
      });

      userInfo.data[0].phoneNumber = res.phoneInfo.phoneNumber;
    }

    return {
      success: true,
      isLoggedIn: true,
      userInfo: {
        _openid: wxContext.OPENID,
        avatarUrl: userInfo.data.avatarUrl || event.userInfo.avatarUrl,
        nickName: userInfo.data.nickName || event.userInfo.nickName,
        createTime: userInfo.data.createTime,
        lastLoginTime: userInfo.data.lastLoginTime
      }
    };
  } catch (error) {
    console.error('登录失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}; 