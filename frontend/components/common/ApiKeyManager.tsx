"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import type { UserApiKey } from "@/types";

// Display-only metadata for the auto-detected platform.
const PROVIDER_INFO: Record<string, { label: string; color: string }> = {
  claude: { label: "Claude", color: "#D97757" },
  chatgpt: { label: "OpenAI", color: "#74AA9C" },
  gemini: { label: "Gemini", color: "#4285F4" },
  deepseek: { label: "DeepSeek", color: "#4D6BFE" },
  groq: { label: "Groq", color: "#F55036" },
  glm: { label: "GLM (Zhipu)", color: "#3859FF" },
};

function providerLabel(provider: string): { label: string; color: string } {
  return PROVIDER_INFO[provider] ?? { label: provider || "Unknown", color: "#9CA3AF" };
}

interface ApiKeyManagerProps {
  onKeysChanged?: () => void;
}

export default function ApiKeyManager({ onKeysChanged }: ApiKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New key form
  const [keyInput, setKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Per-key verify state + diagnostic detail
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, string>>({});

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listApiKeys();
      setApiKeys(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const notifyChange = useCallback(() => {
    fetchKeys();
    onKeysChanged?.();
  }, [fetchKeys, onKeysChanged]);

  const setDetailFor = useCallback((keyId: string, detail: string | null) => {
    setDetails((prev) => {
      const next = { ...prev };
      if (detail) next[keyId] = detail;
      else delete next[keyId];
      return next;
    });
  }, []);

  // Save detects + verifies the platform in one shot. One key per platform —
  // pasting a key for an already-stored platform replaces that platform's key.
  const handleSave = async () => {
    if (!keyInput.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const model = modelInput.trim();
      const res = await api.saveApiKey({
        api_key: keyInput.trim(),
        model: model ? model : undefined,
      });
      if (res.data.id && res.data.verify_detail) {
        setDetailFor(res.data.id, res.data.verify_detail);
      }
      setKeyInput("");
      setModelInput("");
      notifyChange();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save API key");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (keyId: string) => {
    setVerifyingId(keyId);
    setSaveError(null);
    try {
      const res = await api.verifyApiKey(keyId);
      setDetailFor(keyId, res.detail ?? null);
      notifyChange();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (keyId: string) => {
    try {
      await api.deleteApiKey(keyId);
      setDetailFor(keyId, null);
      notifyChange();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to delete key");
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="px-3 py-2">
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
          <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="px-3 py-2">
          <p className="text-xs text-error-500 mb-2">{error}</p>
          <button
            onClick={fetchKeys}
            className="text-xs text-brand-500 hover:text-brand-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
      {/* Section title */}
      <div className="px-3 py-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
          AI API Keys
        </h3>
      </div>

      {/* Stored keys (one per platform) */}
      {apiKeys.length > 0 && (
        <div className="px-3 space-y-2 mb-3">
          {apiKeys.map((key) => {
            const info = providerLabel(key.provider);
            return (
              <div key={key.id}>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: info.color }}
                      title={info.label}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {info.label}
                    </span>
                    {key.model && (
                      <span
                        className="text-[10px] text-gray-400 dark:text-gray-500 truncate font-mono"
                        title="Model"
                      >
                        {key.model}
                      </span>
                    )}
                    {key.is_valid ? (
                      <span className="text-[10px] text-success-600 bg-success-50 px-1.5 py-0.5 rounded-full font-medium dark:bg-success-500/10 dark:text-success-400 flex-shrink-0">
                        Verified
                      </span>
                    ) : (
                      <span className="text-[10px] text-warning-600 bg-warning-50 px-1.5 py-0.5 rounded-full font-medium dark:bg-warning-500/10 dark:text-warning-400 flex-shrink-0">
                        Unverified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {!key.is_valid && (
                      <button
                        onClick={() => handleVerify(key.id)}
                        disabled={verifyingId === key.id}
                        className="text-xs text-brand-500 hover:text-brand-600 disabled:opacity-50 px-1.5 py-0.5"
                        title="Re-detect & verify this API key"
                      >
                        {verifyingId === key.id ? (
                          <span className="inline-block w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "Verify"
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(key.id)}
                      className="text-xs text-gray-400 hover:text-error-500 px-1 py-0.5"
                      title="Delete this API key"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
                {!key.is_valid && details[key.id] && (
                  <p className="mb-1 text-[11px] leading-snug text-warning-600 dark:text-warning-400 break-words">
                    {details[key.id]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add key form */}
      <div className="px-3 space-y-2">
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste an API key..."
            className="w-full text-sm rounded-lg border border-gray-200 bg-transparent px-2.5 py-1.5 pr-9 text-gray-800 dark:border-gray-700 dark:text-white/90 dark:bg-gray-800 dark:placeholder:text-white/30 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title={showKey ? "Hide key" : "Show key"}
          >
            {showKey ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11 4a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            )}
          </button>
        </div>

        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          Bisa simpan beberapa key (Claude, OpenAI, Gemini, GLM, dll). Chat otomatis memakai key yang valid.
        </p>

        <input
          type="text"
          value={modelInput}
          onChange={(e) => setModelInput(e.target.value)}
          placeholder="Model (opsional, mis. glm-5.2, gpt-4o)"
          className="w-full text-sm rounded-lg border border-gray-200 bg-transparent px-2.5 py-1.5 text-gray-800 dark:border-gray-700 dark:text-white/90 dark:bg-gray-800 dark:placeholder:text-white/30 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
        />

        {saveError && (
          <p className="text-xs text-error-500">{saveError}</p>
        )}

        <button
          onClick={handleSave}
          disabled={!keyInput.trim() || saving}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Detecting...
            </>
          ) : (
            "Add Key"
          )}
        </button>
      </div>
    </div>
  );
}
