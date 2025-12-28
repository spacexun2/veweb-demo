# Vew Web版开发文档

本目录包含Vew智能录屏工具Web版的完整开发文档。

## 📚 文档目录

1. **[web_version_prd.md](./web_version_prd.md)** - 产品需求文档
   - 产品概述和核心功能
   - 页面结构和设计
   - 技术架构
   - UI/UX设计原则
   - 迭代计划

2. **[api_documentation.md](./api_documentation.md)** - API文档
   - Node.js API (7个endpoints)
   - Python AI API (2个endpoints)
   - 完整示例和调试工具
   - Postman Collection

3. **[implementation_guide.md](./implementation_guide.md)** - 实现指南
   - 核心代码实现
   - React组件示例
   - 性能优化方案
   - 常见错误和避坑指南

## 🚀 快速开始

### 1. 阅读顺序

新开发者建议按以下顺序阅读：

1. **PRD** → 了解产品定位和功能
2. **API文档** → 熟悉后端接口
3. **实现指南** → 开始编码

### 2. 启动后端服务

Web版需要现有的后端服务支持：

```bash
cd /Users/bytedance/Desktop/Vew_antigravity
./scripts/run-with-logs.sh
```

### 3. 创建Web项目

```bash
npx create-vite vew-web --template react-ts
cd vew-web
npm install
npm install axios zustand tailwindcss @tanstack/react-virtual
```

### 4. 测试API

```bash
# 健康检查
curl http://localhost:8001/health

# 获取视频列表
curl http://localhost:3001/api/videos
```

## 📋 开发检查清单

### 基础功能
- [ ] 屏幕录制 (MediaRecorder API)
- [ ] 视频上传
- [ ] 历史列表展示
- [ ] 视频播放

### AI功能
- [ ] 触发AI处理
- [ ] 轮询处理状态
- [ ] 显示转录结果
- [ ] 显示摘要和时间轴

### 批量操作
- [ ] 复选框选择
- [ ] 批量处理
- [ ] 批量删除
- [ ] 批量导出SRT

### 优化
- [ ] 虚拟列表
- [ ] 懒加载
- [ ] 错误处理
- [ ] Loading状态

## 🔧 技术栈

- **前端**: React 18 + TypeScript + Vite
- **UI**: TailwindCSS + shadcn/ui
- **状态**: Zustand
- **HTTP**: Axios
- **后端**: 复用现有Node.js + Python服务

## 📞 联系方式

遇到问题请查看 `implementation_guide.md` 的避坑指南部分。

---

**版本**: 1.0  
**更新时间**: 2025-12-23
