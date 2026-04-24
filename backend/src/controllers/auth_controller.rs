use axum::{extract::State, http::StatusCode, Json};
use serde_json::{json, Value};

use crate::error::AppResult;
use crate::middleware::auth::AuthUser;
use crate::models::{LoginRequest, LogoutRequest, RefreshRequest, RegisterRequest};
use crate::services::auth_service;
use crate::state::AppState;

/// POST /api/auth/register
/// Register a new user account
pub async fn register(
    State(state): State<AppState>,
    Json(request): Json<RegisterRequest>,
) -> AppResult<(StatusCode, Json<Value>)> {
    let user = auth_service::register_user(&state.db, request).await?;

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "message": "Registration successful",
            "user": user
        })),
    ))
}

/// POST /api/auth/login
/// Login with email and password, returns JWT token pair
pub async fn login(
    State(state): State<AppState>,
    Json(request): Json<LoginRequest>,
) -> AppResult<Json<Value>> {
    let tokens = auth_service::login_user(&state.db, &state.config, request).await?;

    Ok(Json(json!({
        "message": "Login successful",
        "data": tokens
    })))
}

/// POST /api/auth/refresh
/// Refresh access token using refresh token
pub async fn refresh(
    State(state): State<AppState>,
    Json(request): Json<RefreshRequest>,
) -> AppResult<Json<Value>> {
    let tokens = auth_service::refresh_tokens(&state.db, &state.config, request).await?;

    Ok(Json(json!({
        "message": "Token refreshed successfully",
        "data": tokens
    })))
}

/// POST /api/auth/logout
/// Logout by revoking refresh token
pub async fn logout(
    State(state): State<AppState>,
    Json(request): Json<LogoutRequest>,
) -> AppResult<Json<Value>> {
    auth_service::logout_user(&state.db, request).await?;

    Ok(Json(json!({
        "message": "Logged out successfully"
    })))
}

/// GET /api/auth/me
/// Get current authenticated user info (protected route)
pub async fn me(
    auth: AuthUser,
    State(state): State<AppState>,
) -> AppResult<Json<Value>> {
    let user = auth_service::get_user_by_id(&state.db, auth.user_id).await?;

    Ok(Json(json!({
        "user": user
    })))
}
