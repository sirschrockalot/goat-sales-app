# Dynamic Underwriting System

AI-powered market analysis and exit strategy determination for real estate acquisitions.

## Overview

The Dynamic Underwriting system upgrades the AI from fixed pricing ($82,700) to data-driven market analysis. It:

1. **Fetches Local Market Data**: Comps, market trends, rent data
2. **Calculates Dynamic MAO**: Based on actual cash sale to ARV percentages
3. **Determines Optimal Exit Strategy**: Fix & Flip, Buy & Hold, or Creative Finance
4. **Provides Negotiation Leverage**: Real-time data citations during calls

---

## Components

### 1. Market Analyst Service (`src/lib/marketAnalyst.ts`)

**Functions:**
- `fetchMarketComps()` - Gets local comps from last 6 months
- `fetchMarketRent()` - Gets current market rent for similar properties
- `calculateMarketMetrics()` - Analyzes comps to extract key metrics
- `determineOptimalExit()` - Determines best exit strategy
- `calculateDynamicMAO()` - Calculates MAO based on local data
- `getRentToPriceAnalysis()` - Analyzes rent-to-price leverage

### 2. Market Metrics

**Calculated Metrics:**
- `averageCashSaleToARV`: Average percentage of ARV that cash buyers pay
- `averageDaysOnMarket`: Average time properties stay on market
- `averageARVSpread`: Average difference between ARV and purchase price
- `rentToValueRatio`: Annual rent as percentage of ARV
- `marketRent`: Current market rent for similar properties
- `flipVolume`: Number of flips in last 6 months
- `rentalVolume`: Number of rentals in last 6 months

### 3. Exit Strategy Determination

**Scenario A: Fix & Flip**
- **Conditions:**
  - High ARV spread (>25% of ARV)
  - Low days-on-market (<15 days)
  - High flip volume vs rental volume
- **Action:** Offer cash at dynamic MAO
- **Negotiation Points:**
  - Cite recent cash sales in area
  - Reference fast-moving market
  - Emphasize investor buying patterns

**Scenario B: Buy & Hold (Rental)**
- **Conditions:**
  - High rent-to-value ratio (>10%)
  - Lower ARV spread (<20%)
  - High rental volume vs flip volume
- **Action:** Pivot to Subject-To or Seller Finance
- **Negotiation Points:**
  - Cite strong rental market
  - Reference rent-to-value ratio
  - Offer higher price with terms to preserve $15k fee

**Scenario C: Creative Finance**
- **Conditions:**
  - High equity but seller needs terms
  - Cash offer rejected
  - Good condition or under-rented property
- **Action:** Offer higher price with creative terms
- **Negotiation Points:**
  - Acknowledge cash offer limitations
  - Propose alternative structure
  - Higher price in exchange for terms

### 4. Rent-to-Price Filter

**Analysis:**
- Compares current rent vs market rent
- Identifies under-rented properties (<80% of market)
- Provides negotiation leverage

**Negotiation Leverage:**
```
"Since the current tenant is paying [X]% below market rent 
($[current] vs $[market]), my holding costs are higher, 
which is why my cash offer is $[Y]."
```

---

## Integration

### Base Prompt Updates

The `base_prompt.txt` now includes:

1. **Dynamic MAO Calculation**: Based on local comps, not fixed 70%
2. **Real-Time Negotiation Logic**: Data citation phrases
3. **Exit Strategy Logic**: When to use each strategy
4. **Rent-to-Price Filter**: How to use rent data as leverage

### Usage in Calls

**During Discovery:**
- AI fetches property address, zip code, city, state
- Calls `determineOptimalExit()` to get strategy
- Calculates dynamic MAO using `calculateDynamicMAO()`

**During Negotiation:**
- AI cites specific comps: "Looking at the last three cash sales on your street..."
- References market data: "Investors are buying at [X]% of ARV"
- Uses rent leverage if applicable: "Current tenant is paying [X]% below market"

**During Offer:**
- Presents MAO with data backing: "For me to make this work and still keep my $15,000 overhead covered, I have to be at $[Y]."
- Explains reasoning based on market metrics

---

## API Integration (Placeholder)

**Current Status:** Mock data structure in place

**Production Integration Required:**
- **InvestorBase API**: Investor sales data
- **Zillow API**: Recent sales and rent estimates
- **Redfin API**: Market trends and heatmaps
- **Local MLS**: Comprehensive comps database
- **Rentometer API**: Market rent data

