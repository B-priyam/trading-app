import { NextRequest } from "next/server";
import { getAllIndexTokens } from "@/lib/shoonyaMaster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    const index = url.searchParams.get("index")?.toUpperCase();
    const expiry = url.searchParams.get("expiry"); // optional

    if (!index) {
      return Response.json(
        { error: "index is required. Example: ?index=NIFTY" },
        { status: 400 }
      );
    }

    const indexMap = await getAllIndexTokens();

    if (!indexMap[index]) {
      return Response.json(
        { error: `Invalid index: ${index}` },
        { status: 400 }
      );
    }

    const allCE = indexMap[index].CE;
    const allPE = indexMap[index].PE;

    if (!allCE.length || !allPE.length) {
      return Response.json(
        { error: `No option data found for index ${index}` },
        { status: 404 }
      );
    }

    // Pick expiry
    let chosenExpiry = expiry;

    if (!chosenExpiry) {
      // pick earliest expiry available
      const ceExpiries = [...new Set(allCE.map((x) => x.expiry))];
      chosenExpiry = ceExpiries.sort()[0];
    }

    // Filter both CE/PE for chosen expiry
    const ce = allCE.filter((x) => x.expiry === chosenExpiry);
    const pe = allPE.filter((x) => x.expiry === chosenExpiry);

    const strikes = [
      ...new Set([...ce.map((x) => x.strike), ...pe.map((x) => x.strike)]),
    ].sort((a, b) => a - b);

    // Build final option chain structure
    const chain = strikes.map((strike) => {
      return {
        strike,
        CE: ce.find((x) => x.strike === strike) || null,
        PE: pe.find((x) => x.strike === strike) || null,
      };
    });

    return Response.json({
      index,
      expiry: chosenExpiry,
      totalStrikes: chain.length,
      chain,
    });
  } catch (error: any) {
    console.error("❌ Option chain error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
