use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{
    engine::general_purpose::{STANDARD as BASE64, URL_SAFE_NO_PAD as B64URL},
    Engine,
};
use hmac::{Hmac, Mac};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use crate::config::Config;
use crate::error::{AppError, AppResult};
use crate::models::{UserApiKey, UserApiKeyResponse};

type HmacSha256 = Hmac<Sha256>;

// ── Encryption Helpers ──────────────────────────────────

/// Derive a 32-byte AES key from a secret string via SHA-256
pub fn derive_encryption_key(secret: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(secret.as_bytes());
    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

/// Encrypt an API key using AES-256-GCM. Returns base64(nonce || ciphertext).
pub fn encrypt_api_key(plaintext: &str, key: &[u8; 32]) -> AppResult<String> {
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| AppError::Internal(format!("Cipher init failed: {}", e)))?;
    let nonce_bytes: [u8; 12] = rand::thread_rng().gen();
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| AppError::Internal(format!("Encryption failed: {}", e)))?;
    let mut combined = nonce_bytes.to_vec();
    combined.extend(ciphertext);
    Ok(BASE64.encode(&combined))
}

/// Decrypt an API key. Input is base64(nonce || ciphertext).
pub fn decrypt_api_key(encrypted: &str, key: &[u8; 32]) -> AppResult<String> {
    let combined = BASE64
        .decode(encrypted)
        .map_err(|_| AppError::Internal("Invalid base64 encoding".to_string()))?;
    if combined.len() < 12 {
        return Err(AppError::Internal("Invalid encrypted data".to_string()));
    }
    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| AppError::Internal(format!("Cipher init failed: {}", e)))?;
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| AppError::Internal("Decryption failed — wrong key or corrupted data".to_string()))?;
    String::from_utf8(plaintext)
        .map_err(|_| AppError::Internal("Invalid UTF-8 in decrypted data".to_string()))
}

// ── Provider Verification ──────────────────────────────

/// Result of probing a key against a provider: validity + a human-readable
/// reason (HTTP status / error message) so the UI can explain *why* a key is
/// unverified instead of failing silently.
pub struct VerifyOutcome {
    pub is_valid: bool,
    pub detail: String,
}

/// Turn an HTTP response into a VerifyOutcome, extracting the provider's error
/// message from the JSON body when present (OpenAI-style `error.message`,
/// Anthropic-style, or a raw string fallback).
async fn outcome_from(resp: reqwest::Response, label: &str) -> VerifyOutcome {
    let status = resp.status();
    if status.is_success() {
        return VerifyOutcome {
            is_valid: true,
            detail: format!("{}: OK", label),
        };
    }
    let code = status.as_u16();
    let body = resp.text().await.unwrap_or_default();
    let msg = serde_json::from_str::<JsonValue>(&body)
        .ok()
        .and_then(|v| {
            v.get("error")
                .and_then(|e| e.get("message"))
                .and_then(|m| m.as_str())
                .map(String::from)
                .or_else(|| v.get("message").and_then(|m| m.as_str()).map(String::from))
        })
        .unwrap_or_else(|| body.chars().take(160).collect());
    VerifyOutcome {
        is_valid: false,
        detail: if msg.trim().is_empty() {
            format!("{}: HTTP {}", label, code)
        } else {
            format!("{}: HTTP {} — {}", label, code, msg.trim())
        },
    }
}

/// Probe a key against a provider. For OpenAI-compatible providers we use a
/// 1-token chat completion (not GET /models), because project-scoped keys often
/// get 403 on /models even though they work for chat.
pub async fn verify_api_key(
    http_client: &reqwest::Client,
    provider: &str,
    api_key: &str,
) -> AppResult<VerifyOutcome> {
    let outcome = match provider {
        "claude" => verify_models_get(
            http_client,
            "https://api.anthropic.com/v1/models",
            &[("x-api-key", api_key), ("anthropic-version", "2023-06-01")],
            "Claude",
        )
        .await,
        "chatgpt" => verify_openai_compat_chat(
            http_client,
            api_key,
            "https://api.openai.com/v1/chat/completions",
            "gpt-4o-mini",
            "OpenAI",
        )
        .await,
        "gemini" => match http_client
            .get(format!(
                "https://generativelanguage.googleapis.com/v1beta/models?key={}",
                api_key
            ))
            .send()
            .await
        {
            Ok(resp) => outcome_from(resp, "Gemini").await,
            Err(e) => VerifyOutcome {
                is_valid: false,
                detail: format!("Gemini: network error — {}", e),
            },
        },
        "deepseek" => verify_openai_compat_chat(
            http_client,
            api_key,
            "https://api.deepseek.com/v1/chat/completions",
            "deepseek-chat",
            "DeepSeek",
        )
        .await,
        "groq" => {
            let bearer = format!("Bearer {}", api_key);
            verify_models_get(
                http_client,
                "https://api.groq.com/openai/v1/models",
                &[("Authorization", bearer.as_str())],
                "Groq",
            )
            .await
        }
        "glm" => match zhipu_token(api_key) {
            Ok(token) => {
                verify_openai_compat_chat(
                    http_client,
                    &token,
                    "https://open.bigmodel.cn/api/paas/v4/chat/completions",
                    "glm-4-flash",
                    "GLM",
                )
                .await
            }
            Err(e) => VerifyOutcome {
                is_valid: false,
                detail: format!("GLM: {}", e),
            },
        },
        _ => {
            return Err(AppError::BadRequest(format!(
                "Unknown provider: {}. Valid: claude, gemini, deepseek, groq, chatgpt, glm",
                provider
            )))
        }
    };
    Ok(outcome)
}

