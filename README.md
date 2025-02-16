# 学舌AI智能助手

一个基于deepseek-V3的智能文档问答助手，利用RAG技术让用户可以通过上传文档来轻松搭建私有知识库，支持多种格式文档的上传、向量化处理和智能问答功能。

## 功能特点

- 支持多种文档格式
  - Word文档 (.docx)
  - PDF文件 (.pdf)
  - 文本文件 (.txt)，支持UTF-8和GBK编码

- 智能文档处理
  - 基于BAAI/bge-m3的embedding架构
  - 自动文档解析
  - 文本分块处理
  - 向量化存储
  - 相似度匹配

- 用户系统
  - 微信授权登录
  - 用户信息管理
  - 文档管理
  - 向量库后台管理
  - 聊天历史记录

- 智能对话
  - 基于文档的智能问答
  - 语音输入支持
  - 实时对话界面

## 技术架构

### 前端（微信小程序）
- 基于微信小程序原生框架
- 组件化开发
- TabBar导航（对话页、用户页）

### 后端（云开发）
- 云函数
  - processDocument: 文档处理
  - login: 用户登录
  - checkLogin: 登录状态检查
  - deepseekReply: AI回复生成

- 云数据库
  - users: 用户信息
  - document_vectors: 文档向量
  - user_documents: 用户文档
  - chat_history: 聊天记录

- 云存储
  - 文档存储
  - 用户信息

## 核心功能实现

### 文档处理流程
1. 文件上传至云存储
2. 根据文件类型解析内容
3. 文本清理和分块
4. 生成向量嵌入
5. 存储到向量数据库

### 智能问答流程
1. 用户输入向量化
2. 相似度匹配
3. 检索相关文档
4. 生成AI回复

## 部署说明

1. 环境要求
   - 微信开发者工具
   - 微信小程序云开发环境

2. 配置步骤
   ```javascript
   // 修改 app.js 中的环境ID
   wx.cloud.init({
     env: 'your-env-id',
     traceUser: true,
   });
   ```

3. 安装依赖
   ```bash
   # 在 cloudfunctions/processDocument 目录下
   npm install mammoth pdf-parse iconv-lite axios
   ```

4. 必要的云开发配置
   - 创建必要的数据库集合
   - 配置安全规则
   - 上传云函数

## 注意事项

- 文件大小限制：单个文件不超过20MB
- 支持的文件格式：.docx, .pdf, .txt
- 个人重新部署需要在云环境中配置相应的API密钥（如SiliconFlow API）

## 贡献指南

欢迎提交Issue和Pull Request来帮助改进项目。

## 许可证

本项目基于MIT协议开源。
