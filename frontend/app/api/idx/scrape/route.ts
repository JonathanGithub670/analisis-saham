import { NextRequest, NextResponse } from "next/server";

// Scrape data from IDX (idx.co.id) for Indonesian stock market data
// Provides: market summary, stock trading data, top gainers/losers

const IDX_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  Referer: "https://www.idx.co.id/id",
  Origin: "https://www.idx.co.id",
};

interface IdxStockSummary {
  code: string;
  name: string;
  open: number;
  high: number;
  low: number;
  close: number;
  previous: number;
  change: number;
  changePercent: number;
  volume: number;
  value: number;
  frequency: number;
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action") || "summary";

  try {
    if (action === "summary") {
      return await getMarketSummary();
    }
    if (action === "top-gainers") {
      return await getTopMovers("gainers");
    }
    if (action === "top-losers") {
      return await getTopMovers("losers");
    }
    if (action === "most-active") {
      return await getMostActive();
    }
    if (action === "stock-data") {
      const code = request.nextUrl.searchParams.get("code") || "";
      if (!code) {
        return NextResponse.json({ error: "Stock code required" }, { status: 400 });
      }
      return await getStockData(code);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("IDX scrape error:", error);
    return NextResponse.json({ error: "Failed to scrape IDX data" }, { status: 500 });
  }
}

async function getMarketSummary() {
  // Try IDX API endpoint for market summary
  try {
    const url = "https://www.idx.co.id/umbraco/Surface/Helper/GetStockSummary";
    const res = await fetch(url, { headers: IDX_HEADERS, signal: AbortSignal.timeout(10000) });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Fallback below
  }

  // Fallback: Scrape from IDX main page or use alternative API
  try {
    const url = "https://www.idx.co.id/id";
    const res = await fetch(url, { headers: IDX_HEADERS, signal: AbortSignal.timeout(10000) });

    if (!res.ok) throw new Error(`IDX page fetch failed: ${res.status}`);

    const html = await res.text();
    const summary = extractMarketSummaryFromHtml(html);

    return NextResponse.json(summary);
  } catch {
    // Return empty summary as fallback
    return NextResponse.json({
      source: "fallback",
      message: "IDX data temporarily unavailable. Using Yahoo Finance data.",
      data: null,
    });
  }
}

async function getTopMovers(type: "gainers" | "losers") {
  // Try to get stock data and sort by change percentage
  try {
    const stocks = await fetchIdxStockList();
    if (stocks.length > 0) {
      const sorted =
        type === "gainers"
          ? stocks.sort((a, b) => b.changePercent - a.changePercent).slice(0, 10)
          : stocks.sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);

      return NextResponse.json(sorted);
    }
  } catch {
    // Fallback
  }

  // Fallback: Use Yahoo Finance for top IDX movers
  const popularSymbols = [
    "BBCA.JK", "BBRI.JK", "BMRI.JK", "TLKM.JK", "ASII.JK",
    "UNVR.JK", "BBNI.JK", "ICBP.JK", "INDF.JK", "ADRO.JK",
    "ANTM.JK", "PTBA.JK", "GOTO.JK", "BRIS.JK", "KLBF.JK",
    "EXCL.JK", "BSDE.JK", "CTRA.JK", "PGAS.JK", "MEDC.JK",
  ];

  const results = await fetchYahooQuotes(popularSymbols);
  const sorted =
    type === "gainers"
      ? results.sort((a, b) => b.changePercent - a.changePercent).slice(0, 10)
      : results.sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);

  return NextResponse.json(sorted);
}

async function getMostActive() {
  try {
    const stocks = await fetchIdxStockList();
    if (stocks.length > 0) {
      const sorted = stocks.sort((a, b) => b.volume - a.volume).slice(0, 10);
      return NextResponse.json(sorted);
    }
  } catch {
    // Fallback
  }

  const popularSymbols = [
    "BBCA.JK", "BBRI.JK", "BMRI.JK", "TLKM.JK", "ASII.JK",
    "UNVR.JK", "BBNI.JK", "GOTO.JK", "ADRO.JK", "ANTM.JK",
  ];

  const results = await fetchYahooQuotes(popularSymbols);
  const sorted = results.sort((a, b) => b.volume - a.volume).slice(0, 10);
  return NextResponse.json(sorted);
}

