import { NextRequest, NextResponse } from "next/server";

interface CompanyOfficer {
  name: string | null;
  title: string | null;
  age: number | null;
  yearBorn: number | null;
  totalPay: number | null;
}

const YAHOO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Module-level crumb cache (30 min TTL) — crumb+cookie are relatively expensive to fetch
let crumbCache: { crumb: string; cookie: string; expires: number } | null = null;

/**
 * Fetch Yahoo Finance crumb + consent cookie.
 * Required for v10 quoteSummary JSON API since ~2023.
 */
async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  if (crumbCache && crumbCache.expires > Date.now()) {
    return { crumb: crumbCache.crumb, cookie: crumbCache.cookie };
  }

  try {
    // Step 1: hit fc.yahoo.com to receive the A3 consent cookie
    const r1 = await fetch("https://fc.yahoo.com", {
      headers: { "User-Agent": YAHOO_UA },
      redirect: "manual",
    });
    const rawSetCookie = r1.headers.get("set-cookie") || "";
    if (!rawSetCookie) {
      console.warn("[idx/stock] No set-cookie from fc.yahoo.com");
      return null;
    }
    // Join all cookies into a single Cookie header value (name=value pairs)
    const cookieStr = rawSetCookie
      .split(/,(?=[^;]+?=)/)
      .map((c) => c.split(";")[0].trim())
      .filter((c) => c.includes("="))
      .join("; ");

    // Step 2: get the crumb
    const r2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { "User-Agent": YAHOO_UA, Cookie: cookieStr },
    });
    if (!r2.ok) {
      console.warn(`[idx/stock] getcrumb HTTP ${r2.status}`);
      return null;
    }
    const crumb = (await r2.text()).trim();
    if (!crumb || crumb.length < 3 || crumb.includes("<")) {
      console.warn("[idx/stock] Invalid crumb received");
      return null;
    }

    crumbCache = {
      crumb,
      cookie: cookieStr,
      expires: Date.now() + 30 * 60 * 1000,
    };
    console.log(`[idx/stock] Obtained fresh crumb (len=${crumb.length})`);
    return { crumb, cookie: cookieStr };
  } catch (err) {
    console.warn("[idx/stock] getYahooCrumb error:", err);
    return null;
  }
}

/**
 * Primary data source: Yahoo v10 quoteSummary JSON API.
 * Much more reliable than HTML scraping since it returns structured JSON.
 */
