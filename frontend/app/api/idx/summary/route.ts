import { NextRequest, NextResponse } from "next/server";

// IDX Summary - Scrapes basic market data from IDX
// Also provides a list of popular Indonesian stocks
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action") || "popular";

  if (action === "popular") {
    // Return curated list of popular IDX stocks with their .JK symbol
    const popularStocks = [
      // Banking
      { symbol: "BBCA.JK", name: "Bank Central Asia", sector: "Banking", code: "BBCA" },
      { symbol: "BBRI.JK", name: "Bank Rakyat Indonesia", sector: "Banking", code: "BBRI" },
      { symbol: "BMRI.JK", name: "Bank Mandiri", sector: "Banking", code: "BMRI" },
      { symbol: "BBNI.JK", name: "Bank Negara Indonesia", sector: "Banking", code: "BBNI" },
      { symbol: "BRIS.JK", name: "Bank Syariah Indonesia", sector: "Banking", code: "BRIS" },
      // Telco
      { symbol: "TLKM.JK", name: "Telkom Indonesia", sector: "Telco", code: "TLKM" },
      { symbol: "EXCL.JK", name: "XL Axiata", sector: "Telco", code: "EXCL" },
      // Consumer
      { symbol: "UNVR.JK", name: "Unilever Indonesia", sector: "Consumer", code: "UNVR" },
      { symbol: "ICBP.JK", name: "Indofood CBP", sector: "Consumer", code: "ICBP" },
      { symbol: "INDF.JK", name: "Indofood Sukses", sector: "Consumer", code: "INDF" },
      { symbol: "MYOR.JK", name: "Mayora Indah", sector: "Consumer", code: "MYOR" },
      // Mining & Resources
      { symbol: "ADRO.JK", name: "Adaro Energy", sector: "Mining", code: "ADRO" },
      { symbol: "ANTM.JK", name: "Aneka Tambang", sector: "Mining", code: "ANTM" },
      { symbol: "PTBA.JK", name: "Bukit Asam", sector: "Mining", code: "PTBA" },
      { symbol: "INCO.JK", name: "Vale Indonesia", sector: "Mining", code: "INCO" },
      // Automotive
      { symbol: "ASII.JK", name: "Astra International", sector: "Automotive", code: "ASII" },
      // Property
      { symbol: "BSDE.JK", name: "Bumi Serpong Damai", sector: "Property", code: "BSDE" },
      { symbol: "CTRA.JK", name: "Ciputra Development", sector: "Property", code: "CTRA" },
      // Healthcare
      { symbol: "KLBF.JK", name: "Kalbe Farma", sector: "Healthcare", code: "KLBF" },
      // Technology
      { symbol: "GOTO.JK", name: "GoTo Gojek Tokopedia", sector: "Technology", code: "GOTO" },
      { symbol: "BUKA.JK", name: "Bukalapak", sector: "Technology", code: "BUKA" },
      { symbol: "EMTK.JK", name: "Elang Mahkota Teknologi", sector: "Technology", code: "EMTK" },
      // Energy
      { symbol: "PGAS.JK", name: "Perusahaan Gas Negara", sector: "Energy", code: "PGAS" },
      { symbol: "MEDC.JK", name: "Medco Energi", sector: "Energy", code: "MEDC" },
    ];

    return NextResponse.json(popularStocks);
  }

  if (action === "market") {
    // Fetch IDX composite (IHSG) and LQ45 overview from Yahoo Finance
    try {
      const indices = ["^JKSE", "^JKLQ45"];
      const results = await Promise.all(
        indices.map(async (idx) => {
          const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(idx)}?range=5d&interval=1d`;
          const res = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
          });
          if (!res.ok) return null;
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (!meta) return null;

          return {
            symbol: meta.symbol,
            name: idx === "^JKSE" ? "IHSG (IDX Composite)" : "LQ45",
            price: meta.regularMarketPrice,
            previousClose: meta.previousClose,
            change: meta.regularMarketPrice - meta.previousClose,
            changePercent:
              ((meta.regularMarketPrice - meta.previousClose) /
                meta.previousClose) *
              100,
          };
        })
      );

      return NextResponse.json(results.filter(Boolean));
    } catch (error) {
      console.error("Market summary error:", error);
      return NextResponse.json([], { status: 200 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
