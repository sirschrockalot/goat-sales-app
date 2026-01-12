#!/bin/bash

# Goat Sync - Environment Setup Automation Script
# Handles npm install, Doppler setup, Supabase initialization, and Docker launch

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐐 GOAT SYNC - Environment Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: npm install
echo -e "${YELLOW}📦 Step 1: Installing dependencies...${NC}"
if [ ! -d "node_modules" ]; then
  npm install
  echo -e "${GREEN}✅ Dependencies installed${NC}"
else
  echo -e "${GREEN}✅ Dependencies already installed (skipping)${NC}"
fi
echo ""

# Step 2: Doppler setup
echo -e "${YELLOW}🔐 Step 2: Setting up Doppler...${NC}"
if command -v doppler &> /dev/null; then
  # Check if already authenticated
  if doppler me &> /dev/null; then
    echo -e "${GREEN}✅ Doppler already authenticated${NC}"
  else
    echo "Doppler login required..."
    doppler login
  fi
  
  # Setup Doppler project/config
  if [ -z "$DOPPLER_PROJECT" ] || [ -z "$DOPPLER_CONFIG" ]; then
    echo "Setting up Doppler project and config..."
    doppler setup
  else
    echo -e "${GREEN}✅ Doppler project/config already set${NC}"
  fi
else
  echo -e "${RED}⚠️  Doppler CLI not found. Install from: https://docs.doppler.com/docs/install-cli${NC}"
  echo "Continuing without Doppler (using local env vars)..."
fi
echo ""

# Step 3: Supabase setup
echo -e "${YELLOW}🗄️  Step 3: Initializing Supabase local database...${NC}"
if command -v supabase &> /dev/null; then
  # Check if Supabase is already running
  if supabase status &> /dev/null; then
    echo -e "${GREEN}✅ Supabase already running${NC}"
    echo "Stopping existing instance to apply fresh migrations..."
    supabase stop
  fi
  
  # Start Supabase (runs migrations and seed.sql automatically)
  echo "Starting Supabase with migrations and seed data..."
  supabase start
  
  echo -e "${GREEN}✅ Supabase initialized${NC}"
  echo ""
  echo "Supabase Status:"
  supabase status
else
  echo -e "${RED}⚠️  Supabase CLI not found. Install from: https://supabase.com/docs/guides/cli${NC}"
  echo "Continuing without Supabase (using Docker Postgres)..."
fi
echo ""

# Step 4: Docker Compose
echo -e "${YELLOW}🐳 Step 4: Launching Docker services...${NC}"
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
  # Check if containers are already running
  if docker-compose ps | grep -q "Up"; then
    echo "Docker containers already running. Restarting..."
    docker-compose down
  fi
  
  # Build and start services
  echo "Building and starting Docker services..."
  docker-compose up -d --build
  
  echo -e "${GREEN}✅ Docker services started${NC}"
  echo ""
  echo "Docker Status:"
  docker-compose ps
else
  echo -e "${RED}⚠️  Docker not found. Install from: https://docs.docker.com/get-docker/${NC}"
  echo "Skipping Docker setup..."
fi
echo ""

# Step 5: Verify environment
echo -e "${YELLOW}🔍 Step 5: Verifying environment...${NC}"

# Check Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
else
  echo -e "${RED}❌ Node.js not found${NC}"
fi

# Check npm
if command -v npm &> /dev/null; then
  NPM_VERSION=$(npm --version)
  echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
else
  echo -e "${RED}❌ npm not found${NC}"
fi

# Check TypeScript
if command -v tsc &> /dev/null; then
  TS_VERSION=$(tsc --version)
  echo -e "${GREEN}✅ TypeScript: $TS_VERSION${NC}"
else
  echo -e "${YELLOW}⚠️  TypeScript not found globally (may be in node_modules)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Environment setup complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Run 'npm run dev' to start the development server"
echo "  2. Access app at http://localhost:3000"
echo "  3. Supabase Studio at http://localhost:54323"
echo "  4. Check Docker containers: docker-compose ps"
echo ""
echo "To sync secrets from Doppler:"
echo "  doppler run -- npm run dev"
echo ""
