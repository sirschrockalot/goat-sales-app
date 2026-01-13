# Sales State Machine Implementation

## Overview

The Sales Engine enforces a strict sales process that prevents premature offers. The AI must complete full discovery before revealing the price.

## State Machine Flow

```
DISCOVERY → PILLAR_VERIFICATION → UNDERWRITING_SYNC → OFFER_STAGE → CLOSING_WALKTHROUGH → COMPLETED
```

### State 1: DISCOVERY
**Goal**: Identify the "Hidden Why" and assess property condition.

**Required Actions:**
- Mine for motivation (foreclosure, debt, inheritance, relocation, divorce)
- Assess property condition (roof, HVAC, foundation, kitchen, bathrooms)
- Understand timeline and urgency
- Identify price anchor/expectation

**Tools Available:**
- `update_pillar`: Mark pillars as complete as you discover them

**Cannot Proceed Until:**
- All four pillars are complete

### State 2: PILLAR_VERIFICATION
**Goal**: Verify all four pillars are complete.

**Required Pillars:**
1. **motivation**: Hidden Why identified
2. **timeline**: Seller's timeline understood
3. **condition**: Property condition assessed
4. **priceAnchor**: Seller's price expectation known

**Transition:**
- Automatically moves to UNDERWRITING_SYNC when all pillars complete

### State 3: UNDERWRITING_SYNC
**Goal**: Internal logic check for $8k-$15k margin.

**Required Script:**
"I have everything I need. I'm going to run this by my underwriting team/partners real quick to see how close we can get to your goals. Hang on one sec..."

**Tools:**
- `start_underwriting`: Begin underwriting sync
- `complete_underwriting`: Finish and move to OFFER_STAGE

**Duration:**
- 15-30 second pause (simulate consulting partners)

### State 4: OFFER_STAGE
**Goal**: Verbally reveal the calculated price.

**Prerequisites:**
- ✅ All four pillars complete
- ✅ Underwriting sync complete
- ✅ Discovery fully done

**Tools:**
- `trigger_offer`: Gatekeeper that checks prerequisites before allowing offer reveal

**Script:**
"Based on everything we've discussed, my partners and I can offer you $[CALCULATED_PRICE]. Here's how it works: $100 earnest money today, and $[REMAINING] in cash at closing. Does that work for you?"

### State 5: CLOSING_WALKTHROUGH
**Goal**: Execute PA Summary contract walkthrough.

**Prerequisites:**
- ✅ Price verbally agreed (verbal_yes_to_price = true)

**Walkthrough Requirements:**
- **Clause 13**: Explicitly state "We cover ALL closing costs"
- **Clause 17/56**: Explicitly state Memorandum is a "Reserved Sign" (notifying the county)
- Walk through all key sections sequentially
- Ask "Does that make sense so far?" after major sections

## Deflect & Discover Protocol

**When seller asks "What's your offer?" before pillars are complete:**

**Response:**
"[chuckle] I'd love to give you a number right now, but I'd be doing you a disservice. My partners need me to understand the property's story first so we can give you the best possible 'As-Is' price. Can we talk about the [MISSING_PILLAR] for a second?"

**Missing Pillar Examples:**
- motivation: "property's story and your motivation"
- timeline: "timeline you're working with"
- condition: "property's condition"
- priceAnchor: "price range you're thinking"

## Underwriting Gatekeeper

**The `trigger_offer` tool is DISABLED until:**
- `discovery_complete == true`
- All four pillars are complete
- Underwriting sync is done

**If seller asks for offer before ready:**
- Use Deflect & Discover protocol
- Identify which pillar is missing
- Ask about that specific pillar
- Continue discovery

## API Endpoints

### Tools

1. **`/api/vapi/tools/update-pillar`** (POST)
   - Updates pillar status as discovery progresses
   - Parameters: `callId`, `pillar` (motivation|timeline|condition|priceAnchor), `value` (boolean)

2. **`/api/vapi/tools/trigger-offer`** (POST)
   - Gatekeeper: Checks if offer can be revealed
   - Returns deflect response if not ready
   - Allows offer reveal if prerequisites met

3. **`/api/vapi/tools/start-underwriting`** (POST)
   - Transitions to UNDERWRITING_SYNC state
   - Only works if all pillars complete

4. **`/api/vapi/tools/complete-underwriting`** (POST)
   - Completes underwriting and moves to OFFER_STAGE
   - Enables offer reveal

5. **`/api/vapi/tools/check-offer-readiness`** (GET)
   - Query endpoint to check if offer can be revealed
   - Returns current state, pillars, missing pillars

## Usage Example

```typescript
import { getSalesEngine } from '@/lib/salesEngine';

// During discovery
const engine = getSalesEngine(callId);
engine.updatePillar('motivation', true); // Seller mentioned foreclosure
engine.updatePillar('timeline', true); // Seller needs to close in 30 days
engine.updatePillar('condition', true); // Assessed property condition
engine.updatePillar('priceAnchor', true); // Seller wants $100k

// Check if ready for underwriting
if (engine.arePillarsComplete()) {
  engine.startUnderwritingSync();
  // Say: "I have everything I need. I'm going to run this by my underwriting team..."
  // Wait 15-30 seconds
  engine.completeUnderwriting();
  // Now can reveal offer
}
```

## Success Criteria

A battle is successful **ONLY** if:
1. `verbal_yes_to_price === true` (price agreed)
2. `signature_status === 'completed'` (contract signed)

Both criteria must be met.
