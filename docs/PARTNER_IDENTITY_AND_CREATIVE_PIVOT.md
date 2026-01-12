# Partner Identity Filter & Creative Finance Pivot

Upgrade to real-time market data with partner identity filtering and automatic creative finance pivoting.

## Overview

The system now:
1. **Uses Real-Time Market Data**: Zillow/InvestorBase APIs for comps and market heat
2. **Enforces Partner Identity**: Prohibits wholesale/assignment language
3. **Triggers Creative Pivot**: Automatically pivots when seller ask > 10% above cash MAO
4. **Detects Realtors**: Shifts to Professional Peer mode for agent conversations

---

## 1. Data-Driven MAO with Real-Time Market Data

### Rental Yield Analysis

**Tagging Logic:**
- If `Rent/Price > 1%`: Tag as **Buy & Hold candidate**
- Example: Property price $100k, rent $1,200/month = 14.4% annual yield → Buy & Hold

**Calculation:**
```typescript
const rentalYield = (monthlyRent * 12) / price * 100;
if (rentalYield > 1.0) {
  // Tag as Buy & Hold candidate
}
```

### Market Heat Analysis

**Tagging Logic:**
- If zip code "Flip Rate" > 15%: Tag as **Fix & Flip candidate**
- Flip Rate = Percentage of properties flipped in last 6 months

**API Integration:**
- InvestorBase API: `/v1/market-heat?zip={zipCode}`
- Returns flip rate percentage

### Dynamic Cash-to-ARV Percentage

**Rule:**
- **Hot Zips** (>15% flip rate): 82% of ARV
- **Rural Zips** (<5% flip rate): 65% of ARV
- **Medium Zips** (5-15%): Linear interpolation (65-82%)

**Formula:**
```typescript
function getCashToARVPercentage(flipRate: number): number {
  if (flipRate > 15) return 0.82;  // Hot market
  if (flipRate < 5) return 0.65;   // Rural market
  return 0.65 + ((flipRate - 5) / 10) * 0.17; // Interpolation
}
```

**Example:**
- Zip with 20% flip rate → 82% of ARV
- Zip with 3% flip rate → 65% of ARV
- Zip with 10% flip rate → ~73.5% of ARV

---

## 2. Partner Identity Filter

### Prohibited Phrases (NEVER USE)

- ❌ "Assignment"
- ❌ "Wholesale"
- ❌ "Fee"
- ❌ "Contract for sale"
- ❌ "I'm assigning this"
- ❌ "Wholesale fee"
- ❌ "Assignment fee"

### Mandatory Phrases (ALWAYS USE)

- ✅ "We" / "My Partners" / "My Partners and I"
- ✅ "Purchase and Sale Agreement" (not "contract for sale")
- ✅ "Private Funding" (not "assignment")
- ✅ "Closing at Title" (not "assignment")
- ✅ "We're purchasing" / "My partners are purchasing"
- ✅ "We close at title" / "We'll close at title company"

### Example Correct Usage

**✅ CORRECT:**
```
"My partners and I are looking to purchase properties in your area."
"We use private funding and close at title."
"This is a Purchase and Sale Agreement - we're the end buyer."
```

**❌ FORBIDDEN:**
```
"I'm assigning this contract"  // FORBIDDEN
"There's a wholesale fee"        // FORBIDDEN
"I'll assign it to my buyer"    // FORBIDDEN
```

---

## 3. Creative Finance Pivot Trigger

### Automatic Pivot Logic

**Trigger Condition:**
- If seller's ask price > 10% above cash MAO → **AUTOMATIC PIVOT**

**Example:**
- Cash MAO: $80,000
- Seller Ask: $90,000
- Gap: 12.5% → **PIVOT TRIGGERED**

### Creative Finance Script

**Benefits to Explain:**
1. **Monthly Income**: "You receive monthly payments instead of lump sum"
2. **Tax Mitigation**: "Spread income over time reduces tax burden"
3. **Top Dollar**: "We can offer $86,400 instead of $80,000 cash"

**Hand-Off Analogy:**
```
"Think of it like handing off to a bank - we take over payments, 
you get monthly income. Just like a bank, we make payments to you 
monthly while we own the property."
```

**Bank Analogy:**
```
"Just like a bank, we make payments to you monthly while we own 
the property. You get the higher price you need, and we get the 
property with terms that work for us."
```

### Creative Offer Structure

**Typical Terms:**
- Price: 5-10% above cash MAO
- Down Payment: 5%
- Interest Rate: 6%
- Term: 5 years
- Alternative: Subject-To existing mortgage

