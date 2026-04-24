"use client";

import { motion } from "framer-motion";
import type { AiPrediction } from "@/types";

interface AIAnalysisCardProps {
  prediction: AiPrediction | null;
  loading?: boolean;
}

export default function AIAnalysisCard({ prediction, loading }: AIAnalysisCardProps) {
  if (loading) {
    return (
      <div className="glass-card p-5" id="ai-analysis-card">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
          🤖 AI Analysis
        </h3>
        <div className="space-y-3">
          <div className="h-8 shimmer rounded-lg" />
          <div className="h-4 shimmer rounded-lg w-3/4" />
          <div className="h-4 shimmer rounded-lg w-1/2" />
        </div>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="glass-card p-5" id="ai-analysis-card">
        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
          🤖 AI Analysis
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          AI prediction unavailable. The AI service may be offline.
        </p>
      </div>
    );
  }

  const isBullish = prediction.prediction === "bullish";

  return (
    <div className="glass-card p-5 gradient-border" id="ai-analysis-card">
      <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">
        🤖 AI Analysis
      </h3>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-4"
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`text-3xl font-bold ${
              isBullish ? "text-[var(--color-accent-green)]" : "text-[var(--color-accent-red)]"
            }`}
          >
            {isBullish ? "📈" : "📉"}
          </div>
          <div>
            <p
              className={`text-xl font-bold uppercase ${
                isBullish ? "text-[var(--color-accent-green)]" : "text-[var(--color-accent-red)]"
              }`}
            >
              {prediction.prediction}
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              ML Prediction
            </p>
          </div>
        </div>

        {/* Probability gauge */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-[var(--color-text-muted)] mb-1">
            <span>Probability</span>
            <span className="font-bold text-[var(--color-text-primary)]">
              {(prediction.probability * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-[var(--color-dark-bg)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${prediction.probability * 100}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className={`h-full rounded-full ${
                isBullish
                  ? "bg-gradient-to-r from-green-500 to-emerald-400"
                  : "bg-gradient-to-r from-red-500 to-rose-400"
              }`}
            />
          </div>
        </div>

        {/* Features used */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {prediction.features_used.map((feature) => (
            <span
              key={feature}
              className="text-[10px] px-2 py-1 rounded-md bg-[var(--color-dark-bg)] text-[var(--color-text-muted)] uppercase tracking-wider font-medium"
            >
              {feature}
            </span>
          ))}
        </div>
      </motion.div>

      <p className="text-[10px] text-[var(--color-text-muted)] mt-3 leading-relaxed">
        ⚠️ AI predictions are probabilistic and not financial advice. Use with caution.
      </p>
    </div>
  );
}
