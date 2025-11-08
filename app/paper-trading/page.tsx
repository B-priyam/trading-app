"use client";

import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { instruments, generateOptionsChain } from "@/utils/optionsData";

interface OptionTrade {
  id: string;
  type: "option";
  instrument: string;
  strike: number;
  expiry: string;
  optionType: "CE" | "PE";
  action: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  timestamp: Date;
}

interface StockTrade {
  id: string;
  type: "stock";
  symbol: string;
  action: "BUY" | "SELL";
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  timestamp: Date;
}

type Trade = OptionTrade | StockTrade;

const PaperTrading = () => {
  const [allData, setAllData] = useState<any>();
  const [tradeType, setTradeType] = useState<"option" | "stock">("option");
  const [positions, setPositions] = useState<Trade[]>([]);
  const [orderHistory, setOrderHistory] = useState<Trade[]>([]);
  const [optionChain, setOptionChain] = useState<any[]>([]);

  const [selectedInstrument, setSelectedInstrument] = useState("NIFTY");
  const [instruments, setInstruments] = useState<String[]>([]);
  const [expiries, setExpiries] = useState<any[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState("");
  const [allLtps, setAllLtps] = useState<any[]>([]);
  const [strikesData, setStrikesData] = useState<any>({});

  useEffect(() => {
    const getInstruments = async () => {
      const res = await fetch("/all_indices_tokens.json");
      const data = await res.json();
      setAllData(data);
      setInstruments(Object.keys(data));
    };
    getInstruments();
  }, []);

  useEffect(() => {
    const allExpiries =
      allData && allData[selectedInstrument]["CE"].map((d: any) => d.expiry);
    setSelectedExpiry(
      Array.from(new Set(allExpiries).keys()).sort()[0] as string
    );
    setExpiries(Array.from(new Set(allExpiries).keys()).sort());
  }, [allData, selectedInstrument]);

  useEffect(() => {
    if (!allData) return;

    const entries = [
      ...allData[selectedInstrument]["PE"].map((d: any) => ({
        ...d,
        type: "PE",
      })),
      ...allData[selectedInstrument]["CE"].map((d: any) => ({
        ...d,
        type: "CE",
      })),
    ];

    const mergedMap = new Map();

    for (const item of entries) {
      if (item.expiry !== selectedExpiry) continue;

      const bucket = mergedMap.get(item.strike) || { strike: item.strike };

      if (item.type === "PE") {
        bucket.PE = item;
      } else {
        bucket.CE = item;
      }

      mergedMap.set(item.strike, bucket);
    }

    const mergedArray = Array.from(mergedMap.values());
    mergedArray.sort((a, b) => a.strike - b.strike);

    // pick middle 100
    const mid = Math.floor(mergedArray.length / 2);
    const start = Math.max(0, mid - 50);
    const end = start + 100;

    const middle100 = mergedArray.slice(start, end);

    // console.log(middle100);
    setOptionChain(middle100);
  }, [selectedExpiry]);

  useEffect(() => {
    if (optionChain) {
      const ceTokens = optionChain.map((d) => `NFO|${d.CE.token}`);
      const peTokens = optionChain.map((d) => `NFO|${d.PE.token}`);
      const allTokens = [...ceTokens, ...peTokens];
      setAllLtps(allTokens);
    }
  }, [optionChain]);

  useEffect(() => {
    const es = new EventSource(`/api/test?strikes=${allLtps}`);

    es.onmessage = (event) => {
      const tick = JSON.parse(event.data);
      if (["tk", "tf", "dk"].includes(tick.t)) {
        setStrikesData((prev: any) => ({
          ...prev,
          [tick.tk]: tick,
        }));
      }
    };

    es.onerror = (err) => {
      console.log("SSE error:", err);
      es.close();
    };

    return () => es.close();
  }, [allLtps]);

  const [quantity, setQuantity] = useState(1);

  const tickList = Object.values(strikesData);

  // Stock trading state
  const [stockSymbol, setStockSymbol] = useState("");
  const [stockPrice, setStockPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState(1);

  const [selectedStrikes, setSelectedStrikes] = useState<
    {
      id: string;
      instrument: string;
      strike: string;
      expiry: string;
      type: "CE" | "PE";
    }[]
  >([]);

  // const instrumentData = instruments[selectedInstrument];
  const optionsChain = selectedExpiry
    ? generateOptionsChain(selectedInstrument, selectedExpiry, new Date())
    : [];

  const executeOptionTrade = (
    strike: number,
    expiry: string,
    optionType: "CE" | "PE",
    action: "BUY" | "SELL"
  ) => {
    const optionData = optionsChain.find((row) => row.strike === strike);
    if (!optionData) return;

    const entryPrice =
      optionType === "CE" ? optionData.callLTP : optionData.putLTP;

    const newTrade: OptionTrade = {
      id: `nsjabfbnlsablasba`,
      type: "option",
      instrument: selectedInstrument,
      strike,
      expiry,
      optionType,
      action,
      entryPrice,
      currentPrice: entryPrice,
      quantity,
      timestamp: new Date(),
    };

    setPositions([...positions, newTrade]);
    toast.success(
      `${action} ${quantity} x ${selectedInstrument} ${strike} ${optionType}`,
      {
        description: `Entry: ₹${entryPrice} | Expiry: ${expiry}`,
      }
    );
  };

  const executeStockTrade = (action: "BUY" | "SELL") => {
    if (!stockSymbol || !stockPrice) {
      toast.error("Please enter symbol and price");
      return;
    }

    const price = parseFloat(stockPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    const newTrade: StockTrade = {
      id: `${Date.now()}-${Math.random()}`,
      type: "stock",
      symbol: stockSymbol.toUpperCase(),
      action,
      entryPrice: price,
      currentPrice: price,
      quantity: stockQuantity,
      timestamp: new Date(),
    };

    setPositions([...positions, newTrade]);
    toast.success(`${action} ${stockQuantity} x ${stockSymbol.toUpperCase()}`, {
      description: `Entry: ₹${price}`,
    });

    setStockSymbol("");
    setStockPrice("");
  };

  const closePosition = (id: string) => {
    const position = positions.find((p) => p.id === id);
    if (!position) return;

    setOrderHistory([...orderHistory, position]);
    setPositions(positions.filter((p) => p.id !== id));

    const pnl = calculatePnL(position);
    toast.success("Position closed", {
      description: `P&L: ${pnl >= 0 ? "+" : ""}₹${pnl.toFixed(2)}`,
    });
  };

  const calculatePnL = (trade: Trade): number => {
    const priceDiff = trade.currentPrice - trade.entryPrice;
    const multiplier = trade.action === "BUY" ? 1 : -1;
    return priceDiff * trade.quantity * multiplier;
  };

  const totalPnL = positions.reduce(
    (sum, trade) => sum + calculatePnL(trade),
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Paper Trading</h1>
          <p className="text-muted-foreground">Practice trading without risk</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold flex items-center gap-2 ${
                  totalPnL >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {totalPnL >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                {totalPnL >= 0 ? "+" : ""}₹{totalPnL.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Open Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{positions.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Closed Trades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orderHistory.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Execute Trade</CardTitle>
              <CardDescription>Place your paper trades</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={tradeType}
                onValueChange={(v) => setTradeType(v as "option" | "stock")}
              >
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="option">Options</TabsTrigger>
                  <TabsTrigger value="stock">Stocks</TabsTrigger>
                </TabsList>

                <TabsContent value="option" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Instrument</Label>
                    <Select
                      value={selectedInstrument}
                      onValueChange={setSelectedInstrument}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {instruments.map((inst, index) => (
                          <SelectItem key={index} value={inst as string}>
                            {inst}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Expiry</Label>
                    <Select
                      value={selectedExpiry}
                      onValueChange={setSelectedExpiry}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select expiry" />
                      </SelectTrigger>
                      <SelectContent>
                        {expiries.length > 0 &&
                          expiries?.map((exp, index) => (
                            <SelectItem key={exp} value={exp}>
                              {exp}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedExpiry && (
                    <div className="border rounded-lg max-h-80 overflow-y-scroll">
                      <Table className="max-h-40">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Strike</TableHead>
                            <TableHead>CE</TableHead>
                            <TableHead>PE</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {optionChain &&
                            optionChain.map((row: any, index) => {
                              // const callSelected = positions.find(
                              //   (p) =>
                              //     p.strike === row.strike &&
                              //     p.expiry === selectedExpiry &&
                              //     p.optionType === "CE"
                              // );
                              // const putSelected = positions.find(
                              //   (p) =>
                              //     p.type === "option" &&
                              //     p.strike === row.strike &&
                              //     p.expiry === selectedExpiry &&
                              //     p.optionType === "PE"
                              // );
                              // const rowHighlight = callSelected || putSelected;

                              return (
                                <TableRow
                                  key={index}
                                  // className={
                                  //   rowHighlight
                                  //     ? rowHighlight.action === "BUY"
                                  //       ? "bg-success/10"
                                  //       : "bg-danger/10"
                                  //     : ""
                                  // }
                                >
                                  <TableCell className="font-medium">
                                    {row.strike}
                                  </TableCell>
                                  <TableCell
                                  // className={
                                  //   callSelected
                                  //     ? callSelected.action === "BUY"
                                  //       ? "bg-success/20"
                                  //       : "bg-danger/20"
                                  //     : ""
                                  // }
                                  >
                                    <div className="space-y-1">
                                      <div className="text-sm">
                                        ₹
                                        {
                                          tickList.find(
                                            (data: any) =>
                                              data.tk === row.CE.token
                                          )?.lp
                                        }
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="h-6 text-xs px-2"
                                          onClick={() =>
                                            executeOptionTrade(
                                              row.strike,
                                              selectedExpiry,
                                              "CE",
                                              "BUY"
                                            )
                                          }
                                        >
                                          B
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="h-6 text-xs px-2"
                                          onClick={() =>
                                            executeOptionTrade(
                                              row.strike,
                                              selectedExpiry,
                                              "CE",
                                              "SELL"
                                            )
                                          }
                                        >
                                          S
                                        </Button>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell
                                  // className={
                                  //   putSelected
                                  //     ? putSelected.action === "BUY"
                                  //       ? "bg-success/20"
                                  //       : "bg-danger/20"
                                  //     : ""
                                  // }
                                  >
                                    <div className="space-y-1">
                                      <div className="text-sm">
                                        ₹
                                        {
                                          tickList.find(
                                            (data: any) =>
                                              data.tk === row.PE.token
                                          )?.lp
                                        }
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="h-6 text-xs px-2"
                                          onClick={() =>
                                            executeOptionTrade(
                                              row.strike,
                                              selectedExpiry,
                                              "PE",
                                              "BUY"
                                            )
                                          }
                                        >
                                          B
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="h-6 text-xs px-2"
                                          onClick={() =>
                                            executeOptionTrade(
                                              row.strike,
                                              selectedExpiry,
                                              "PE",
                                              "SELL"
                                            )
                                          }
                                        >
                                          S
                                        </Button>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="stock" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Stock Symbol</Label>
                    <Input
                      placeholder="e.g., RELIANCE, TCS"
                      value={stockSymbol}
                      onChange={(e) =>
                        setStockSymbol(e.target.value.toUpperCase())
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter price"
                        value={stockPrice}
                        onChange={(e) => setStockPrice(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={stockQuantity}
                        onChange={(e) =>
                          setStockQuantity(parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => executeStockTrade("BUY")}
                    >
                      Buy
                    </Button>
                    <Button
                      className="flex-1"
                      variant="destructive"
                      onClick={() => executeStockTrade("SELL")}
                    >
                      Sell
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>Your active paper trades</CardDescription>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No open positions
                </p>
              ) : (
                <div className="space-y-2">
                  {positions.map((position) => (
                    <div key={position.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium">
                            {position.type === "option" ? (
                              <>
                                {position.instrument} {position.strike}{" "}
                                {position.optionType}
                                <Badge
                                  className="ml-2"
                                  variant={
                                    position.action === "BUY"
                                      ? "default"
                                      : "destructive"
                                  }
                                >
                                  {position.action}
                                </Badge>
                              </>
                            ) : (
                              <>
                                {position.symbol}
                                <Badge
                                  className="ml-2"
                                  variant={
                                    position.action === "BUY"
                                      ? "default"
                                      : "destructive"
                                  }
                                >
                                  {position.action}
                                </Badge>
                              </>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Qty: {position.quantity} | Entry: ₹
                            {position.entryPrice}
                            {position.type === "option" &&
                              ` | ${position.expiry}`}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => closePosition(position.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          calculatePnL(position) >= 0
                            ? "text-success"
                            : "text-danger"
                        }`}
                      >
                        P&L: {calculatePnL(position) >= 0 ? "+" : ""}₹
                        {calculatePnL(position).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Trade History</CardTitle>
            <CardDescription>Your closed positions</CardDescription>
          </CardHeader>
          <CardContent>
            {orderHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No closed trades yet
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Exit</TableHead>
                    <TableHead>P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderHistory.map((trade) => {
                    const pnl = calculatePnL(trade);
                    return (
                      <TableRow key={trade.id}>
                        <TableCell className="text-sm">
                          {trade.timestamp.toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {trade.type === "option" ? "Option" : "Stock"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {trade.type === "option" ? (
                            <>
                              {trade.instrument} {trade.strike}{" "}
                              {trade.optionType}
                            </>
                          ) : (
                            <>{trade.symbol}</>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              trade.action === "BUY" ? "default" : "destructive"
                            }
                          >
                            {trade.action}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{trade.entryPrice}</TableCell>
                        <TableCell>₹{trade.currentPrice}</TableCell>
                        <TableCell>
                          <span
                            className={
                              pnl >= 0 ? "text-success" : "text-danger"
                            }
                          >
                            {pnl >= 0 ? "+" : ""}₹{pnl.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PaperTrading;
