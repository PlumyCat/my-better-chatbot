#!/bin/bash

echo "==============================================="
echo "Building Better Chatbot for Windows"
echo "==============================================="

echo ""
echo "Step 1: Installing dependencies..."
pnpm install

echo ""
echo "Step 2: Building Next.js application..."
pnpm run build:local

echo ""
echo "Step 3: Installing Electron dependencies..."
pnpm add -D electron electron-builder cross-env
pnpm add electron-is-dev electron-serve

echo ""
echo "Step 4: Creating standalone build..."
# Ensure the standalone build has all necessary files
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public .next/standalone/ 2>/dev/null || true

echo ""
echo "Step 5: Building Windows executable..."
npx electron-builder --win

echo ""
echo "==============================================="
echo "Build complete!"
echo "The executable is located in: dist-electron/"
echo "==============================================="