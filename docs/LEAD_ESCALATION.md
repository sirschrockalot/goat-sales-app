# Lead Escalation & Document Automation

Final layer for instant SMS alerts and automated contract generation on high-margin deals.

## Overview

The Lead Escalation system provides:
1. **Real-Time SMS Alerts**: Instant notification on high-margin deals ($15k+ spread)
2. **Automated Contract Generation**: DocuSign/PandaDoc integration
3. **Partner Hand-off Logic**: Natural transition to contract generation
4. **Pre-Call Research**: Battle Intelligence injection before calls

---

## 1. Escalation Service

### Service: `src/lib/escalationService.ts`

**Function**: `processEscalation()`
- Detects commitment to sign
- Calculates estimated fee/spread
- Checks if deal qualifies ($15k+ spread)
- Sends SMS alert via Twilio
- Generates and sends Purchase Agreement

**Fee Calculation:**
```
Fee = ARV - Purchase Price - Repairs - Closing Costs (3%)
```

**Qualification:**
- Only escalates if estimated fee ≥ $15,000
- Requires commitment detected in transcript
- Requires seller email and agreed price

### SMS Alert Format

**Message:**
```
🔥 BIG DEAL ALERT: 123 Main St | Est. Fee: $15,000 | Strategy: Cash. View Transcript: https://app.com/calls/call-123
```

**Components:**
- Property address
- Estimated fee (calculated from ARV, price, repairs)
- Exit strategy (Cash, Sub-To, etc.)
- Direct link to transcript

