Page({
  data: {
    messages: [
      { role: 'bot', content: '您好！我是学舌AI智能助手' }, // 添加初始测试消息
      { role: 'user', content: '你好！' }
    ],
    inputValue: '',
    isRecording: false,
    documents: [] // 存储文档列表
  },

  // 输入处理
  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  // 发送消息
  sendMessage() {
    const message = this.data.inputValue;
    if (!message.trim()) return;

    // 添加用户消息到界面
    const userMessage = { role: 'user', content: message };
    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: ''
    });

    // 调用云函数获取 DeepSeek 回复
    wx.showLoading({ title: '思考中...' });
    wx.cloud.callFunction({
      name: 'deepseekReply',
      data: { message },
      success: res => {
        if (res.result.error) {
          wx.showToast({
            title: res.result.error,
            icon: 'none',
            duration: 3000
          });
          console.error('API 调用详细错误:', res.result.details);
          return;
        }
        
        // 添加机器人回复到界面
        const botMessage = { role: 'bot', content: res.result.reply };
        this.setData({
          messages: [...this.data.messages, botMessage]
        });
        this.scrollToBottom();
      },
      fail: err => {
        console.error('云函数调用失败:', err);
        wx.showToast({
          title: '发送失败，请重试',
          icon: 'none',
          duration: 3000
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  handleSend() {
    wx.request({
      url: 'https://api.weixin.qq.com/cgi-bin/message/custom/send',
      method: 'POST',
      data: {
        touser: '用户openid',
        msgtype: 'text',
        text: { content: '这是自动回复内容' }
      },
      success() {
        console.log('消息发送成功');
      }
    });
  },

  // 开始录音
  startRecord() {
    this.setData({ isRecording: true });
    wx.startRecord({
      success: res => this.handleRecordSuccess(res),
      fail: err => this.handleRecordError(err)
    });
  },

  // 停止录音
  stopRecord() {
    this.setData({ isRecording: false });
    wx.stopRecord();
  },

  // 处理录音成功
  async handleRecordSuccess(res) {
    wx.showLoading({ title: '识别中...' });
    try {
      const text = await this.recognizeVoice(res.tempFilePath);
      this.setData({ inputValue: text });
    } catch (err) {
      wx.showToast({ title: '识别失败', icon: 'none' });
    }
    wx.hideLoading();
  },

  // 调用云函数识别语音
  recognizeVoice(filePath) {
    return wx.cloud.callFunction({
      name: 'voiceRecognize',
      data: { filePath }
    }).then(res => res.result);
  },

  // 获取位置信息
  getLocation() {
    wx.getLocation({
      type: 'wgs84',
      success: res => {
        console.log('经度:', res.longitude, '纬度:', res.latitude);
      },
      fail: err => {
        wx.showToast({ title: '获取位置失败', icon: 'none' });
      }
    });
  },

  onLoad() {
    this.loadDocuments();
  },

  // 添加滚动到底部方法
  scrollToBottom() {
    const lastIndex = this.data.messages.length - 1;
    this.setData({
      lastId: `msg-${lastIndex}`
    });
  },

  // 上传文档
  uploadDocument() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['txt', 'docx', 'pdf'], // 支持的文件格式
      success: res => {
        const file = res.tempFiles[0];
        // 检查文件大小
        if (file.size > 20 * 1024 * 1024) { // 20MB 限制
          wx.showToast({
            title: '文件过大',
            icon: 'none'
          });
          return;
        }
        this.uploadToCloud(file);
      }
    });
  },

  // 上传到云存储
  async uploadToCloud(file) {
    wx.showLoading({ title: '上传中...' });
    try {
      // 1. 上传文件到云存储
      const cloudPath = `documents/${Date.now()}-${file.name}`;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: file.path,
      });

      // 2. 调用云函数处理文档
      await wx.cloud.callFunction({
        name: 'processDocument',
        data: { fileID: uploadRes.fileID }
      });

      // 3. 保存文档信息
      const db = wx.cloud.database();
      await db.collection('user_documents').add({
        data: {
          fileID: uploadRes.fileID,
          name: file.name,
          uploadTime: new Date()
        }
      });

      // 4. 更新文档列表
      this.loadDocuments();
      wx.showToast({ title: '上传成功' });
    } catch (error) {
      console.error('上传失败：', error);
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
    wx.hideLoading();
  },

  // 加载文档列表
  async loadDocuments() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('user_documents').get();
      this.setData({ documents: res.data });
    } catch (error) {
      console.error('加载文档列表失败：', error);
      if (error.errCode === -502005) {
        wx.showToast({
          title: '请先创建数据库集合',
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  // 删除文档
  async deleteDocument(e) {
    const fileID = e.currentTarget.dataset.id;
    try {
      // 1. 删除云存储中的文件
      await wx.cloud.deleteFile({ fileList: [fileID] });
      
      const db = wx.cloud.database();
      // 2. 删除文档记录
      await db.collection('user_documents')
        .where({ fileID })
        .remove();
      
      // 3. 删除向量化的文档块
      await db.collection('document_vectors')
        .where({ fileID })
        .remove();

      // 4. 更新列表
      this.loadDocuments();
      wx.showToast({ title: '删除成功' });
    } catch (error) {
      wx.showToast({ title: '删除失败', icon: 'none' });
    }
  }
}); 