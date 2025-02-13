Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    isLoading: false,
    avatarUrl: '/images/default-avatar.png',
    nickName: '',
    documentCount: 0,
    chatCount: 0,
    recentDocuments: [],
    recentChats: []
  },

  onLoad() {
    // 页面加载时不再自动检查登录状态
  },

  onShow() {
    console.log('页面显示');  // 调试日志
    if (this.data.userInfo) {
      this.loadUserStats();
      this.loadRecentData();
    }
  },

  async handleLogin() {
    if (this.data.isLoading) return;
    if (!this.data.avatarUrl || !this.data.nickName) {
      wx.showToast({
        title: '请选择头像并输入昵称',
        icon: 'none'
      });
      return;
    }

    try {
      this.setData({ 
        isLoading: true
      });

      // 获取登录code
      const loginResult = await wx.login();
      
      // 调用登录云函数
      const { result } = await wx.cloud.callFunction({
        name: 'login',
        data: {
          code: loginResult.code,
          userInfo: {
            avatarUrl: this.data.avatarUrl,
            nickName: this.data.nickName
          }
        }
      });

      if (result.success && result.isLoggedIn) {
        this.setData({
          userInfo: result.userInfo,
          isLoggedIn: true
        });
        
        // 登录成功后加载数据
        this.loadUserStats();
        this.loadRecentData();

        wx.showToast({
          title: '登录成功',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('登录过程出错:', error);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ 
        isLoading: false
      });
    }
  },

  preventTouchMove() {
    return;
  },

  async loadUserStats() {
    try {
      const db = wx.cloud.database();
      
      // 获取文档数量
      const { total: docCount } = await db.collection('user_documents')
        .where({
          _openid: this.data.userInfo._openid
        })
        .count();
      
      // 获取对话数量
      const { total: msgCount } = await db.collection('chat_history')
        .where({
          _openid: this.data.userInfo._openid
        })
        .count();

      this.setData({
        documentCount: docCount,
        chatCount: msgCount
      });
    } catch (error) {
      console.error('加载用户统计失败:', error);
    }
  },

  async loadRecentData() {
    const db = wx.cloud.database();
    try {
      // 获取最近5个文档
      const docsRes = await db.collection('user_documents')
        .where({
          _openid: this.data.userInfo._openid
        })
        .orderBy('uploadTime', 'desc')
        .limit(5)
        .get();

      // 获取最近5条对话
      const chatsRes = await db.collection('chat_history')
        .where({
          _openid: this.data.userInfo._openid
        })
        .orderBy('createTime', 'desc')
        .limit(5)
        .get();

      this.setData({
        recentDocuments: docsRes.data,
        recentChats: chatsRes.data
      });
    } catch (error) {
      console.error('加载最近数据失败:', error);
    }
  },

  handleCancel() {
    this.setData({
      isLoading: false
    });
    wx.showToast({
      title: '已取消授权',
      icon: 'none'
    });
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      avatarUrl
    });
  },

  onInputNickname(e) {
    this.setData({
      nickName: e.detail.value
    });
  }
}); 