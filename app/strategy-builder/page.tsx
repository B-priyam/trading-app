"use client";

import Navbar from "@/components/Navbar";
import PayoffChart from "@/components/PayOffChart";
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
import { Plus, Trash2, Save, Download, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ALL_INSTRUMENTS } from "@/constants/all-data";
// import {
//   instruments,
//   generateOptionsChain,
//   strategyTemplates,
//   type OptionChainRow,
// } from "@/utils/optionsData";

interface SelectedOption {
  id: string;
  strike: number;
  type: "CE" | "PE";
  action: "BUY" | "SELL";
  premium: number;
  quantity: number;
  expiry: Date;
}

const StrategyBuilder = () => {
  const [allInstruments, setAllInstrument] = useState([
    "NIFTY",
    "BANKNIFTY",
    "FINNIFTY",
    "MIDCPNIFTY",
    ...ALL_INSTRUMENTS,
  ]);
  const [selectedIndex, setSelectedIndex] = useState("BANKNIFTY");
  const [expiries, setExpiries] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>("");
  const [optionData, setOptionData] = useState<any[]>([]);
  const [spotPrice, setspotPrice] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<any[]>([]);
  const [targetStrike, setTargetStrike] = useState("");

  //   const instrumentData = instruments[instrument];
  //   const spotPrice = instrumentData.spotPrice;
  //   const optionsChain = generateOptionsChain(instrument, expiry);

  // console.log(optionData);

  const containerRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (!optionData.length || !spotPrice) return;

    const interval = selectedIndex === "NIFTY" ? 50 : 100;
    const atmRow = optionData.find(
      (row) => Math.abs(row.strikePrice - spotPrice) <= interval
    );

    if (atmRow) {
      setTargetStrike(atmRow.strikePrice.toString());
    }
  }, [optionData, spotPrice, selectedIndex]);

  useEffect(() => {
    if (!targetStrike || !containerRef.current || hasScrolled.current) return;

    hasScrolled.current = true; // only once per update
    const container = containerRef.current;

    const targetRow = Array.from(container.querySelectorAll("tr")).find((tr) =>
      tr.textContent?.includes(targetStrike)
    ) as HTMLElement | undefined;

    if (targetRow) {
      targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [targetStrike]);

  const addOption = (
    strike: number,
    type: "CE" | "PE",
    action: "BUY" | "SELL"
  ) => {
    const data = optionData.find((row) => row.strikePrice === strike);
    if (!data) return;

    console.log(data);

    const premium = type === "CE" ? data?.CE.lastPrice : data?.PE.lastPrice;

    const newOption: SelectedOption = {
      //   id: `${Date.now()}-${Math.random()}`,
      id: Math.random().toString(),
      strike,
      type,
      action,
      premium,
      quantity: 1,
      expiry: data.expiryDate,
    };

    setSelectedOptions([...selectedOptions, newOption]);
    toast.success(`${action} ${type} @ ${strike} added to strategy`);
  };

  const removeOption = (id: string) => {
    setSelectedOptions(selectedOptions.filter((opt) => opt.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setSelectedOptions(
      selectedOptions.map((opt) => (opt.id === id ? { ...opt, quantity } : opt))
    );
  };

  const clearAll = () => {
    setSelectedOptions([]);
    toast.info("Strategy cleared");
  };

  useEffect(() => {
    const fetchExpiries = async () => {
      //   setLoading(true);
      try {
        const res = await fetch(`/api/options-data?index=${selectedIndex}`);
        const json = await res.json();

        if (json.success) {
          setExpiries(json.expiryDates);
          setSelectedExpiry(json.expiryDates?.[0] || "");
        }
      } catch (err) {
        console.error("Error fetching expiries:", err);
      } finally {
        // setLoading(false);
      }
    };
    fetchExpiries();
  }, [selectedIndex]);

  useEffect(() => {
    const fetchOptions = async () => {
      if (!selectedExpiry) return;
      //   setLoading(true);
      try {
        const res = await fetch(
          `/api/options-data?index=${selectedIndex}&expiry=${encodeURIComponent(
            selectedExpiry
          )}`
        );
        const json = await res.json();
        if (json.success) {
          setOptionData(json.data);
          console.log(json.data[0].CE.underlyingValue);
          setspotPrice(json.data[0].CE.underlyingValue);
        }
      } catch (err) {
        console.error("Error fetching option data:", err);
      } finally {
        // setLoading(false);
      }
    };
    fetchOptions();
  }, [selectedExpiry, selectedIndex]);

  //   const applyTemplate = (templateName: keyof typeof strategyTemplates) => {
  //     const strikeInterval =
  //       instrument === "NIFTY" ? 50 : instrument === "BANKNIFTY" ? 100 : 50;
  //     const template = strategyTemplates[templateName](spotPrice, strikeInterval);

  //     const newOptions: SelectedOption[] = template
  //       .map((leg) => {
  //         const optionData = optionsChain.find(
  //           (row) => row.strike === leg.strike
  //         );
  //         if (!optionData) return null;

  //         const premium =
  //           leg.type === "CE" ? optionData.callLTP : optionData.putLTP;
  //         return {
  //           id: `${Date.now()}-${Math.random()}`,
  //           strike: leg.strike,
  //           type: leg.type,
  //           action: leg.action,
  //           premium,
  //           quantity: 1,
  //         };
  //       })
  //       .filter(Boolean) as SelectedOption[];

  //     setSelectedOptions(newOptions);
  //     toast.success(`${templateName} strategy applied`);
  //   };

  console.log("selected option", selectedOptions);

  const calculateNetPremium = () => {
    return selectedOptions.reduce((sum, opt) => {
      const premium = opt.premium * opt.quantity * 50;
      return sum + (opt.action === "BUY" ? -premium : premium);
    }, 0);
  };

  const saveStrategy = () => {
    // TODO: Save to backend/local storage
    toast.success("Strategy saved successfully");
  };
  useEffect(() => {
    if (optionData.length > 0) {
      const nearest = optionData.reduce((prev, curr) =>
        Math.abs(curr.strikePrice - spotPrice) <
        Math.abs(prev.strikePrice - spotPrice)
          ? curr
          : prev
      );
      setTargetStrike(nearest.strikePrice);
    }
  }, [optionData, spotPrice]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Strategy Builder</h1>
          <p className="text-muted-foreground">
            Construct multi-leg option strategies and visualize payoff diagrams
          </p>
        </div>

        <div className="space-y-6">
          {/* Market Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Strategy Parameters</CardTitle>
              <CardDescription>
                Select instrument and build your strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Instrument</Label>
                  <Select
                    value={selectedIndex}
                    onValueChange={setSelectedIndex}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allInstruments.map((data, key) => (
                        <SelectItem key={key} value={data}>
                          {data}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Spot Price</Label>
                  <div className="h-10 px-3 rounded-md border bg-muted flex items-center font-medium">
                    ₹{spotPrice.toLocaleString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Expiry</Label>
                  <Select
                    value={selectedExpiry}
                    onValueChange={setSelectedExpiry}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {expiries.map((data, key) => (
                        <SelectItem key={key} value={data}>
                          {data}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Net Premium</Label>
                  <div
                    className={`h-10 px-3 rounded-md border flex items-center font-medium ${
                      calculateNetPremium() >= 0
                        ? "text-green-600 bg-green-50 border-green-200"
                        : "text-red-600 bg-red-50 border-red-200"
                    }`}
                  >
                    {calculateNetPremium() >= 0 ? "+" : ""}₹
                    {Math.abs(calculateNetPremium()).toLocaleString()}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Actions</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={saveStrategy}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearAll}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payoff Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Payoff Diagram</CardTitle>
              <CardDescription>
                Profit/Loss at expiry across different spot prices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PayoffChart
                selectedOptions={selectedOptions}
                spotPrice={spotPrice}
              />
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Options Chain */}
            <div
              className="lg:col-span-2 min-h-96 h-96 max-h-96 overflow-y-auto"
              ref={containerRef}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Options Chain</CardTitle>
                  <CardDescription>
                    Click Buy/Sell to add options to your strategy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-center" colSpan={5}>
                            CALLS
                          </TableHead>
                          <TableHead className="text-center bg-muted font-bold">
                            Strike
                          </TableHead>
                          <TableHead className="text-center" colSpan={5}>
                            PUTS
                          </TableHead>
                        </TableRow>
                        <TableRow>
                          <TableHead className="w-20"></TableHead>
                          <TableHead className="text-right">OI</TableHead>
                          <TableHead className="text-right">LTP</TableHead>
                          <TableHead className="text-right">Chg</TableHead>
                          <TableHead className="text-right">IV</TableHead>
                          <TableHead className="text-center bg-muted font-bold w-24">
                            Price
                          </TableHead>
                          <TableHead>IV</TableHead>
                          <TableHead>Chg</TableHead>
                          <TableHead>LTP</TableHead>
                          <TableHead>OI</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {optionData.map((row) => {
                          const isATM = row.strikePrice === targetStrike;

                          const callSelected = selectedOptions.find(
                            (opt) =>
                              opt.strike === row.strikePrice &&
                              opt.type === "CE" &&
                              opt.expiry === selectedExpiry
                          );
                          const putSelected = selectedOptions.find(
                            (opt) =>
                              opt.strike === row.strikePrice &&
                              opt.type === "PE" &&
                              opt.expiry === selectedExpiry
                          );
                          const rowHighlight = callSelected || putSelected;

                          return (
                            <TableRow
                              key={row.strikePrice}
                              className={isATM ? "bg-yellow-200" : ""}
                            >
                              <TableCell
                              // className={
                              //   callSelected
                              //     ? callSelected.action === "BUY"
                              //       ? "bg-green-300"
                              //       : "bg-red-300"
                              //     : ""
                              // }
                              >
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 min-w-7 border-green-200 "
                                    onClick={() =>
                                      addOption(row.strikePrice, "CE", "BUY")
                                    }
                                  >
                                    {callSelected &&
                                    callSelected.action === "BUY" ? (
                                      <Check className="absolute" />
                                    ) : (
                                      "B"
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 min-w-7 px-2 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                    onClick={() =>
                                      addOption(row.strikePrice, "CE", "SELL")
                                    }
                                  >
                                    {callSelected &&
                                    callSelected.action === "SELL" ? (
                                      <Check className="absolute" />
                                    ) : (
                                      "S"
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {(row.CE.openInterest / 1000).toFixed(0)}K
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {row.CE.lastPrice.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                <span
                                  className={
                                    row.CE.change > 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }
                                >
                                  {row.CE.change > 0 ? "+" : ""}
                                  {row.CE.change.toFixed(2)}%
                                </span>
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {row.CE.impliedVolatility.toFixed(1)}%
                              </TableCell>

                              <TableCell className="text-center bg-muted font-bold">
                                {row.strikePrice}
                              </TableCell>

                              <TableCell className="text-sm text-muted-foreground">
                                {row.PE.impliedVolatility.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-sm">
                                <span
                                  className={
                                    row.PE.change > 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }
                                >
                                  {row.PE.change > 0 ? "+" : ""}
                                  {row.PE.change.toFixed(1)}%
                                </span>
                              </TableCell>
                              <TableCell className="font-medium">
                                {row.PE.lastPrice.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {(row.PE.impliedVolatility / 1000).toFixed(0)}K
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 min-w-7 px-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                    onClick={() =>
                                      addOption(row.strikePrice, "PE", "BUY")
                                    }
                                  >
                                    {putSelected &&
                                    putSelected.action === "BUY" ? (
                                      <Check className="absolute" />
                                    ) : (
                                      "B"
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 min-w-7 px-2 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200 disabled:opacity-100"
                                    onClick={() =>
                                      addOption(row.strikePrice, "PE", "SELL")
                                    }
                                    disabled={
                                      putSelected &&
                                      putSelected.action === "SELL"
                                    }
                                  >
                                    {putSelected &&
                                    putSelected.action !== "BUY" ? (
                                      <Check className="absolute " />
                                    ) : (
                                      "S"
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Selected Positions */}
              {selectedOptions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Selected Legs ({selectedOptions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedOptions.map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                        >
                          <Badge
                            variant={
                              option.action === "BUY" ? "outline" : "secondary"
                            }
                            className={`text-xs text-white ${
                              option.action === "BUY"
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                          >
                            {option.action}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {option.strike} {option.type} {option.expiry}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              ₹{option.premium}
                            </p>
                          </div>
                          <Input
                            type="number"
                            min="1"
                            value={option.quantity}
                            onChange={(e) =>
                              updateQuantity(option.id, Number(e.target.value))
                            }
                            className="w-12 h-7 text-xs"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeOption(option.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Strategies */}
              {/* <Card>
                <CardHeader>
                  <CardTitle>Quick Strategies</CardTitle>
                  <CardDescription>Pre-built templates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => applyTemplate("longStraddle")}
                  >
                    Long Straddle
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => applyTemplate("longStrangle")}
                  >
                    Long Strangle
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => applyTemplate("ironCondor")}
                  >
                    Iron Condor
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => applyTemplate("bullCallSpread")}
                  >
                    Bull Call Spread
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                    onClick={() => applyTemplate("bearPutSpread")}
                  >
                    Bear Put Spread
                  </Button>
                </CardContent>
              </Card> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyBuilder;
