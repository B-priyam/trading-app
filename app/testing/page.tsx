"use client";

import { useEffect, useState } from "react";

export default function NiftyStream() {
  const [ticks, setTicks] = useState<any>({});
  const [strikes, setStrikes] = useState([]);

  // useEffect(() => {
  //   const get = async () => {
  //     const res = await fetch("/api/option-chain?index=NIFTY");
  //     const data = await res.json();
  //     console.log(data);
  //   };
  //   get();
  // });

  useEffect(() => {
    const evtSrc = new EventSource(`/api/test?strikes=${strikes}`);

    evtSrc.onmessage = (e) => {
      const tick = JSON.parse(e.data);

      // Shoonya sends tick updates as tk, tf, dk
      if (["tk", "tf", "dk"].includes(tick.t)) {
        setTicks((prev: any) => ({
          ...prev,
          [tick.tk]: tick,
        }));
      }
    };

    evtSrc.onerror = () => {
      console.log("Stream disconnected");
      evtSrc.close();
    };

    return () => evtSrc.close();
  }, [strikes]);

  const tickList = Object.values(ticks);

  useEffect(() => {
    const test = async () => {
      const res = await fetch("/all_indices_tokens.json");
      // console.log(res);
      const data = await res.json();
      setStrikes(
        data["NIFTY"]["CE"]
          .filter(
            (x: any) =>
              (x.strike == "25350" && x.expiry === "2025-11-11") ||
              (x.strike == "25250" && x.expiry === "2025-11-11")
          )
          .map((item: any) => `NFO|${item.token}`)
      );
    };
    test();
  }, []);

  // console.log(strikes);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-2">
        📈 Live Ticks (Selected Strikes)
      </h2>

      <table className="min-w-full text-sm border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2">Token</th>
            <th className="border px-2">LTP</th>
            <th className="border px-2">OI</th>
            <th className="border px-2">Volume</th>
          </tr>
        </thead>
        <tbody>
          {tickList.map((tick: any) => (
            <tr key={tick.tk}>
              <td className="border px-2">{tick.tk}</td>
              <td className="border px-2">{tick.lp}</td>
              <td className="border px-2">{tick.oi}</td>
              <td className="border px-2">{tick.v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <div>
          Enter index <input placeholder="NIFTY" />
        </div>
        <div>
          Enter strike <input placeholder="25350" />
        </div>
        <div>
          Enter underlying <input placeholder="CE" />
        </div>
        <button>add</button>
      </div>
    </div>
  );
}
