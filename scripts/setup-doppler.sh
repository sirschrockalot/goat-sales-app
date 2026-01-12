#!/bin/bash

# Doppler Setup Script for Goat Sales App
# Configures Doppler project, configs, and required secrets

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 DOPPLER SETUP - Goat Sales App"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Doppler is installed
if ! command -v doppler &> /dev/null; then
  echo -e "${RED}❌ Doppler CLI not found${NC}"
  echo "Install from: https://docs.doppler.com/docs/install-cli"
  exit 1
fi

echo -e "${GREEN}✅ Doppler CLI found${NC}"
echo ""

# Check if authenticated
if ! doppler me &> /dev/null; then
  echo -e "${YELLOW}⚠️  Not authenticated with Doppler${NC}"
  echo "Logging in..."
  doppler login
fi

echo -e "${GREEN}✅ Authenticated with Doppler${NC}"
echo ""

# Project name
PROJECT_NAME="goat-sales-app"
DEV_CONFIG="dev_goat-sales-app"
PROD_CONFIG="prd_goat-sales-app"

# Step 1: Create or verify project
echo -e "${BLUE}📦 Step 1: Setting up project...${NC}"
if doppler projects get "$PROJECT_NAME" &> /dev/null; then
  echo -e "${GREEN}✅ Project '$PROJECT_NAME' already exists${NC}"
else
  echo "Creating project '$PROJECT_NAME'..."
  doppler projects create "$PROJECT_NAME"
  echo -e "${GREEN}✅ Project created${NC}"
fi
echo ""

# Step 2: Verify environments exist
echo -e "${BLUE}🌍 Step 2: Verifying environments...${NC}"

# Check if dev environment exists (slug: dev)
if doppler environments get dev --project "$PROJECT_NAME" &> /dev/null; then
  echo -e "${GREEN}✅ Environment 'dev' exists${NC}"
  DEV_ENV="dev"
else
  echo -e "${YELLOW}⚠️  Environment 'dev' not found. Using 'Development' instead.${NC}"
  DEV_ENV="Development"
fi

# Check if prod environment exists (slug: prd)
if doppler environments get prd --project "$PROJECT_NAME" &> /dev/null; then
  echo -e "${GREEN}✅ Environment 'prd' exists${NC}"
  PROD_ENV="prd"
elif doppler environments get Production --project "$PROJECT_NAME" &> /dev/null; then
  echo -e "${GREEN}✅ Environment 'Production' exists${NC}"
  PROD_ENV="Production"
else
  echo -e "${YELLOW}⚠️  Production environment not found. Using 'prd' as fallback.${NC}"
  PROD_ENV="prd"
fi
echo ""

# Step 3: Create configs
echo -e "${BLUE}⚙️  Step 3: Setting up configs...${NC}"

# Dev config
if doppler configs get "$DEV_CONFIG" --project "$PROJECT_NAME" &> /dev/null; then
  echo -e "${GREEN}✅ Config '$DEV_CONFIG' already exists${NC}"
else
  echo "Creating '$DEV_CONFIG' config with environment '$DEV_ENV'..."
  doppler configs create "$DEV_CONFIG" --project "$PROJECT_NAME" --environment "$DEV_ENV"
  echo -e "${GREEN}✅ Config '$DEV_CONFIG' created${NC}"
fi

# Prod config
if doppler configs get "$PROD_CONFIG" --project "$PROJECT_NAME" &> /dev/null; then
  echo -e "${GREEN}✅ Config '$PROD_CONFIG' already exists${NC}"
else
  echo "Creating '$PROD_CONFIG' config with environment '$PROD_ENV'..."
  doppler configs create "$PROD_CONFIG" --project "$PROJECT_NAME" --environment "$PROD_ENV"
  echo -e "${GREEN}✅ Config '$PROD_CONFIG' created${NC}"
fi
echo ""

# Step 4: Setup local machine
echo -e "${BLUE}🔧 Step 4: Configuring local machine...${NC}"
doppler setup --project "$PROJECT_NAME" --config "$DEV_CONFIG"
echo -e "${GREEN}✅ Local machine configured${NC}"
echo ""