/// GET /models probe for providers where listing models is reliable (Anthropic, Groq).
async fn verify_models_get(
    client: &reqwest::Client,
    url: &str,
    headers: &[(&str, &str)],
    label: &str,
) -> VerifyOutcome {
    let mut req = client.get(url);
    for (k, v) in headers {
        req = req.header(*k, *v);
    }
    match req.send().await {
        Ok(resp) => outcome_from(resp, label).await,
        Err(e) => VerifyOutcome {
            is_valid: false,
            detail: format!("{}: network error — {}", label, e),
        },
    }
}

/// Minimal 1-token chat-completion probe for OpenAI-compatible providers.
async fn verify_openai_compat_chat(
    client: &reqwest::Client,
    key: &str,
    endpoint: &str,
    model: &str,
    label: &str,
) -> VerifyOutcome {
    let resp = client
        .post(endpoint)
        .header("Authorization", format!("Bearer {}", key))
        .json(&serde_json::json!({
            "model": model,
            "messages": [{ "role": "user", "content": "ping" }],
            "max_tokens": 1,
        }))
        .send()
        .await;
    match resp {
        Ok(r) => outcome_from(r, label).await,
        Err(e) => VerifyOutcome {
            is_valid: false,
            detail: format!("{}: network error — {}", label, e),
        },
    }
}

// ── Auto-detection ─────────────────────────────────────

/// Pick candidate providers from the API key shape, in priority order.
/// `sk-...` is ambiguous between OpenAI and DeepSeek, so both are tried.
/// Zhipu/GLM keys use the `id.secret` format (contain a dot).
fn candidate_providers(api_key: &str) -> Vec<&'static str> {
    let trimmed = api_key.trim();
    if trimmed.starts_with("sk-ant-") {
        vec!["claude"]
    } else if trimmed.starts_with("AIza") {
        vec!["gemini"]
    } else if trimmed.starts_with("gsk_") {
        vec!["groq"]
    } else if trimmed.split_once('.').is_some() {
        // Zhipu/GLM keys are `<id>.<secret>`.
        vec!["glm"]
    } else {
        // `sk-`, `sk-proj-`, or anything else → try OpenAI-compatible family,
        // then GLM as a last resort (catches dot-less Zhipu keys too).
        vec!["chatgpt", "deepseek", "glm"]
    }
}

/// Auto-detect which AI platform an API key belongs to.
///
/// Builds candidate providers from the key prefix, then probes each against its
/// real API. Returns the first candidate that verifies. If none verify, returns
/// the best-guess (prefix-based) candidate with `is_valid = false` plus the last
/// provider's failure detail, so the UI can show *why* it didn't verify.
pub async fn detect_provider(
    http_client: &reqwest::Client,
    api_key: &str,
) -> AppResult<(String, bool, String)> {
    let candidates = candidate_providers(api_key);
    let mut last_detail = String::from("not verified");
    for provider in &candidates {
        let outcome = verify_api_key(http_client, provider, api_key)
            .await
            .unwrap_or(VerifyOutcome {
                is_valid: false,
                detail: format!("{}: network error", provider),
            });
        if outcome.is_valid {
            return Ok((provider.to_string(), true, outcome.detail));
        }
        last_detail = outcome.detail;
    }
    Ok((candidates[0].to_string(), false, last_detail))
}

// ── CRUD Operations ────────────────────────────────────

