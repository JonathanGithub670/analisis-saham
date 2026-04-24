"use client";

import { motion } from "framer-motion";
import type { SentimentResult } from "@/types";

interface SentimentWidgetProps {
  sentiment: SentimentResult | null;
  loading?: boolean;
}

export default function SentimentWidget({ sentiment, loading }: SentimentWidgetProps) {
  if (loading) {
    return (
      <div className="glass-card p-5" id="sentiment-widget">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
          📰 News Sentiment
        </h3>
        <div className="space-y-3">
          <div className="h-6 shimmer rounded-lg w-1/2" />
          <div className="h-4 shimmer rounded-lg" />
          <div className="h-4 shimmer rounded-lg w-3/4" />
        </div>
      </div>
    );
  }

  if (!sentiment || sentiment.articles_analyzed === 0) {
    return (
      <div className="glass-card p-5" id="sentiment-widget">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
          📰 News Sentiment
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          No news data available. Configure a News API key for sentiment analysis.
        </p>
      </div>
    );
  }

  const sentimentColor = {
    positive: "var(--color-accent-green)",
    negative: "var(--color-accent-red)",
    neutral: "var(--color-accent-amber)",
  }[sentiment.overall_sentiment] || "var(--color-accent-amber)";

  return (
    <div className="glass-card p-5" id="sentiment-widget">
      <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
        📰 News Sentiment
      </h3>

      <div className="flex items-center gap-3 mb-4">
        <span
          className="text-xl font-bold uppercase"
          style={{ color: sentimentColor }}
        >
          {sentiment.overall_sentiment}
        </span>
        <span className="text-sm text-[var(--color-text-muted)]">
          ({sentiment.articles_analyzed} articles)
        </span>
      </div>

      {/* Sentiment bars */}
      <div className="space-y-2 mb-4">
        <SentimentBar label="Positive" value={sentiment.positive_ratio} color="var(--color-accent-green)" />
        <SentimentBar label="Neutral" value={sentiment.neutral_ratio} color="var(--color-accent-amber)" />
        <SentimentBar label="Negative" value={sentiment.negative_ratio} color="var(--color-accent-red)" />
      </div>

      {/* Headlines */}
      {sentiment.headlines.length > 0 && (
        <div className="space-y-2 mt-4 pt-4 border-t border-[var(--color-dark-border)]">
          <h4 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
            Latest Headlines
          </h4>
          {sentiment.headlines.slice(0, 5).map((headline, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-2"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  headline.sentiment === "positive"
                    ? "bg-[var(--color-accent-green)]"
                    : headline.sentiment === "negative"
                    ? "bg-[var(--color-accent-red)]"
                    : "bg-[var(--color-accent-amber)]"
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-text-secondary)] truncate">
                  {headline.url ? (
                    <a href={headline.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent-cyan)] transition-colors">
                      {headline.title}
                    </a>
                  ) : (
                    headline.title
                  )}
                </p>
                {headline.source && (
                  <span className="text-[10px] text-[var(--color-text-muted)]">{headline.source}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function SentimentBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--color-text-muted)] w-16">{label}</span>
      <div className="flex-1 h-2 bg-[var(--color-dark-bg)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium text-[var(--color-text-secondary)] w-10 text-right">
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}
