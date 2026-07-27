use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::middleware::auth::AuthUser;
use crate::models::SaveApiKeyRequest;
use crate::services::api_key_service;
use crate::state::AppState;

/// POST /api/auth/api-keys
/// Save/upsert the user's API key for the auto-detected platform
pub async fn save_api_key(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(request): Json<SaveApiKeyRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let encryption_key = api_key_service::derive_encryption_key(&state.config.api_key_encryption_key);
    let key = api_key_service::save_api_key(
        &state.db,
        &state.http_client,
        &encryption_key,
        auth.user_id,
        &request.api_key,
        request.model.as_deref(),
    )
    .await?;

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "message": "API key saved successfully",
            "data": key
        })),
    ))
}

/// GET /api/auth/api-keys
/// List all API keys for the authenticated user (metadata only)
pub async fn list_api_keys(
    auth: AuthUser,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let keys = api_key_service::list_api_keys(&state.db, auth.user_id).await?;
    Ok(Json(json!({ "data": keys })))
}

/// POST /api/auth/api-keys/verify
/// Re-detect & verify one specific stored API key (body: { "id": "<uuid>" })
pub async fn verify_api_key(
    auth: AuthUser,
    State(state): State<AppState>,
    Json(body): Json<Value>,
) -> AppResult<Json<Value>> {
    let key_id = body
        .get("id")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .and_then(|s| s.parse::<Uuid>().ok())
        .ok_or_else(|| AppError::BadRequest("Missing or invalid 'id' field".to_string()))?;

    let encryption_key = api_key_service::derive_encryption_key(&state.config.api_key_encryption_key);
    let result = api_key_service::verify_and_update_key(
        &state.db,
        &state.http_client,
        &encryption_key,
        auth.user_id,
        key_id,
    )
    .await?;

    Ok(Json(result))
}

/// DELETE /api/auth/api-keys/{id}
/// Delete an API key
pub async fn delete_api_key(
    auth: AuthUser,
    State(state): State<AppState>,
    Path(key_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    api_key_service::delete_api_key(&state.db, auth.user_id, key_id).await?;
    Ok(Json(json!({ "message": "API key deleted successfully" })))
}
