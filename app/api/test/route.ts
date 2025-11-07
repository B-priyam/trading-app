import { NextRequest } from "next/server";
import WebSocket from "ws";
import { getAllIndexTokens } from "@/lib/shoonyaMaster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // console.log(url);

  const strikes = url.searchParams.get("strikes");
  // const niftyTokens = ["NFO|40083", "NFO|40085", "NFO|40079", "NFO|40093"];

  console.log(strikes?.toString());

  const niftyTokens = strikes?.split(",");

  const encoder = new TextEncoder();

  // await getAllIndexTokens();

  const stream = new ReadableStream({
    start(controller) {
      console.log("🚀 Stream started");

      const ws = new WebSocket("wss://api.shoonya.com/NorenWSTP/");
      let isClosed = false;

      const safeClose = () => {
        if (!isClosed) {
          isClosed = true;
          try {
            controller.close();
          } catch {}
        }
      };

      ws.on("open", () => {
        console.log("✅ WS open, sending auth");
        ws.send(
          JSON.stringify({
            t: "c",
            uid: process.env.SHOONYA_USER,
            actid: process.env.SHOONYA_USER,
            susertoken: process.env.SHOONYA_TOKEN,
            source: "API",
          })
        );
      });

      ws.on("message", (msg) => {
        const data = JSON.parse(msg.toString());
        // console.log("📨 WS message:", data);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        if (data.t === "ck" && data.s === "OK") {
          console.log("🔐 Auth success");
          setTimeout(() => {
            const tokenString = niftyTokens.join("#");
            console.log("📡 Subscribing to:", tokenString);
            ws.send(JSON.stringify({ t: "t", k: tokenString }));
          }, 1000);
        }

        if (data.t === "tk") {
          console.log("📊 Tick received:", data);
        }
      });

      ws.on("error", (err) => {
        console.error("⚠️ WS error:", err);
        safeClose();
      });

      ws.on("close", () => {
        console.log("❌ WS closed");
        safeClose();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // 🚀 disables buffering in Vercel/Nginx
    },
  });
}
