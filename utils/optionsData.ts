// Centralized options data service - mock data structured for easy API replacement

export interface OptionChainRow {
  strike: number;
  expiry: string;
  callOI: number;
  callVolume: number;
  callLTP: number;
  callChange: number;
  callIV: number;
  callBid: number;
  callAsk: number;
  putLTP: number;
  putChange: number;
  putVolume: number;
  putOI: number;
  putIV: number;
  putBid: number;
  putAsk: number;
}

export interface InstrumentData {
  symbol: string;
  spotPrice: number;
  change: number;
  changePercent: number;
  lotSize: number;
  expiries: string[];
}

// Mock instruments with realistic data
export const instruments: Record<string, InstrumentData> = {
  NIFTY: {
    symbol: "NIFTY",
    spotPrice: 22045,
    change: 185.5,
    changePercent: 0.85,
    lotSize: 50,
    expiries: ["28-Oct-2025", "04-Nov-2025", "28-Nov-2025"],
  },
  BANKNIFTY: {
    symbol: "BANKNIFTY",
    spotPrice: 47250,
    change: -125.3,
    changePercent: -0.26,
    lotSize: 25,
    expiries: ["28-Oct-2025", "04-Nov-2025", "28-Nov-2025"],
  },
  RELIANCE: {
    symbol: "RELIANCE",
    spotPrice: 2850,
    change: 42.5,
    changePercent: 1.51,
    lotSize: 250,
    expiries: ["28-Oct-2025", "28-Nov-2025"],
  },
  TCS: {
    symbol: "TCS",
    spotPrice: 3680,
    change: -18.75,
    changePercent: -0.51,
    lotSize: 125,
    expiries: ["28-Oct-2025", "28-Nov-2025"],
  },
};

// Helper to calculate days between dates
const calculateDaysToExpiry = (
  currentDate: Date,
  expiryDateStr: string
): number => {
  const [day, month, year] = expiryDateStr.split("-");
  const monthMap: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  const expiryDate = new Date(Number(year), monthMap[month], Number(day));
  const diffTime = expiryDate.getTime() - currentDate.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
};

// Calculate realistic option premium using simplified Black-Scholes approximation
const calculateOptionPremium = (
  spot: number,
  strike: number,
  isCall: boolean,
  iv: number,
  daysToExpiry: number
): number => {
  const intrinsic = isCall
    ? Math.max(0, spot - strike)
    : Math.max(0, strike - spot);

  // Simplified time value calculation
  const timeValue = (iv / 100) * Math.sqrt(daysToExpiry / 365) * spot * 0.4;
  const atmnessDiscount = Math.exp(-Math.abs(spot - strike) / (spot * 0.05));

  const premium = intrinsic + timeValue * atmnessDiscount;
  return Math.max(0.05, Number(premium.toFixed(2)));
};

// Generate realistic options chain for an instrument
export const generateOptionsChain = (
  instrumentSymbol: string,
  expiry?: string,
  currentDate: Date = new Date()
): OptionChainRow[] => {
  const instrument = instruments[instrumentSymbol];
  if (!instrument) return [];

  const spot = instrument.spotPrice;
  const expiriesToGenerate = expiry ? [expiry] : instrument.expiries;

  const allRows: OptionChainRow[] = [];

  expiriesToGenerate.forEach((expiryDate) => {
    const daysToExpiry = calculateDaysToExpiry(currentDate, expiryDate);

    // Generate strikes around spot price
    const strikeInterval =
      instrumentSymbol === "NIFTY"
        ? 50
        : instrumentSymbol === "BANKNIFTY"
        ? 100
        : 50;

    const numStrikes = 15;
    const centerStrike = Math.round(spot / strikeInterval) * strikeInterval;
    const strikes: number[] = [];

    for (
      let i = -Math.floor(numStrikes / 2);
      i <= Math.floor(numStrikes / 2);
      i++
    ) {
      strikes.push(centerStrike + i * strikeInterval);
    }

    const rows = strikes.map((strike) => {
      const distanceFromSpot = Math.abs(strike - spot);
      const isATM = distanceFromSpot <= strikeInterval;
      const isITM_Call = strike < spot;
      const isITM_Put = strike > spot;

      // Realistic IV - higher for OTM, lower for ITM
      const baseIV = 16 + (distanceFromSpot / spot) * 20;
      const callIV = Number((baseIV + (isITM_Call ? -1 : 2)).toFixed(2));
      const putIV = Number((baseIV + (isITM_Put ? -1 : 2)).toFixed(2));

      // Calculate premiums
      const callLTP = calculateOptionPremium(
        spot,
        strike,
        true,
        callIV,
        daysToExpiry
      );
      const putLTP = calculateOptionPremium(
        spot,
        strike,
        false,
        putIV,
        daysToExpiry
      );

      // Volume and OI - higher for ATM strikes
      const atmMultiplier = isATM ? 3 : 1;
      const baseVolume = 5000 + Math.random() * 10000;
      const baseOI = 20000 + Math.random() * 50000;

      // Realistic price changes
      const callChange = isITM_Call
        ? Number((5 + Math.random() * 15).toFixed(2))
        : Number((-2 - Math.random() * 10).toFixed(2));

      const putChange = isITM_Put
        ? Number((5 + Math.random() * 15).toFixed(2))
        : Number((-2 - Math.random() * 10).toFixed(2));

      return {
        strike,
        expiry: expiryDate,
        callOI: Math.round(baseOI * atmMultiplier),
        callVolume: Math.round(baseVolume * atmMultiplier),
        callLTP,
        callChange,
        callIV,
        callBid: Number((callLTP * 0.98).toFixed(2)),
        callAsk: Number((callLTP * 1.02).toFixed(2)),
        putLTP,
        putChange,
        putVolume: Math.round(baseVolume * atmMultiplier * 0.9),
        putOI: Math.round(baseOI * atmMultiplier * 1.1),
        putIV,
        putBid: Number((putLTP * 0.98).toFixed(2)),
        putAsk: Number((putLTP * 1.02).toFixed(2)),
      };
    });

    allRows.push(...rows);
  });

  return allRows;
};

