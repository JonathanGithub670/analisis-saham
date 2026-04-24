use axum::{
    extract::FromRequestParts,
    http::request::Parts,
};
use uuid::Uuid;

use crate::error::AppError;
use crate::services::auth_service::{verify_access_token, Claims};
use crate::state::AppState;

/// Extractor that validates JWT from Authorization header and provides user info.
///
/// Usage in handler:
/// ```
/// async fn protected_route(auth: AuthUser) -> impl IntoResponse {
///     // auth.user_id and auth.email are available
/// }
/// ```
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub email: String,
    pub claims: Claims,
}

impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        // Extract Authorization header
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| {
                AppError::Unauthorized("Missing Authorization header".to_string())
            })?;

        // Expect "Bearer <token>"
        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or_else(|| {
                AppError::Unauthorized("Invalid Authorization header format. Expected: Bearer <token>".to_string())
            })?;

        // Verify the token
        let token_data = verify_access_token(token, &state.config)?;
        let claims = token_data.claims;

        // Parse user ID from claims
        let user_id = Uuid::parse_str(&claims.sub).map_err(|_| {
            AppError::Unauthorized("Invalid token payload".to_string())
        })?;

        Ok(AuthUser {
            user_id,
            email: claims.email.clone(),
            claims,
        })
    }
}
