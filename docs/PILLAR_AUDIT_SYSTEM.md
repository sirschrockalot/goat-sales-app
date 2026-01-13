# Pillar Audit System

## Overview

The Pillar Audit system monitors live transcripts to ensure the AI follows the discovery process before making offers. It tracks four specific "Pillar Flags" that must be detected in the conversation.

## Pillar Flags

### 1. Motivation (Hidden Why)
**Detection Criteria:**
- Keywords: foreclosure, debt, inheritance, relocation, divorce, liens, title issues
- Paragraph references: Paragraph 15, Paragraph 38
- Questions about "why" selling
- Pain point indicators (owe, behind, struggling)

**Example Triggers:**
- "I'm behind on payments"
- "There's a lien on the property"
- "We're going through a divorce"
- "What's got you thinking about selling?"

### 2. Condition (AS IS Items)
**Detection Criteria:**
- Keywords: fixtures, appliances, plants, "as is", Paragraph 6
- Condition questions: "What condition is...", "How's the..."
- AS IS explicit mention
- Fixture/appliance discussions

**Example Triggers:**
- "What condition is the roof in?"
- "The property is sold AS IS"
- "All fixtures stay with the property"
- "What about the appliances?"

### 3. Timeline (30-Day/Paragraph 24)
**Detection Criteria:**
- Keywords: 30-day, close of escrow, Paragraph 24, timeline, closing date
- Timeline questions: "When do you need...", "How soon..."
- Date mentions (30 days, specific dates)

**Example Triggers:**
- "When do you need to close by?"
- "We need to close in 30 days"
- "Paragraph 24 discusses close of escrow"
- "What's your timeline?"

### 4. Price Anchor (Seller Number First)
**Detection Criteria:**
- Seller mentions price BEFORE AI reveals $82,700
- Phrases: "I want", "I'm thinking", "looking for", "hoping to get"
- Price pattern: $XX,XXX mentioned by seller first

**Example Triggers:**
- "I'm looking for around $100,000"
- "I want to get $95k out of it"
- "What I'm hoping to get is..."

## Offer Gate Mechanism

**The `trigger_offer` tool is LOCKED until:**
- ✅ Sales Engine: All four pillars complete + discovery complete + underwriting done
- ✅ Pillar Audit: All four pillar flags detected in transcript

**If AI tries to make offer early:**
- Tool returns: `allowed: false`
- Provides deflect message based on missing pillars
- Example: "I need to understand the condition and timeline a bit better before I can give you an accurate 'As-Is' price."

## Pushy Pete Persona

**Behavior Pattern:**
- Demands price every 60 seconds
- Avoids talking about property condition
- Gets frustrated with discovery questions
- Says "just give me a number" repeatedly

**Success Criteria:**
- AI must deflect price demands at least 3 times
- AI must extract missing "Condition" pillar data
- AI must persist despite Pete's impatience

**Testing Goal:**
- Verify deflect protocol works under pressure
- Ensure AI doesn't cave to impatience
- Confirm pillar extraction happens even with resistant seller

## Dashboard Widget

**PillarDashboard Component:**
- Real-time compliance checkboxes for each pillar
- Offer Status: LOCKED/READY indicator
- PA Walkthrough Progress: 0-58 paragraphs after offer
- Missing Pillars Alert: Shows which pillars need attention

**API Endpoint:**
- `GET /api/calls/[id]/pillar-status`
- Returns current pillar flags, allPillarsMet status, walkthrough progress

## Usage

```typescript
import { auditPillars, getPillarAuditor } from '@/lib/pillarAudit';

// During call, audit transcript
const result = auditPillars(callId, transcript);

// Check if offer can be triggered
const canTrigger = canTriggerOffer(callId);

// Get deflect message if not ready
const deflectMessage = getDeflectMessage(callId);
```

## Integration Points

1. **Vapi Webhook**: Audit transcript on each message
2. **Trigger Offer Tool**: Check pillar audit before allowing offer
3. **Dashboard**: Poll pillar status every 2 seconds
4. **Sales Engine**: Coordinate with pillar audit for state transitions
