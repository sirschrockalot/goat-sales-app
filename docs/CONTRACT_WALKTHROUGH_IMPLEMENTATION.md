# Contract Walkthrough Implementation

## Overview

The Contract Walkthrough system provides real-time, hand-holding guidance for sellers through the DocuSign Purchase Agreement process. The AI stays on the line and walks through key sections sequentially, ensuring understanding before signature.

## Components

### 1. Contract Walkthrough Service (`src/lib/contractWalkthrough.ts`)

**Key Sections Explained:**
- **Paragraph 4 & 7**: Names/address confirmation and "AS IS" status (fixtures, outdoor plants)
- **Paragraph 8**: Price breakdown ($100 earnest money + remaining cash at close)
- **Paragraph 13 & 15**: Closing costs (we cover all, seller only responsible for liens until closing)
- **Paragraph 38**: Title delays - "We will work with you on obtaining a clear title"
- **Paragraph 47/48**: Personal property warning - anything left becomes buyer's property
- **Paragraph 50**: Direct buyer-seller transaction (not a realtor)
- **Paragraph 56 (Clause 17)**: Memorandum - "notifying the county we are working together"

**Functions:**
- `getWalkthroughSections()`: Returns all sections in order
- `generateWalkthroughScript()`: Creates full dialogue script
- `shouldProceedToNextSection()`: Validates seller confirmation
- `validateSuccess()`: Checks if `verbal_yes_to_price === true AND signature_status === 'completed'`

### 2. Signature Monitor (`src/lib/signatureMonitor.ts`)

**Features:**
- Polls DocuSign API every 10 seconds
- Webhook integration for real-time updates
- Sequential walkthrough delivery
- Comfortable silence detection (45 seconds → soft texture injection)
- AI response injection based on status

**Hand-Holding Logic:**
1. When document is delivered → Start walkthrough
2. Deliver each section sequentially
3. Ask "Does that make sense so far?" after Price, Costs, Title, Memorandum
4. Wait for confirmation before proceeding
5. If seller says "no" → Re-explain that section
6. Inject soft textures if seller is silent for 45 seconds

### 3. DocuSign Webhook Handler (`src/app/api/webhooks/docusign/route.ts`)

**Events Handled:**
- `recipient-delivered`: Starts walkthrough
- `recipient-viewed`: Provides guidance
- `recipient-completed`: Celebrates and sends victory SMS

**Integration:**
- Updates `calls.last_docusign_event`
- Updates `sandbox_battles.document_status`
- Calculates `time_to_sign`
- Saves `signed_pdf_url`
- Triggers signature monitor

### 4. Vapi Tool: `check_envelope_status` (`src/app/api/vapi/tools/check-envelope-status/route.ts`)

**Purpose:**
- Allows AI to check envelope status in real-time
- Called every 30 seconds if seller is silent
- Called immediately when webhook hits

**Returns:**
- Current status: 'sent', 'delivered', 'viewed', 'completed'
- Signed status boolean
- Helpful message for AI to use

### 5. Success Criteria Validation

**Definition:**
A battle is successful **ONLY** if:
1. `verbal_yes_to_price === true` (PRIMARY SUCCESS)
2. `signature_status === 'completed'` (ULTIMATE SUCCESS)

**Both criteria must be met** - this is the Signature-First model.

## Usage

### Starting the Walkthrough

```typescript
import { startSignatureMonitoring } from '@/lib/signatureMonitor';

// When price is agreed and DocuSign is sent
const monitor = await startSignatureMonitoring({
  callId: call.id,
  envelopeId: envelopeId,
  recipientEmail: sellerEmail,
  vapiCallId: vapiCall.id,
});

// Initialize with deal details
monitor.initializeWalkthrough(
  sellerName,
  propertyAddress,
  purchasePrice,
  100 // earnest money
);
```

### Processing Seller Responses

```typescript
// When seller responds during walkthrough
await monitor.processSellerResponse(sellerResponse);
```

### Webhook Integration

The webhook automatically:
1. Starts monitoring when `recipient-delivered` event is received
2. Updates status when `recipient-viewed` is received
3. Completes and sends SMS when `recipient-completed` is received

## Database Schema

**calls table:**
- `last_docusign_event`: Tracks where sellers drop off
- `signed_pdf_url`: URL to signed PDF
- `time_to_sign`: Seconds from call start to signature

**sandbox_battles table:**
- `verbal_yes_to_price`: PRIMARY SUCCESS
- `document_status`: ULTIMATE SUCCESS ('completed' = signed)
- `technical_assistance_score`: How well AI helped navigate DocuSign

## Success Metrics

- **Success Rate**: % of battles with BOTH `verbal_yes_to_price = true` AND `document_status = 'completed'`
- **Primary Success Rate**: % with `verbal_yes_to_price = true`
- **Ultimate Success Rate**: % with `document_status = 'completed'`
- **Time to Sign**: Average seconds from call start to signature
- **Drop-off Points**: Tracked via `last_docusign_event`

## Configuration

**Environment Variables:**
- `DOCUSIGN_WEBHOOK_SECRET`: Webhook authentication
- `TWILIO_ACCOUNT_SID`: For victory SMS
- `TWILIO_AUTH_TOKEN`: For victory SMS
- `TWILIO_PHONE_NUMBER`: For victory SMS
- `ALERT_PHONE_NUMBER`: Recipient for victory SMS

## Next Steps

1. **Run Migration**: `supabase db push --linked`
2. **Configure DocuSign Connect**: Point to `/api/webhooks/docusign`
3. **Add Tool to Vapi Assistant**: Configure `check_envelope_status` tool in assistant creation
4. **Test Walkthrough**: Trigger a test call and verify sequential delivery
