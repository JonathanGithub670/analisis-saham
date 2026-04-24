"use client";

import { motion } from "framer-motion";
import type { SignalResult } from "@/types";

interface SignalBadgeProps {
  signal: SignalResult;
}

export default function SignalBadge({ signal }: SignalBadgeProps) {
  const colorMap = {
    bullish: {
      bg: "rgba(16, 185, 129, 0.1)",
      border: "rgba(16, 185, 129, 0.3)",
      text: "var(--color-accent-green)",
      glow: "rgba(16, 185, 129, 0.2)",
      icon: "↑",
    },
    bearish: {
      bg: "rgba(239, 68, 68, 0.1)",
      border: "rgba(239, 68, 68, 0.3)",
      text: "var(--color-accent-red)",
      glow: "rgba(239, 68, 68, 0.2)",
      icon: "↓",
    },
    neutral: {
      bg: "rgba(245, 158, 11, 0.1)",
      border: "rgba(245, 158, 11, 0.3)",
      text: "var(--color-accent-amber)",
      glow: "rgba(245, 158, 11, 0.2)",
      icon: "→",
    },
  };

  const colors = colorMap[signal.signal] || colorMap.neutral;

  return (
    <div className="glass-card p-5" id="signal-badge">
      <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
        Trading Signal
      </h3>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-4 mb-5"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold"
          style={{
            backgroundColor: colors.bg,
            border: `2px solid ${colors.border}`,
            color: colors.text,
            boxShadow: `0 0 24px ${colors.glow}`,
          }}
        >
          {colors.icon}
        </div>
        <div>
          <p
            className="text-2xl font-bold uppercase tracking-wider"
            style={{ color: colors.text }}
          >
            {signal.signal}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            Confidence: {(signal.confidence * 100).toFixed(0)}%
          </p>
        </div>
      </motion.div>

      {/* Confidence bar */}
      <div className="mb-5">
        <div className="h-2 bg-[var(--color-dark-bg)] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${signal.confidence * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: colors.text }}
          />
        </div>
      </div>

      {/* Reasons */}
      <div className="space-y-2">
        {signal.reasons.map((reason, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-start gap-2 text-sm"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                reason.signal === "bullish"
                  ? "bg-[var(--color-accent-green)]"
                  : reason.signal === "bearish"
                  ? "bg-[var(--color-accent-red)]"
                  : "bg-[var(--color-accent-amber)]"
              }`}
            />
            <div>
              <span className="font-medium text-[var(--color-text-secondary)]">
                {reason.indicator}
              </span>
              <span className="text-[var(--color-text-muted)]"> — {reason.description}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
