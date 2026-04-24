"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries } from "lightweight-charts";
import type { IdxHistoryItem } from "@/services/idxApi";

interface Props {
  data: IdxHistoryItem[];
  symbol: string;
  chartType: "candlestick" | "line";
  currency?: string;
}

export default function IdxStockChart({ data, symbol, chartType, currency = "IDR" }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const isDark = document.documentElement.classList.contains("dark");
    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isDark ? "#94a3b8" : "#667085",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: isDark ? "rgba(31, 42, 64, 0.5)" : "rgba(228, 231, 236, 0.8)" },
        horzLines: { color: isDark ? "rgba(31, 42, 64, 0.5)" : "rgba(228, 231, 236, 0.8)" },
      },
      width: container.clientWidth,
      height: 420,
      crosshair: {
        vertLine: { color: "rgba(70, 95, 255, 0.3)", width: 1, style: 2 },
        horzLine: { color: "rgba(70, 95, 255, 0.3)", width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: isDark ? "rgba(31, 42, 64, 0.8)" : "rgba(228, 231, 236, 1)",
      },
      timeScale: {
        borderColor: isDark ? "rgba(31, 42, 64, 0.8)" : "rgba(228, 231, 236, 1)",
        timeVisible: true,
      },
      localization: {
        priceFormatter: (price: number) => {
          if (currency === "IDR") {
            return `Rp ${price.toLocaleString("id-ID")}`;
          }
          return `$${price.toFixed(2)}`;
        },
      },
    });

    chartRef.current = chart;

    const formattedData = data
      .map((item) => ({
        time: item.date as string,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    const volumeData = data
      .map((item) => ({
        time: item.date as string,
        value: item.volume,
        color: item.close >= item.open
          ? "rgba(18, 183, 106, 0.3)"
          : "rgba(240, 68, 56, 0.3)",
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    if (chartType === "candlestick") {
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#12b76a",
        downColor: "#f04438",
        borderUpColor: "#12b76a",
        borderDownColor: "#f04438",
        wickUpColor: "#12b76a",
        wickDownColor: "#f04438",
      });
      candlestickSeries.setData(formattedData as never[]);
    } else {
      const lineSeries = chart.addSeries(LineSeries, {
        color: "#465fff",
        lineWidth: 2,
      });
      lineSeries.setData(
        formattedData.map((d) => ({ time: d.time, value: d.close })) as never[]
      );
    }

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    volumeSeries.setData(volumeData as never[]);

    chart.timeScale().fitContent();

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
  }, [data, chartType, currency]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {symbol.replace(".JK", "")} Price Chart
        </h2>
      </div>
      <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden" />
    </div>
  );
}
