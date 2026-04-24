"use client";

import { useState, useCallback } from "react";
import { api } from "@/services/api";
import type { StockQuote, OhlcvData, IndicatorResult, SignalResult, AiPrediction, SentimentResult } from "@/types";

export function useStock(symbol: string) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [history, setHistory] = useState<OhlcvData[]>([]);
  const [indicators, setIndicators] = useState<IndicatorResult | null>(null);
  const [signal, setSignal] = useState<SignalResult | null>(null);
  const [aiPrediction, setAiPrediction] = useState<AiPrediction | null>(null);
  const [sentiment, setSentiment] = useState<SentimentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (interval: string = "1d") => {
    setLoading(true);
    setError(null);

    try {
      const [quoteData, historyData, indicatorData, signalData] = await Promise.all([
        api.getStock(symbol),
        api.getHistory(symbol, interval),
        api.getIndicators(symbol),
        api.getSignal(symbol),
      ]);

      setQuote(quoteData);
      setHistory(historyData);
      setIndicators(indicatorData);
      setSignal(signalData);

      // Fetch AI and sentiment in background (non-blocking)
      api.getAiPrediction(symbol).then(setAiPrediction).catch(() => {});
      api.getSentiment(symbol).then(setSentiment).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  return {
    quote,
    history,
    indicators,
    signal,
    aiPrediction,
    sentiment,
    loading,
    error,
    fetchAll,
  };
}
