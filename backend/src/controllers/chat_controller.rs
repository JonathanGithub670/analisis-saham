use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};

use crate::error::{AppError, AppResult};
use crate::middleware::auth::AuthUser;
use crate::services::api_key_service;
use crate::state::AppState;

/// POST /api/ai/chat
/// Send a chat message using the server-configured AI (AI_PROVIDER/AI_API_KEY/AI_MODEL).
pub async fn chat(
    _auth: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<Value>,
) -> AppResult<Json<Value>> {
    let message = body
        .get("message")
        .and_then(|v| v.as_str())
        .filter(|m| !m.is_empty())
        .ok_or_else(|| AppError::BadRequest("Missing 'message' field".to_string()))?;

    // Build conversation: optional history + new user message
    let history = body
        .get("history")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|h| {
                    let role = h.get("role")?.as_str()?;
                    let content = h.get("content")?.as_str()?;
                    Some(api_key_service::ChatMessage {
                        role: role.to_string(),
                        content: content.to_string(),
                    })
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let mut messages = history;
    messages.push(api_key_service::ChatMessage {
        role: "user".to_string(),
        content: message.to_string(),
    });

    // Chat via the server-configured AI (env). Surface which provider answered.
    let reply = api_key_service::chat_completion_config(&state.config, &state.http_client, &messages)
        .await?;

    Ok(Json(json!({
        "reply": reply,
        "provider": state.config.ai_provider,
    })))
}
