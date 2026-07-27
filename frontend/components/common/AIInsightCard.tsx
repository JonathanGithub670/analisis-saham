"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Client cache of completed sections — revisiting a tab shows instantly
// without re-generating (Ollama on CPU is slow).
const sectionCache = new Map<string, string>();

type InsightSection =
  | "summary"
  | "fundamental"
  | "fairValue"
  | "recommendation"
  | "profile";

interface AIInsightCardProps {
  title?: string;
  /** When provided together with `section`, the card streams its own AI text. */
  symbol?: string;
  section?: InsightSection;
  /** Manual text (overrides the streaming mode). */
  text?: string;
  loading?: boolean;
  error?: string;
  model?: string;
  className?: string;
}

/**
 * Renders an AI-generated (Ollama) narrative on top of the deterministic data.
 *
 * Two modes:
 *  - Streaming (preferred): pass `symbol` + `section`. The card fetches
 *    /api/idx/ai-section and renders tokens as they arrive — best UX on slow
 *    local CPU inference. Shows skeleton, then streaming text with a caret.
 *  - Manual: pass `text`/`loading`/`error` directly.
 */
export default function AIInsightCard({
  title = "Analisis AI",
  symbol,
  section,
  text: manualText,
  loading: manualLoading,
  error: manualError,
  model: manualModel,
  className = "",
}: AIInsightCardProps) {
  const useStream = !!symbol && !!section && manualText === undefined;

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(useStream);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<string | undefined>(undefined);
  const [streaming, setStreaming] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!useStream) return;
    const cacheKey = `${symbol}:${section}`;
    const cached = sectionCache.get(cacheKey);
    if (cached) {
      // Already generated this session — show instantly, no refetch.
      setText(cached);
      setError(null);
      setLoading(false);
      setStreaming(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    startedRef.current = true;

    setText("");
    setError(null);
    setLoading(true);
    setStreaming(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/idx/ai-section?symbol=${encodeURIComponent(symbol as string)}&section=${section}`,
          { signal: controller.signal }
        );
        if (!res.ok || !res.body) {
          let m = `Permintaan gagal (HTTP ${res.status})`;
          try {
            const j = await res.json();
            if (j?.error) m = j.error;
          } catch {
            /* ignore */
          }
          throw new Error(m);
        }
        if (!cancelled) setLoading(false);

        const hdrModel = res.headers.get("X-AI-Model");
        if (hdrModel && !cancelled) setModel(hdrModel);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          if (cancelled) break;
          const snap = acc;
          setText(snap);
        }
        if (cancelled) return;
        // Detect server-side error marker
        const errIdx = acc.indexOf("[ERROR]");
        if (errIdx >= 0) {
          setError(
            acc.slice(errIdx + "[ERROR]".length).trim() ||
              "Gagal menghasilkan analisis."
          );
          setText("");
        } else if (!acc.trim()) {
          setError("Tidak ada respons dari AI.");
        } else {
          // Cache the completed section for instant re-display on tab revisit.
          sectionCache.set(cacheKey, acc);
        }
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        const msg = err instanceof Error ? err.message : "Gagal mengambil analisis AI.";
        setError(msg);
      } finally {
        if (!cancelled) {
          setStreaming(false);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, section]);

  // Manual mode passthrough
  const displayText = useStream ? text : manualText;
  const isLoading = useStream ? loading : manualLoading;
  const displayError = useStream ? error ?? undefined : manualError;
  const displayModel = useStream ? model : manualModel;

  if (isLoading) {
    return (
      <div
        className={`rounded-2xl border border-brand-200 bg-white p-5 dark:border-brand-500/30 dark:bg-white/[0.03] ${className}`}
      >
        <Header title={title} model={displayModel} />
        <div className="space-y-2 animate-pulse">
          <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-11/12 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-4/5 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (displayError) {
    return (
      <div
        className={`rounded-2xl border border-warning-200 bg-warning-50 p-5 dark:border-warning-500/30 dark:bg-warning-500/10 ${className}`}
      >
        <Header title={title} />
        <p className="text-xs text-warning-700 dark:text-warning-300 leading-relaxed">
          {displayError}
        </p>
      </div>
    );
  }

  if (!displayText || !displayText.trim()) return null;

  return (
    <div
      className={`rounded-2xl border border-brand-200 bg-gradient-to-br from-white to-brand-50/40 p-5 dark:border-brand-500/30 dark:from-white/[0.03] dark:to-brand-500/[0.06] ${className}`}
    >
      <Header title={title} model={displayModel} />
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-2">
        {renderMarkdown(displayText)}
        {useStream && streaming && (
          <span className="inline-block w-1.5 h-3.5 bg-brand-500 ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}

function Header({ title, model }: { title: string; model?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white text-[11px] flex-shrink-0">
        🤖
      </span>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</span>
      {model && (
        <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 font-mono">
          {model}
        </span>
      )}
    </div>
  );
}

// ── Lightweight Markdown renderer (no dependency) ──
function renderMarkdown(src: string): ReactNode[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let list: ReactNode[] = [];

  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="space-y-1 pl-1 my-1">
          {list}
        </ul>
      );
      list = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }
    if (/^#{1,3}\s+/.test(trimmed)) {
      flushList();
      const level = trimmed.match(/^#+/)![0].length;
      const content = trimmed.replace(/^#+\s+/, "");
      blocks.push(
        <p
          key={`h-${i}`}
          className={`font-bold text-gray-800 dark:text-white/90 ${level <= 2 ? "text-sm mt-2" : "text-[13px]"}`}
        >
          {inline(content)}
        </p>
      );
      return;
    }
    if (/^[-•*]\s+/.test(trimmed)) {
      list.push(
        <li key={`li-${i}`} className="flex gap-2">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
          <span>{inline(trimmed.replace(/^[-•*]\s+/, ""))}</span>
        </li>
      );
      return;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      list.push(
        <li key={`li-${i}`} className="flex gap-2">
          <span className="mt-0.5 text-brand-500 font-semibold flex-shrink-0">
            {trimmed.match(/^\d+/)![0]}.
          </span>
          <span>{inline(trimmed.replace(/^\d+\.\s+/, ""))}</span>
        </li>
      );
      return;
    }
    flushList();
    blocks.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {inline(trimmed)}
      </p>
    );
  });

  flushList();
  return blocks;
}

function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p))
      return (
        <strong key={i} className="font-semibold text-gray-800 dark:text-white/90">
          {p.slice(2, -2)}
        </strong>
      );
    if (/^\*[^*]+\*$/.test(p))
      return (
        <em key={i} className="italic">
          {p.slice(1, -1)}
        </em>
      );
    if (/^`[^`]+`$/.test(p))
      return (
        <code key={i} className="font-mono text-[12px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
          {p.slice(1, -1)}
        </code>
      );
    return <span key={i}>{p}</span>;
  });
}
