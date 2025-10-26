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
import { Trash2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  instruments,
  generateOptionsChain,
  type OptionChainRow,
} from "@/utils/optionsData";

interface SelectedOption {
  id: string;
  strike: number;
  expiry: string;
  type: "CE" | "PE";
  action: "BUY" | "SELL";
  premium: number;
  quantity: number;
  daysToExpiry: number;
}

const OptionsSimulator = () => {
  const [instrument, setInstrument] = useState("NIFTY");
  const [selectedExpiries, setSelectedExpiries] = useState<string[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>([]);

  // Simulation date/time state - starts at today 9:15 AM (market open)
  const getMarketOpenTime = () => {
    const date = new Date();
    date.setHours(9, 15, 0, 0);
    return date;
  };
  const [simulationDate, setSimulationDate] = useState(getMarketOpenTime());

  const instrumentData = instruments[instrument];
  const spotPrice = instrumentData.spotPrice;

  // Generate options chain for selected expiries or all if none selected
  const expiriesToShow =
    selectedExpiries.length > 0 ? selectedExpiries : instrumentData.expiries;
  const optionsChain = expiriesToShow.flatMap((exp) =>
    generateOptionsChain(instrument, exp, simulationDate)
  );

  const addOption = (
    strike: number,
    expiry: string,
    type: "CE" | "PE",
    action: "BUY" | "SELL"
  ) => {
    const optionData = optionsChain.find(
      (row) => row.strike === strike && row.expiry === expiry
    );
    if (!optionData) return;

    const premium = type === "CE" ? optionData.callLTP : optionData.putLTP;

    // Calculate days to expiry from simulation date
    const [day, month, year] = expiry.split("-");
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
    const diffTime = expiryDate.getTime() - simulationDate.getTime();
    const daysToExpiry = Math.max(
      0,
      Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    );

    const newOption: SelectedOption = {
      id: `wdfkbenrglkbgrjbwle`,
      strike,
      expiry,
      type,
      action,
      premium,
      quantity: 1,
      daysToExpiry,
    };

    setSelectedOptions([...selectedOptions, newOption]);
    toast.success(`${action} ${type} @ ${strike} (${expiry}) added`, {
      description: `Premium: ₹${premium} | ${daysToExpiry} days to expiry`,
    });
  };

  const removeOption = (id: string) => {
    setSelectedOptions(selectedOptions.filter((opt) => opt.id !== id));
    toast.info("Option removed from strategy");
  };

  const updateQuantity = (id: string, quantity: number) => {
    setSelectedOptions(
      selectedOptions.map((opt) => (opt.id === id ? { ...opt, quantity } : opt))
    );
  };

  const clearAll = () => {
    setSelectedOptions([]);
    toast.info("All positions cleared");
  };

  const adjustTime = (minutes: number) => {
    const newDate = new Date(simulationDate);
    newDate.setMinutes(newDate.getMinutes() + minutes);
    setSimulationDate(newDate);
  };

  const setToStartOfDay = () => {
    const newDate = new Date(simulationDate);
    newDate.setHours(9, 15, 0, 0); // Market open
    setSimulationDate(newDate);
  };

  const setToEndOfDay = () => {
    const newDate = new Date(simulationDate);
    newDate.setHours(15, 30, 0, 0); // Market close
    setSimulationDate(newDate);
  };

  const goToPrevDay = () => {
    const newDate = new Date(simulationDate);
    newDate.setDate(newDate.getDate() - 1);
    newDate.setHours(9, 15, 0, 0);
    setSimulationDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(simulationDate);
    newDate.setDate(newDate.getDate() + 1);
    newDate.setHours(9, 15, 0, 0);
    setSimulationDate(newDate);
  };

  const toggleExpiry = (expiry: string) => {
    setSelectedExpiries((prev) =>
      prev.includes(expiry)
        ? prev.filter((e) => e !== expiry)
        : [...prev, expiry]
    );
  };

  const calculateNetPremium = () => {
    return selectedOptions.reduce((sum, opt) => {
      const premium = opt.premium * opt.quantity * instrumentData.lotSize;
      return sum + (opt.action === "BUY" ? -premium : premium);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-4 max-w-[1800px]">
        {/* Top Bar with Controls */}
        <div className="mb-4 p-4 bg-card rounded-lg border space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-xs">Instrument</Label>
              <Select value={instrument} onValueChange={setInstrument}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(instruments).map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Spot Price</Label>
              <div className="h-9 px-3 rounded-md border bg-muted flex items-center justify-between text-sm">
                <span className="font-medium">
                  ₹{spotPrice.toLocaleString()}
                </span>
                <Badge
                  variant={
                    instrumentData.change > 0 ? "default" : "destructive"
                  }
                  className="ml-2 text-xs"
                >
                  {instrumentData.change > 0 ? "+" : ""}
                  {instrumentData.changePercent.toFixed(2)}%
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                Simulation Date
              </Label>
              <div className="h-9 px-3 rounded-md border bg-muted flex items-center text-sm font-medium">
                {simulationDate.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Simulation Time
              </Label>
              <div className="h-9 px-3 rounded-md border bg-muted flex items-center text-sm font-medium">
                {simulationDate.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </div>
            </div>
          </div>

          {/* Time Control Buttons */}
          <div className="space-y-2">
            <Label className="text-xs">Time Controls</Label>
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={goToPrevDay}
                  className="h-7 text-xs"
                >
                  Prev Day
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={setToStartOfDay}
                  className="h-7 text-xs"
                >
                  SOD
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => adjustTime(-120)}
                  className="h-7 text-xs"
                >
                  -2hrs
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => adjustTime(-30)}
                  className="h-7 text-xs"
                >
                  -30min
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => adjustTime(-15)}
                  className="h-7 text-xs"
                >
                  -15min
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => adjustTime(-5)}
                  className="h-7 text-xs"
                >
                  -5min
                </Button>
              </div>
              <div className="h-7 w-px bg-border" />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => adjustTime(5)}
                  className="h-7 text-xs"
                >
                  +5min
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => adjustTime(15)}
                  className="h-7 text-xs"
                >
                  +15min
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => adjustTime(30)}
                  className="h-7 text-xs"
                >
                  +30min
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => adjustTime(120)}
                  className="h-7 text-xs"
                >
                  +2hrs
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={setToEndOfDay}
                  className="h-7 text-xs"
                >
                  EOD
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={goToNextDay}
                  className="h-7 text-xs"
                >
                  Next Day
                </Button>
              </div>
            </div>
          </div>

          {/* Expiry Filter */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs">Filter by Expiries</Label>
            <div className="flex flex-wrap gap-2">
              {instrumentData.expiries.map((exp) => (
                <Badge
                  key={exp}
                  variant={
                    selectedExpiries.includes(exp) ? "default" : "outline"
                  }
                  className="cursor-pointer text-xs"
                  onClick={() => toggleExpiry(exp)}
                >
                  {exp}
                </Badge>
              ))}
              {selectedExpiries.length > 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({selectedExpiries.length} selected)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - Options Chain */}
          <div className="lg:col-span-5">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Options Chain</CardTitle>
                    <CardDescription className="text-xs">
                      Click B/S to add positions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[calc(100vh-240px)]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="text-center text-xs" colSpan={3}>
                          CALLS
                        </TableHead>
                        <TableHead className="text-center bg-muted font-bold text-xs">
                          Strike
                        </TableHead>
                        <TableHead className="text-center text-xs" colSpan={3}>
                          PUTS
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optionsChain.map((row, idx) => {
                        const strikeInterval =
                          instrument === "NIFTY"
                            ? 50
                            : instrument === "BANKNIFTY"
                            ? 100
                            : 50;
                        const isATM =
                          Math.abs(row.strike - spotPrice) <= strikeInterval;
                        const callSelected = selectedOptions.find(
                          (opt) =>
                            opt.strike === row.strike &&
                            opt.expiry === row.expiry &&
                            opt.type === "CE"
                        );
                        const putSelected = selectedOptions.find(
                          (opt) =>
                            opt.strike === row.strike &&
                            opt.expiry === row.expiry &&
                            opt.type === "PE"
                        );
                        const rowHighlight = callSelected || putSelected;

                        return (
                          <TableRow
                            key={`${row.strike}-${row.expiry}-${idx}`}
                            className={
                              isATM
                                ? "bg-primary/5"
                                : rowHighlight
                                ? rowHighlight.action === "BUY"
                                  ? "bg-success/10"
                                  : "bg-danger/10"
                                : ""
                            }
                          >
                            <TableCell
                              className={`text-right text-sm py-2 ${
                                callSelected
                                  ? callSelected.action === "BUY"
                                    ? "bg-success/20"
                                    : "bg-danger/20"
                                  : ""
                              }`}
                            >
                              {row.callLTP.toFixed(2)}
                            </TableCell>
                            <TableCell
                              className={`py-2 ${
                                callSelected
                                  ? callSelected.action === "BUY"
                                    ? "bg-success/20"
                                    : "bg-danger/20"
                                  : ""
                              }`}
                            >
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                  onClick={() =>
                                    addOption(
                                      row.strike,
                                      row.expiry,
                                      "CE",
                                      "BUY"
                                    )
                                  }
                                >
                                  B
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                  onClick={() =>
                                    addOption(
                                      row.strike,
                                      row.expiry,
                                      "CE",
                                      "SELL"
                                    )
                                  }
                                >
                                  S
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground py-2">
                              {row.callIV.toFixed(1)}%
                            </TableCell>

                            <TableCell className="text-center bg-muted font-bold text-sm py-2">
                              <div>{row.strike}</div>
                              <div className="text-[10px] text-muted-foreground font-normal">
                                {row.expiry}
                              </div>
                            </TableCell>

                            <TableCell
                              className={`text-xs text-muted-foreground py-2 ${
                                putSelected
                                  ? putSelected.action === "BUY"
                                    ? "bg-success/20"
                                    : "bg-danger/20"
                                  : ""
                              }`}
                            >
                              {row.putIV.toFixed(1)}%
                            </TableCell>
                            <TableCell
                              className={`py-2 ${
                                putSelected
                                  ? putSelected.action === "BUY"
                                    ? "bg-success/20"
                                    : "bg-danger/20"
                                  : ""
                              }`}
                            >
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-1.5 text-xs bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                  onClick={() =>
                                    addOption(
                                      row.strike,
                                      row.expiry,
                                      "PE",
                                      "BUY"
                                    )
                                  }
                                >
                                  B
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                  onClick={() =>
                                    addOption(
                                      row.strike,
                                      row.expiry,
                                      "PE",
                                      "SELL"
                                    )
                                  }
                                >
                                  S
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell
                              className={`text-sm py-2 ${
                                putSelected
                                  ? putSelected.action === "BUY"
                                    ? "bg-success/20"
                                    : "bg-danger/20"
                                  : ""
                              }`}
                            >
                              {row.putLTP.toFixed(2)}
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

          {/* Right Column - Chart & Positions */}
          <div className="lg:col-span-7 space-y-4">
            {/* Market Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Net Premium</div>
                <div
                  className={`text-lg font-bold ${
                    calculateNetPremium() >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {calculateNetPremium() >= 0 ? "+" : ""}₹
                  {calculateNetPremium().toLocaleString()}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">
                  Total Positions
                </div>
                <div className="text-lg font-bold">
                  {selectedOptions.length}
                </div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Total Lots</div>
                <div className="text-lg font-bold">
                  {selectedOptions.reduce((sum, opt) => sum + opt.quantity, 0)}
                </div>
              </Card>
            </div>

            {/* Payoff Chart */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Payoff Diagram</CardTitle>
                    <CardDescription className="text-xs">
                      P&L at expiry
                    </CardDescription>
                  </div>
                  {selectedOptions.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAll}
                      className="h-8"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <PayoffChart
                  selectedOptions={selectedOptions}
                  spotPrice={spotPrice}
                />
              </CardContent>
            </Card>

            {/* Positions Table */}
            {selectedOptions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    Positions ({selectedOptions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Strike</TableHead>
                        <TableHead className="text-xs">Expiry</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                        <TableHead className="text-xs text-right">
                          Premium
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          Qty
                        </TableHead>
                        <TableHead className="text-xs text-right">
                          DTE
                        </TableHead>
                        <TableHead className="text-xs"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOptions.map((option) => (
                        <TableRow key={option.id}>
                          <TableCell className="font-medium text-sm">
                            {option.type}
                          </TableCell>
                          <TableCell className="text-sm">
                            {option.strike}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {option.expiry}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                option.action === "BUY"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {option.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            ₹{option.premium}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="1"
                              value={option.quantity}
                              onChange={(e) =>
                                updateQuantity(
                                  option.id,
                                  Number(e.target.value)
                                )
                              }
                              className="w-16 h-7 text-sm text-right"
                            />
                          </TableCell>
                          <TableCell className="text-sm text-right">
                            {option.daysToExpiry}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeOption(option.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsSimulator;
