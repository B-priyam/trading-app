import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";

interface SelectedOption {
  strike: number;
  type: "CE" | "PE";
  action: "BUY" | "SELL";
  premium: number;
  quantity: number;
}

interface PayoffChartProps {
  selectedOptions: SelectedOption[];
  spotPrice: number;
  availableStrikes?: number[];
}

const PayoffChart = ({
  selectedOptions,
  spotPrice,
  availableStrikes,
}: PayoffChartProps) => {
  const [zoomLevel, setZoomLevel] = useState(1);

  // Generate price range for X-axis covering full option chain
  const generatePriceRange = () => {
    if (selectedOptions.length === 0 && !availableStrikes) {
      return Array.from({ length: 100 }, (_, i) => spotPrice - 1000 + i * 20);
    }

    let minStrike: number, maxStrike: number;

    if (availableStrikes && availableStrikes.length > 0) {
      // Use full option chain range
      minStrike = Math.min(...availableStrikes);
      maxStrike = Math.max(...availableStrikes);
    } else {
      // Fallback to selected options
      const strikes = selectedOptions.map((opt) => opt.strike);
      minStrike = Math.min(...strikes);
      maxStrike = Math.max(...strikes);
    }

    // Apply zoom
    const center = spotPrice;
    const baseRange = maxStrike - minStrike;
    const range = baseRange / zoomLevel;
    const start = center - range / 2;
    const end = center + range / 2;

    // Ensure we cover at least from minStrike to maxStrike
    const actualStart = Math.min(start, minStrike - baseRange * 0.1);
    const actualEnd = Math.max(end, maxStrike + baseRange * 0.1);

    const step = (actualEnd - actualStart) / 100;

    return Array.from({ length: 100 }, (_, i) => actualStart + i * step);
  };

  // Calculate payoff for a single option at expiry
  const calculateOptionPayoff = (option: SelectedOption, price: number) => {
    const { strike, type, action, premium, quantity } = option;
    let payoff = 0;

    if (type === "CE") {
      // Call option
      const intrinsic = Math.max(0, price - strike);
      payoff =
        action === "BUY"
          ? (intrinsic - premium) * quantity * 50 // 50 is lot size
          : (premium - intrinsic) * quantity * 50;
    } else {
      // Put option
      const intrinsic = Math.max(0, strike - price);
      payoff =
        action === "BUY"
          ? (intrinsic - premium) * quantity * 50
          : (premium - intrinsic) * quantity * 50;
    }

    return payoff;
  };

  // Calculate breakeven points
  const calculateBreakevens = () => {
    const data = generateChartData();
    const breakevens: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];

      // Check if line crosses zero
      if (
        (prev.payoff <= 0 && curr.payoff >= 0) ||
        (prev.payoff >= 0 && curr.payoff <= 0)
      ) {
        // Linear interpolation to find exact breakeven
        const slope = (curr.payoff - prev.payoff) / (curr.price - prev.price);
        const breakeven = prev.price - prev.payoff / slope;
        breakevens.push(breakeven);
      }
    }

    return breakevens;
  };

  // Calculate Probability of Profit (simplified - assumes normal distribution)
  const calculatePOP = () => {
    if (selectedOptions.length === 0) return 0;

    const data = generateChartData();
    const profitablePoints = data.filter((d) => d.payoff > 0).length;
    return ((profitablePoints / data.length) * 100).toFixed(1);
  };

  // Calculate standard deviation (simplified)
  const calculateStdDev = () => {
    // Assume ~1% daily volatility, 30 days to expiry
    const annualVol = 0.2; // 20% annual volatility
    const daysToExpiry = 30;
    const stdDev = spotPrice * annualVol * Math.sqrt(daysToExpiry / 365);
    return stdDev;
  };

  // Calculate margin required with hedge benefits
  const calculateMarginRequired = () => {
    if (selectedOptions.length === 0) return 0;

    const LOT_SIZE = 50;
    let totalMargin = 0;

    // Group options by type to identify hedges
    const calls = selectedOptions.filter((opt) => opt.type === "CE");
    const puts = selectedOptions.filter((opt) => opt.type === "PE");

    // Calculate margin for call side
    const callSells = calls
      .filter((opt) => opt.action === "SELL")
      .sort((a, b) => a.strike - b.strike);
    const callBuys = calls
      .filter((opt) => opt.action === "BUY")
      .sort((a, b) => a.strike - b.strike);

    callSells.forEach((sell) => {
      let marginForThisLeg = 0;

      // Check if there's a hedge (buy at higher strike)
      const hedge = callBuys.find((buy) => buy.strike > sell.strike);

      if (hedge) {
        // Credit spread: margin = (higher strike - lower strike) * lot size * quantity
        const spreadWidth = hedge.strike - sell.strike;
        marginForThisLeg = spreadWidth * LOT_SIZE * sell.quantity;
      } else {
        // Naked short: SPAN + Exposure margin (simplified as ~25% of strike)
        marginForThisLeg = sell.strike * 0.25 * LOT_SIZE * sell.quantity;
      }

      totalMargin += marginForThisLeg;
    });

    // Calculate margin for put side
    const putSells = puts
      .filter((opt) => opt.action === "SELL")
      .sort((a, b) => b.strike - a.strike);
    const putBuys = puts
      .filter((opt) => opt.action === "BUY")
      .sort((a, b) => b.strike - a.strike);

    putSells.forEach((sell) => {
      let marginForThisLeg = 0;

      // Check if there's a hedge (buy at lower strike)
      const hedge = putBuys.find((buy) => buy.strike < sell.strike);

      if (hedge) {
        // Credit spread: margin = (higher strike - lower strike) * lot size * quantity
        const spreadWidth = sell.strike - hedge.strike;
        marginForThisLeg = spreadWidth * LOT_SIZE * sell.quantity;
      } else {
        // Naked short: SPAN + Exposure margin (simplified as ~25% of strike)
        marginForThisLeg = sell.strike * 0.25 * LOT_SIZE * sell.quantity;
      }

      totalMargin += marginForThisLeg;
    });

    // Add premium paid for long options (already paid upfront)
    const longPremium = selectedOptions
      .filter((opt) => opt.action === "BUY")
      .reduce((sum, opt) => sum + opt.premium * opt.quantity * LOT_SIZE, 0);

    totalMargin += longPremium;

    // Subtract premium received from short options
    const shortPremium = selectedOptions
      .filter((opt) => opt.action === "SELL")
      .reduce((sum, opt) => sum + opt.premium * opt.quantity * LOT_SIZE, 0);

    // Net margin = margin required - premium received + premium paid
    return Math.max(0, totalMargin - shortPremium);
  };

  // Generate chart data
  const generateChartData = () => {
    const priceRange = generatePriceRange();

    return priceRange.map((price) => {
      const totalPayoff = selectedOptions.reduce((sum, option) => {
        return sum + calculateOptionPayoff(option, price);
      }, 0);

      return {
        price: Math.round(price),
        payoff: Math.round(totalPayoff),
        profit: totalPayoff > 0 ? totalPayoff : 0,
        loss: totalPayoff < 0 ? totalPayoff : 0,
      };
    });
  };

  const data = generateChartData();
  const maxProfit = Math.max(...data.map((d) => d.payoff));
  const maxLoss = Math.min(...data.map((d) => d.payoff));
  const breakevens = calculateBreakevens();
  const pop = calculatePOP();
  const stdDev = calculateStdDev();
  const marginRequired = calculateMarginRequired();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">
            Spot: ₹{data.price.toLocaleString()}
          </p>
          <p
            className={`text-sm font-semibold ${
              data.payoff >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            P&L: ₹{data.payoff.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev / 1.5, 0.5));
  };

  if (selectedOptions.length === 0) {
    return (
      <div className="h-[500px] flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-border">
        <div className="text-center text-muted-foreground">
          <p className="font-medium">Select options from the chain below</p>
          <p className="text-sm mt-1">
            Click Buy/Sell to add legs to your strategy
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Zoom Controls */}
      <div className="flex justify-end gap-2 mb-3">
        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4 mr-1" />
          Zoom Out
        </Button>
        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4 mr-1" />
          Zoom In
        </Button>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <ComposedChart
          data={data}
          margin={{ top: 30, right: 30, left: 60, bottom: 50 }}
        >
          <defs>
            {/* Solid profit zone - light green */}
            <linearGradient id="profitZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c8e6c9" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#c8e6c9" stopOpacity={0.6} />
            </linearGradient>
            {/* Solid loss zone - light orange/peach */}
            <linearGradient id="lossZone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffccbc" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#ffccbc" stopOpacity={0.5} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="1 1" stroke="#e0e0e0" opacity={0.5} />

          <XAxis
            dataKey="price"
            stroke="#333333"
            tick={{ fontSize: 11, fill: "#333333" }}
            tickFormatter={(value) => value.toLocaleString()}
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

          <Tooltip content={<CustomTooltip />} />

          {/* Standard Deviation Zones - Gray backgrounds */}
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

          {/* Standard Deviation Reference Lines */}
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

          {/* Current price - green dashed vertical line */}
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

          {/* Profit zone - solid light green */}
          <ReferenceArea
            y1={0}
            y2={maxProfit > 0 ? maxProfit : 0}
            fill="url(#profitZone)"
            fillOpacity={1}
          />

          {/* Loss zone - solid light orange/peach */}
          <ReferenceArea
            y1={maxLoss < 0 ? maxLoss : 0}
            y2={0}
            fill="url(#lossZone)"
            fillOpacity={1}
          />

          {/* Main payoff line - orange/red solid */}
          <Line
            type="monotone"
            dataKey="payoff"
            stroke="#ff6f00"
            strokeWidth={3}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-6">
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Max Profit</p>
          <p
            className={`text-base font-bold ${
              maxProfit === Infinity ? "text-primary" : "text-success"
            }`}
          >
            {maxProfit === Infinity
              ? "Unlimited"
              : `₹${maxProfit.toLocaleString()}`}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Max Loss</p>
          <p
            className={`text-base font-bold ${
              maxLoss === -Infinity ? "text-primary" : "text-danger"
            }`}
          >
            {maxLoss === -Infinity
              ? "Unlimited"
              : `₹${Math.abs(maxLoss).toLocaleString()}`}
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
            {(() => {
              const currentPnL =
                data.find((d) => d.price >= spotPrice)?.payoff || 0;
              return (
                <span
                  className={currentPnL >= 0 ? "text-success" : "text-danger"}
                >
                  ₹{currentPnL.toLocaleString()}
                </span>
              );
            })()}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Total Legs</p>
          <p className="text-base font-bold text-primary">
            {selectedOptions.length}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Margin Required</p>
          <p className="text-base font-bold text-primary">
            ₹{marginRequired.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Breakeven Details */}
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
    </div>
  );
};

export default PayoffChart;
