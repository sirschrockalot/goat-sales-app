# Pre-Flight Updates

Final updates before starting autonomous training: Live Data Injection, Lead Escalation, and Compliance logic.

## Overview

The Pre-Flight updates add:
1. **Neighborhood Context Hook**: Real-time market comps injection
2. **Closing Webhook**: Automatic contract generation on commitment
3. **Professional Disclosure**: Natural AI disclosure with Eric Cline rebuttal
4. **Metadata Logging**: Exit strategy tracking for decision auditing

---

## 1. Neighborhood Context Hook

### Service: `src/lib/neighborhoodPulse.ts`

**Function**: `getNeighborhoodPulse()`
- Fetches last 3-5 cash comps from Zillow/InvestorBase
- Filters to cash sales only
- Formats as "Current Market Intelligence" string

**Injection**: `prepareCallWithNeighborhoodContext()`
- Prepends market intelligence to system prompt
- Runs before simulation or live call starts
- One-stop function for call preparation

**Market Intelligence Format:**
```
CURRENT MARKET INTELLIGENCE (12345):
Last 3 Cash Sales in This Area:
1. 123 Main St: $75,000 cash (65% of ARV $120,000), 30 days ago, 5 DOM
2. 456 Oak Ave: $68,000 cash (62% of ARV $110,000), 60 days ago, 7 DOM
3. 789 Pine Rd: $82,000 cash (63% of ARV $130,000), 90 days ago, 3 DOM

Average Cash-to-ARV: 63%
Use this data to justify your offer. Cite specific addresses when relevant.
```

**Integration:**
- Automatically injected in `/api/vapi/create-assistant`
- Only for non-role-reversal calls (real calls, not training)
- Requires property address and zip code

---

## 2. Closing Webhook

### Service: `src/lib/callActions.ts`

**Function**: `detectCommitmentToSign()`
- Analyzes transcript for commitment phrases
- Returns confidence score (0-1)
- Lists detected phrases

**Commitment Phrases:**
- Direct: "I accept", "I agree", "Let's do it", "Deal", "I'll sign", "Send me the contract"
- Conditional: "As long as", "If you can", "Provided that"
- Verbal: "I commit", "I'm committed", "You have my word"

**Function**: `triggerContract()`
- Calls external webhook (Zapier/Make.com)
- Sends: callId, propertyAddress, sellerName, sellerEmail, offerPrice, exitStrategy
- Returns contract URL (DocuSign)

**Function**: `processCallCompletion()`
- Orchestrates commitment detection and contract triggering
- Only triggers if commitment detected AND seller email/price available
- Logs results

**Webhook Payload:**
```json
{
  "callId": "call-123",
  "propertyAddress": "123 Main St",
  "sellerName": "John Doe",
  "sellerEmail": "john@example.com",
  "offerPrice": 82700,
  "exitStrategy": "cash",
  "contractType": "Purchase and Sale Agreement",
  "metadata": {
    "triggeredAt": "2024-01-15T10:30:00Z",
    "source": "apex-closer-ai"
  }
}
```

**Environment Variable:**
```bash
CONTRACT_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...
```

---

## 3. Professional Disclosure Logic

### Base Prompt Update

**Natural Disclosure Response:**
```
"I'm actually an AI partner for our investment group—it helps us stay 
organized, but I'm the one authorized to make these offers today. We use 
technology to handle the initial outreach and data analysis, but all 
decisions and offers come from our team. Does that work for you?"
```

**Key Points:**
- Acknowledge AI component honestly
- Emphasize authorization and decision-making authority
- Position as "tech-forward" not "fully automated"
- Redirect to offer/negotiation

**Never:**
- Deny being AI if directly asked
- Claim to be fully human if asked directly
- Avoid the question or change subject awkwardly

**Trigger:**
- If asked: "Are you a robot?", "Are you AI?", "Is this automated?"
- Use Eric Cline's "Tech-Forward Investor" rebuttal

---

## 4. Metadata Logging

### Database Column: `exit_strategy_chosen`

**Values:**
- `cash` - Straight cash offer
- `fix_and_flip` - Fix & flip strategy
- `buy_and_hold` - Buy & hold strategy
- `subject_to` - Subject-To existing mortgage
- `seller_finance` - Seller financing
- `creative_finance` - Creative finance structure

**Extraction Logic:**
1. First check `call.metadata.exitStrategy`
2. If not found, analyze transcript for keywords:
   - "subject to" / "sub-to" → `subject_to`
   - "seller finance" / "seller carry" → `seller_finance`
   - "creative finance" → `creative_finance`
   - "buy and hold" / "rental" → `buy_and_hold`
   - "cash" / "cash offer" → `cash`
