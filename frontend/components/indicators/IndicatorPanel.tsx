"use client";

import { motion } from "framer-motion";
import type { IndicatorResult } from "@/types";

interface IndicatorPanelProps {
  indicators: IndicatorResult;
}

export default function IndicatorPanel({ indicators }: IndicatorPanelProps) {
  return (
    <div className="glass-card p-5" id="indicator-panel">
      <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
        Technical Indicators
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* RSI */}
        <IndicatorItem
          label="RSI (14)"
          value={indicators.rsi}
          formatter={(v) => v.toFixed(1)}
          colorFn={(v) =>
            v < 30 ? "var(--color-accent-green)" : v > 70 ? "var(--color-accent-red)" : "var(--color-accent-amber)"
          }
          badge={
            indicators.rsi !== undefined && indicators.rsi !== null
              ? indicators.rsi < 30
                ? "Oversold"
                : indicators.rsi > 70
                ? "Overbought"
                : "Neutral"
              : undefined
          }
          progress={indicators.rsi ? indicators.rsi / 100 : 0}
          index={0}
        />

        {/* MACD */}
        <IndicatorItem
          label="MACD"
          value={indicators.macd?.macd_line}
          formatter={(v) => v.toFixed(2)}
          colorFn={(v) => (v > 0 ? "var(--color-accent-green)" : "var(--color-accent-red)")}
          badge={indicators.macd ? (indicators.macd.histogram > 0 ? "Bullish" : "Bearish") : undefined}
          index={1}
        />

        {/* MA20 */}
        <IndicatorItem
          label="MA20"
          value={indicators.ma20}
          formatter={(v) => `$${v.toFixed(2)}`}
          colorFn={() => "#06b6d4"}
          index={2}
        />

        {/* MA50 */}
        <IndicatorItem
          label="MA50"
          value={indicators.ma50}
          formatter={(v) => `$${v.toFixed(2)}`}
          colorFn={() => "#8b5cf6"}
          index={3}
        />

        {/* Volume */}
        <IndicatorItem
          label="Avg Volume"
          value={indicators.volume_avg}
          formatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
          colorFn={() => "var(--color-text-primary)"}
          badge={indicators.volume_trend === "high" ? "High" : indicators.volume_trend === "low" ? "Low" : "Normal"}
          index={4}
        />

        {/* MACD Signal */}
        <IndicatorItem
          label="Signal Line"
          value={indicators.macd?.signal_line}
          formatter={(v) => v.toFixed(2)}
          colorFn={(v) => (v > 0 ? "var(--color-accent-green)" : "var(--color-accent-red)")}
          index={5}
        />
      </div>
    </div>
  );
}

interface IndicatorItemProps {
  label: string;
  value?: number | null;
  formatter: (v: number) => string;
  colorFn: (v: number) => string;
  badge?: string;
  progress?: number;
  index: number;
}

function IndicatorItem({ label, value, formatter, colorFn, badge, progress, index }: IndicatorItemProps) {
  const displayValue = value !== undefined && value !== null ? formatter(value) : "—";
  const color = value !== undefined && value !== null ? colorFn(value) : "var(--color-text-muted)";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[var(--color-dark-bg)] rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--color-text-muted)] font-medium">{label}</span>
        {badge && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              badge === "Oversold" || badge === "Bullish" || badge === "High"
                ? "bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]"
                : badge === "Overbought" || badge === "Bearish" || badge === "Low"
                ? "bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)]"
                : "bg-[var(--color-accent-amber)]/10 text-[var(--color-accent-amber)]"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <span className="text-xl font-bold" style={{ color }}>
        {displayValue}
      </span>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 bg-[var(--color-dark-card)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress * 100, 100)}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
      )}
    </motion.div>
  );
}
