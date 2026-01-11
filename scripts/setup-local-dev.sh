#!/bin/bash
# Setup Local Development Environment
# This script helps set up the local development environment

set -e

echo "🐐 Setting up Sales Goat Local Development Environment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop first."
  exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "⚠️  Supabase CLI not found. Installing..."
  npm install -g supabase
else
  echo "✅ Supabase CLI is installed"
fi

echo ""

# Create .env.development if it doesn't exist
if [ ! -f .env.development ]; then
  echo "📝 Creating .env.development from template..."
  cp env.development.example .env.development
  echo "✅ Created .env.development"
  echo "   ⚠️  Please edit .env.development and add your OPENAI_API_KEY"
else
  echo "✅ .env.development already exists"
fi

echo ""

# Create .env.production if it doesn't exist
if [ ! -f .env.production ]; then
  echo "📝 Creating .env.production from template..."
  cp env.production.example .env.production
  echo "✅ Created .env.production"
  echo "   ⚠️  Please edit .env.production and add your production credentials"
else
  echo "✅ .env.production already exists"
fi

echo ""
echo "🚀 Starting local Supabase..."
supabase start

echo ""
echo "⏳ Waiting for Supabase to be ready..."
sleep 5

echo ""
echo "🌱 Seeding database with test data..."
npm run db:seed

echo ""
echo "✅ Local development environment is ready!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env.development and add your OPENAI_API_KEY"
echo "   2. Run: npm run dev:local"
echo "   3. Open http://localhost:3000"
echo ""
echo "👥 Test users (password: testpassword123):"
echo "   - sarah.johnson@test.com (Admin)"
echo "   - mike.chen@test.com"
echo "   - emma.rodriguez@test.com"
echo ""
