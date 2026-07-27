"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function ChatAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setInput("");
    setError(null);

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    // Build history from previous messages (exclude the just-added one)
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);

    setSending(true);
    const aiId = generateId();
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      if (!res.ok || !res.body) {
        let errMsg = `API error: ${res.status}`;
        try {
          const j = await res.json();
          if (j?.error) errMsg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(errMsg);
      }

      // Stream the assistant reply token-by-token
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let added = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snap = acc;
        if (!added) {
          added = true;
          setMessages((prev) => [
            ...prev,
            { id: aiId, role: "assistant", content: snap, timestamp: Date.now() },
          ]);
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === aiId ? { ...m, content: snap } : m))
          );
        }
      }
      if (!added) {
        setMessages((prev) => [
          ...prev,
          { id: aiId, role: "assistant", content: "(tidak ada respons dari AI)", timestamp: Date.now() },
        ]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send message";
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Chat AI</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Asisten analisis saham · powered by Ollama (lokal)
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Mulai Percakapan
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              Ketik pesanmu untuk memulai analisis atau diskusi tentang saham. AI dijalankan secara lokal melalui Ollama — gratis & privat.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full flex-shrink-0 mr-2 mt-0.5 flex items-center justify-center text-white text-[10px] font-bold bg-gradient-to-br from-brand-400 to-brand-600">
                AI
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand-500 text-white rounded-br-md"
                  : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-md"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <span className="block mt-1 text-[10px] opacity-50 text-right">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-brand-500 flex-shrink-0 ml-2 mt-0.5 flex items-center justify-center text-white text-[10px] font-bold">
                U
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full flex-shrink-0 mr-2 mt-0.5 flex items-center justify-center text-white text-[10px] font-bold bg-gradient-to-br from-brand-400 to-brand-600">
              AI
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/30 rounded-lg px-4 py-2 text-sm text-error-600 dark:text-error-400 max-w-md text-center">
              {error}
              {error.includes("Ollama") && (
                <span className="block mt-1 text-xs opacity-75">
                  Pastikan Ollama berjalan di {`http://localhost:11434`} dan model sudah di-pull (mis. <code>ollama pull qwen2.5:7b</code>).
                </span>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanya tentang analisis saham..."
            rows={2}
            disabled={sending}
            className="w-full resize-none rounded-2xl border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 px-4 py-3 pr-12 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/30 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 disabled:opacity-50"
          />
          <span className="absolute right-3 bottom-3 text-[10px] text-gray-400">
            Enter ↵
          </span>
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex-shrink-0 w-11 h-11 rounded-full bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white flex items-center justify-center transition-colors disabled:cursor-not-allowed"
          title={activeProvider ? `via ${activeProvider}` : "Kirim pesan"}
        >
          {sending ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