async function fetchQuoteSummaryAPI(
  symbol: string
): Promise<Record<string, unknown> | null> {
  const modules = [
    "price",
    "summaryDetail",
    "defaultKeyStatistics",
    "financialData",
    "assetProfile",
    "summaryProfile",
  ].join(",");

  const tryFetch = async (
    host: string,
    crumb?: string,
    cookie?: string
  ): Promise<Record<string, unknown> | null> => {
    const url =
      `https://${host}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
      `?modules=${modules}` +
      (crumb ? `&crumb=${encodeURIComponent(crumb)}` : "");

    const headers: Record<string, string> = { "User-Agent": YAHOO_UA };
    if (cookie) headers.Cookie = cookie;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.warn(
        `[idx/stock] v10 ${host} HTTP ${res.status} for ${symbol} (crumb=${!!crumb})`
      );
      if (res.status === 401 || res.status === 403) crumbCache = null;
      return null;
    }
    const data = await res.json();
    const result = data?.quoteSummary?.result?.[0];
    if (!result) return null;

    const extracted: Record<string, unknown> = {};
    extractFromStore(result, extracted);
    return extracted;
  };

  try {
    // Attempt 1: with crumb + cookie (most reliable)
    const auth = await getYahooCrumb();
    if (auth) {
      const out = await tryFetch("query2.finance.yahoo.com", auth.crumb, auth.cookie);
      if (out && Object.keys(out).length > 0) return out;
    }

    // Attempt 2: query1 without crumb (some regions/saham work)
    const out2 = await tryFetch("query1.finance.yahoo.com");
    if (out2 && Object.keys(out2).length > 0) return out2;

    return null;
  } catch (err) {
    console.warn("[idx/stock] fetchQuoteSummaryAPI error:", err);
    return null;
  }
}

// Get stock quote from Yahoo Finance
// Primary: v10 quoteSummary JSON API (with crumb)
// Fallback: v8 chart API (price only) + HTML scraping (fundamentals)
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "";
  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  try {
    // 1) v8 chart API — always works, no crumb needed (needed for OHLC today + prev close)
    const chartUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d&includePrePost=false`;
    const chartRes = await fetch(chartUrl, {
      headers: { "User-Agent": YAHOO_UA },
    });

    if (!chartRes.ok) throw new Error(`Yahoo chart ${chartRes.status}`);

    const chartData = await chartRes.json();
    const chartResult = chartData?.chart?.result?.[0];
    if (!chartResult) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    const meta = chartResult.meta || {};
    const timestamps = chartResult.timestamp || [];
    const ohlcv = chartResult.indicators?.quote?.[0] || {};
    const lastIdx = timestamps.length - 1;

    const currentPrice = meta.regularMarketPrice ?? ohlcv.close?.[lastIdx] ?? 0;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
    const change = currentPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    // 2) Try v10 quoteSummary API first (structured JSON), fallback to HTML scraping
    let scraped: Record<string, unknown> = {};
    let dataSource = "none";

    const apiData = await fetchQuoteSummaryAPI(symbol);
    if (apiData && Object.keys(apiData).length > 0) {
      scraped = apiData;
      dataSource = "v10-api";
    } else {
      console.warn(`[idx/stock] v10 API failed for ${symbol}, falling back to HTML scrape`);
      try {
        scraped = await scrapeYahooPage(symbol);
        if (Object.keys(scraped).length > 0) dataSource = "html-scrape";
      } catch (err) {
        console.warn("[idx/stock] HTML scrape also failed:", err);
      }
    }

    // Diagnostic logging — shows which critical fundamental fields were obtained
    const critical = [
      "eps",
      "bookValue",
      "targetMeanPrice",
      "trailingPE",
      "priceToBook",
      "marketCap",
    ];
    const present = critical.filter((f) => scraped[f] !== undefined && scraped[f] !== null);
    const missing = critical.filter((f) => scraped[f] === undefined || scraped[f] === null);
    console.log(
      `[idx/stock] ${symbol} source=${dataSource} fields=${Object.keys(scraped).length} ` +
        `present=[${present.join(",")}] missing=[${missing.join(",")}]`
    );

    const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);
    const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null);

    const formatBig = (v: number | null) => {
      if (v === null || v === undefined) return null;
      if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
      if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
      if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
      return `${v}`;
    };

    // Derived fallbacks: if EPS/BVPS are missing but we have the ratios & price,
    // we can reconstruct them. This keeps fair value computable even when Yahoo
    // omits raw EPS/BVPS fields.
    let epsVal = num(scraped.eps as number);
    const trailingPEVal = num(scraped.trailingPE as number);
    if ((epsVal === null || epsVal === 0) && trailingPEVal && trailingPEVal > 0 && currentPrice > 0) {
      epsVal = currentPrice / trailingPEVal;
      console.log(`[idx/stock] ${symbol} derived EPS from price/PE: ${epsVal.toFixed(2)}`);
    }

    let bookValueVal = num(scraped.bookValue as number);
    const priceToBookVal = num(scraped.priceToBook as number);
    if ((bookValueVal === null || bookValueVal === 0) && priceToBookVal && priceToBookVal > 0 && currentPrice > 0) {
      bookValueVal = currentPrice / priceToBookVal;
      console.log(`[idx/stock] ${symbol} derived BVPS from price/PB: ${bookValueVal.toFixed(2)}`);
    }

    const marketCapVal = num(scraped.marketCap as number);

    const quote = {
      symbol: meta.symbol || symbol,
      name: str(scraped.name) || meta.shortName || meta.longName || symbol.replace(".JK", ""),
      currency: meta.currency || "IDR",
      exchange: meta.exchangeName || "",
      marketState: str(scraped.marketState) || "",

      price: currentPrice,
      change,
      changePercent,
      previousClose,
      open: ohlcv.open?.[lastIdx] ?? 0,
      high: ohlcv.high?.[lastIdx] ?? 0,
      low: ohlcv.low?.[lastIdx] ?? 0,
      volume: ohlcv.volume?.[lastIdx] ?? 0,

      marketCap: marketCapVal,
      marketCapFmt: formatBig(marketCapVal),
      fiftyTwoWeekHigh: num(scraped.fiftyTwoWeekHigh as number),
      fiftyTwoWeekLow: num(scraped.fiftyTwoWeekLow as number),
      fiftyDayAverage: num(scraped.fiftyDayAverage as number),
      twoHundredDayAverage: num(scraped.twoHundredDayAverage as number),
      averageVolume: num(scraped.averageVolume as number),
      trailingPE: trailingPEVal,
      forwardPE: num(scraped.forwardPE as number),
      priceToBook: priceToBookVal,
      bookValue: bookValueVal,
      dividendYield: num(scraped.dividendYield as number),
      dividendYieldFmt: scraped.dividendYieldFmt as string || null,
      beta: num(scraped.beta as number),
      epsTrailingTwelveMonths: epsVal,
      sector: str(scraped.sector),
      industry: str(scraped.industry),

      earningsQuarterlyGrowth: num(scraped.earningsGrowth as number),
      enterpriseValue: num(scraped.enterpriseValue as number),
      enterpriseValueFmt: formatBig(num(scraped.enterpriseValue as number)),
      totalRevenue: num(scraped.totalRevenue as number),
      totalRevenueFmt: formatBig(num(scraped.totalRevenue as number)),
      revenueGrowth: num(scraped.revenueGrowth as number),
      grossMargins: num(scraped.grossMargins as number),
      operatingMargins: num(scraped.operatingMargins as number),
      profitMargins: num(scraped.profitMargins as number),
      returnOnEquity: num(scraped.returnOnEquity as number),
      debtToEquity: num(scraped.debtToEquity as number),
      currentRatio: num(scraped.currentRatio as number),
      targetMeanPrice: num(scraped.targetMeanPrice as number),
      recommendationKey: str(scraped.recommendationKey),
      fullTimeEmployees: num(scraped.fullTimeEmployees as number),
      website: str(scraped.website),
      longBusinessSummary: str(scraped.longBusinessSummary),
      address1: str(scraped.address1),
      city: str(scraped.city),
      zip: str(scraped.zip),
      country: str(scraped.country),
      phone: str(scraped.phone),
      companyOfficers: Array.isArray(scraped.companyOfficers)
        ? (scraped.companyOfficers as CompanyOfficer[])
        : [],
    };

    return NextResponse.json(quote);
  } catch (error) {
    console.error("Stock API error:", error);
    return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 });
  }
}

