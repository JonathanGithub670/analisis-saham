"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { IdxStockQuote } from "@/services/idxApi";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  timestamp: Date;
  typing?: boolean;
}

interface Props {
  quote: IdxStockQuote;
}

const QUICK_REPLIES = [
  "Harga sekarang?",
  "Layak dibeli?",
  "P/E ratio?",
  "Dividen berapa?",
  "Siapa CEO-nya?",
  "Profil perusahaan",
];

function fmtRp(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "-";
  return `Rp ${v.toLocaleString("id-ID")}`;
}

function fmtPct(v: number | null | undefined, scale = 100): string {
  if (v === null || v === undefined || !isFinite(v)) return "-";
  return `${(v * scale).toFixed(2)}%`;
}

function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "-";
  return v.toLocaleString("id-ID");
}

function generateBotResponse(userText: string, quote: IdxStockQuote): string {
  const text = userText.toLowerCase();
  const code = quote.symbol.replace(".JK", "");

  // Harga saat ini
  if (/\b(harga|price|sekarang|current|now)\b/.test(text)) {
    const dir = quote.change >= 0 ? "naik" : "turun";
    const emoji = quote.change >= 0 ? "📈" : "📉";
    return `${emoji} Harga ${code} saat ini **${fmtRp(quote.price)}**, ${dir} ${Math.abs(quote.changePercent).toFixed(2)}% (${fmtRp(Math.abs(quote.change))}) dari penutupan sebelumnya ${fmtRp(quote.previousClose)}.\n\nOHLC hari ini:\n• Open: ${fmtRp(quote.open)}\n• High: ${fmtRp(quote.high)}\n• Low: ${fmtRp(quote.low)}`;
  }

  // Rekomendasi / layak beli
  if (/\b(layak|beli|buy|worth|rekomen|saran|jual|sell)\b/.test(text)) {
    return `Untuk keputusan jual/beli, silakan lihat tab **Rekomendasi AI** yang menganalisis 10+ indikator teknikal (RSI, MACD, SMA, dll). \n\nDari sisi valuasi fundamental, cek tab **Harga Wajar** untuk melihat apakah ${code} sedang undervalued atau overvalued berdasarkan metode Graham Number, P/E, P/B, dan target analis.\n\nIngat: selalu lakukan riset mandiri sebelum mengambil keputusan investasi.`;
  }

  // P/E Ratio
  if (/\b(p\/?e|pe ratio|price earning|earning)\b/.test(text)) {
    return `📊 **P/E Ratio ${code}:**\n• Trailing P/E: ${quote.trailingPE?.toFixed(2) || "-"}\n• Forward P/E: ${quote.forwardPE?.toFixed(2) || "-"}\n• EPS (TTM): ${quote.epsTrailingTwelveMonths?.toFixed(2) || "-"}\n\nMenurut Benjamin Graham, P/E ≤ 15x umumnya dianggap wajar untuk saham defensif. P/E yang terlalu tinggi bisa berarti saham mahal atau pasar ekspektasi pertumbuhan tinggi.`;
  }

  // P/B Ratio
  if (/\b(p\/?b|pb ratio|book value|bvps|buku)\b/.test(text)) {
    return `📚 **P/B Ratio ${code}:**\n• P/B: ${quote.priceToBook?.toFixed(2) || "-"}\n• Book Value per Share: ${fmtRp(quote.bookValue)}\n\nP/B ≤ 1.5x dianggap wajar menurut Graham. P/B < 1 berarti harga pasar di bawah nilai buku — bisa jadi undervalued, atau sinyal ada masalah fundamental.`;
  }

  // Dividen
  if (/\b(dividen|dividend|yield|cuan)\b/.test(text)) {
    const yieldStr = quote.dividendYieldFmt || fmtPct(quote.dividendYield);
    return `💰 **Dividend Yield ${code}: ${yieldStr}**\n\n${
      quote.dividendYield && quote.dividendYield > 0
        ? `Dengan harga saat ini ${fmtRp(quote.price)}, setiap lembar saham memberikan yield tahunan sekitar ${yieldStr}. ${
            quote.dividendYield > 0.04
              ? "Yield ini cukup menarik untuk income investing."
              : "Yield relatif kecil — saham ini lebih cocok untuk growth investing."
          }`
        : "Data dividen tidak tersedia atau perusahaan tidak membagikan dividen."
    }`;
  }

  // Market Cap
  if (/\b(market cap|kapitalisasi|kapital|ukuran)\b/.test(text)) {
    return `🏦 **Kapitalisasi Pasar ${code}: ${quote.marketCapFmt || fmtRp(quote.marketCap)}**\n\nIni adalah total nilai pasar seluruh saham beredar. Enterprise Value: ${quote.enterpriseValueFmt || fmtRp(quote.enterpriseValue)}.`;
  }

  // Volume
  if (/\b(volume|volum|likuid|trading)\b/.test(text)) {
    return `📊 **Volume Transaksi ${code}:**\n• Hari ini: ${fmtNum(quote.volume)} lembar\n• Rata-rata: ${fmtNum(quote.averageVolume)} lembar\n\n${
      quote.volume && quote.averageVolume
        ? quote.volume > quote.averageVolume * 1.5
          ? "Volume hari ini jauh di atas rata-rata — menunjukkan minat pasar yang tinggi."
          : quote.volume < quote.averageVolume * 0.5
            ? "Volume hari ini di bawah rata-rata — minat pasar rendah."
            : "Volume hari ini normal."
        : ""
    }`;
  }

  // 52 Week
  if (/\b(52|tahun|yearly|year|setahun|range)\b/.test(text)) {
    let position = "-";
    if (quote.fiftyTwoWeekLow && quote.fiftyTwoWeekHigh && quote.price) {
      const pct =
        ((quote.price - quote.fiftyTwoWeekLow) /
          (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) *
        100;
      position = `${pct.toFixed(1)}% dari low`;
    }
    return `📅 **Range 52 Minggu ${code}:**\n• High: ${fmtRp(quote.fiftyTwoWeekHigh)}\n• Low: ${fmtRp(quote.fiftyTwoWeekLow)}\n• Posisi saat ini: ${position}\n\nMA 50 hari: ${fmtRp(quote.fiftyDayAverage)}\nMA 200 hari: ${fmtRp(quote.twoHundredDayAverage)}`;
  }

  // CEO / Direksi
  if (/\b(ceo|direksi|direktur|pimpinan|officer|bos|jabat)\b/.test(text)) {
    const officers = quote.companyOfficers || [];
    if (officers.length === 0)
      return `❓ Data direksi untuk ${code} belum tersedia.`;
    const top = officers.slice(0, 5);
    return `👥 **Eksekutif Kunci ${code}:**\n\n${top
      .map((o) => `• **${o.name || "-"}**\n  ${o.title || "-"}${o.age ? ` (usia ${o.age})` : ""}`)
      .join("\n\n")}`;
  }

  // Sektor / Industri
  if (/\b(sektor|sector|industri|industry|bidang|usaha)\b/.test(text)) {
    return `🏢 **${code} — ${quote.name}**\n\n• Sektor: ${quote.sector || "-"}\n• Industri: ${quote.industry || "-"}\n• Karyawan: ${fmtNum(quote.fullTimeEmployees)} orang\n• Bursa: ${quote.exchange || "IDX"}`;
  }

  // Profil / tentang
  if (/\b(profil|tentang|about|company|perusahaan|apa)\b/.test(text)) {
    if (quote.longBusinessSummary) {
      const short =
        quote.longBusinessSummary.length > 400
          ? quote.longBusinessSummary.slice(0, 400) + "..."
          : quote.longBusinessSummary;
      return `📖 **${quote.name} (${code})**\n\n${short}\n\n📍 ${quote.city || "-"}, ${quote.country || "-"}\n🌐 ${quote.website || "-"}`;
    }
    return `${quote.name} (${code}) — ${quote.sector || "-"} / ${quote.industry || "-"}, tercatat di ${quote.exchange || "IDX"}.`;
  }

  // Revenue / Pendapatan
  if (/\b(pendapatan|revenue|sales|penjualan|omzet)\b/.test(text)) {
    return `💵 **Pendapatan ${code}:**\n• Total Revenue: ${quote.totalRevenueFmt || fmtRp(quote.totalRevenue)}\n• Revenue Growth: ${fmtPct(quote.revenueGrowth)}\n• EPS Growth (Q): ${fmtPct(quote.earningsQuarterlyGrowth)}\n\n${
      quote.revenueGrowth && quote.revenueGrowth > 0.1
        ? "Pertumbuhan pendapatan kuat (>10%) — pertanda perusahaan sedang ekspansi."
        : quote.revenueGrowth && quote.revenueGrowth < 0
          ? "Pendapatan sedang turun — perlu dipantau fundamentalnya."
          : ""
    }`;
  }

  // Margin
  if (/\b(margin|profit|laba|untung)\b/.test(text)) {
    return `📈 **Margin ${code}:**\n• Gross Margin: ${fmtPct(quote.grossMargins)}\n• Operating Margin: ${fmtPct(quote.operatingMargins)}\n• Profit Margin: ${fmtPct(quote.profitMargins)}\n\nProfit margin tinggi menandakan efisiensi perusahaan dalam mengubah pendapatan menjadi laba bersih.`;
  }

  // ROE
  if (/\b(roe|return on equity|ekuitas)\b/.test(text)) {
    const roe = quote.returnOnEquity;
    let verdict = "";
    if (roe !== null && roe !== undefined) {
      if (roe > 0.2) verdict = " — **Sangat baik** (>20%)";
      else if (roe > 0.15) verdict = " — **Baik** (>15%)";
      else if (roe > 0.1) verdict = " — Cukup (>10%)";
      else if (roe > 0) verdict = " — Rendah";
      else verdict = " — **Negatif** (perusahaan sedang merugi)";
    }
    return `🎯 **ROE ${code}: ${fmtPct(roe)}${verdict}**\n\nReturn on Equity mengukur seberapa efisien perusahaan menghasilkan laba dari modal pemegang saham. ROE > 15% dianggap baik menurut Warren Buffett.`;
  }

  // Debt / Hutang
  if (/\b(hutang|debt|utang|liability|kewajiban)\b/.test(text)) {
    return `⚖️ **Kesehatan Keuangan ${code}:**\n• Debt to Equity: ${quote.debtToEquity?.toFixed(2) || "-"}\n• Current Ratio: ${quote.currentRatio?.toFixed(2) || "-"}\n\nDebt to Equity < 1 umumnya menandakan perusahaan konservatif. Current Ratio > 1 berarti aset lancar cukup untuk membayar kewajiban jangka pendek.`;
  }

  // Salam
  if (/\b(halo|hai|hi|hello|selamat|assalam)\b/.test(text)) {
    return `👋 Halo! Saya asisten AI untuk saham **${code}** (${quote.name}).\n\nTanyakan apa saja — harga, fundamental, valuasi, dividen, CEO, atau profil perusahaan. Harga saat ini: **${fmtRp(quote.price)}** (${quote.change >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%)`;
  }

  // Terima kasih
  if (/\b(terima kasih|thanks|thank|makasih)\b/.test(text)) {
    return `Sama-sama! 😊 Jika ada pertanyaan lain tentang ${code}, silakan tanyakan kapan saja.`;
  }

  // Bantuan
  if (/\b(bantu|help|bisa apa|fitur|menu)\b/.test(text)) {
    return `🤖 Saya bisa menjawab pertanyaan tentang **${code}**:\n\n• **Harga** — harga saat ini, OHLC, range 52W\n• **Valuasi** — P/E, P/B, book value, dividen\n• **Fundamental** — revenue, margin, ROE, hutang\n• **Perusahaan** — profil, sektor, CEO, karyawan\n• **Rekomendasi** — saran jual/beli\n\nCoba tanyakan: "Berapa P/E ratio?", "Siapa CEO-nya?", atau "Bagaimana dividennya?"`;
  }

  // Default fallback
  return `🤔 Maaf, saya belum memahami pertanyaan "${userText}" dengan baik.\n\nSaya bisa menjawab tentang: **harga, P/E, P/B, dividen, market cap, volume, 52W range, CEO, sektor, profil perusahaan, pendapatan, margin, ROE, hutang**.\n\nContoh: "berapa harga sekarang?", "bagaimana dividennya?", atau ketik **"bantu"** untuk daftar lengkap.`;
}

// Render message text with basic markdown (**bold**) support
function renderMessageText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function IdxStockChat({ quote }: Props) {
  const code = quote.symbol.replace(".JK", "");
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "welcome",
      role: "bot",
      text: `👋 Halo! Saya asisten AI untuk **${code}** (${quote.name}).\n\nTanyakan apa saja tentang saham ini. Harga saat ini: **${fmtRp(quote.price)}** (${quote.change >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%)`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || typingRef.current) return;
      typingRef.current = true;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        text: text.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      // Simulate thinking delay
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

      const response = generateBotResponse(text, quote);
      setIsTyping(false);

      const botId = `b-${Date.now()}`;
      const botMsg: Message = {
        id: botId,
        role: "bot",
        text: "",
        timestamp: new Date(),
        typing: true,
      };
      setMessages((prev) => [...prev, botMsg]);

      // Type out response character by character (realtime effect)
      const speed = response.length > 300 ? 4 : 10;
      for (let i = 1; i <= response.length; i++) {
        await new Promise((r) => setTimeout(r, speed));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? {
                  ...m,
                  text: response.slice(0, i),
                  typing: i < response.length,
                }
              : m
          )
        );
      }

      typingRef.current = false;
    },
    [quote]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const showQuickReplies = messages.length <= 1;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] flex flex-col h-[calc(100vh-250px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-md">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
              />
            </svg>
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 border-2 border-white dark:border-gray-900 rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 truncate">
            AI Asisten {code}
          </h3>
          <p className="text-[11px] text-success-500 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-500" />
            </span>
            Online • Real-time data
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-bold text-gray-800 dark:text-white/90">
            {fmtRp(quote.price)}
          </p>
          <p
            className={`text-[10px] font-semibold ${
              quote.change >= 0 ? "text-success-500" : "text-error-500"
            }`}
          >
            {quote.change >= 0 ? "+" : ""}
            {quote.changePercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "bot" && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 mt-auto">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[80%] flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                  msg.role === "user"
                    ? "bg-brand-500 text-white rounded-br-md"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 rounded-bl-md"
                }`}
              >
                {renderMessageText(msg.text)}
                {msg.typing && (
                  <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
                )}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-2">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-3.5 h-3.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09z"
                />
              </svg>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1 items-center">
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Replies (hanya tampil di awal) */}
      {showQuickReplies && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2 tracking-wide">
            Pertanyaan Cepat
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="px-3 py-1.5 text-xs bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 rounded-full hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Tanya tentang ${code}...`}
          disabled={isTyping}
          className="flex-1 h-10 rounded-full bg-gray-100 dark:bg-gray-800 px-4 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-600 transition-colors flex-shrink-0"
          aria-label="Kirim"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
