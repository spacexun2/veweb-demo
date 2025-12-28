# 🚀 Veweb Demo 傻瓜式部署指南

**目标**：20分钟内让产品经理通过网络访问你的demo

---

## 📋 准备工作（5分钟）

### 1. 注册必要账号

```bash
# 打开浏览器，注册以下账号（用GitHub登录最快）:

1. GitHub账号: https://github.com (如果没有)
2. Railway账号: https://railway.app (用GitHub登录)
3. Vercel账号: https://vercel.com (用GitHub登录)
```

✅ 完成后继续

---

## Step 1: 推送代码到GitHub（5分钟）

### 打开终端，复制粘贴以下命令：

```bash
cd /Users/bytedance/Desktop/Veweb

# 初始化Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Demo deployment ready"
```

### 在GitHub创建仓库

1. 访问 https://github.com/new
2. 仓库名输入：`veweb-demo`
3. 选择 **Public**
4. **不要**勾选任何初始化选项
5. 点击 "Create repository"

### 推送代码

复制GitHub页面显示的命令，类似这样：

```bash
git remote add origin https://github.com/你的用户名/veweb-demo.git
git branch -M main
git push -u origin main
```

✅ **刷新GitHub页面，看到代码就成功了**

---

## Step 2: 部署Backend到Railway（5分钟）

### 在Railway创建项目

1. 访问 https://railway.app/new
2. 点击 "Deploy from GitHub repo"
3. 如果第一次使用，点击 "Configure GitHub App"授权
4. 选择 `veweb-demo` 仓库
5. Railway会自动开始部署

### 配置环境变量

1. 在Railway项目页面，点击你的服务
2. 点击 "Variables" 标签
3. 添加以下变量（点击 "+ New Variable"）：

```
DASHSCOPE_CHAT_API_KEY=你的key
MODELSCOPE_API_KEY=你的key
DASHSCOPE_TTS_API_KEY=你的key
NODE_ENV=production
PORT=3001
```

4. 点击 "Deploy" 重新部署

### 获取Railway URL

1. 在项目页面，点击 "Settings"
2. 找到 "Public Networking" 部分
3. 点击 "Generate Domain"
4. 复制生成的URL，例如：`https://veweb-demo-production.up.railway.app`

✅ **保存这个URL，待会要用！**

---

## Step 3: 部署Frontend到Vercel（5分钟）

### 打开终端，执行：

```bash
cd /Users/bytedance/Desktop/Veweb/vew-web

# 安装Vercel CLI（如果还没有）
npm install -g vercel

# 登录Vercel
vercel login
# 按提示在浏览器完成登录

# 部署!
vercel --prod
```

### 配置环境变量

部署完成后会给你一个URL，但先别急着访问。需要先配置后端地址：

1. 访问 https://vercel.com/dashboard
2. 找到 `veweb` 项目，点击进入
3. 点击 "Settings" → "Environment Variables"
4. 添加以下变量：

```
Name: VITE_API_URL
Value: https://你的railway域名 (就是Step 2保存的URL)

Name: VITE_WS_URL  
Value: wss://你的railway域名 (把https改成wss)
```

5. 点击 "Save"

### 重新部署使变量生效

回到终端：

```bash
vercel --prod
```

✅ **完成！会给你最终的URL**

---

## 🎉 测试访问

访问Vercel给你的URL，例如：`https://veweb-xxx.vercel.app`

应该看到登录页面，测试账号：

- 产品经理：`pm@veweb.com` / `demo123`
- 开发工程师：`dev@veweb.com` / `demo123`  
- 老板：`boss@veweb.com` / `demo123`

**每个账号的数据互相隔离！**

---

## ❓ 遇到问题？

### Railway部署失败
- 检查环境变量是否都填了
- 查看Logs，截图发给我

### Vercel部署失败
- 确保在 `vew-web` 目录执行命令
- 运行 `npm run build` 测试本地构建

### 页面打不开
- 等1-2分钟让Railway完全启动
- 清除浏览器缓存重试

---

## 📱 分享给产品经理

把Vercel URL发给产品经理：

```
嗨，这是Veweb的demo：
https://你的vercel域名

测试账号：
产品经理：pm@veweb.com / demo123
开发：dev@veweb.com / demo123
老板：boss@veweb.com / demo123

每个账号数据隔离，可以同时登录不同账号测试！
```

---

## 需要帮助吗？

遇到问题就：
1. 截图错误信息
2. 告诉我在哪一步卡住了
3. 我帮你解决！
