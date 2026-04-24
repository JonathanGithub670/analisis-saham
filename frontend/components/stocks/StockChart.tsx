"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries } from "lightweight-charts";
import type { OhlcvData } from "@/types";

interface StockChartProps {
  data: OhlcvData[];
  ma20?: number;
  ma50?: number;
  symbol: string;
}

export default function StockChart({ data, symbol }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const [chartType, setChartType] = useState<"candlestick" | "line">("candlestick");

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: "rgba(31, 42, 64, 0.5)" },
        horzLines: { color: "rgba(31, 42, 64, 0.5)" },
      },
      width: container.clientWidth,
      height: 420,
      crosshair: {
        vertLine: { color: "rgba(6, 182, 212, 0.3)", width: 1, style: 2 },
        horzLine: { color: "rgba(6, 182, 212, 0.3)", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: "rgba(31, 42, 64, 0.8)",
      },
      timeScale: {
        borderColor: "rgba(31, 42, 64, 0.8)",
        timeVisible: true,
      },
    });

    chartRef.current = chart;

    // Format data for the chart
    const formattedData = data
      .map((item) => ({
        time: item.date.split(" ")[0] as string,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    const volumeData = data
      .map((item) => ({
        time: item.date.split(" ")[0] as string,
        value: item.volume,
        color: item.close >= item.open
          ? "rgba(16, 185, 129, 0.3)"
          : "rgba(239, 68, 68, 0.3)",
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    if (chartType === "candlestick") {
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#ef4444",
        borderUpColor: "#10b981",
        borderDownColor: "#ef4444",
        wickUpColor: "#10b981",
        wickDownColor: "#ef4444",
      });
      candlestickSeries.setData(formattedData as any);
    } else {
      const lineSeries = chart.addSeries(LineSeries, {
        color: "#06b6d4",
        lineWidth: 2,
      });
      lineSeries.setData(
        formattedData.map((d) => ({ time: d.time, value: d.close })) as any
      );
    }

    // Volume
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeries.setData(volumeData as any);

    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [data, chartType]);

  return (
    <div className="glass-card p-5" id="stock-chart-container">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
          {symbol} Price Chart
        </h2>
        <div className="flex gap-1 bg-[var(--color-dark-bg)] p-1 rounded-lg">
          <button
            onClick={() => setChartType("candlestick")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              chartType === "candlestick"
                ? "bg-[var(--color-dark-card)] text-[var(--color-accent-cyan)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            Candlestick
          </button>
          <button
            onClick={() => setChartType("line")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              chartType === "line"
                ? "bg-[var(--color-dark-card)] text-[var(--color-accent-cyan)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            Line
          </button>
        </div>
      </div>
      <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden" />
    </div>
  );
}
