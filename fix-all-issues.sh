#!/bin/bash
echo "🔧 应用所有核心修复..."

cd ~/Desktop/veweb-demo

# 1. 同步已修复的文件
echo "1️⃣ 同步DemoLoginPage..."
cp ~/Desktop/Veweb/vew-web/src/pages/DemoLoginPage.tsx vew-web/src/pages/DemoLoginPage.tsx

echo "2️⃣ 同步ProtectedRoute..."
cp ~/Desktop/Veweb/vew-web/src/components/ProtectedRoute.tsx vew-web/src/components/ProtectedRoute.tsx

echo "3️⃣ 同步App.tsx..."
cp ~/Desktop/Veweb/vew-web/src/App.tsx vew-web/src/App.tsx

echo "4️⃣ 同步InteractiveRecordPage..."
cp ~/Desktop/Veweb/vew-web/src/pages/InteractiveRecordPage.tsx vew-web/src/pages/InteractiveRecordPage.tsx

echo "5️⃣ 同步HomePage..."  
cp ~/Desktop/Veweb/vew-web/src/pages/HomePage.tsx vew-web/src/pages/HomePage.tsx

echo "✅ 所有文件同步完成"
