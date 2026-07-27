import { NextRequest } from "next/server";
import { buildStockContext } from "@/lib/stock-context";
import { ollamaStream, ollamaModel, isOllamaReachable } from "@/lib/ollama";
import {
  sectionSystemPrompt,
  sectionUserPrompt,
  type InsightSection,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECTIONS: InsightSection[] = [
  "summary",
  "fundamental",
  "fairValue",
  "recommendation",
  "profile",
];

/**
 * GET /api/idx/ai-section?symbol=BBCA&section=summary
 * Streams ONE concise AI analysis section (plain text) from Ollama, built on
 * top of the complete stock dataset. One section per call so generation stays
 * short on slow (CPU) inference, and text streams token-by-token for UX.
 */
export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol") || "";
  const section = (request.nextUrl.searchParams.get("section") || "") as InsightSection;
  if (!symbol) {
    return new Response(JSON.stringify({ error: "Symbol required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!SECTIONS.includes(section)) {
    return new Response(
      JSON.stringify({ error: `Invalid section. Valid: ${SECTIONS.join(", ")}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const origin = request.nextUrl.origin;

  // Reachability check → clear error before streaming.
  if (!(await isOllamaReachable())) {
    return new Response(
      JSON.stringify({
        error: `Ollama tidak terjangkau di ${process.env.OLLAMA_BASE_URL || "http://localhost:11434"}. Pastikan Ollama berjalan dan model '${ollamaModel()}' sudah di-pull.`,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const ctx = await buildStockContext(symbol, origin);
  const messages = [
    { role: "system" as const, content: sectionSystemPrompt() },
    { role: "user" as const, content: sectionUserPrompt(ctx.promptText, section) },
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of ollamaStream(messages, {
          temperature: 0.4,
          timeoutMs: 300_000,
          numPredict: 256,
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
      "X-AI-Section": section,
    },
  });
}
