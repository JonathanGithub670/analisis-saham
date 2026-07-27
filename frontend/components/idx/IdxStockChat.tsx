"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { IdxStockQuote } from "@/services/idxApi";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  timestamp: Date;
  typing?: boolean;
}

interface Props {
  quote: IdxStockQuote;
}

const QUICK_REPLIES = [
  "Harga sekarang?",
  "Layak dibeli?",
  "P/E ratio?",
  "Dividen berapa?",
  "Bagaimana fundamentalnya?",
  "Profil perusahaan",
];

function fmtRp(v: number | null | undefined): string {
  if (v === null || v === undefined || !isFinite(v)) return "-";
  return `Rp ${v.toLocaleString("id-ID")}`;
}

// Render message text with basic markdown (**bold**) support
function renderMessageText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function IdxStockChat({ quote }: Props) {
  const code = quote.symbol.replace(".JK", "");
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: "welcome",
      role: "bot",
      text: `👋 Halo! Saya asisten AI untuk **${code}** (${quote.name}).\n\nSaya punya akses ke data lengkap saham ini (harga, fundamental, indikator teknikal, estimasi harga wajar). Tanyakan apa saja — jawaban saya berbasis data nyata. Harga saat ini: **${fmtRp(quote.price)}** (${quote.change >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%)`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  const sendMessage = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || sendingRef.current) return;
      sendingRef.current = true;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        text: t,
        timestamp: new Date(),
      };
      // Build history from current messages (before adding the new user msg)
      const history = messages
        .filter((m) => m.text && !m.text.startsWith("⚠️"))
        .map((m) => ({ role: m.role, content: m.text }));

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      const botId = `b-${Date.now()}`;
      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: t,
            history,
            symbol: quote.symbol,
          }),
        });

        if (!res.ok || !res.body) {
          let errMsg = `Permintaan gagal (HTTP ${res.status})`;
          try {
            const j = await res.json();
            if (j?.error) errMsg = j.error;
          } catch {
            /* ignore */
          }
          throw new Error(errMsg);
        }

        setIsTyping(false);
        // Insert empty bot message (typing) then stream tokens into it
        setMessages((prev) => [
          ...prev,
          { id: botId, role: "bot", text: "", timestamp: new Date(), typing: true },
        ]);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          const snapshot = acc;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botId ? { ...m, text: snapshot, typing: true } : m
            )
          );
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botId
              ? { ...m, text: acc || "(tidak ada respons dari AI)", typing: false }
              : m
          )
        );
      } catch (err) {
        setIsTyping(false);
        const msg = err instanceof Error ? err.message : "Gagal menghubungi AI";
        setMessages((prev) => [
          ...prev,
          {
            id: botId,
            role: "bot",
            text: `⚠️ ${msg}`,
            timestamp: new Date(),
            typing: false,
          },
        ]);
      } finally {
        sendingRef.current = false;
      }
    },
    [messages, quote.symbol]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const showQuickReplies = messages.length <= 1;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] flex flex-col h-[calc(100vh-250px)] min-h-[500px]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-md">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
              />
            </svg>
          </div>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-success-500 border-2 border-white dark:border-gray-900 rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white/90 truncate">
            AI Asisten {code}
          </h3>
          <p className="text-[11px] text-success-500 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-500" />
            </span>
            Online · powered by Ollama
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs font-bold text-gray-800 dark:text-white/90">
            {fmtRp(quote.price)}
          </p>
          <p
            className={`text-[10px] font-semibold ${
              quote.change >= 0 ? "text-success-500" : "text-error-500"
            }`}
          >
            {quote.change >= 0 ? "+" : ""}
            {quote.changePercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "bot" && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0 mt-auto">
                <svg
                  className="w-3.5 h-3.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                  />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[80%] flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line leading-relaxed ${
                  msg.role === "user"
                    ? "bg-brand-500 text-white rounded-br-md"
                    : msg.text.startsWith("⚠️")
                    ? "bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-300 border border-warning-200 dark:border-warning-500/30 rounded-bl-md"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100 rounded-bl-md"
                }`}
              >
                {renderMessageText(msg.text)}
                {msg.typing && (
                  <span className="inline-block w-1.5 h-3.5 bg-current ml-0.5 animate-pulse align-middle" />
                )}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-2">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center flex-shrink-0">
              <svg
                className="w-3.5 h-3.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                />
              </svg>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1 items-center">
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Replies (hanya tampil di awal) */}
      {showQuickReplies && (
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 uppercase font-semibold mb-2 tracking-wide">
            Pertanyaan Cepat
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="px-3 py-1.5 text-xs bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 rounded-full hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Tanya tentang ${code}...`}
          disabled={isTyping}
          className="flex-1 h-10 rounded-full bg-gray-100 dark:bg-gray-800 px-4 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-600 transition-colors flex-shrink-0"
          aria-label="Kirim"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
