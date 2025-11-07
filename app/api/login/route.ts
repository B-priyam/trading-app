import { NextResponse } from "next/server";

// import { RestAPI,WebSocket } from "@quantiply/finvasia-nodejs-sdk";

const BASE_URL = "https://api.shoonya.com/NorenWClientTP/";

export async function POST() {
  try {
    const payload = JSON.stringify({
      uid: "FA294062",
      pwd: "8c346175e7d9721076f3230af2b1b09a0dfcb5c2932ae5f56fdd9919e54b6cd7",
      factor2: "378625",
      imei: "abc1234",
      apkversion: "1.0.0",
      vc: "FA294062_U",
      appkey:
        "80c846f6f02ab4653f5e3eb30110a12e6a6e3def8c40517e07620e2e80322b6b",
      source: "API",
    });

    const resp = await fetch(`${BASE_URL}QuickAuth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `jData=${payload}`,
    });

    const data = await resp.json();
    console.log(data);
    console.log(data.jKey);

    const token = data.jKey;

    console.log("token ", token);
    if (!token) throw new Error("Invalid login response");

    return NextResponse.json({ token });
  } catch (err: any) {
    console.error("Shoonya API Error:", err.response?.data?.emsg);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