**Example:**
- Cash MAO: $80,000
- Creative Offer: $86,400 (8% above)
- Terms: 5% down ($4,320), 6% interest, 5-year term
- Monthly Payment: ~$1,580/month

---

## 4. Realtor Detection & Professional Peer Mode

### Realtor Detection

**Indicators:**
- Mentions "realtor", "agent", "broker"
- References "listing agent", "MLS", "listing"
- Says "my client" or "the seller"
- Identifies as "real estate professional"
- Asks about "closing timeline" or "terms"

**Detection Function:**
```typescript
function detectRealtor(transcript: string): boolean {
  const indicators = [
    'realtor', 'real estate agent', 'listing agent', 
    'broker', 'mls', 'my client', 'representing'
  ];
  return indicators.some(indicator => 
    transcript.toLowerCase().includes(indicator)
  );
}
```

### Professional Peer Mode Language

**Key Phrases:**
- "I'm an active principal buyer in this zip code."
- "My partners and I are looking to put $X into a project this month."
- "We can do a quick close or terms if your seller needs to hit a specific net number."
- "We're not wholesalers - we're the end buyer. We close at title."
- "What net number does your seller need to hit?"
- "We can structure this as cash, Subject-To, or seller financing - whatever works for your seller."

**Tone Shift:**
- More direct and professional
- Focus on net number and closing flexibility
- Emphasize end buyer status (not assigning)
- Offer multiple closing options upfront

### Example Realtor Conversation

**AI Detection:**
```
Realtor: "Hi, I'm calling about the property at 123 Main St. 
I'm the listing agent and my client is looking to sell."

AI: "Great! I'm an active principal buyer in this zip code. 
My partners and I are looking to put $200,000 into a project 
this month. What net number does your seller need to hit? 
We can do a quick close or terms - whatever works for your 
seller."
```

---

## API Integration

### InvestorBase API

**Market Comps:**
```
GET https://api.investorbase.com/v1/comps?zip={zipCode}&months=6
Headers: Authorization: Bearer {API_KEY}
```

**Market Heat:**
```
GET https://api.investorbase.com/v1/market-heat?zip={zipCode}
Headers: Authorization: Bearer {API_KEY}
Response: { "flipRate": 15.5 }
```

### Zillow API

**Recent Sales:**
```
GET https://api.zillow.com/v1/sales?zip={zipCode}&months=6
Headers: X-RapidAPI-Key: {API_KEY}
```

**Rent Zestimate:**
```
GET https://api.zillow.com/v1/rentzestimate?zip={zipCode}&bedrooms={bedrooms}
Headers: X-RapidAPI-Key: {API_KEY}
Response: { "rentzestimate": { "amount": 1200 } }
```

### Environment Variables

```bash
INVESTORBASE_API_KEY=your_investorbase_key
ZILLOW_API_KEY=your_zillow_key
```

---

## Usage Flow

### 1. Property Discovery

```typescript
const propertyData = {
  address: "123 Main St",
  zipCode: "12345",
  city: "City",
  state: "State",
  estimatedARV: 120000,
  currentRent: 800,
  bedrooms: 3,
};
```

### 2. Market Analysis

```typescript
const exitStrategy = await determineOptimalExit(propertyData);
// Returns: strategy, recommendedMAO, cashToARVPercentage, marketHeat, rentalYield
```

### 3. Creative Pivot Check

```typescript
const sellerAskPrice = 90000;
const cashMAO = exitStrategy.recommendedMAO; // e.g., 80000

const pivotAnalysis = analyzeCreativePivot(sellerAskPrice, cashMAO);
if (pivotAnalysis.shouldPivot) {
  // Use creative finance script
  // Explain benefits with Hand-Off and Bank analogies
}
```

### 4. Realtor Detection

```typescript
const isRealtor = detectRealtor(transcript);
if (isRealtor) {
  // Shift to Professional Peer mode
  // Use realtor-specific language
}
```

---

## Summary

The system now:
- ✅ **Uses Real-Time Market Data**: Zillow/InvestorBase APIs
- ✅ **Tags by Rental Yield**: Buy & Hold if Rent/Price > 1%
- ✅ **Tags by Market Heat**: Fix & Flip if flip rate > 15%
- ✅ **Dynamic Cash-to-ARV**: 65-82% based on market heat
- ✅ **Partner Identity Filter**: Prohibits wholesale/assignment language
- ✅ **Creative Pivot Trigger**: Auto-pivots when ask > 10% above cash MAO
- ✅ **Realtor Detection**: Professional Peer mode for agents

The AI now represents a partnership, uses real market data, and automatically adapts its strategy based on seller needs and market conditions.