**Twilio Configuration:**
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
ALERT_PHONE_NUMBER=+1234567890  # Your phone number
```

---

## 2. Automated Contract Generation

### Function: `sendPurchaseAgreement()`

**Integration Priority:**
1. **DocuSign** (if configured)
2. **PandaDoc** (if configured)
3. **Contract Webhook** (Zapier/Make.com fallback)

### DocuSign Integration

**Environment Variables:**
```bash
DOCUSIGN_ACCOUNT_ID=your_account_id
DOCUSIGN_INTEGRATION_KEY=your_integration_key
DOCUSIGN_USER_ID=your_user_id
DOCUSIGN_PRIVATE_KEY=your_private_key
DOCUSIGN_TEMPLATE_ID=your_template_id
```

**Template Fields Populated:**
- `seller_name`: Seller's name
- `property_address`: Property address
- `purchase_price`: Agreed price (formatted as currency)
- `closing_date`: 30 days from today
- `clause_17`: Memorandum of Contract (automatically included)

**Process:**
1. Authenticate with DocuSign (JWT)
2. Create envelope from template
3. Populate template fields
4. Add Clause 17 (Memorandum) automatically
5. Send to seller email
6. Return signing URL

### PandaDoc Integration

**Environment Variables:**
```bash
PANDADOC_API_KEY=your_api_key
PANDADOC_TEMPLATE_ID=your_template_id
```

**API Flow:**
1. Create document from template
2. Populate fields (seller name, address, price, closing date)
3. Add recipients (seller email)
4. Send document
5. Return document URL

**Template Fields:**
```json
{
  "seller_name": "John Doe",
  "property_address": "123 Main St",
  "purchase_price": "$82,700.00",
  "closing_date": "2024-02-15"
}
```

### Contract Webhook (Fallback)

**Environment Variable:**
```bash
CONTRACT_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...
```

**Payload:**
```json
{
  "callId": "call-123",
  "propertyAddress": "123 Main St",
  "sellerName": "John Doe",
  "sellerEmail": "john@example.com",
  "offerPrice": 82700,
  "exitStrategy": "cash",
  "contractType": "Purchase and Sale Agreement",
  "closingDate": "2024-02-15",
  "metadata": {
    "estimatedARV": 120000,
    "estimatedRepairs": 25000,
    "triggeredAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 3. Partner Hand-off Logic

### Base Prompt Update

**Closing Instruction:**
```
Once they agree to the price, say:

"Perfect. I'm going to have our system generate the paperwork for my partner 
to review right now. You'll see an email from us in about 3 minutes. Is it 
okay if I follow up via text once it's sent?"
```

**Key Points:**
- Use "my partner" language (not "I" or "we")
- Set expectation: "about 3 minutes"
- Ask permission for text follow-up
- Triggers automated contract generation

**Timing:**
- Say IMMEDIATELY after price agreement
- Before moving to any other topics
- Final step before ending call

---

## 4. Pre-Call Research

### Script: `src/scripts/preCallResearch.ts`

**Function**: `getBattleIntelligence()`
- Fetches last 5 cash sales from Zillow/InvestorBase
- Formats as "Battle Intelligence" (tactical framing)
- Returns formatted string for system prompt injection

**Function**: `prepareSystemPromptWithBattleIntelligence()`
- One-stop function for pre-call preparation
- Fetches neighborhood context
- Formats as Battle Intelligence
- Injects into system prompt

**Battle Intelligence Format:**
```
BATTLE INTELLIGENCE (12345):
Last 3 Cash Sales in Target Area:
1. 123 Main St: $75,000 cash (65% of ARV $120,000), 30 days ago, 5 DOM
2. 456 Oak Ave: $68,000 cash (62% of ARV $110,000), 60 days ago, 7 DOM
3. 789 Pine Rd: $82,000 cash (63% of ARV $130,000), 90 days ago, 3 DOM

Average Cash-to-ARV: 63%
Market Heat: Active

USE THIS INTELLIGENCE:
- Cite specific addresses when justifying your offer
- Reference average cash-to-ARV percentage when seller pushes back
- Use recent sales dates to show market activity
```

**Usage:**
```bash
npm run research:pre-call "123 Main St" "12345" "City" "State"
```

**Integration:**
- Automatically injected in `/api/vapi/create-assistant`
- Only for real calls (not role-reversal training)
- Requires property address and zip code

---

## Integration Flow

### Call Completion Flow

1. **Call Ends** → Webhook receives transcript
2. **Commitment Detection** → `detectCommitmentToSign()`
3. **Fee Calculation** → Calculate estimated fee
4. **Qualification Check** → Fee ≥ $15k?
5. **SMS Alert** → Send via Twilio
6. **Contract Generation** → DocuSign/PandaDoc/webhook
7. **Logging** → Store results in database

### Pre-Call Flow

1. **Call Initiated** → Property address provided
2. **Neighborhood Pulse** → Fetch last 5 cash comps
3. **Battle Intelligence** → Format as tactical intelligence
4. **System Prompt Injection** → Prepend to base prompt
5. **Call Starts** → AI has real-time market data

---

## Environment Variables

### Required

```bash
# Twilio (SMS Alerts)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
ALERT_PHONE_NUMBER=+1234567890  # Your phone number

# Contract Generation (choose one)
DOCUSIGN_ACCOUNT_ID=your_account_id
DOCUSIGN_INTEGRATION_KEY=your_integration_key
DOCUSIGN_USER_ID=your_user_id
DOCUSIGN_PRIVATE_KEY=your_private_key
DOCUSIGN_TEMPLATE_ID=your_template_id

# OR
PANDADOC_API_KEY=your_api_key
PANDADOC_TEMPLATE_ID=your_template_id

# OR (fallback)
CONTRACT_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...

# Market Data
INVESTORBASE_API_KEY=your_investorbase_key
ZILLOW_API_KEY=your_zillow_key
```

---

## DocuSign Setup

### 1. Create Template

1. Go to DocuSign → Templates
2. Create Purchase Agreement template
3. Add merge fields:
   - `seller_name`
   - `property_address`
   - `purchase_price`
   - `closing_date`
4. Include Clause 17 (Memorandum) in template
5. Save template ID

### 2. API Integration

**JWT Authentication:**
- Generate JWT token for API access
- Store in `DOCUSIGN_PRIVATE_KEY`
- Use for envelope creation

**Envelope Creation:**
```typescript
// Create envelope from template
POST https://demo.docusign.net/restapi/v2.1/accounts/{accountId}/envelopes
{
  "templateId": "template-123",
  "templateRoles": [{
    "email": "seller@example.com",
    "name": "John Doe",
    "roleName": "Signer"
  }],
  "status": "sent"
}
```

---

## PandaDoc Setup

### 1. Create Template

1. Go to PandaDoc → Templates
2. Create Purchase Agreement template
3. Add fields:
   - `seller_name` (text)
   - `property_address` (text)
   - `purchase_price` (text)
   - `closing_date` (date)
4. Include Clause 17 (Memorandum) in template
5. Save template UUID

### 2. API Integration

**Create Document:**
```typescript
POST https://api.pandadoc.com/public/v1/documents
{
  "name": "Purchase Agreement - 123 Main St",
  "template_uuid": "template-123",
  "recipients": [{
    "email": "seller@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "Signer"
  }],
  "fields": {
    "seller_name": "John Doe",
    "property_address": "123 Main St",
    "purchase_price": "$82,700.00",
    "closing_date": "2024-02-15"
  }
}
```

**Send Document:**
```typescript
POST https://api.pandadoc.com/public/v1/documents/{documentId}/send
{
  "message": "Please review and sign the Purchase Agreement.",
  "subject": "Purchase Agreement - 123 Main St"
}
```

---

## Usage Examples

### SMS Alert

**Trigger:**
- Commitment detected: "I'll sign" or "Send me the contract"
- Estimated fee: $18,500 (ARV $120k - Price $82.7k - Repairs $25k - Closing $2.5k)
- Qualifies: Yes ($18.5k > $15k threshold)

**SMS Sent:**
```
🔥 BIG DEAL ALERT: 123 Main St, City, State | Est. Fee: $18,500 | Strategy: Cash. View Transcript: https://app.com/calls/call-123
```

### Contract Generation

**Trigger:**
- Same conditions as SMS alert
- Seller email available
- Contract service configured

**Result:**
- DocuSign/PandaDoc contract created
- Sent to seller email
- Contract URL logged

### Pre-Call Research

**Before Call:**
```bash
npm run research:pre-call "123 Main St" "12345" "City" "State"
```

**Output:**
```
🎯 BATTLE INTELLIGENCE INJECTED

BATTLE INTELLIGENCE (12345):
Last 3 Cash Sales in Target Area:
1. 123 Main St: $75,000 cash (65% of ARV $120,000), 30 days ago, 5 DOM
2. 456 Oak Ave: $68,000 cash (62% of ARV $110,000), 60 days ago, 7 DOM

Average Cash-to-ARV: 63%
Market Heat: Active

✅ System prompt prepared with 3 cash comps
```

---

## Best Practices

1. **SMS Alerts:**
   - Only for high-margin deals ($15k+)
   - Include direct transcript link
   - Format strategy clearly

2. **Contract Generation:**
   - Always include Clause 17 (Memorandum)
   - Set closing date to 30 days
   - Use partner language in email

3. **Pre-Call Research:**
   - Fetch before every real call
   - Fallback gracefully if API unavailable
   - Use "Battle Intelligence" framing

4. **Partner Hand-off:**
   - Say immediately after price agreement
   - Set 3-minute expectation
   - Ask for text follow-up permission

---

## Summary

The Lead Escalation system provides:
- ✅ **Real-Time SMS Alerts**: Instant notification on $15k+ deals
- ✅ **Automated Contracts**: DocuSign/PandaDoc integration
- ✅ **Partner Hand-off**: Natural transition to contract generation
- ✅ **Pre-Call Research**: Battle Intelligence injection

All systems are ready for production with instant alerts, automated document generation, and real-time market intelligence.
