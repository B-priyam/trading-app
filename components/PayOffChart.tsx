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
} from "recharts";

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
}

const PayoffChart = ({ selectedOptions, spotPrice }: PayoffChartProps) => {
  // Generate price range for X-axis
  const generatePriceRange = () => {
    if (selectedOptions.length === 0) {
      return Array.from({ length: 50 }, (_, i) => spotPrice - 500 + i * 20);
    }

    const strikes = selectedOptions.map((opt) => opt.strike);
    const minStrike = Math.min(...strikes);
    const maxStrike = Math.max(...strikes);
    const range = maxStrike - minStrike;
    const start = minStrike - range * 0.3;
    const end = maxStrike + range * 0.3;
    const step = (end - start) / 50;

    return Array.from({ length: 50 }, (_, i) => start + i * step);
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

  if (selectedOptions.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed border-border">
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
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 30, left: 60, bottom: 30 }}
        >
          <defs>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor="hsl(142 76% 36%)"
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor="hsl(142 76% 36%)"
                stopOpacity={0.05}
              />
            </linearGradient>
            <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.05} />
              <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.5}
          />

          <XAxis
            dataKey="price"
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
            label={{
              value: "Spot Price",
              position: "insideBottom",
              offset: -15,
              fill: "hsl(var(--foreground))",
            }}
          />

          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
            label={{
              value: "Profit/Loss",
              angle: -90,
              position: "insideLeft",
              fill: "hsl(var(--foreground))",
            }}
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
          />

          {/* <Tooltip content={<CustomTooltip />} /> */}

          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} />
          <ReferenceLine
            x={spotPrice}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: "Current",
              position: "top",
              fill: "hsl(var(--primary))",
            }}
          />

          {/* Filled areas */}
          <Area
            type="monotone"
            dataKey="profit"
            fill="url(#profitGradient)"
            stroke="none"
          />
          <Area
            type="monotone"
            dataKey="loss"
            fill="url(#lossGradient)"
            stroke="none"
          />

          {/* Main payoff line */}
          <Line
            type="monotone"
            dataKey="payoff"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Max Profit</p>
          <p
            className={`text-lg font-bold ${
              maxProfit === Infinity ? "text-primary" : "text-green-600"
            }`}
          >
            {maxProfit === Infinity
              ? "Unlimited"
              : `₹${maxProfit.toLocaleString()}`}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Max Loss</p>
          <p
            className={`text-lg font-bold ${
              maxLoss === -Infinity ? "text-primary" : "text-red-600"
            }`}
          >
            {maxLoss === -Infinity
              ? "Unlimited"
              : `₹${maxLoss.toLocaleString()}`}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Current P&L</p>
          <p className="text-lg font-bold">
            {(() => {
              const currentPnL =
                data.find((d) => d.price >= spotPrice)?.payoff || 0;
              return (
                <span
                  className={
                    currentPnL >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  ₹{currentPnL.toLocaleString()}
                </span>
              );
            })()}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Total Legs</p>
          <p className="text-lg font-bold text-primary">
            {selectedOptions.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayoffChart;