# Step 5: Display required secrets
echo -e "${BLUE}📋 Step 5: Required Secrets${NC}"
echo ""
echo "The following secrets need to be set in Doppler:"
echo ""
echo -e "${YELLOW}Required Secrets:${NC}"
echo "  - OPENAI_API_KEY"
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo "  - SUPABASE_SANDBOX_URL (for sandbox environment)"
echo "  - VAPI_SECRET_KEY"
echo "  - NEXT_PUBLIC_VAPI_API_KEY"
echo ""
echo -e "${YELLOW}Optional Secrets:${NC}"
echo "  - ELEVEN_LABS_API_KEY"
echo "  - DEEPGRAM_API_KEY"
echo "  - SLACK_WEBHOOK_URL"
echo "  - TWILIO_ACCOUNT_SID"
echo "  - TWILIO_AUTH_TOKEN"
echo "  - TWILIO_PHONE_NUMBER"
echo "  - ALERT_PHONE_NUMBER"
echo "  - DOCUSIGN_ACCOUNT_ID"
echo "  - DOCUSIGN_INTEGRATION_KEY"
echo "  - DOCUSIGN_USER_ID"
echo "  - DOCUSIGN_PRIVATE_KEY"
echo "  - DOCUSIGN_TEMPLATE_ID"
echo "  - PANDADOC_API_KEY"
echo "  - PANDADOC_TEMPLATE_ID"
echo "  - CONTRACT_WEBHOOK_URL"
echo "  - INVESTORBASE_API_KEY"
echo "  - ZILLOW_API_KEY"
echo "  - CRON_SECRET"
echo "  - NEXT_PUBLIC_APP_URL"
echo ""
echo -e "${YELLOW}To set secrets, run:${NC}"
echo "  doppler secrets set KEY=value --config $DEV_CONFIG"
echo ""
echo -e "${YELLOW}Or set multiple at once:${NC}"
echo "  doppler secrets set \\"
echo "    OPENAI_API_KEY=sk-... \\"
echo "    NEXT_PUBLIC_SUPABASE_URL=https://... \\"
echo "    --config $DEV_CONFIG"
echo ""
echo -e "${YELLOW}To view current secrets:${NC}"
echo "  doppler secrets --config $DEV_CONFIG"
echo ""

# Step 6: Interactive secret setup
read -p "Would you like to set secrets interactively now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${BLUE}🔑 Interactive Secret Setup${NC}"
  echo "Press Enter to skip any secret you don't have yet"
  echo ""
  
  # Required secrets
  read -p "OPENAI_API_KEY: " OPENAI_API_KEY
  if [ ! -z "$OPENAI_API_KEY" ]; then
    doppler secrets set OPENAI_API_KEY="$OPENAI_API_KEY" --config "$DEV_CONFIG" --no-interactive
    echo -e "${GREEN}✅ Set OPENAI_API_KEY${NC}"
  fi
  
  read -p "NEXT_PUBLIC_SUPABASE_URL: " SUPABASE_URL
  if [ ! -z "$SUPABASE_URL" ]; then
    doppler secrets set NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL" --config "$DEV_CONFIG" --no-interactive
    echo -e "${GREEN}✅ Set NEXT_PUBLIC_SUPABASE_URL${NC}"
  fi
  
  read -p "SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_KEY
  if [ ! -z "$SUPABASE_KEY" ]; then
    doppler secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_KEY" --config "$DEV_CONFIG" --no-interactive
    echo -e "${GREEN}✅ Set SUPABASE_SERVICE_ROLE_KEY${NC}"
  fi
  
  read -p "SUPABASE_SANDBOX_URL (optional): " SANDBOX_URL
  if [ ! -z "$SANDBOX_URL" ]; then
    doppler secrets set SUPABASE_SANDBOX_URL="$SANDBOX_URL" --config "$DEV_CONFIG" --no-interactive
    echo -e "${GREEN}✅ Set SUPABASE_SANDBOX_URL${NC}"
  fi
  
  read -p "VAPI_SECRET_KEY: " VAPI_SECRET
  if [ ! -z "$VAPI_SECRET" ]; then
    doppler secrets set VAPI_SECRET_KEY="$VAPI_SECRET" --config "$DEV_CONFIG" --no-interactive
    echo -e "${GREEN}✅ Set VAPI_SECRET_KEY${NC}"
  fi
  
  read -p "NEXT_PUBLIC_VAPI_API_KEY: " VAPI_PUBLIC
  if [ ! -z "$VAPI_PUBLIC" ]; then
    doppler secrets set NEXT_PUBLIC_VAPI_API_KEY="$VAPI_PUBLIC" --config "$DEV_CONFIG" --no-interactive
    echo -e "${GREEN}✅ Set NEXT_PUBLIC_VAPI_API_KEY${NC}"
  fi
  
  echo ""
  echo -e "${GREEN}✅ Secret setup complete!${NC}"
  echo ""
  echo "You can add more secrets later with:"
  echo "  doppler secrets set KEY=value --config $DEV_CONFIG"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Doppler setup complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "  1. Verify secrets: doppler secrets --config $DEV_CONFIG"
echo "  2. Run app with Doppler: doppler run -- npm run dev"
echo "  3. Or use in scripts: doppler run -- npm run <script>"
echo ""
echo "To switch configs:"
echo "  doppler setup --project $PROJECT_NAME --config $DEV_CONFIG  # Development"
echo "  doppler setup --project $PROJECT_NAME --config $PROD_CONFIG  # Production"
echo ""