**Example Integration:**
```typescript
// In fetchMarketComps()
const response = await fetch(`https://api.investorbase.com/comps`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${API_KEY}` },
  body: JSON.stringify({
    address: propertyData.address,
    zipCode: propertyData.zipCode,
    months: 6,
  }),
});
```

---

## Dynamic MAO Calculation

**Formula:**
```
MAO = ARV × (Average Cash Sale to ARV Percentage)
```

**Example:**
- ARV: $120,000
- Average Cash Sale to ARV: 65% (from last 6 months of comps)
- Dynamic MAO: $120,000 × 0.65 = $78,000

**Fallback:**
- If no comps available: Use 70% default
- Acknowledge: "I don't have recent comps for your exact area, so I'm using a conservative 70% rule."

---

## Negotiation Phrases

### Data Citation Phrases

**Cash Sales:**
- "Look, I'm looking at the last three cash sales on your street... investors are buying at 65% of ARV."
- "The average days-on-market for cash sales in your area is 7 days - this is a fast-moving market."

**Rent-to-Value:**
- "Market rents in your area are 12% of property value annually - this is a strong rental market."
- "Since the current tenant is paying 40% below market rent ($800 vs $1,200), my holding costs are higher, which is why my cash offer is $75,000."

**MAO Justification:**
- "For me to make this work and still keep my $15,000 overhead covered, I have to be at $78,000."
- "Based on the last 6 months of cash sales in your area, investors are consistently buying at 65% of ARV. That's where I need to be."

---

## Exit Strategy Examples

### Fix & Flip Example

**Market Conditions:**
- ARV Spread: 30%
- Days on Market: 5 days
- Flip Volume: 15 (vs 3 rentals)

**AI Response:**
```
"Looking at the last 6 months of sales in your area, I'm seeing 
a strong flip market. The average cash sale is happening at 65% 
of ARV, and properties are moving in about 5 days. Based on 
your property's ARV of $120,000, I can offer $78,000 cash."
```

### Buy & Hold Example

**Market Conditions:**
- Rent-to-Value: 12%
- ARV Spread: 15%
- Rental Volume: 20 (vs 5 flips)

**AI Response:**
```
"Your area has a strong rental market - rents are about 12% of 
property value annually. For a buy-and-hold strategy, I can 
offer a higher price if we structure this as Subject-To or 
Seller Finance. That way I can preserve my $15,000 overhead 
coverage while giving you more than a straight cash offer."
```

### Creative Finance Example

**Market Conditions:**
- High equity (ARV $120k, seller wants $90k)
- Cash offer rejected at $78k
- Property in excellent condition

**AI Response:**
```
"I understand you need more than my cash offer of $78,000. 
Looking at the comps, investors are buying at 65% of ARV, 
which is where I have to be for cash. However, if you're 
open to creative terms, I can offer $85,000 with seller 
financing - maybe 5% down, 6% interest, 5-year term. That 
gives you more money while still working for me."
```

---

## Rent-to-Price Leverage

**Scenario:**
- Property ARV: $100,000
- Current Rent: $600/month
- Market Rent: $1,000/month
- Rent Discount: 40% below market

**AI Negotiation:**
```
"Since the current tenant is paying 40% below market rent 
($600 vs $1,000), my holding costs are higher during the 
transition period. That's why my cash offer is $70,000 
instead of $75,000 - I have to account for the rent gap 
until I can get market rent."
```

---

## Best Practices

1. **Always Cite Data**: Never make claims without backing data
2. **Be Specific**: "Last three cash sales" not "recent sales"
3. **Acknowledge Limitations**: If no comps, say so and use default
4. **Use Rent Leverage**: Always check if property is under-rented
5. **Pivot Strategically**: Know when to switch from cash to creative finance

---

## Summary

The Dynamic Underwriting system transforms the AI from:
- ❌ Fixed pricing ($82,700)
- ❌ Generic market assumptions
- ❌ One-size-fits-all approach

To:
- ✅ Data-driven MAO calculation
- ✅ Real-time market analysis
- ✅ Strategic exit determination
- ✅ Evidence-based negotiation

The AI now cites actual market data, calculates dynamic MAO based on local comps, and adapts its strategy based on market conditions.