/// Save (upsert) a user's API key for the auto-detected platform. `model` is an
/// optional override used at chat time (e.g. "glm-5.2"); None → provider default.
pub async fn save_api_key(
    db: &PgPool,
    http_client: &reqwest::Client,
    encryption_key: &[u8; 32],
    user_id: Uuid,
    raw_key: &str,
    model: Option<&str>,
) -> AppResult<UserApiKeyResponse> {
    let (provider, is_valid, detail) = detect_provider(http_client, raw_key).await?;
    let encrypted = encrypt_api_key(raw_key, encryption_key)?;
    let verified_at = if is_valid { Some(chrono::Utc::now()) } else { None };
    let model_value = model.map(|m| m.trim()).filter(|m| !m.is_empty());

    let key = sqlx::query_as::<_, UserApiKey>(
        r#"
        INSERT INTO user_api_keys (user_id, provider, api_key, model, is_valid, verified_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, provider)
        DO UPDATE SET api_key = $3, model = $4, is_valid = $5, verified_at = $6, updated_at = NOW()
        RETURNING id, user_id, provider, api_key, model, is_valid, verified_at, created_at, updated_at
        "#,
    )
    .bind(user_id)
    .bind(&provider)
    .bind(&encrypted)
    .bind(model_value)
    .bind(is_valid)
    .bind(verified_at)
    .fetch_one(db)
    .await?;

    let mut resp = UserApiKeyResponse::from(key);
    resp.verify_detail = Some(detail);
    Ok(resp)
}

/// List all API keys for a user (metadata only — never exposes raw key)
pub async fn list_api_keys(db: &PgPool, user_id: Uuid) -> AppResult<Vec<UserApiKeyResponse>> {
    let keys = sqlx::query_as::<_, UserApiKey>(
        r#"
        SELECT id, user_id, provider, api_key, model, is_valid, verified_at, created_at, updated_at
        FROM user_api_keys
        WHERE user_id = $1
        ORDER BY created_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(db)
    .await?;

    Ok(keys.into_iter().map(UserApiKeyResponse::from).collect())
}

/// Check if a user has any valid API key (for Pro badge)
pub async fn has_valid_key(db: &PgPool, user_id: Uuid) -> AppResult<bool> {
    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM user_api_keys WHERE user_id = $1 AND is_valid = TRUE",
    )
    .bind(user_id)
    .fetch_one(db)
    .await?;

    Ok(count > 0)
}

/// Re-detect & verify one specific stored key (by id), updating its platform + status.
pub async fn verify_and_update_key(
    db: &PgPool,
    http_client: &reqwest::Client,
    encryption_key: &[u8; 32],
    user_id: Uuid,
    key_id: Uuid,
) -> AppResult<serde_json::Value> {
    let stored = sqlx::query_as::<_, UserApiKey>(
        r#"
        SELECT id, user_id, provider, api_key, model, is_valid, verified_at, created_at, updated_at
        FROM user_api_keys
        WHERE id = $1 AND user_id = $2
        "#,
    )
    .bind(key_id)
    .bind(user_id)
    .fetch_optional(db)
    .await?
    .ok_or_else(|| AppError::NotFound("API key not found".to_string()))?;

    let raw_key = decrypt_api_key(&stored.api_key, encryption_key)?;
    let (provider, is_valid, detail) = detect_provider(http_client, &raw_key).await?;
    let now = if is_valid { Some(chrono::Utc::now()) } else { None };

    sqlx::query(
        r#"
        UPDATE user_api_keys
        SET provider = $1, is_valid = $2, verified_at = $3, updated_at = NOW()
        WHERE id = $4
        "#,
    )
    .bind(&provider)
    .bind(is_valid)
    .bind(now)
    .bind(stored.id)
    .execute(db)
    .await?;

    Ok(serde_json::json!({
        "id": stored.id,
        "provider": provider,
        "is_valid": is_valid,
        "verified_at": now,
        "detail": detail,
    }))
}

/// Delete an API key
pub async fn delete_api_key(db: &PgPool, user_id: Uuid, key_id: Uuid) -> AppResult<()> {
    let result = sqlx::query("DELETE FROM user_api_keys WHERE id = $1 AND user_id = $2")
        .bind(key_id)
        .bind(user_id)
        .execute(db)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("API key not found".to_string()));
    }
    Ok(())
}

// ── AI Chat Completion ──────────────────────────────────

use serde_json::Value as JsonValue;

/// System prompt steering the AI toward stock-analysis assistance.
const STOCK_SYSTEM_PROMPT: &str = "You are a stock-analysis assistant for the StockPulse app. \
Help the user analyze stocks, interpret technical indicators (RSI, MACD, moving averages, volume), \
and explain market sentiment concisely. Answer in the user's language. \
Always clarify that your responses are not financial advice.";

