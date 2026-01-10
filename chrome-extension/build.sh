#!/bin/bash

# Build script for Chrome Extension
# Compiles TypeScript and bundles for extension

echo "Building Chrome Extension..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build TypeScript/React code
echo "Compiling TypeScript..."
npx tsc --project tsconfig.json

# Bundle with webpack
echo "Bundling with webpack..."
npx webpack --config webpack.config.js

# Copy static files
echo "Copying static files..."
cp manifest.json dist/
cp popup.html dist/
cp popup.js dist/
cp content.css dist/
cp -r icons dist/ 2>/dev/null || true

echo "Build complete! Extension files are in ./dist"
echo "Load the 'dist' folder in Chrome Extensions (Developer Mode)"