/**
 * Scrape Yahoo Finance page to extract JSON data embedded in the HTML.
 * Yahoo Finance embeds full quote data in script tags as JSON.
 */
async function scrapeYahooPage(symbol: string): Promise<Record<string, unknown>> {
  const url = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!res.ok) return {};

  const html = await res.text();

  // Yahoo embeds structured data in script[type="application/json"]
  // Look for the main data store
  const result: Record<string, unknown> = {};

  // Try to extract from JSON embedded in the page
  // Pattern: "QuoteSummaryStore":{ ... }
  const storeMatch = html.match(/"QuoteSummaryStore"\s*:\s*(\{[\s\S]*?\})\s*,\s*"[A-Z]/);
  if (storeMatch) {
    try {
      // This is nested deeply, try parsing
      const rawJson = storeMatch[1];
      const store = JSON.parse(rawJson);
      extractFromStore(store, result);
      return result;
    } catch {
      // JSON parsing might fail due to truncation
    }
  }

  // Alternative: look for specific data patterns in the HTML
  // Extract from "root.App.main" data
  const appMainMatch = html.match(/root\.App\.main\s*=\s*(\{[\s\S]*?\});\s*\n/);
  if (appMainMatch) {
    try {
      const mainData = JSON.parse(appMainMatch[1]);
      const stores = mainData?.context?.dispatcher?.stores;
      if (stores?.QuoteSummaryStore) {
        extractFromStore(stores.QuoteSummaryStore, result);
        return result;
      }
    } catch {
      // ignore
    }
  }

  // Fallback: extract individual values from script tags
  const jsonBlocks = html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonBlocks) {
    try {
      const json = JSON.parse(match[1]);
      // Look for quote data in various possible structures
      const body = json?.body;
      if (body && typeof body === "object") {
        extractFromFinnhubStyle(body, result);
      }
      // Check for direct price data
      if (json?.quoteSummary?.result?.[0]) {
        extractFromStore(json.quoteSummary.result[0], result);
      }
    } catch {
      // skip unparseable blocks
    }
  }

  // Extract name from title tag
  if (!result.name) {
    const titleMatch = html.match(/<title>([^<]*)/);
    if (titleMatch) {
      const title = titleMatch[1];
      const nameMatch = title.match(/^(.+?)\s*\(/);
      if (nameMatch) result.name = nameMatch[1].trim();
    }
  }

  return result;
}

