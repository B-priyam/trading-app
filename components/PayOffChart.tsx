// PayoffChart.tsx
import React, { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";

interface SelectedOption {
  id?: string;
  strike: number | string;
  type: "CE" | "PE";
  action: "BUY" | "SELL";
  premium: number | string;
  quantity: number | string;
  expiry?: string; // ISO date string (optional) — recommended to be present for calendar spreads
}

interface PayoffChartProps {
  selectedOptions: SelectedOption[];
  spotPrice: number;
  availableStrikes?: number[];
  lotSize?: number; // default 50
  debug?: boolean;
}

const PayoffChart: React.FC<PayoffChartProps> = ({
  selectedOptions,
  spotPrice,
  availableStrikes = [],
  lotSize = 35,
  debug = false,
}) => {
  // UI state to support calendar spread viewing and zoom
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [viewExpiry, setViewExpiry] = useState<string>("ALL"); // "ALL" or a specific expiry
  const [viewMode, setViewMode] = useState<"expiry-only" | "all-intrinsic">(
    "expiry-only"
  );

  // helper: safe numeric
  const toNum = (v: any) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // unique expiries from selectedOptions (strings)
  const expiries = useMemo(() => {
    const set = new Set<string>();
    selectedOptions.forEach((o) => {
      if (o.expiry) set.add(String(o.expiry));
    });
    return Array.from(set).sort();
  }, [selectedOptions]);

  // filter options according to viewMode + viewExpiry:
  // - expiry-only: only include legs whose expiry === viewExpiry (if viewExpiry !== 'ALL')
  // - all-intrinsic: include all legs but when computing at a chosen expiry we evaluate intrinsic for each leg at snapshot date (i.e., intrinsic rather than model price)
  const filteredOptions = useMemo(() => {
    if (viewExpiry === "ALL") return selectedOptions;
    if (viewMode === "expiry-only") {
      return selectedOptions.filter(
        (o) => String(o.expiry) === String(viewExpiry)
      );
    } else {
      // all-intrinsic -> include all legs (we will evaluate intrinsic at snapshot)
      return selectedOptions;
    }
  }, [selectedOptions, viewExpiry, viewMode]);

  // Generate robust price grid (centered on spot, covers available strikes or selected strikes)
  const generatePriceRange = (zoom = zoomLevel) => {
    const POINTS = 300;
    if (
      (!filteredOptions || filteredOptions.length === 0) &&
      (!availableStrikes || availableStrikes.length === 0)
    ) {
      const start = Math.max(0, spotPrice - 1000);
      const end = spotPrice + 1000;
      const step = (end - start) / (POINTS - 1);
      return Array.from({ length: POINTS }, (_, i) => start + i * step);
    }

    let minStrike = Infinity;
    let maxStrike = -Infinity;

    if (availableStrikes && availableStrikes.length > 0) {
      minStrike = Math.min(...availableStrikes.map(toNum));
      maxStrike = Math.max(...availableStrikes.map(toNum));
    } else {
      const strikes = filteredOptions.map((s) => toNum((s as any).strike));
      if (strikes.length === 0) {
        minStrike = Math.max(0, spotPrice - 1000);
        maxStrike = spotPrice + 1000;
      } else {
        minStrike = Math.min(...strikes);
        maxStrike = Math.max(...strikes);
      }
    }

    const baseRange = Math.max(
      maxStrike - minStrike,
      Math.max(100, Math.abs(spotPrice) * 0.2)
    );
    const padding = baseRange * 0.5;
    const start = Math.max(
      0,
      Math.min(minStrike - padding, spotPrice - baseRange)
    );
    const end = Math.max(maxStrike + padding, spotPrice + baseRange);

    const center = spotPrice;
    const visibleRange = (end - start) / (zoom || 1);
    const rStart = Math.max(0, center - visibleRange / 2);
    const rEnd = center + visibleRange / 2;

    const actualStart = Math.min(rStart, start);
    const actualEnd = Math.max(rEnd, end);

    const step = (actualEnd - actualStart) / (POINTS - 1 || 1);
    return Array.from({ length: POINTS }, (_, i) => actualStart + i * step);
  };

  // Calculate payoff for a single option at a given price.
  // viewMode matters: if viewMode === 'all-intrinsic' and viewExpiry set (not ALL),
  // we treat each option's value at that snapshot as intrinsic (ignores time value).
  const optionPayoffAtPrice = (
    option: SelectedOption,
    price: number,
    snapshotExpiry: string | "ALL"
  ) => {
    const strike = toNum(option.strike);
    const premium = toNum(option.premium);
    const qty = Math.max(1, Math.floor(toNum(option.quantity)));
    const LOT = lotSize;

    // If viewMode is 'all-intrinsic' and snapshotExpiry !== 'ALL', then we evaluate intrinsic for EVERY leg.
    // This provides a simple theoretical snapshot for calendar spreads (time value ignored).
    const isIntrinsicMode =
      viewMode === "all-intrinsic" && snapshotExpiry !== "ALL";

    if (!isIntrinsicMode) {
      // Standard expiry payoff at option's expiry: intrinsic only at expiry (intrinsic at price)
      // For the purpose of payoff-at-expiry calculation we use intrinsic (payoff at expiry).
    }

    let intrinsic = 0;
    if (option.type === "CE") {
      intrinsic = Math.max(0, price - strike);
    } else {
      intrinsic = Math.max(0, strike - price);
    }

    // When showing expiry-only and option's expiry !== snapshotExpiry, the option is not part of that expiry's payoff.
    if (viewMode === "expiry-only" && snapshotExpiry !== "ALL") {
      if (String(option.expiry) !== String(snapshotExpiry)) {
        return 0; // option hasn't expired on that date (so no expiry payoff)
      }
    }

    // For 'all-intrinsic' mode, every leg contributes intrinsic at snapshotExpiry regardless of its actual expiry.
    // Cashflow sign: BUY -> buyer pays premium upfront and receives intrinsic at expiry (intrinsic - premium)
    // SELL -> seller receives premium upfront and pays intrinsic at expiry (premium - intrinsic)
    if (option.action === "BUY") {
      return (intrinsic - premium) * qty * LOT;
    } else {
      return (premium - intrinsic) * qty * LOT;
    }
  };

  // Generate chart data using filteredOptions and snapshot expiry
  const generateChartData = (snapshotExpiry: string | "ALL" = viewExpiry) => {
    const priceRange = generatePriceRange();
    return priceRange.map((price) => {
      const total = filteredOptions.reduce((sum, opt) => {
        return sum + optionPayoffAtPrice(opt, price, snapshotExpiry);
      }, 0);
      return { price: Math.round(price), payoff: total };
    });
  };

  // Breakevens by interpolation
  const calculateBreakevens = (data: { price: number; payoff: number }[]) => {
    const be: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      if (
        (prev.payoff <= 0 && curr.payoff >= 0) ||
        (prev.payoff >= 0 && curr.payoff <= 0)
      ) {
        const dx = curr.price - prev.price;
        const dy = curr.payoff - prev.payoff;
        if (Math.abs(dy) < 1e-9 || dx === 0) {
          be.push((prev.price + curr.price) / 2);
        } else {
          const slope = dy / dx;
          const x = prev.price - prev.payoff / slope;
          be.push(x);
        }
      }
    }
    return Array.from(new Set(be.map((b) => Math.round(b)))).sort(
      (a, b) => a - b
    );
  };

  // POP: fraction of price points with payoff > 0
  const calculatePOP = (data: { price: number; payoff: number }[]) => {
    if (!data || data.length === 0) return 0;
    const profitable = data.filter((d) => d.payoff > 0).length;
    return Number(((profitable / data.length) * 100).toFixed(1));
  };

  // Simple std dev estimate (for drawing +/- 1σ and 2σ)
  const calculateStdDev = () => {
    const annualVol = 0.2; // default 20% p.a. (tunable)
    const daysToExpiry = 30; // approximate
    return spotPrice * annualVol * Math.sqrt(daysToExpiry / 365);
  };

  // Margin calculation (approximate) — pairs hedges greedily and flags naked short calls as Infinity
  const calculateMarginRequired = (
    snapshotExpiry: string | "ALL" = viewExpiry
  ) => {
    // For margin estimate we consider all legs by default (calendar spreads: margin typically computed per expiry in reality)
    // If snapshotExpiry is not 'ALL' and viewMode === 'expiry-only' we will compute margin only for legs expiring on snapshotExpiry.
    const relevantLegs =
      viewMode === "expiry-only" && snapshotExpiry !== "ALL"
        ? selectedOptions.filter(
            (o) => String(o.expiry) === String(snapshotExpiry)
          )
        : selectedOptions;

    if (!relevantLegs || relevantLegs.length === 0) return 0;

    const normalized = relevantLegs.map((o) => ({
      strike: toNum((o as any).strike),
      type: (o as any).type,
      action: (o as any).action,
      premium: toNum(o.premium),
      qty: Math.max(1, Math.floor(toNum(o.quantity))),
    }));

    const calls = normalized.filter((n) => n.type === "CE");
    const puts = normalized.filter((n) => n.type === "PE");

    const computeSpreadMargin = (
      shorts: any[],
      buys: any[],
      isCall: boolean
    ) => {
      let margin = 0;
      const s = [...shorts].sort((a, b) => a.strike - b.strike);
      const b = [...buys].sort((a, b) => a.strike - b.strike);

      for (const sh of s) {
        let remainingQty = sh.qty;
        for (const buy of b) {
          const canHedge =
            buy.qty > 0 &&
            ((isCall && buy.strike > sh.strike) ||
              (!isCall && buy.strike < sh.strike));
          if (!canHedge) continue;
          const hedgedQty = Math.min(remainingQty, buy.qty);
          const spreadWidth = Math.abs(buy.strike - sh.strike);
          margin += spreadWidth * lotSize * hedgedQty;
          buy.qty -= hedgedQty;
          remainingQty -= hedgedQty;
          if (remainingQty <= 0) break;
        }

        if (remainingQty > 0) {
          if (isCall) {
            return { margin: Infinity, unlimited: true };
          } else {
            margin += sh.strike * lotSize * remainingQty * 0.5; // conservative approximation
          }
        }
      }

      return { margin, unlimited: false };
    };

    const callShorts = calls
      .filter((c) => c.action === "SELL")
      .map((c) => ({ ...c }));
    const callBuys = calls
      .filter((c) => c.action === "BUY")
      .map((c) => ({ ...c }));
    const putShorts = puts
      .filter((p) => p.action === "SELL")
      .map((p) => ({ ...p }));
    const putBuys = puts
      .filter((p) => p.action === "BUY")
      .map((p) => ({ ...p }));

    const callRes = computeSpreadMargin(callShorts, callBuys, true);
    if (callRes.unlimited) return Infinity;
    const putRes = computeSpreadMargin(putShorts, putBuys, false);
    if (putRes.unlimited) return Infinity;

    const longPremiums = normalized
      .filter((n) => n.action === "BUY")
      .reduce((s, n) => s + n.premium * n.qty * lotSize, 0);
    const shortPremiums = normalized
      .filter((n) => n.action === "SELL")
      .reduce((s, n) => s + n.premium * n.qty * lotSize, 0);

    const total = callRes.margin + putRes.margin + longPremiums - shortPremiums;
    return Math.max(0, Math.round(total));
  };

  // Detect unlimited risk/profit from positions: naked short call => unlimited loss, any long call => unlimited profit
  const computeMaxProfitLoss = (data: { price: number; payoff: number }[]) => {
    const maxProfit = Math.max(...data.map((d) => d.payoff));
    const maxLoss = Math.min(...data.map((d) => d.payoff));

    const hasNakedShortCall = selectedOptions.some((o) => {
      return (
        (o as any).type === "CE" &&
        (o as any).action === "SELL" &&
        !selectedOptions.some(
          (b) =>
            (b as any).type === "CE" &&
            (b as any).action === "BUY" &&
            toNum((b as any).strike) > toNum((o as any).strike) &&
            toNum((b as any).quantity) >= toNum((o as any).quantity)
        )
      );
    });

    const hasLongCall = selectedOptions.some(
      (o) => (o as any).type === "CE" && (o as any).action === "BUY"
    );

    return {
      maxProfit: hasLongCall ? Infinity : maxProfit,
      maxLoss: hasNakedShortCall ? -Infinity : maxLoss,
      hasLongCall,
      hasNakedShortCall,
    };
  };

  // Primary data calculation (memoized)
  const data = useMemo(
    () => generateChartData(viewExpiry),
    [selectedOptions, spotPrice, viewExpiry, viewMode, zoomLevel]
  );
  const breakevens = useMemo(() => calculateBreakevens(data), [data]);
  const pop = useMemo(() => calculatePOP(data), [data]);
  const stdDev = useMemo(() => calculateStdDev(), [spotPrice]);
  const marginRequired = useMemo(
    () => calculateMarginRequired(viewExpiry),
    [selectedOptions, viewExpiry, viewMode]
  );

  const { maxProfit, maxLoss, hasLongCall, hasNakedShortCall } = useMemo(
    () => computeMaxProfitLoss(data),
    [data, selectedOptions]
  );

  // Current P&L: find closest price point to spot
  const currentPnL = useMemo(() => {
    if (!data || data.length === 0) return 0;
    return data.reduce(
      (closest, cur) =>
        Math.abs(cur.price - spotPrice) < Math.abs(closest.price - spotPrice)
          ? cur
          : closest,
      data[0]
    ).payoff;
  }, [data, spotPrice]);

  // Debug helper: console table for a chosen price (call in console or toggle debug)
  const debugBreakdown = (atPrice: number) => {
    const breakdown = (selectedOptions || []).map((opt) => {
      const p = optionPayoffAtPrice(opt, atPrice, viewExpiry);
      return {
        strike: toNum(opt.strike),
        type: opt.type,
        action: opt.action,
        expiry: opt.expiry ?? "N/A",
        premium: toNum(opt.premium),
        qty: toNum(opt.quantity),
        payoff: p,
      };
    });
    // eslint-disable-next-line no-console
    console.groupCollapsed(`Payoff breakdown @ ${atPrice}`);
    // eslint-disable-next-line no-console
    console.table(breakdown);
    // eslint-disable-next-line no-console
    console.log(
      "Total payoff:",
      breakdown.reduce((s, r) => s + r.payoff, 0)
    );
    // eslint-disable-next-line no-console
    console.groupEnd();
  };

  if (debug) {
    // eslint-disable-next-line no-console
    console.log("DEBUG: selectedOptions", selectedOptions);
    debugBreakdown(spotPrice);
  }

  // UI controls for expiry and mode
  const expiryOptions = ["ALL", ...expiries];

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
        <div className="flex gap-2 items-center">
          <label className="text-sm">View Expiry:</label>
          <select
            className="px-2 py-1 rounded border"
            value={viewExpiry}
            onChange={(e) => setViewExpiry(e.target.value)}
          >
            {expiryOptions.map((ex) => (
              <option key={ex} value={ex}>
                {ex === "ALL" ? "All Expiries" : ex}
              </option>
            ))}
          </select>

          <label className="text-sm pl-3">Mode:</label>
          <select
            className="px-2 py-1 rounded border"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
          >
            <option value="expiry-only">
              Expiry-only (legs expiring on selected date)
            </option>
            <option value="all-intrinsic">
              All-intrinsic snapshot (intrinsic for all legs)
            </option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel((z) => Math.max(0.5, z / 1.5))}
          >
            <ZoomOut className="h-4 w-4 mr-1" /> Zoom Out
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel((z) => Math.min(5, z * 1.5))}
          >
            <ZoomIn className="h-4 w-4 mr-1" /> Zoom In
          </Button>
        </div>
      </div>

      {(!data || data.length === 0) && (
        <div className="h-[500px] flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-border">
          <div className="text-center text-muted-foreground">
            <p className="font-medium">Select options from the chain below</p>
            <p className="text-sm mt-1">
              Click Buy/Sell to add legs to your strategy
            </p>
          </div>
        </div>
      )}

      {data && data.length > 0 && (
        <>
          <ResponsiveContainer width="100%" height={500}>
            <ComposedChart
              data={data}
              margin={{ top: 30, right: 30, left: 60, bottom: 50 }}
            >
              <CartesianGrid
                strokeDasharray="1 1"
                stroke="#e0e0e0"
                opacity={0.5}
              />

              <XAxis
                dataKey="price"
                stroke="#333333"
                tick={{ fontSize: 11, fill: "#333333" }}
                tickFormatter={(value) => Number(value).toLocaleString()}
                label={{
                  value: "Underlying Price",
                  position: "insideBottom",
                  offset: -10,
                  fill: "#000000",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              />

              <YAxis
                stroke="#333333"
                tick={{ fontSize: 11, fill: "#333333" }}
                label={{
                  value: "Profit / Loss",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#000000",
                  fontSize: 13,
                  fontWeight: 700,
                }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />

              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium">
                          Spot: ₹{d.price.toLocaleString()}
                        </p>
                        <p
                          className={`text-sm font-semibold ${
                            d.payoff >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          P&L: ₹{Math.round(d.payoff).toLocaleString()}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Std dev reference areas */}
              <ReferenceArea
                x1={Math.round(spotPrice - 2 * stdDev)}
                x2={Math.round(spotPrice - stdDev)}
                fill="#f5f5f5"
                fillOpacity={0.8}
              />
              <ReferenceArea
                x1={Math.round(spotPrice + stdDev)}
                x2={Math.round(spotPrice + 2 * stdDev)}
                fill="#f5f5f5"
                fillOpacity={0.8}
              />

              {/* Std dev lines */}
              <ReferenceLine
                x={Math.round(spotPrice - 2 * stdDev)}
                stroke="#999999"
                strokeDasharray="2 2"
                strokeOpacity={0.7}
                label={{
                  value: "-2σ",
                  position: "top",
                  fill: "#666666",
                  fontSize: 11,
                }}
              />
              <ReferenceLine
                x={Math.round(spotPrice - stdDev)}
                stroke="#999999"
                strokeDasharray="2 2"
                strokeOpacity={0.7}
                label={{
                  value: "-1σ",
                  position: "top",
                  fill: "#666666",
                  fontSize: 11,
                }}
              />
              <ReferenceLine
                x={Math.round(spotPrice + stdDev)}
                stroke="#999999"
                strokeDasharray="2 2"
                strokeOpacity={0.7}
                label={{
                  value: "+1σ",
                  position: "top",
                  fill: "#666666",
                  fontSize: 11,
                }}
              />
              <ReferenceLine
                x={Math.round(spotPrice + 2 * stdDev)}
                stroke="#999999"
                strokeDasharray="2 2"
                strokeOpacity={0.7}
                label={{
                  value: "+2σ",
                  position: "top",
                  fill: "#666666",
                  fontSize: 11,
                }}
              />

              {/* Zero line */}
              <ReferenceLine y={0} stroke="#666666" strokeWidth={1.5} />

              {/* Current price */}
              <ReferenceLine
                x={spotPrice}
                stroke="#4caf50"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: spotPrice.toLocaleString(),
                  position: "top",
                  fill: "#4caf50",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />

              {/* Breakeven lines */}
              {breakevens.map((be, idx) => (
                <ReferenceLine
                  key={`be-${idx}`}
                  x={Math.round(be)}
                  stroke="#ff9800"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{
                    value: `${Math.round(be).toLocaleString()}`,
                    position: "top",
                    fill: "#ff9800",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              ))}

              {/* Profit/Loss shading */}
              <ReferenceArea
                y1={0}
                y2={Math.max(...data.map((d) => d.payoff, 0))}
                fill="#c8e6c9"
                fillOpacity={0.6}
              />
              <ReferenceArea
                y1={Math.min(...data.map((d) => d.payoff, 0))}
                y2={0}
                fill="#ffccbc"
                fillOpacity={0.5}
              />

              <Line
                type="monotone"
                dataKey="payoff"
                stroke="#ff6f00"
                strokeWidth={3}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-6">
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Max Profit</p>
              <p className="text-base font-bold">
                {maxProfit === Infinity
                  ? "Unlimited"
                  : `₹${Math.round(maxProfit).toLocaleString()}`}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Max Loss</p>
              <p className="text-base font-bold">
                {maxLoss === -Infinity
                  ? "Unlimited"
                  : `₹${Math.abs(Math.round(maxLoss)).toLocaleString()}`}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Breakevens</p>
              <p className="text-base font-bold text-warning">
                {breakevens.length === 0 ? "None" : breakevens.length}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">POP</p>
              <p
                className={`text-base font-bold ${
                  Number(pop) >= 50 ? "text-success" : "text-danger"
                }`}
              >
                {pop}%
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Current P&L</p>
              <p className="text-base font-bold">
                {currentPnL >= 0 ? (
                  <span className="text-success">
                    ₹{Math.round(currentPnL).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-danger">
                    ₹{Math.round(currentPnL).toLocaleString()}
                  </span>
                )}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Total Legs</p>
              <p className="text-base font-bold text-primary">
                {selectedOptions.length}
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">
                Margin Required
              </p>
              <p className="text-base font-bold text-primary">
                {marginRequired === Infinity
                  ? "Unlimited"
                  : `₹${Math.round(marginRequired).toLocaleString()}`}
              </p>
            </div>
          </div>

          {/* Breakeven detail list */}
          {breakevens.length > 0 && (
            <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-sm font-semibold text-warning mb-2">
                Breakeven Points:
              </p>
              <div className="flex flex-wrap gap-2">
                {breakevens.map((be, idx) => (
                  <span
                    key={idx}
                    className="text-sm font-mono bg-background px-2 py-1 rounded border border-warning/30"
                  >
                    ₹{Math.round(be).toLocaleString()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PayoffChart;
