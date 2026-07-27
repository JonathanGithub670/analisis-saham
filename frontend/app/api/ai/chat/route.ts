import { NextRequest } from "next/server";
import { ollamaStream, ollamaModel, isOllamaReachable, type OllamaMessage } from "@/lib/ollama";
import { buildStockContext } from "@/lib/stock-context";
import { chatSystemPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IncomingMessage {
  role?: string;
  content?: string;
}

/**
 * POST /api/ai/chat
 * Body: { message: string, history?: {role, content}[], symbol?: string }
 *
 * Streams the Ollama reply as plain text chunks. When `symbol` is provided,
 * the complete stock dataset is injected into the system prompt so the AI can
 * answer with full, accurate context (per-stock chat).
 */
export async function POST(request: NextRequest) {
  let body: {
    message?: string;
    history?: IncomingMessage[];
    symbol?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const message = (body.message || "").trim();
  if (!message) {
    return new Response(JSON.stringify({ error: "Missing 'message'" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Reachability check → clear error before streaming.
  if (!(await isOllamaReachable())) {
    return new Response(
      JSON.stringify({
        error: `Ollama tidak terjangkau di ${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}. Pastikan Ollama berjalan dan model '${ollamaModel()}' sudah di-pull.`,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  // Build messages: system + history + new user message
  const messages: OllamaMessage[] = [];
  const hasSymbol = !!body.symbol;

  let systemText = chatSystemPrompt(hasSymbol);

  // If a stock symbol is given, enrich the system prompt with the full dataset.
  if (hasSymbol) {
    try {
      const ctx = await buildStockContext(body.symbol as string, request.nextUrl.origin);
      systemText += "\n\n=== DATASET LENGKAP SAHAM ===\n" + ctx.promptText;
    } catch {
      // Non-fatal: continue without stock context.
    }
  }

  messages.push({ role: "system", content: systemText });

  for (const h of body.history || []) {
    const role = h.role === "assistant" ? "assistant" : h.role === "system" ? "system" : "user";
    const content = (h.content || "").trim();
    if (content) messages.push({ role, content });
  }

  messages.push({ role: "user", content: message });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of ollamaStream(messages, {
          temperature: 0.5,
          numPredict: 768,
          signal: request.signal,
        })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gagal menghubungi Ollama.";
        controller.enqueue(encoder.encode(`\n\n[ERROR] ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-AI-Model": ollamaModel(),
    },
  });
}