async function getStockData(code: string) {
  // Try IDX API for specific stock
  try {
    const symbol = code.endsWith(".JK") ? code : `${code}.JK`;
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1mo&interval=1d&includePrePost=false`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });

    if (!res.ok) throw new Error("Yahoo fetch failed");

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error("No data");

    const meta = result.meta || {};
    const timestamps = result.timestamp || [];
    const ohlcv = result.indicators?.quote?.[0] || {};

    const history = timestamps.map((ts: number, i: number) => ({
      date: new Date(ts * 1000).toISOString().split("T")[0],
      open: ohlcv.open?.[i] ?? 0,
      high: ohlcv.high?.[i] ?? 0,
      low: ohlcv.low?.[i] ?? 0,
      close: ohlcv.close?.[i] ?? 0,
      volume: ohlcv.volume?.[i] ?? 0,
    })).filter((item: { close: number }) => item.close > 0);

    return NextResponse.json({
      code: code.replace(".JK", ""),
      symbol,
      name: meta.shortName || meta.longName || code,
      currency: meta.currency || "IDR",
      exchange: meta.exchangeName || "JKT",
      currentPrice: meta.regularMarketPrice,
      previousClose: meta.previousClose,
      history,
    });
  } catch (error) {
    console.error("Stock data error:", error);
    return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 });
  }
}

// Helper: Fetch stock list from IDX
async function fetchIdxStockList(): Promise<IdxStockSummary[]> {
  // Try IDX API for stock trading data
  const urls = [
    "https://www.idx.co.id/umbraco/Surface/StockData/GetStockData?length=30&start=0",
    "https://www.idx.co.id/umbraco/Surface/Helper/GetStockData?length=30&start=0",
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: IDX_HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const items = data?.data || data?.Results || data || [];

      if (Array.isArray(items) && items.length > 0) {
        return items.map((item: Record<string, unknown>) => ({
          code: (item.Code || item.StockCode || item.code || "") as string,
          name: (item.Name || item.StockName || item.name || "") as string,
          open: Number(item.OpenPrice || item.Open || item.open || 0),
          high: Number(item.High || item.high || 0),
          low: Number(item.Low || item.low || 0),
          close: Number(item.Close || item.ClosePrice || item.close || 0),
          previous: Number(item.Previous || item.PrevClose || item.previous || 0),
          change: Number(item.Change || item.change || 0),
          changePercent: Number(item.Percentage || item.ChangePct || item.changePercent || 0),
          volume: Number(item.Volume || item.volume || 0),
          value: Number(item.Value || item.value || 0),
          frequency: Number(item.Frequency || item.frequency || 0),
        }));
      }
    } catch {
      continue;
    }
  }

  return [];
}

// Helper: Fetch quotes from Yahoo Finance for multiple symbols
async function fetchYahooQuotes(symbols: string[]): Promise<IdxStockSummary[]> {
  const results = await Promise.allSettled(
    symbols.map(async (sym) => {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=5d&interval=1d`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const ohlcv = data?.chart?.result?.[0]?.indicators?.quote?.[0];
      const timestamps = data?.chart?.result?.[0]?.timestamp || [];
      if (!meta) return null;

      const lastIdx = timestamps.length - 1;
      const price = meta.regularMarketPrice || 0;
      const prev = meta.chartPreviousClose || meta.previousClose || 0;

      return {
        code: sym.replace(".JK", ""),
        name: meta.shortName || meta.longName || sym,
        open: ohlcv?.open?.[lastIdx] ?? 0,
        high: ohlcv?.high?.[lastIdx] ?? 0,
        low: ohlcv?.low?.[lastIdx] ?? 0,
        close: price,
        previous: prev,
        change: price - prev,
        changePercent: prev > 0 ? ((price - prev) / prev) * 100 : 0,
        volume: ohlcv?.volume?.[lastIdx] ?? 0,
        value: 0,
        frequency: 0,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<IdxStockSummary | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((r): r is IdxStockSummary => r !== null);
}

// Helper: Extract market summary from IDX HTML page
function extractMarketSummaryFromHtml(html: string): Record<string, unknown> {
  const result: Record<string, unknown> = { source: "idx.co.id" };

  // Try to extract IHSG value from the page
  const ihsgMatch = html.match(/IHSG[\s\S]*?(\d[\d.,]+)/i);
  if (ihsgMatch) {
    result.ihsg = parseFloat(ihsgMatch[1].replace(/,/g, ""));
  }

  // Try to extract trading summary data
  const volumeMatch = html.match(/(?:volume|vol)[\s\S]*?(\d[\d.,]+)/i);
  if (volumeMatch) {
    result.tradingVolume = parseFloat(volumeMatch[1].replace(/,/g, ""));
  }

  const valueMatch = html.match(/(?:value|val)[\s\S]*?(\d[\d.,]+)/i);
  if (valueMatch) {
    result.tradingValue = parseFloat(valueMatch[1].replace(/,/g, ""));
  }

  return result;
}
