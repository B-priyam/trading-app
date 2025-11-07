import { NextRequest } from "next/server";
import WebSocket from "ws";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tokensParam = req.nextUrl.searchParams.get("tokens");

  if (!tokensParam) {
    return new Response("Missing tokens param", { status: 400 });
  }

  const rawTokens = tokensParam.split(",");
  const tokens = rawTokens.map((t) => `NFO|${t.trim()}`);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const ws = new WebSocket("wss://api.shoonya.com/NorenWSTP/");
      let closed = false;

      const safeClose = () => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {}
          ws.close();
        }
      };

      ws.on("open", () => {
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

        // Auth OK → Subscribe to all tokens
        if (data.t === "ck" && data.s === "OK") {
          const tknString = tokens.join("#");
          ws.send(JSON.stringify({ t: "t", k: tknString }));
          return;
        }

        // Tick (t = tk)
        if (data.t === "tk") {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        }
      });

      ws.on("close", safeClose);
      ws.on("error", safeClose);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
