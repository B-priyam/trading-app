import fs from "fs";
import { unzipSync } from "fflate";

const SYMBOL_MASTER_URL = "https://api.shoonya.com/NFO_symbols.txt.zip";

const INDICES = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY"];

// Shoonya TSYM example:
// NIFTY11NOV25C25300
// BANKNIFTY28NOV24P48000
// FINNIFTY19DEC24C20000
// MIDCPNIFTY05DEC24P9000
const TSYM_REGEX =
  /^(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY)(\d{2}[A-Z]{3}\d{2})([CP])(\d+)$/;

export async function getAllIndexTokens() {
  console.log("⬇️ Downloading Shoonya symbol master...");

  const res = await fetch(SYMBOL_MASTER_URL);
  if (!res.ok) throw new Error("Failed to download symbol master");

  const buffer = Buffer.from(await res.arrayBuffer());

  // unzip → using fflate (zero deps, safe in Next runtime)
  const unzipped = unzipSync(buffer);
  const fileName = Object.keys(unzipped)[0];
  const fileContent = Buffer.from(unzipped[fileName]).toString("utf-8");

  const lines = fileContent.split(/\r?\n/).filter(Boolean);
  console.log(`📄 Loaded ${lines.length} lines from symbol master`);

  // Prepare our index map
  const indexMap: any = {};
  for (const idx of INDICES) {
    indexMap[idx] = { CE: [], PE: [] };
  }

  // detect delimiter automatically
  const delimiter = lines[0].includes(",") ? "," : "|";

  for (const line of lines) {
    const parts = line.split(delimiter).map((x) => x.trim());
    if (parts.length < 9) continue;

    const exch = parts[0]; // NFO
    const token = parts[1]; // numeric token
    const tsym = parts[4]; // NIFTY11NOV25C25300
    const expiryRaw = parts[5]; // 11-NOV-2025
    const instname = parts[6]; // OPTIDX
    const optCol = parts[7]; // CE/PE
    const strikeCol = parts[8]; // numeric strike

    if (instname !== "OPTIDX") continue;

    // match tsym to extract index, expiry part, type, strike
    const match = tsym.match(TSYM_REGEX);
    if (!match) continue;

    const [, indexName, expiryCode, cp, strikeFromTSYM] = match;

    if (!INDICES.includes(indexName)) continue;

    const optionType = cp === "C" ? "CE" : "PE";
    const strike = Number(strikeFromTSYM);
    if (!strike) continue;

    const expiry = formatExpiry(expiryRaw);

    indexMap[indexName][optionType].push({
      strike,
      expiry,
      token,
      tsym,
    });
  }

  // sort strikes inside CE and PE
  for (const idx of INDICES) {
    indexMap[idx].CE.sort((a: any, b: any) => a.strike - b.strike);
    indexMap[idx].PE.sort((a: any, b: any) => a.strike - b.strike);
  }

  fs.writeFileSync(
    "all_indices_tokens.json",
    JSON.stringify(indexMap, null, 2)
  );
  console.log("✅ Saved → all_indices_tokens.json");

  return indexMap;
}

// Convert Shoonya expiry "11-NOV-2025" to YYYY-MM-DD
function formatExpiry(raw: string) {
  if (!raw || !raw.includes("-")) return raw;

  const [day, mon, year] = raw.split("-");

  const months: any = {
    JAN: "01",
    FEB: "02",
    MAR: "03",
    APR: "04",
    MAY: "05",
    JUN: "06",
    JUL: "07",
    AUG: "08",
    SEP: "09",
    OCT: "10",
    NOV: "11",
    DEC: "12",
  };

  return `${year}-${months[mon.toUpperCase()]}-${day}`;
}

// CLI usage
if (process.argv[1] === new URL(import.meta.url).pathname) {
  getAllIndexTokens()
    .then(() => console.log("✅ Done"))
    .catch((err) => console.error("❌ Error:", err));
}