function extractFromStore(store: Record<string, unknown>, result: Record<string, unknown>) {
  const raw = (obj: unknown) => {
    if (obj && typeof obj === "object" && "raw" in (obj as Record<string, unknown>)) {
      return (obj as Record<string, unknown>).raw;
    }
    return obj;
  };

  // price module
  const price = store.price as Record<string, unknown> | undefined;
  if (price) {
    result.name = price.longName || price.shortName;
    result.marketState = price.marketState;
    result.marketCap = raw(price.marketCap);
  }

  // summaryDetail
  const sd = store.summaryDetail as Record<string, unknown> | undefined;
  if (sd) {
    result.fiftyTwoWeekHigh = raw(sd.fiftyTwoWeekHigh);
    result.fiftyTwoWeekLow = raw(sd.fiftyTwoWeekLow);
    result.fiftyDayAverage = raw(sd.fiftyDayAverage);
    result.twoHundredDayAverage = raw(sd.twoHundredDayAverage);
    result.averageVolume = raw(sd.averageVolume);
    result.trailingPE = raw(sd.trailingPE);
    result.forwardPE = raw(sd.forwardPE);
    result.dividendYield = raw(sd.dividendYield);
    if (sd.dividendYield && typeof sd.dividendYield === "object") {
      result.dividendYieldFmt = (sd.dividendYield as Record<string, unknown>).fmt;
    }
    result.beta = raw(sd.beta);
  }

  // defaultKeyStatistics
  const ks = store.defaultKeyStatistics as Record<string, unknown> | undefined;
  if (ks) {
    result.priceToBook = raw(ks.priceToBook);
    result.bookValue = raw(ks.bookValue);
    result.enterpriseValue = raw(ks.enterpriseValue);
    result.earningsGrowth = raw(ks.earningsQuarterlyGrowth);
    result.eps = raw(ks.trailingEps);
  }

  // financialData
  const fd = store.financialData as Record<string, unknown> | undefined;
  if (fd) {
    result.totalRevenue = raw(fd.totalRevenue);
    result.revenueGrowth = raw(fd.revenueGrowth);
    result.grossMargins = raw(fd.grossMargins);
    result.operatingMargins = raw(fd.operatingMargins);
    result.profitMargins = raw(fd.profitMargins);
    result.returnOnEquity = raw(fd.returnOnEquity);
    result.debtToEquity = raw(fd.debtToEquity);
    result.currentRatio = raw(fd.currentRatio);
    result.targetMeanPrice = raw(fd.targetMeanPrice);
    result.recommendationKey = fd.recommendationKey;
  }

  // summaryProfile / assetProfile — both may contain profile data
  const sp = (store.summaryProfile || store.assetProfile) as
    | Record<string, unknown>
    | undefined;
  if (sp) {
    result.sector = sp.sector;
    result.industry = sp.industry;
    result.fullTimeEmployees = sp.fullTimeEmployees;
    result.website = sp.website;
    result.longBusinessSummary = sp.longBusinessSummary;
    result.address1 = sp.address1;
    result.city = sp.city;
    result.zip = sp.zip;
    result.country = sp.country;
    result.phone = sp.phone;
  }

  // assetProfile specifically may carry companyOfficers
  const ap = store.assetProfile as Record<string, unknown> | undefined;
  if (ap && Array.isArray(ap.companyOfficers)) {
    result.companyOfficers = (ap.companyOfficers as Record<string, unknown>[])
      .slice(0, 8)
      .map((o) => ({
        name: (o.name as string) || null,
        title: (o.title as string) || null,
        age: (o.age as number) || null,
        yearBorn: (o.yearBorn as number) || null,
        totalPay: (raw(o.totalPay) as number) || null,
      }));
  }
}

function extractFromFinnhubStyle(body: unknown, result: Record<string, unknown>) {
  if (!body || typeof body !== "object") return;
  const b = body as Record<string, unknown>;
  if (b.marketCap) result.marketCap = b.marketCap;
  if (b.trailingPE) result.trailingPE = b.trailingPE;
  if (b.sector) result.sector = b.sector;
}
