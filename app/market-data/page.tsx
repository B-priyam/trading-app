"use client";

import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import {
  instruments,
  generateOptionsChain,
  getMarketSummary,
} from "@/utils/optionsData";

const MarketData = () => {
  const [instrument, setInstrument] = useState("NIFTY");
  const [expiry, setExpiry] = useState("current");
  const [searchTerm, setSearchTerm] = useState("");

  const optionsChain = generateOptionsChain(instrument, expiry);
  const marketSummary = getMarketSummary(instrument);
  const instrumentData = instruments[instrument];

  const filteredChain = searchTerm
    ? optionsChain.filter((row) => row.strike.toString().includes(searchTerm))
    : optionsChain;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Market Data</h1>
          <p className="text-muted-foreground">
            Real-time options chain data for NSE/BSE instruments
          </p>
        </div>

        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Options Chain Filter</CardTitle>
              <CardDescription>
                Select instrument and expiry date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Select value={instrument} onValueChange={setInstrument}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select instrument" />
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
                  <Select value={expiry} onValueChange={setExpiry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select expiry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current Week</SelectItem>
                      <SelectItem value="next">Next Week</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search strike price..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Status */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">
                  {instrument} Spot
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">
                    ₹{instrumentData.spotPrice.toLocaleString()}
                  </p>
                  <Badge
                    className={
                      instrumentData.change > 0 ? "bg-green-500" : "bg-red-500"
                    }
                  >
                    {instrumentData.change > 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {instrumentData.changePercent > 0 ? "+" : ""}
                    {instrumentData.changePercent.toFixed(2)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">PCR Ratio</p>
                <div className="flex items-center justify-between">
                  <p className="text-2xl font-bold">{marketSummary.pcr}</p>
                  <Badge variant="secondary">{marketSummary.sentiment}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">
                  Total Call OI
                </p>
                <p className="text-2xl font-bold">
                  {(marketSummary.totalCallOI / 1000000).toFixed(2)}M
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">
                  Total Put OI
                </p>
                <p className="text-2xl font-bold">
                  {(marketSummary.totalPutOI / 1000000).toFixed(2)}M
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Options Chain Table */}
          <Card>
            <CardHeader>
              <CardTitle>Options Chain - {instrument}</CardTitle>
              <CardDescription>
                Live options data with OI, volume, and Greeks
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
                      <TableHead className="text-center bg-muted">
                        Strike
                      </TableHead>
                      <TableHead className="text-center" colSpan={5}>
                        PUTS
                      </TableHead>
                    </TableRow>
                    <TableRow>
                      <TableHead className="text-right">OI</TableHead>
                      <TableHead className="text-right">Volume</TableHead>
                      <TableHead className="text-right">LTP</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="text-right">IV</TableHead>
                      <TableHead className="text-center bg-muted font-bold">
                        Price
                      </TableHead>
                      <TableHead>IV</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>LTP</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>OI</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChain.map((row) => {
                      const strikeInterval =
                        instrument === "NIFTY"
                          ? 50
                          : instrument === "BANKNIFTY"
                          ? 100
                          : 50;
                      const isATM =
                        Math.abs(row.strike - instrumentData.spotPrice) <=
                        strikeInterval;
                      return (
                        <TableRow
                          key={row.strike}
                          className={isATM ? "bg-primary/5" : ""}
                        >
                          <TableCell className="text-right">
                            {(row.callOI / 1000).toFixed(0)}K
                          </TableCell>
                          <TableCell className="text-right">
                            {(row.callVolume / 1000).toFixed(0)}K
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {row.callLTP.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                row.callChange > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {row.callChange > 0 ? "+" : ""}
                              {row.callChange.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {row.callIV.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-center bg-muted font-bold">
                            {row.strike}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.putIV.toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                row.putChange > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {row.putChange > 0 ? "+" : ""}
                              {row.putChange.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.putLTP.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {(row.putVolume / 1000).toFixed(0)}K
                          </TableCell>
                          <TableCell>
                            {(row.putOI / 1000).toFixed(0)}K
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
      </div>
    </div>
  );
};

export default MarketData;
