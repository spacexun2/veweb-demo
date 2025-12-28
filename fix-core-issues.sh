#!/bin/bash
# 核心功能修复脚本

echo "🔧 开始修复核心功能..."

# 1. 修改账号邮箱：数字前缀
echo "1️⃣ 修改测试账号前缀为数字..."
cd ~/Desktop/veweb-demo/vew-backend

# 使用sed批量替换
sed -i.bak "s/pm@veweb.com/1@veweb.com/g" demo-auth.js
sed -i.bak "s/dev@veweb.com/2@veweb.com/g" demo-auth.js  
sed -i.bak "s/boss@veweb.com/3@veweb.com/g" demo-auth.js
sed -i.bak "s/designer@veweb.com/4@veweb.com/g" demo-auth.js
sed -i.bak "s/qa@veweb.com/5@veweb.com/g" demo-auth.js
sed -i.bak "s/marketing@veweb.com/6@veweb.com/g" demo-auth.js
sed -i.bak "s/sales@veweb.com/7@veweb.com/g" demo-auth.js
sed -i.bak "s/hr@veweb.com/8@veweb.com/g" demo-auth.js
sed -i.bak "s/finance@veweb.com/9@veweb.com/g" demo-auth.js
sed -i.bak "s/ceo@veweb.com/10@veweb.com/g" demo-auth.js

echo "✅ 账号前缀已修改为数字"
echo ""
echo "🔐 新的测试账号："
echo "  1@veweb.com  - 产品经理"
echo "  2@veweb.com  - 开发工程师"
echo "  3@veweb.com  - 老板"
echo "  4@veweb.com  - 设计师"
echo "  5@veweb.com  - 测试工程师"
echo "  6@veweb.com  - 市场经理"
echo "  7@veweb.com  - 销售经理"
echo "  8@veweb.com  - HR经理"
echo "  9@veweb.com  - 财务经理"
echo "  10@veweb.com - CEO"

echo ""
echo "✅ 修复完成！"
