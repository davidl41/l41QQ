@echo off
chcp 65001 >nul
title l41果冻铺 - Q弹果冻动图工坊
echo ========================================================
echo   l41果冻铺 · 角色智能抠图与 Q 弹果冻工坊
echo   正在启动本地服务并为您自动打开浏览器...
echo ========================================================
cd /d "%~dp0"
start "" "http://localhost:3000"
node_modules\.bin\tsx.cmd server.ts
pause