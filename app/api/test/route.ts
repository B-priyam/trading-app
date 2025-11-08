import { NextRequest } from "next/server";
import WebSocket from "ws";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const strikesParam = url.searchParams.get("strikes");

  if (!strikesParam) {
    return new Response(
      `data: ${JSON.stringify({ error: "Missing strikes parameter" })}\n\n`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      }
    );
  }

  // Split and trim tokens
  const tokens = strikesParam
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return new Response("No valid tokens found", { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      console.log("Stream started with tokens:", tokens);

      const ws = new WebSocket("wss://api.shoonya.com/NorenWSTP/");
      let closed = false;

      const safeClose = () => {
        if (!closed) {
          closed = true;
          try {
            controller.close();
          } catch {}
        }
      };

      ws.on("open", () => {
        console.log("WS open, sending auth...");
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
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

        if (data.t === "ck" && data.s === "OK") {
          console.log("Auth success, subscribing...");

          const joinString = tokens.join("#");
          ws.send(JSON.stringify({ t: "t", k: joinString }));
        }
      });

      ws.on("error", (err) => {
        console.error("WS error", err);
        safeClose();
      });

      ws.on("close", () => {
        console.log("WS closed");
        safeClose();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
