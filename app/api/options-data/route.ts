// app/api/option-chain/route.ts
import { NextResponse } from "next/server";
import { NseIndia } from "stock-nse-india";

const nseIndia = new NseIndia();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const index = searchParams.get("index") || "BANKNIFTY";
  const expiry = searchParams.get("expiry"); // optionall

  try {
    let chain;

    if (
      index.includes("NIFTY") ||
      index.includes("BANKNIFTY") ||
      index.includes("FINNIFTY") ||
      index.includes("MIDCPNIFTY")
    ) {
      chain = await nseIndia.getIndexOptionChain(index);
    } else {
      chain = await nseIndia.getEquityOptionChain(index);
    }

    if (!chain) {
      return NextResponse.json({
        success: false,
        expiryDates: {},
        data: {},
      });
    }

    // console.log(chain);

    // console.log(chain.records.data);

    let filteredData = chain.records.data;

    // console.log(filteredData);

    console.log(expiry);
    if (expiry) {
      filteredData = filteredData.filter(
        (item: any) => item.expiryDate === expiry
      );
    }

    // console.log(filteredData);

    return NextResponse.json({
      success: true,
      expiryDates: chain.records.expiryDates,
      data: filteredData,
    });
  } catch (err) {
    console.error("NSE fetch error:", err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
