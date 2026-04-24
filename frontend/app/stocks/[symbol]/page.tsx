"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useStock } from "@/hooks/useStock";
import StockChart from "@/components/stocks/StockChart";
import IndicatorPanel from "@/components/indicators/IndicatorPanel";
import SignalBadge from "@/components/signals/SignalBadge";
import AIAnalysisCard from "@/components/ai/AIAnalysisCard";
import SentimentWidget from "@/components/ai/SentimentWidget";
import { api } from "@/services/api";

const INTERVALS = [
  { label: "1m", value: "1min" },
  { label: "5m", value: "5min" },
  { label: "15m", value: "15min" },
  { label: "1h", value: "60min" },
  { label: "1D", value: "1d" },
];

export default function StockDetailPage() {
  const params = useParams();
  const symbol = (params.symbol as string || "").toUpperCase();
  const [interval, setInterval] = useState("1d");
  const [inWatchlist, setInWatchlist] = useState(false);

  const {
    quote,
    history,
    indicators,
    signal,
    aiPrediction,
    sentiment,
    loading,
    error,
    fetchAll,
  } = useStock(symbol);

  useEffect(() => {
    if (symbol) {
      fetchAll(interval);
    }
  }, [symbol, interval, fetchAll]);

  useEffect(() => {
    async function checkWatchlist() {
      try {
        const list = await api.getWatchlist();
        setInWatchlist(list.some((item) => item.symbol === symbol));
      } catch {
        // ignore
      }
    }
    checkWatchlist();
  }, [symbol]);

  const toggleWatchlist = async () => {
    try {
      if (inWatchlist) {
        await api.removeFromWatchlist(symbol);
        setInWatchlist(false);
      } else {
        await api.addToWatchlist(symbol, quote?.name || undefined);
        setInWatchlist(true);
      }
    } catch {
      // ignore
    }
  };

  if (loading && !quote) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-24 shimmer rounded" />
              <div className="h-8 w-32 shimmer rounded" />
            </div>
          </div>
          <div className="h-[420px] glass-card shimmer rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 glass-card shimmer rounded-2xl" />
            <div className="h-64 glass-card shimmer rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="glass-card p-8 text-center">
          <p className="text-[var(--color-accent-red)] text-xl mb-2">⚠️ Error</p>
          <p className="text-[var(--color-text-muted)]">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 flex items-center justify-center">
            <span className="text-lg font-bold text-[var(--color-accent-cyan)]">
              {symbol.substring(0, 2)}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              {symbol}
            </h1>
            {quote?.name && (
              <p className="text-sm text-[var(--color-text-muted)]">{quote.name}</p>
            )}
          </div>
          {quote && (
            <div className="ml-4">
              <span className="text-3xl font-bold text-[var(--color-text-primary)]">
                ${quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className={`ml-3 text-lg font-semibold ${
                  quote.change >= 0
                    ? "text-[var(--color-accent-green)]"
                    : "text-[var(--color-accent-red)]"
                }`}
              >
                {quote.change >= 0 ? "+" : ""}
                {quote.change.toFixed(2)} ({quote.change_percent.toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Signal badge mini */}
          {signal && (
            <span className={`badge-${signal.signal}`}>
              {signal.signal} ({(signal.confidence * 100).toFixed(0)}%)
            </span>
          )}
          <button
            onClick={toggleWatchlist}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              inWatchlist
                ? "bg-[var(--color-accent-cyan)]/10 border-[var(--color-accent-cyan)]/30 text-[var(--color-accent-cyan)]"
                : "bg-[var(--color-dark-card)] border-[var(--color-dark-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-cyan)]/30"
            }`}
            id="watchlist-toggle"
          >
            {inWatchlist ? "★ Watching" : "☆ Watch"}
          </button>
        </div>
      </motion.div>

      {/* Quote Details Bar */}
      {quote && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 mb-6 flex flex-wrap gap-6 text-sm"
        >
          <QuoteStat label="Open" value={`$${quote.open.toFixed(2)}`} />
          <QuoteStat label="High" value={`$${quote.high.toFixed(2)}`} color="var(--color-accent-green)" />
          <QuoteStat label="Low" value={`$${quote.low.toFixed(2)}`} color="var(--color-accent-red)" />
          <QuoteStat label="Prev Close" value={`$${quote.previous_close.toFixed(2)}`} />
          <QuoteStat label="Volume" value={`${(quote.volume / 1_000_000).toFixed(2)}M`} />
          {quote.latest_trading_day && <QuoteStat label="Trading Day" value={quote.latest_trading_day} />}
        </motion.div>
      )}

      {/* Interval Selector + Chart */}
      <div className="mb-6">
        <div className="flex gap-1 mb-4 bg-[var(--color-dark-surface)] p-1 rounded-xl w-fit">
          {INTERVALS.map((intv) => (
            <button
              key={intv.value}
              onClick={() => setInterval(intv.value)}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all ${
                interval === intv.value
                  ? "bg-[var(--color-dark-card)] text-[var(--color-accent-cyan)] shadow-lg"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
              }`}
            >
              {intv.label}
            </button>
          ))}
        </div>

        {history.length > 0 && (
          <StockChart data={history} symbol={symbol} />
        )}
      </div>

      {/* Indicators + Signal Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {indicators && <IndicatorPanel indicators={indicators} />}
        {signal && <SignalBadge signal={signal} />}
      </div>

      {/* AI + Sentiment Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIAnalysisCard prediction={aiPrediction} loading={!aiPrediction && loading} />
        <SentimentWidget sentiment={sentiment} loading={!sentiment && loading} />
      </div>
    </div>
  );
}

function QuoteStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <span className="text-[var(--color-text-muted)] text-xs">{label}</span>
      <p className="font-semibold" style={{ color: color || "var(--color-text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