/// Chat message format (OpenAI-compatible)
#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,  // "user" | "assistant" | "system"
    pub content: String,
}

/// Send a chat completion using the server-configured AI (AI_PROVIDER / AI_API_KEY
/// / AI_MODEL from the environment). Returns the AI's reply text.
pub async fn chat_completion_config(
    config: &Config,
    http_client: &reqwest::Client,
    messages: &[ChatMessage],
) -> AppResult<String> {
    let api_key = config.ai_api_key.trim();
    let provider = config.ai_provider.trim();
    if api_key.is_empty() {
        return Err(AppError::Internal(
            "AI is not configured. Set AI_PROVIDER, AI_API_KEY and AI_MODEL in the backend .env."
                .to_string(),
        ));
    }
    let model = {
        let m = config.ai_model.trim();
        if m.is_empty() {
            default_model(provider)
        } else {
            m
        }
    };

    match provider {
        "claude" => chat_claude(http_client, api_key, messages, model).await,
        "chatgpt" => chat_openai(http_client, api_key, messages, model).await,
        "gemini" => chat_gemini(http_client, api_key, messages, model).await,
        "deepseek" => chat_deepseek(http_client, api_key, messages, model).await,
        "groq" => chat_groq(http_client, api_key, messages, model).await,
        "glm" => chat_glm(http_client, api_key, messages, model).await,
        other => Err(AppError::Internal(format!(
            "Unknown AI_PROVIDER '{}'. Valid: claude, chatgpt, gemini, deepseek, groq, glm.",
            other
        ))),
    }
}

// ── Provider-specific chat implementations ─────────────

/// Default model per provider, used when the user didn't set one.
fn default_model(provider: &str) -> &'static str {
    match provider {
        "claude" => "claude-fable-5",
        "chatgpt" => "gpt-4o-mini",
        "gemini" => "gemini-2.0-flash",
        "deepseek" => "deepseek-chat",
        "groq" => "llama-3.3-70b-versatile",
        "glm" => "glm-4-flash",
        _ => "gpt-4o-mini",
    }
}

/// Claude: Anthropic Messages API
async fn chat_claude(
    client: &reqwest::Client,
    key: &str,
    messages: &[ChatMessage],
    model: &str,
) -> AppResult<String> {
    let anthropic_messages: Vec<JsonValue> = messages
        .iter()
        .map(|m| serde_json::json!({ "role": m.role, "content": m.content }))
        .collect();

    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", key)
        .header("anthropic-version", "2023-06-01")
        .json(&serde_json::json!({
            "model": model,
            "max_tokens": 1024,
            "system": STOCK_SYSTEM_PROMPT,
            "messages": anthropic_messages,
        }))
        .send()
        .await?;

    let body: JsonValue = resp.json().await.map_err(|e| {
        AppError::ExternalApi(format!("Failed to parse Claude response: {}", e))
    })?;

    body["content"]
        .as_array()
        .and_then(|blocks| blocks.first())
        .and_then(|b| b["text"].as_str())
        .map(String::from)
        .ok_or_else(|| {
            let err = body["error"]["message"]
                .as_str()
                .unwrap_or("Unknown Claude error");
            AppError::ExternalApi(format!("Claude API error: {}", err))
        })
}

/// ChatGPT / OpenAI Chat Completions
async fn chat_openai(
    client: &reqwest::Client,
    key: &str,
    messages: &[ChatMessage],
    model: &str,
) -> AppResult<String> {
    chat_openai_compat(client, key, messages, "https://api.openai.com/v1/chat/completions", model).await
}

/// Gemini: Google Generative Language API
async fn chat_gemini(
    client: &reqwest::Client,
    key: &str,
    messages: &[ChatMessage],
    model: &str,
) -> AppResult<String> {
    // Convert messages to Gemini format (system + history + current)
    let contents: Vec<JsonValue> = messages
        .iter()
        .map(|m| {
            serde_json::json!({
                "role": if m.role == "assistant" { "model" } else { "user" },
                "parts": [{ "text": m.content }]
            })
        })
        .collect();

    let resp = client
        .post(format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model, key
        ))
        .json(&serde_json::json!({
            "contents": contents,
            "systemInstruction": {
                "parts": [{ "text": STOCK_SYSTEM_PROMPT }]
            }
        }))
        .send()
        .await?;

    let body: JsonValue = resp.json().await.map_err(|e| {
        AppError::ExternalApi(format!("Failed to parse Gemini response: {}", e))
    })?;

    body["candidates"]
        .as_array()
        .and_then(|c| c.first())
        .and_then(|c| c["content"]["parts"].as_array())
        .and_then(|p| p.first())
        .and_then(|p| p["text"].as_str())
        .map(String::from)
        .ok_or_else(|| {
            let err = body["error"]["message"]
                .as_str()
                .unwrap_or("Unknown Gemini error");
            AppError::ExternalApi(format!("Gemini API error: {}", err))
        })
}

