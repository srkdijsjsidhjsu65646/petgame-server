@echo off
chcp 65001
title 我的小鲨鲨 - 服务器启动中
echo ========================================
echo   我的小鲨鲨 云端服务器
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 没有检测到 Node.js
    echo.
    echo 请先安装 Node.js：
    echo 1. 打开浏览器访问 https://nodejs.org/zh-cn/
    echo 2. 下载左边那个"LTS"长期支持版
    echo 3. 双击安装，一路点"下一步"
    echo 4. 安装完后重新双击这个启动文件
    echo.
    pause
    exit
)

echo [1/3] 检测到 Node.js，正在安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败，请检查网络
    pause
    exit
)

echo.
echo [2/3] 依赖安装完成
echo.
echo [3/3] 服务器启动中...
echo.
echo ========================================
echo   服务器地址: http://你电脑的IP:3000
echo   管理后台: http://你电脑的IP:3000/admin
echo   管理密码: Admin@2026#PetGame
echo ========================================
echo.
echo 按 Ctrl+C 停止服务器
echo.

node server.js
pause
