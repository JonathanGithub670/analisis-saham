// ============================================================
// Ollama client (SERVER-ONLY).
// Central client for the local LLM used across all analysis sections.
// Only import this from route handlers / server components — never from
// client components (they must go through fetch to an API route).
// ============================================================

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "qwen2.5:7b";

function baseUrl(): string {
  return (process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

export function ollamaModel(): string {
  return (process.env.OLLAMA_MODEL || DEFAULT_MODEL).trim();
}

// ── In-memory cache (TTL 10 min) ─────────────────────────
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { val: unknown; ts: number }>();

function cacheGet<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.val as T;
  if (hit) cache.delete(key);
  return undefined;
}

function cacheSet(key: string, val: unknown): void {
  cache.set(key, { val, ts: Date.now() });
}

/**
 * Check Ollama reachability (lightweight tags list). Used to surface a clear
 * error to the UI before attempting a long generation.
 */
export async function isOllamaReachable(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(`${baseUrl()}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Non-streaming chat completion → full reply text.
 * @param cacheKey when provided, result is cached & reused for that key.
 */
export async function ollamaComplete(
  messages: OllamaMessage[],
  opts: {
    json?: boolean;
    temperature?: number;
    timeoutMs?: number;
    numPredict?: number;
    cacheKey?: string;
  } = {}
): Promise<string> {
  if (opts.cacheKey) {
    const cached = cacheGet<string>(opts.cacheKey);
    if (cached !== undefined) return cached;
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 120_000);

  try {
    const res = await fetch(`${baseUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: ollamaModel(),
        messages,
        stream: false,
        ...(opts.json ? { format: "json" } : {}),
        ...(opts.temperature !== undefined || opts.numPredict !== undefined
          ? {
              options: {
                ...(opts.temperature !== undefined
                  ? { temperature: opts.temperature }
                  : {}),
                ...(opts.numPredict !== undefined
                  ? { num_predict: opts.numPredict }
                  : {}),
              },
            }
          : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Ollama HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}`
      );
    }

    const data = await res.json();
    const content: string = data?.message?.content ?? "";
    if (opts.cacheKey) cacheSet(opts.cacheKey, content);
    return content;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Streaming chat completion. Yields text deltas as they arrive.
 * Pass an external `signal` (e.g. request.signal) to abort generation when the
 * HTTP client disconnects — otherwise an abandoned request keeps Ollama busy.
 */
export async function* ollamaStream(
  messages: OllamaMessage[],
  opts: { temperature?: number; timeoutMs?: number; numPredict?: number; signal?: AbortSignal } = {}
): AsyncGenerator<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 120_000);

  // Chain an external abort signal (client disconnect) to the internal one.
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  const options: Record<string, number> = {};
  if (opts.temperature !== undefined) options.temperature = opts.temperature;
  if (opts.numPredict !== undefined) options.num_predict = opts.numPredict;

  try {
    const res = await fetch(`${baseUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: ollamaModel(),
        messages,
        stream: true,
        ...(Object.keys(options).length ? { options } : {}),
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Ollama HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}`
      );
    }

    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // Ollama streams NDJSON: one JSON object per line.
      const lines = buf.split("\n");
      buf = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const obj = JSON.parse(trimmed);
          if (obj.message?.content) yield obj.message.content as string;
          if (obj.done) return;
        } catch {
          // ignore partial / non-JSON line
        }
      }
    }
  } finally {
    clearTimeout(t);
  }
}

/**
 * Robust JSON extractor. Strips ```json fences and isolates the outermost
 * {...} or [...] block before parsing. Throws on unrecoverable parse error.
 */
export function extractJSON<T = unknown>(raw: string): T {
  let text = raw.trim();

  // Strip markdown code fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  // Find outermost object/array
  const start = text.search(/[{[]/);
  if (start === -1) throw new Error("No JSON object/array found in response");
  const openChar = text[start];
  const closeChar = openChar === "{" ? "}" : "]";
  const end = text.lastIndexOf(closeChar);
  if (end <= start) throw new Error("Malformed JSON in response");

  const slice = text.slice(start, end + 1);
  return JSON.parse(slice) as T;
}

/**
 * JSON chat completion → parsed object. Uses Ollama `format:"json"`, then
 * defensively re-extracts the JSON. Falls back to returning the raw string
 * under `__raw` if parsing fails (so callers never hard-crash).
 */
export async function ollamaJSON<T = Record<string, unknown>>(
  system: string,
  userPrompt: string,
  opts: { temperature?: number; timeoutMs?: number; numPredict?: number; cacheKey?: string } = {}
): Promise<T> {
  if (opts.cacheKey) {
    const cached = cacheGet<T>(opts.cacheKey);
    if (cached !== undefined) return cached;
  }

  const raw = await ollamaComplete(
    [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    { json: true, temperature: opts.temperature ?? 0.4, timeoutMs: opts.timeoutMs ?? 180_000, numPredict: opts.numPredict }
  );

  try {
    const parsed = extractJSON<T>(raw);
    if (opts.cacheKey) cacheSet(opts.cacheKey, parsed);
    return parsed;
  } catch {
    // Last resort: return raw text so the UI can show *something*.
    const fallback = { __raw: raw } as unknown as T;
    if (opts.cacheKey) cacheSet(opts.cacheKey, fallback);
    return fallback;
  }
}
