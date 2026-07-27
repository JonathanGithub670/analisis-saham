// ============================================================
// Prompt templates for Ollama (Bahasa Indonesia).
// Every section returns the AI's analysis layered ON TOP of the complete,
// accurate dataset (promptText) — the AI interprets, it does not invent.
// ============================================================

const DISCLAIMER = "Akhiri dengan catatan: ini bukan saran finansial, investor wajib riset mandiri.";

const ROLE_ANALYST =
  "Kamu analis saham IDX yang menulis Bahasa Indonesia jelas & objektif. " +
  "Hanya pakai data faktual yang diberikan; jangan mengarang angka, akui jika 'n/a'. " +
  "Tulis insight bernuansa (bukan sekadar mengulang angka), format Markdown ringkas (**tebal**, bullet).";

/**
 * System prompt for the unified insights JSON call (all 5 sections at once).
 */
export function insightsSystemPrompt(): string {
  return (
    ROLE_ANALYST +
    "\n\n" +
    "Tugasmu: menghasilkan analisis naratif untuk 5 bagian sebuah saham, " +
    "semuanya berdasarkan DATASET LENGKAP yang diberikan user. " +
    "WAJIB menjawab dalam format JSON valid dengan tepat 5 key string (Markdown): " +
    '"summary", "fundamental", "fairValue", "recommendation", "profile". ' +
    "Jangan tambahkan key lain, jangan bungkus dengan penjelasan di luar JSON.\n\n" +
    "Pedoman tiap bagian (masing-masing 120–200 kata):\n" +
    "- summary: snapshot pasar saat ini — posisi harga, momentum, sentimen teknikal jangka pendek.\n" +
    "- fundamental: kesehatan fundamental — profitabilitas (margin/ROE), pertumbuhan, struktur permodalan (debt/equity), valuasi (P/E, P/B).\n" +
    '- fairValue: interpretasi estimasi harga wajar vs harga saat ini — apakah undervalued/overvalued, dasar metodenya, pertimbangan risiko.\n' +
    "- recommendation: rekomendasi terintegrasi (gabungkan teknikal + fundamental + fair value) — sebut tingkat risiko & horizon. Konsisten dengan skor/sinyal teknikal yang diberikan.\n" +
    "- profile: gambaran perusahaan — model bisnis, posisi kompetitif di sektornya, tata kelola/direksi.\n\n" +
    DISCLAIMER
  );
}

export function insightsUserPrompt(promptText: string): string {
  return (
    "Berikut adalah dataset lengkap saham:\n\n" +
    promptText +
    "\n\nHasilkan analisis untuk kelima bagian sesuai pedoman. Jawab HANYA dengan JSON valid berisi key: summary, fundamental, fairValue, recommendation, profile."
  );
}

/**
 * System prompt for chat. When a stock context is present (per-stock chat),
 * it is appended as a system message by the caller.
 */
export function chatSystemPrompt(withStock: boolean): string {
  const base =
    "Kamu adalah asisten AI analisis saham StockPulse untuk saham Bursa Efek Indonesia (IDX). " +
    "Jawab dalam Bahasa Indonesia, jelas dan to the point. " +
    "Gunakan HANYA data faktual yang tersedia; jika tidak tahu, akui. " +
    "Untuk angka/format gunakan Markdown ringkas. " +
    DISCLAIMER;
  return withStock
    ? base +
        "\n\nPengguna sedang membahas saham tertentu. Gunakan DATASET LENGKAP yang disediakan untuk menjawab secara spesifik dan akurat."
    : base;
}

/** System prompt for the single Rekomendasi AI narrative (used by /api/idx/ai-analysis). */
export function recommendationSystemPrompt(): string {
  return (
    ROLE_ANALYST +
    "\n\n" +
    "Tugasmu: tulis SATU narasi rekomendasi terintegrasi (150–220 kata) untuk saham ini, " +
    "menggabungkan analisis TEKNIKAL (sinyal RSI/MACD/MA/volume/momentum), FUNDAMENTAL (margin/ROE/utang/valuasi), dan FAIR VALUE. " +
    "Sebut angka kunci sebagai dasar, berikan reading arah pasar, tingkat risiko, dan horizon waktu. " +
    "Konsistenkan kesimpulanmu dengan skor/sinyal teknikal pada data. Jawab langsung teks Markdown, bukan JSON.\n\n" +
    DISCLAIMER
  );
}

export function recommendationUserPrompt(promptText: string, score?: number, rec?: string): string {
  return (
    "Dataset lengkap saham:\n\n" +
    promptText +
    (score !== undefined ? `\n\n(Skor teknikal deterministik sistem: ${score}, rekomendasi sistem: ${rec || "n/a"} — gunakan sebagai rujukan, jangan bertentangan tanpa alasan.)` : "") +
    "\n\nTulis narasi rekomendasi terintegrasi sesuai pedoman."
  );
}

// ── Per-section streaming prompts ────────────────────────
// Used by /api/idx/ai-section (one concise section at a time, streamed).
// Kept short (60–90 kata) because local CPU inference is slow.

export type InsightSection =
  | "summary"
  | "fundamental"
  | "fairValue"
  | "recommendation"
  | "profile";

const SECTION_GUIDE: Record<InsightSection, string> = {
  summary:
    "RINGKASAN PASAR: posisi harga & momentum saat ini, sentimen teknikal jangka pendek. Sebut angka kunci (harga, % perubahan, posisi vs moving average).",
  fundamental:
    "ANALISIS FUNDAMENTAL: profitabilitas (margin, ROE), pertumbuhan (revenue/EPS), struktur permodalan (debt/equity, current ratio), dan valuasi (P/E, P/B).",
  fairValue:
    "INTERPRETASI HARGA WAJAR: bandingkan estimasi fair value (Graham/P-E/P-B/target analis) dengan harga saat ini — undervalued/overvalued, dasar metode, risiko.",
  recommendation:
    "REKOMENDASI TERINTEGRASI: gabungkan teknikal + fundamental + fair value. Berikan reading arah pasar, tingkat risiko, dan horizon waktu. Konsisten dengan sinyal/skor teknikal pada data.",
  profile:
    "PROFIL & POSISI PASAR: model bisnis, sektor/industri, posisi kompetitif, dan tata kelola/direksi.",
};

/**
 * CONSTANT system prompt across all sections. Keeping it identical lets Ollama
 * cache the prompt prefix (system + promptText) so sections 2–5 only re-eval
 * the tiny trailing task line — critical on slow CPU inference.
 */
export function sectionSystemPrompt(_section?: InsightSection): string {
  return ROLE_ANALYST;
}

export function sectionUserPrompt(promptText: string, section: InsightSection): string {
  // promptText comes FIRST (identical across sections → cacheable prefix);
  // the section-specific task is appended at the END (small re-eval only).
  return (
    promptText +
    "\n\n=== TUGAS ===\n" +
    `Tulis SATU bagian analisis: ${SECTION_GUIDE[section]} ` +
    "Sebut angka kunci sebagai dasar. 60–90 kata, Markdown ringkas, langsung teksnya tanpa pembuka/judul. " +
    DISCLAIMER
  );
}
