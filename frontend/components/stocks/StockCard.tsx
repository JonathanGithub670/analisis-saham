"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { StockQuote } from "@/types";

interface StockCardProps {
  quote: StockQuote;
  index?: number;
}

export default function StockCard({ quote, index = 0 }: StockCardProps) {
  const isPositive = quote.change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link
        href={`/stocks/${quote.symbol}`}
        className="block glass-card-hover p-5"
        id={`stock-card-${quote.symbol}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-[var(--color-text-primary)]">
              {quote.symbol}
            </h3>
            {quote.name && (
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate max-w-[150px]">
                {quote.name}
              </p>
            )}
          </div>
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isPositive ? "bg-[var(--color-accent-green)] pulse-green" : "bg-[var(--color-accent-red)] pulse-red"
            }`}
          />
        </div>

        <div className="mb-2">
          <span className="text-2xl font-bold text-[var(--color-text-primary)]">
            ${quote.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold ${
              isPositive ? "text-[var(--color-accent-green)]" : "text-[var(--color-accent-red)]"
            }`}
          >
            {isPositive ? "+" : ""}
            {quote.change.toFixed(2)}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-md font-medium ${
              isPositive
                ? "bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]"
                : "bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)]"
            }`}
          >
            {isPositive ? "+" : ""}
            {quote.change_percent.toFixed(2)}%
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-[var(--color-dark-border)]">
          <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
            <span>Vol: {(quote.volume / 1_000_000).toFixed(1)}M</span>
            <span>H: ${quote.high.toFixed(2)}</span>
            <span>L: ${quote.low.toFixed(2)}</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
