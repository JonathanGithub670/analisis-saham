import { NextRequest, NextResponse } from "next/server";

// Yahoo Finance search API - supports Indonesian stocks
// Indonesian stocks use .JK suffix (Jakarta Stock Exchange)
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  if (!q) {
    return NextResponse.json([]);
  }

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0&listsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&enableCb=false&enableNavLinks=false&enableEnhancedTrivialQuery=false&region=ID&lang=id-ID`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) {
      throw new Error(`Yahoo search failed: ${res.status}`);
    }

    const data = await res.json();
    const quotes = (data.quotes || [])
      .filter((q: Record<string, unknown>) => q.quoteType === "EQUITY")
      .map((q: Record<string, unknown>) => ({
        symbol: q.symbol as string,
        name: (q.longname || q.shortname || "") as string,
        exchange: (q.exchange || "") as string,
        exchDisp: (q.exchDisp || "") as string,
        type: (q.quoteType || "") as string,
        isIDX: ((q.symbol as string) || "").endsWith(".JK"),
      }));

    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Yahoo search error:", error);
    return NextResponse.json([], { status: 200 });
  }
}