3. Default to `fix_and_flip` if none detected

**Usage:**
- Audit AI's "Top Earner" decision-making
- Track which strategies are most successful
- Analyze correlation between exit strategy and contract signed
- Identify patterns in strategy selection

**Query Example:**
```sql
SELECT 
  exit_strategy_chosen,
  COUNT(*) as total_calls,
  AVG(goat_score) as avg_score,
  SUM(CASE WHEN contract_signed THEN 1 ELSE 0 END) as contracts_signed
FROM calls
WHERE exit_strategy_chosen IS NOT NULL
GROUP BY exit_strategy_chosen
ORDER BY contracts_signed DESC;
```

---

## Integration Points

### 1. Assistant Creation (`/api/vapi/create-assistant`)

**Neighborhood Context Injection:**
```typescript
if (propertyAddress && !isRoleReversal) {
  const contextResult = await prepareCallWithNeighborhoodContext(
    persona.systemPrompt,
    propertyAddress,
    zipCode,
    city,
    state
  );
  enhancedSystemPrompt = contextResult.enhancedPrompt;
}
```

**When:**
- Property address provided
- Not in role-reversal mode (real calls only)
- Zip code can be extracted from address or propertyLocation

### 2. Call Completion (`/api/vapi-webhook`)

**Commitment Detection & Contract Triggering:**
```typescript
const callActions = await processCallCompletion(
  call.id,
  transcript,
  propertyAddress,
  sellerName,
  sellerEmail,
  offerPrice,
  exitStrategy,
  metadata
);
```

**Exit Strategy Logging:**
```typescript
exit_strategy_chosen: normalizedExitStrategy || null
```

**When:**
- Call ends (status: 'ended')
- Transcript available
- After grading and analysis complete

---

## Environment Variables

```bash
# Contract Webhook (Zapier/Make.com)
CONTRACT_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/...

# Market Data APIs
INVESTORBASE_API_KEY=your_investorbase_key
ZILLOW_API_KEY=your_zillow_key
```

---

## Webhook Setup (Zapier/Make.com)

### Zapier Example

**Trigger:** Webhook (Catch Hook)
- URL: Set in `CONTRACT_WEBHOOK_URL`
- Method: POST
- Payload: JSON

**Action 1:** Generate DocuSign Contract
- Template: Purchase and Sale Agreement
- Fill fields from webhook payload
- Send to: `sellerEmail`

**Action 2:** Notify Slack
- Channel: #contracts-sent
- Message: "Contract sent to {sellerName} for {propertyAddress}"

### Make.com Example

**Scenario:**
1. Webhook receives payload
2. Generate PDF contract (DocuSign API)
3. Email to seller
4. Log to database
5. Notify team

---

## Usage Examples

### Neighborhood Context

**Before Call:**
```typescript
const { enhancedPrompt, context } = await prepareCallWithNeighborhoodContext(
  systemPrompt,
  "123 Main St, City, State 12345",
  "12345"
);

// enhancedPrompt now includes:
// "CURRENT MARKET INTELLIGENCE (12345):
//  Last 3 Cash Sales in This Area:
//  1. 123 Main St: $75,000 cash (65% of ARV)..."
```

### Commitment Detection

**During/After Call:**
```typescript
const commitment = detectCommitmentToSign(transcript);
if (commitment.detected && commitment.confidence >= 0.5) {
  // Trigger contract generation
  await triggerContract(callId, address, name, email, price, strategy);
}
```

### Exit Strategy Logging

**Automatic:**
- Extracted from transcript or metadata
- Stored in `calls.exit_strategy_chosen` column
- Available for analytics queries

---

## Best Practices

1. **Neighborhood Context:**
   - Always fetch before real calls
   - Use for both simulations and live calls
   - Fallback gracefully if API unavailable

2. **Commitment Detection:**
   - Use confidence threshold (≥0.5)
   - Require seller email and offer price
   - Log all attempts (success and failure)

3. **Professional Disclosure:**
   - Only respond if directly asked
   - Use exact rebuttal wording
   - Redirect to offer quickly

4. **Exit Strategy Logging:**
   - Extract from multiple sources (metadata, transcript)
   - Normalize values consistently
   - Use for performance analysis

---

## Summary

The Pre-Flight updates provide:
- ✅ **Live Data Injection**: Real-time market comps in system prompt
- ✅ **Closing Webhook**: Automatic contract generation on commitment
- ✅ **Professional Disclosure**: Natural AI disclosure with rebuttal
- ✅ **Metadata Logging**: Exit strategy tracking for auditing

All systems are ready for autonomous training with real-time market intelligence, automatic contract generation, and comprehensive decision tracking.