/// DeepSeek: OpenAI-compatible API
async fn chat_deepseek(
    client: &reqwest::Client,
    key: &str,
    messages: &[ChatMessage],
    model: &str,
) -> AppResult<String> {
    chat_openai_compat(client, key, messages, "https://api.deepseek.com/v1/chat/completions", model).await
}

/// Groq: OpenAI-compatible API
async fn chat_groq(
    client: &reqwest::Client,
    key: &str,
    messages: &[ChatMessage],
    model: &str,
) -> AppResult<String> {
    chat_openai_compat(client, key, messages, "https://api.groq.com/openai/v1/chat/completions", model).await
}

/// GLM / Zhipu (bigmodel.cn): OpenAI-compatible, JWT auth for id.secret keys.
async fn chat_glm(
    client: &reqwest::Client,
    api_key: &str,
    messages: &[ChatMessage],
    model: &str,
) -> AppResult<String> {
    let token = zhipu_token(api_key)?;
    chat_openai_compat(
        client,
        &token,
        messages,
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        model,
    )
    .await
}

/// Shared helper for OpenAI-compatible chat APIs (ChatGPT, DeepSeek, Groq, GLM).
/// `token` is whatever goes after "Bearer " — the raw key, or a JWT for GLM.
async fn chat_openai_compat(
    client: &reqwest::Client,
    token: &str,
    messages: &[ChatMessage],
    endpoint: &str,
    model: &str,
) -> AppResult<String> {
    let mut msgs: Vec<JsonValue> = Vec::with_capacity(messages.len() + 1);
    msgs.push(serde_json::json!({ "role": "system", "content": STOCK_SYSTEM_PROMPT }));
    for m in messages {
        msgs.push(serde_json::json!({ "role": m.role, "content": m.content }));
    }

    let resp = client
        .post(endpoint)
        .header("Authorization", format!("Bearer {}", token))
        .json(&serde_json::json!({
            "model": model,
            "messages": msgs,
            "max_tokens": 1024,
        }))
        .send()
        .await?;

    let body: JsonValue = resp.json().await.map_err(|e| {
        AppError::ExternalApi(format!("Failed to parse response: {}", e))
    })?;

    body["choices"]
        .as_array()
        .and_then(|c| c.first())
        .and_then(|c| c["message"]["content"].as_str())
        .map(String::from)
        .ok_or_else(|| {
            let err = body["error"]["message"]
                .as_str()
                .unwrap_or("Unknown API error");
            AppError::ExternalApi(err.to_string())
        })
}

// ── Zhipu / GLM JWT ─────────────────────────────────────

/// Zhipu API keys use the `<id>.<secret>` format and authenticate via a
/// short-lived HS256 JWT derived from the secret. Returns the JWT for such keys,
/// or the raw key otherwise (newer direct keys skip JWT).
fn zhipu_token(api_key: &str) -> AppResult<String> {
    match api_key.split_once('.') {
        Some((id, secret)) if !secret.is_empty() => {
            let now_ms = chrono::Utc::now().timestamp_millis();
            let header = serde_json::json!({ "alg": "HS256", "sign_type": "SIGN", "typ": "JWT" });
            let payload = serde_json::json!({
                "api_key": id,
                "exp": now_ms + 3_600_000,
                "timestamp": now_ms,
            });
            let header_b64 = B64URL.encode(serde_json::to_vec(&header).map_err(json_err)?);
            let payload_b64 = B64URL.encode(serde_json::to_vec(&payload).map_err(json_err)?);
            let signing_input = format!("{}.{}", header_b64, payload_b64);
            let mut mac = <HmacSha256 as Mac>::new_from_slice(secret.as_bytes())
                .map_err(|e| AppError::Internal(format!("HMAC init failed: {}", e)))?;
            mac.update(signing_input.as_bytes());
            let sig_b64 = B64URL.encode(mac.finalize().into_bytes());
            Ok(format!("{}.{}", signing_input, sig_b64))
        }
        _ => Ok(api_key.to_string()),
    }
}

fn json_err(e: serde_json::Error) -> AppError {
    AppError::Internal(format!("JSON encode failed: {}", e))
}
