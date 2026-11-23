@echo off
chcp 65001 >nul
title K.R. Mangalam University - Campus Events
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed.
  echo  Download the LTS version from https://nodejs.org , install it, then run this file again.
  echo.
  pause
  exit /b 1
)
if not exist node_modules (
  echo  First run: installing dependencies. This takes a few minutes...
  call npm install
)
echo.
echo  Starting Campus Events... the browser will open at http://localhost:5180
echo  Keep this window open. Press Ctrl+C to stop.
echo.
start "" cmd /c "timeout /t 10 >nul & start http://localhost:5180"
call npm run dev
pause
