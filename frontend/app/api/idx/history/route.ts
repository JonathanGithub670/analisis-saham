import { NextRequest, NextResponse } from "next/server";

// Yahoo Finance chart API for historical data
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "";
  const range = request.nextUrl.searchParams.get("range") || "6mo"; // 1d,5d,1mo,3mo,6mo,1y,2y,5y,max
  const interval = request.nextUrl.searchParams.get("interval") || "1d"; // 1m,5m,15m,1h,1d,1wk,1mo

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) {
      throw new Error(`Yahoo chart failed: ${res.status}`);
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      return NextResponse.json({ error: "No data found" }, { status: 404 });
    }

    const timestamps = result.timestamp || [];
    const ohlcv = result.indicators?.quote?.[0] || {};
    const adjClose = result.indicators?.adjclose?.[0]?.adjclose || [];

    const history = timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().split("T")[0],
      timestamp: ts,
      open: ohlcv.open?.[i] ?? null,
      high: ohlcv.high?.[i] ?? null,
      low: ohlcv.low?.[i] ?? null,
      close: ohlcv.close?.[i] ?? null,
      volume: ohlcv.volume?.[i] ?? null,
      adjClose: adjClose[i] ?? null,
    })).filter((item: Record<string, unknown>) => item.close !== null);

    const meta = result.meta || {};

    return NextResponse.json({
      symbol: meta.symbol || symbol,
      currency: meta.currency || "IDR",
      exchangeName: meta.exchangeName || "",
      regularMarketPrice: meta.regularMarketPrice,
      previousClose: meta.previousClose,
      history,
    });
  } catch (error) {
    console.error("Yahoo chart error:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