// Calculate PCR (Put-Call Ratio)
export const calculatePCR = (optionsChain: OptionChainRow[]): number => {
  const totalPutOI = optionsChain.reduce((sum, row) => sum + row.putOI, 0);
  const totalCallOI = optionsChain.reduce((sum, row) => sum + row.callOI, 0);
  return Number((totalPutOI / totalCallOI).toFixed(2));
};

// Get market summary
export const getMarketSummary = (instrumentSymbol: string) => {
  const instrument = instruments[instrumentSymbol];
  const optionsChain = generateOptionsChain(instrumentSymbol);
  const pcr = calculatePCR(optionsChain);

  const totalCallOI = optionsChain.reduce((sum, row) => sum + row.callOI, 0);
  const totalPutOI = optionsChain.reduce((sum, row) => sum + row.putOI, 0);

  return {
    instrument,
    pcr,
    totalCallOI,
    totalPutOI,
    sentiment: pcr > 1.2 ? "Bullish" : pcr < 0.8 ? "Bearish" : "Neutral",
  };
};

// Pre-defined strategy templates with realistic strikes
export const strategyTemplates = {
  longStraddle: (spot: number, strikeInterval: number) => {
    const atmStrike = Math.round(spot / strikeInterval) * strikeInterval;
    return [
      { type: "CE" as const, strike: atmStrike, action: "BUY" as const },
      { type: "PE" as const, strike: atmStrike, action: "BUY" as const },
    ];
  },
  longStrangle: (spot: number, strikeInterval: number) => {
    const atmStrike = Math.round(spot / strikeInterval) * strikeInterval;
    return [
      {
        type: "CE" as const,
        strike: atmStrike + strikeInterval,
        action: "BUY" as const,
      },
      {
        type: "PE" as const,
        strike: atmStrike - strikeInterval,
        action: "BUY" as const,
      },
    ];
  },
  ironCondor: (spot: number, strikeInterval: number) => {
    const atmStrike = Math.round(spot / strikeInterval) * strikeInterval;
    return [
      {
        type: "CE" as const,
        strike: atmStrike + strikeInterval * 2,
        action: "BUY" as const,
      },
      {
        type: "CE" as const,
        strike: atmStrike + strikeInterval,
        action: "SELL" as const,
      },
      {
        type: "PE" as const,
        strike: atmStrike - strikeInterval,
        action: "SELL" as const,
      },
      {
        type: "PE" as const,
        strike: atmStrike - strikeInterval * 2,
        action: "BUY" as const,
      },
    ];
  },
  bullCallSpread: (spot: number, strikeInterval: number) => {
    const atmStrike = Math.round(spot / strikeInterval) * strikeInterval;
    return [
      { type: "CE" as const, strike: atmStrike, action: "BUY" as const },
      {
        type: "CE" as const,
        strike: atmStrike + strikeInterval,
        action: "SELL" as const,
      },
    ];
  },
  bearPutSpread: (spot: number, strikeInterval: number) => {
    const atmStrike = Math.round(spot / strikeInterval) * strikeInterval;
    return [
      { type: "PE" as const, strike: atmStrike, action: "BUY" as const },
      {
        type: "PE" as const,
        strike: atmStrike - strikeInterval,
        action: "SELL" as const,
      },
    ];
  },
};

// API placeholder function - replace with actual API calls
export const fetchLiveOptionsData = async (
  instrument: string,
  expiry: string
): Promise<OptionChainRow[]> => {
  // TODO: Replace with actual NSE API call
  // const response = await fetch(`https://api.nseindia.com/option-chain?symbol=${instrument}`);
  // const data = await response.json();
  // return parseNSEData(data);

  // For now, return mock data
  return generateOptionsChain(instrument, expiry);
};
