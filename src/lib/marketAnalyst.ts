/**
 * Market Analyst Service
 * Fetches local market data and performs dynamic underwriting
 * Determines optimal exit strategy based on market conditions
 */

import logger from './logger';

// Market data interfaces
export interface PropertyData {
  address: string;
  zipCode: string;
  city: string;
  state: string;
  estimatedARV?: number;
  currentRent?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  yearBuilt?: number;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface MarketComps {
  address: string;
  salePrice: number;
  saleDate: string;
  saleType: 'cash' | 'financed' | 'unknown';
  arv?: number;
  daysOnMarket: number;
  propertyType: string;
}

export interface MarketMetrics {
  averageCashSaleToARV: number; // Percentage (e.g., 0.65 = 65%)
  averageDaysOnMarket: number;
  averageARVSpread: number; // ARV - Purchase Price
  rentToValueRatio: number; // Annual Rent / ARV
  marketRent: number; // Current market rent for similar properties
  flipVolume: number; // Number of flips in last 6 months
  rentalVolume: number; // Number of rentals in last 6 months
  comps: MarketComps[];
}

export interface ExitStrategy {
  strategy: 'fix_and_flip' | 'buy_and_hold' | 'creative_finance';
  confidence: number; // 0-1
  reasoning: string;
  recommendedMAO: number;
  negotiationPoints: string[];
  cashToARVPercentage: number; // Local market cash-to-ARV percentage
  marketHeat: number; // Flip rate percentage
  rentalYield: number; // Rent/Price percentage
}

export interface CreativePivotAnalysis {
  shouldPivot: boolean;
  sellerAskPrice?: number;
  cashMAO: number;
  priceGap: number; // Percentage difference
  pivotReasoning: string;
  creativeOffer: {
    price: number;
    terms: string;
    benefits: string[];
  };
}

/**
 * Fetch market comps from external APIs
 * Integrates with InvestorBase and Zillow APIs
 */
export async function fetchMarketComps(
  propertyData: PropertyData,
  months: number = 6
): Promise<MarketComps[]> {
  logger.info('Fetching market comps', {
    address: propertyData.address,
    zipCode: propertyData.zipCode,
    months,
  });

  const comps: MarketComps[] = [];

  // Try InvestorBase API first (investor-focused data)
  try {
    const investorBaseApiKey = process.env.INVESTORBASE_API_KEY;
    if (investorBaseApiKey) {
      const response = await fetch(
        `https://api.investorbase.com/v1/comps?zip=${propertyData.zipCode}&months=${months}`,
        {
          headers: {
            'Authorization': `Bearer ${investorBaseApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.comps && Array.isArray(data.comps)) {
          comps.push(...data.comps.map((comp: any) => ({
            address: comp.address || '',
            salePrice: comp.salePrice || 0,
            saleDate: comp.saleDate || new Date().toISOString(),
            saleType: comp.saleType || 'unknown',
            arv: comp.arv || comp.salePrice,
            daysOnMarket: comp.daysOnMarket || 0,
            propertyType: comp.propertyType || 'single_family',
          })));
        }
      }
    }
  } catch (error) {
    logger.warn('InvestorBase API error', { error });
  }

  // Fallback to Zillow API
  try {
    const zillowApiKey = process.env.ZILLOW_API_KEY;
    if (zillowApiKey && comps.length === 0) {
      const response = await fetch(
        `https://api.zillow.com/v1/sales?zip=${propertyData.zipCode}&months=${months}`,
        {
          headers: {
            'X-RapidAPI-Key': zillowApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.sales && Array.isArray(data.sales)) {
          comps.push(...data.sales.map((sale: any) => ({
            address: sale.address || '',
            salePrice: sale.price || 0,
            saleDate: sale.date || new Date().toISOString(),
            saleType: sale.financing === 'cash' ? 'cash' : 'financed',
            arv: sale.zestimate || sale.price,
            daysOnMarket: sale.daysOnMarket || 0,
            propertyType: sale.propertyType || 'single_family',
          })));
        }
      }
    }
  } catch (error) {
    logger.warn('Zillow API error', { error });
  }

  // If no API data, return mock data for development
  if (comps.length === 0) {
    logger.warn('No API data available, using mock comps', { zipCode: propertyData.zipCode });
    return [
      {
        address: '123 Main St',
        salePrice: 75000,
        saleDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        saleType: 'cash',
        arv: 120000,
        daysOnMarket: 5,
        propertyType: 'single_family',
      },
      {
        address: '456 Oak Ave',
        salePrice: 68000,
        saleDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        saleType: 'cash',
        arv: 110000,
        daysOnMarket: 7,
        propertyType: 'single_family',
      },
    ];
  }

  return comps;
}

/**
 * Fetch market rent data
 */
export async function fetchMarketRent(propertyData: PropertyData): Promise<number> {
  logger.info('Fetching market rent', {
    address: propertyData.address,
    zipCode: propertyData.zipCode,
  });

  // Try Zillow Rent Zestimate API
  try {
    const zillowApiKey = process.env.ZILLOW_API_KEY;
    if (zillowApiKey) {
      const response = await fetch(
        `https://api.zillow.com/v1/rentzestimate?zip=${propertyData.zipCode}&bedrooms=${propertyData.bedrooms || 3}`,
        {
          headers: {
            'X-RapidAPI-Key': zillowApiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.rentzestimate && data.rentzestimate.amount) {
          return data.rentzestimate.amount;
        }
      }
    }
  } catch (error) {
    logger.warn('Zillow Rent API error', { error });
  }

  // Fallback: Calculate from ARV (typically 0.8-1.2% of ARV per month)
  const estimatedARV = propertyData.estimatedARV || 100000;
  const mockMarketRent = estimatedARV * 0.01; // 1% of ARV per month
  return mockMarketRent;
}

/**
 * Get market heat (flip rate) for zip code
 * Returns percentage of properties that were flipped in last 6 months
 */
export async function getMarketHeat(zipCode: string): Promise<number> {
  logger.info('Fetching market heat', { zipCode });

  try {
    const investorBaseApiKey = process.env.INVESTORBASE_API_KEY;
    if (investorBaseApiKey) {
      const response = await fetch(
        `https://api.investorbase.com/v1/market-heat?zip=${zipCode}`,
        {
          headers: {
            'Authorization': `Bearer ${investorBaseApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.flipRate !== undefined) {
          return data.flipRate; // Percentage (e.g., 15.5 = 15.5%)
        }
      }
    }
  } catch (error) {
    logger.warn('Market heat API error', { error });
  }

  // Fallback: Estimate based on comps
  return 10; // Default 10% flip rate
}

/**
 * Calculate rental yield (Rent/Price ratio)
 * Returns percentage (e.g., 1.2 = 1.2%)
 */
export function calculateRentalYield(monthlyRent: number, price: number): number {
  if (price === 0) return 0;
  const annualRent = monthlyRent * 12;
  return (annualRent / price) * 100; // Return as percentage
}

/**
 * Get cash-to-ARV percentage based on zip code market heat
 * Hot zips (>15% flip rate): 82%
 * Rural zips (<5% flip rate): 65%
 * Medium zips: 70-75%
 */
export function getCashToARVPercentage(flipRate: number): number {
  if (flipRate > 15) {
    return 0.82; // Hot market - investors pay more
  } else if (flipRate < 5) {
    return 0.65; // Rural/slow market - lower prices
  } else {
    // Linear interpolation between 65% and 82%
    return 0.65 + ((flipRate - 5) / 10) * 0.17; // 5-15% range maps to 65-82%
  }
}

/**
 * Calculate market metrics from comps
 */
export function calculateMarketMetrics(
  comps: MarketComps[],
  marketRent: number,
  estimatedARV: number
): MarketMetrics {
  if (comps.length === 0) {
    // Default metrics if no comps available
    return {
      averageCashSaleToARV: 0.70, // Default 70%
      averageDaysOnMarket: 30,
      averageARVSpread: estimatedARV * 0.3, // 30% spread
      rentToValueRatio: (marketRent * 12) / estimatedARV,
      marketRent,
      flipVolume: 0,
      rentalVolume: 0,
      comps: [],
    };
  }

  // Filter cash sales only
  const cashComps = comps.filter((c) => c.saleType === 'cash' && c.arv);

  // Calculate average cash sale to ARV percentage
  const cashSaleToARVRatios = cashComps.map((c) => (c.salePrice / (c.arv || c.salePrice)) * 100);
  const averageCashSaleToARV =
    cashSaleToARVRatios.length > 0
      ? cashSaleToARVRatios.reduce((sum, ratio) => sum + ratio, 0) / cashSaleToARVRatios.length / 100
      : 0.70;

  // Calculate average days on market
  const averageDaysOnMarket =
    comps.length > 0
      ? comps.reduce((sum, c) => sum + c.daysOnMarket, 0) / comps.length
      : 30;

  // Calculate average ARV spread
  const arvSpreads = cashComps
    .filter((c) => c.arv)
    .map((c) => (c.arv || 0) - c.salePrice);
  const averageARVSpread =
    arvSpreads.length > 0 ? arvSpreads.reduce((sum, spread) => sum + spread, 0) / arvSpreads.length : estimatedARV * 0.3;

  // Calculate rent-to-value ratio
  const rentToValueRatio = (marketRent * 12) / estimatedARV;

  // Count flip volume (properties with high ARV spread and low DOM)
  const flipVolume = comps.filter((c) => {
    if (!c.arv) return false;
    const spread = c.arv - c.salePrice;
    const spreadPercent = (spread / c.arv) * 100;
    return spreadPercent > 25 && c.daysOnMarket < 15;
  }).length;

  // Count rental volume (properties with lower spread, longer DOM)
  const rentalVolume = comps.filter((c) => {
    if (!c.arv) return false;
    const spread = c.arv - c.salePrice;
    const spreadPercent = (spread / c.arv) * 100;
    return spreadPercent < 20 && c.daysOnMarket > 20;
  }).length;

  return {
    averageCashSaleToARV,
    averageDaysOnMarket,
    averageARVSpread,
    rentToValueRatio,
    marketRent,
    flipVolume,
    rentalVolume,
    comps,
  };
}

/**
 * Determine optimal exit strategy based on market data
 * Now includes rental yield and market heat analysis
 */
export async function determineOptimalExit(propertyData: PropertyData): Promise<ExitStrategy> {
  logger.info('Determining optimal exit strategy', { address: propertyData.address });

  // Fetch market data
  const comps = await fetchMarketComps(propertyData, 6);
  const marketRent = await fetchMarketRent(propertyData);
  const estimatedARV = propertyData.estimatedARV || 100000;
  const marketHeat = await getMarketHeat(propertyData.zipCode);

  // Calculate market metrics
  const metrics = calculateMarketMetrics(comps, marketRent, estimatedARV);

  // Calculate rental yield
  const rentalYield = calculateRentalYield(marketRent, estimatedARV);

  // Get cash-to-ARV percentage based on market heat
  const cashToARVPercentage = getCashToARVPercentage(marketHeat);

  // Scenario A: Fix & Flip
  // High market heat (flip rate > 15%) OR high ARV spread with fast market
  const isFixAndFlip =
    marketHeat > 15 || // Market heat > 15% flip rate
    (metrics.averageARVSpread > estimatedARV * 0.25 && // 25%+ spread
      metrics.averageDaysOnMarket < 15 && // Fast market
      metrics.flipVolume > metrics.rentalVolume); // More flips than rentals

  // Scenario B: Buy & Hold (Rental)
  // Rental yield > 1% OR high rent-to-value ratio
  const isBuyAndHold =
    rentalYield > 1.0 || // Rent/Price > 1% (tagged as Buy & Hold candidate)
    (metrics.rentToValueRatio > 0.10 && // 10%+ annual rent-to-value
      metrics.averageARVSpread < estimatedARV * 0.20 && // Lower spread
      metrics.rentalVolume > metrics.flipVolume); // More rentals than flips

  // Scenario C: Creative Finance
  // High equity but seller needs terms, or cash offer rejected
  const isCreativeFinance =
    !isFixAndFlip &&
    !isBuyAndHold &&
    (metrics.averageARVSpread > estimatedARV * 0.15 || // Some equity
      propertyData.condition === 'excellent' || // Good condition
      propertyData.currentRent && propertyData.currentRent < marketRent * 0.8); // Under-rented

  // Determine strategy
  let strategy: 'fix_and_flip' | 'buy_and_hold' | 'creative_finance';
  let confidence: number;
  let reasoning: string;
  let recommendedMAO: number;
  const negotiationPoints: string[] = [];

  if (isFixAndFlip) {
    strategy = 'fix_and_flip';
    confidence = 0.85;
    reasoning = `Market heat is ${marketHeat.toFixed(1)}% (flip rate > 15%) - this is a strong flip market. High ARV spread (${((metrics.averageARVSpread / estimatedARV) * 100).toFixed(1)}%) and fast market (${metrics.averageDaysOnMarket.toFixed(0)} days average DOM) indicate strong flip potential.`;
    recommendedMAO = estimatedARV * cashToARVPercentage; // Use market heat-adjusted percentage
    negotiationPoints.push(
      `Looking at the last ${comps.length} cash sales in your area, investors are buying at ${(metrics.averageCashSaleToARV * 100).toFixed(0)}% of ARV.`
    );
    negotiationPoints.push(
      `The average days-on-market for cash sales is ${metrics.averageDaysOnMarket.toFixed(0)} days - this is a fast-moving market.`
    );
  } else if (isBuyAndHold) {
    strategy = 'buy_and_hold';
    confidence = 0.80;
    reasoning = `Rental yield is ${rentalYield.toFixed(2)}% (Rent/Price > 1%) - tagged as Buy & Hold candidate. High rent-to-value ratio (${(metrics.rentToValueRatio * 100).toFixed(1)}%) and strong rental market suggest buy-and-hold strategy. Consider Subject-To or Seller Finance to preserve fee structure.`;
    recommendedMAO = estimatedARV * 0.75; // Slightly higher for rental strategy
    negotiationPoints.push(
      `Market rents in your area are ${(metrics.rentToValueRatio * 100).toFixed(1)}% of property value annually - this is a strong rental market.`
    );
    if (propertyData.currentRent && propertyData.currentRent < marketRent * 0.8) {
      negotiationPoints.push(
        `Since the current tenant is paying ${((propertyData.currentRent / marketRent) * 100).toFixed(0)}% below market rent, my holding costs are higher, which affects my cash offer.`
      );
    }
    negotiationPoints.push(
      `For a buy-and-hold strategy, I can offer a higher price if we structure this as Subject-To or Seller Finance to preserve my $15,000 overhead coverage.`
    );
  } else {
    strategy = 'creative_finance';
    confidence = 0.70;
    reasoning = `Market conditions suggest creative finance approach. High equity position allows for higher price with terms.`;
    recommendedMAO = estimatedARV * 0.80; // Higher MAO for creative finance
    negotiationPoints.push(
      `I'm looking at the last three cash sales on your street - investors are buying at ${(metrics.averageCashSaleToARV * 100).toFixed(0)}% of ARV.`
    );
    negotiationPoints.push(
      `For me to make this work and still keep my $15,000 overhead covered, I have to be at $${recommendedMAO.toFixed(0)} cash.`
    );
    negotiationPoints.push(
      `However, if you need more than that, we can structure this creatively - I can offer a higher price in exchange for terms that work for both of us.`
    );
  }

  // Add rent-to-price filter negotiation point if applicable
  if (propertyData.currentRent && propertyData.currentRent < marketRent * 0.8) {
    const rentDiscount = ((1 - propertyData.currentRent / marketRent) * 100).toFixed(0);
    negotiationPoints.push(
      `Since the current tenant is paying ${rentDiscount}% below market rent ($${propertyData.currentRent.toFixed(0)} vs $${marketRent.toFixed(0)}), my holding costs are higher, which is why my cash offer is $${recommendedMAO.toFixed(0)}.`
    );
  }

  return {
    strategy,
    confidence,
    reasoning,
    recommendedMAO,
    negotiationPoints,
    cashToARVPercentage,
    marketHeat,
    rentalYield,
  };
}

/**
 * Analyze if creative finance pivot is needed
 * Trigger: If seller's ask price is > 10% above cash MAO
 */
export function analyzeCreativePivot(
  sellerAskPrice: number,
  cashMAO: number
): CreativePivotAnalysis {
  const priceGap = ((sellerAskPrice - cashMAO) / cashMAO) * 100;
  const shouldPivot = priceGap > 10; // > 10% above cash MAO

  if (!shouldPivot) {
    return {
      shouldPivot: false,
      sellerAskPrice,
      cashMAO,
      priceGap,
      pivotReasoning: 'Seller ask is within 10% of cash MAO - no pivot needed.',
      creativeOffer: {
        price: 0,
        terms: '',
        benefits: [],
      },
    };
  }

  // Calculate creative finance offer (typically 5-10% above cash MAO)
  const creativePrice = cashMAO * 1.08; // 8% above cash MAO

  return {
    shouldPivot: true,
    sellerAskPrice,
    cashMAO,
    priceGap,
    pivotReasoning: `Seller ask ($${sellerAskPrice.toLocaleString()}) is ${priceGap.toFixed(1)}% above cash MAO ($${cashMAO.toLocaleString()}). Creative finance pivot triggered.`,
    creativeOffer: {
      price: Math.round(creativePrice),
      terms: 'Seller financing: 5% down, 6% interest, 5-year term, or Subject-To existing mortgage',
      benefits: [
        'Monthly Income: You receive monthly payments instead of lump sum',
        'Tax Mitigation: Spread income over time reduces tax burden',
        'Top Dollar: We can offer $' + Math.round(creativePrice).toLocaleString() + ' instead of $' + cashMAO.toLocaleString() + ' cash',
        'Hand-Off: Think of it like handing off to a bank - we take over payments, you get monthly income',
        'Bank Analogy: Just like a bank, we make payments to you monthly while we own the property',
      ],
    },
  };
}

/**
 * Detect if caller is a Realtor
 * Looks for professional indicators in conversation
 */
export function detectRealtor(transcript: string): boolean {
  const realtorIndicators = [
    'realtor',
    'real estate agent',
    'listing agent',
    'broker',
    'mls',
    'listing',
    'seller\'s agent',
    'buyer\'s agent',
    'real estate professional',
    'licensed agent',
    'my client',
    'the seller',
    'representing',
  ];

  const lowerTranscript = transcript.toLowerCase();
  return realtorIndicators.some((indicator) => lowerTranscript.includes(indicator));
}

/**
 * Calculate dynamic MAO based on local market data
 * Replaces default 70% with actual cash sale to ARV percentage
 */
export async function calculateDynamicMAO(propertyData: PropertyData): Promise<number> {
  const comps = await fetchMarketComps(propertyData, 6);
  const estimatedARV = propertyData.estimatedARV || 100000;

  if (comps.length === 0) {
    // Fallback to default 70% if no comps
    logger.warn('No comps available, using default 70% MAO');
    return estimatedARV * 0.70;
  }

  const metrics = calculateMarketMetrics(comps, 0, estimatedARV);
  const dynamicMAO = estimatedARV * metrics.averageCashSaleToARV;

  logger.info('Dynamic MAO calculated', {
    estimatedARV,
    averageCashSaleToARV: metrics.averageCashSaleToARV,
    dynamicMAO,
    compsUsed: comps.length,
  });

  return dynamicMAO;
}

/**
 * Get rent-to-price analysis
 */
export async function getRentToPriceAnalysis(propertyData: PropertyData): Promise<{
  currentRent: number;
  marketRent: number;
  rentDiscount: number; // Percentage below market
  isUnderRented: boolean;
  negotiationLeverage: string;
}> {
  const marketRent = await fetchMarketRent(propertyData);
  const currentRent = propertyData.currentRent || 0;
  const rentDiscount = currentRent > 0 ? ((1 - currentRent / marketRent) * 100) : 0;
  const isUnderRented = currentRent > 0 && currentRent < marketRent * 0.8; // 20%+ below market

  let negotiationLeverage = '';
  if (isUnderRented) {
    negotiationLeverage = `Since the current tenant is paying ${rentDiscount.toFixed(0)}% below market rent ($${currentRent.toFixed(0)} vs $${marketRent.toFixed(0)}), my holding costs are higher, which is why my cash offer is lower.`;
  }

  return {
    currentRent,
    marketRent,
    rentDiscount,
    isUnderRented,
    negotiationLeverage,
  };
}
