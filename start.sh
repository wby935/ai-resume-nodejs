#!/bin/bash
# Glitch 启动脚本
# 使用 node 运行时加载本地 better-sqlite3

# Glitch 会自动安装依赖
# 如果需要本地构建原生模块
if [ -f "package.json" ]; then
  echo "Installing dependencies..."
  npm install
  
  # 对于 better-sqlite3，可能需要 rebuild
  if [ -d "node_modules/better-sqlite3" ]; then
    echo "Building better-sqlite3..."
    cd node_modules/better-sqlite3
    npm run build-release
    cd ../..
  fi
fi

# 启动应用
echo "Starting server..."
node server.js
