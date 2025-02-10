Page({
  data: {
    messages: [
      { role: 'bot', content: '您好！我是智能助手' }, // 添加初始测试消息
      { role: 'user', content: '你好！' }
    ],
    inputValue: '',
    isRecording: false
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
            icon: 'none'
          });
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
        wx.showToast({
          title: '发送失败，请重试',
          icon: 'none'
        });
        console.error('调用失败：', err);
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
    wx.showLoading({ title: '加载中' });
    // 模拟数据请求
    setTimeout(() => {
      this.setData({ messages: [{
        role: 'bot',
        content: '欢迎使用智能聊天'
      }] });
      wx.hideLoading();
    }, 500);
  },

  // 添加滚动到底部方法
  scrollToBottom() {
    const lastIndex = this.data.messages.length - 1;
    this.setData({
      lastId: `msg-${lastIndex}`
    });
  }
}); 