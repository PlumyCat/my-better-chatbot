@echo off
echo ===============================================
echo Building Better Chatbot for Windows
echo ===============================================

echo.
echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Building Next.js application...
call npm run build:local

echo.
echo Step 3: Installing Electron dependencies...
call npm install --save-dev electron electron-builder cross-env
call npm install electron-is-dev electron-serve

echo.
echo Step 4: Building Windows executable...
call npx electron-builder --win

echo.
echo ===============================================
echo Build complete!
echo The executable is located in: dist-electron\
echo ===============================================
pause