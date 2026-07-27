use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Database row for user_api_keys table
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserApiKey {
    pub id: Uuid,
    pub user_id: Uuid,
    pub provider: String,
    pub api_key: String, // AES-256-GCM encrypted (base64)
    pub model: Option<String>,
    pub is_valid: bool,
    pub verified_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Safe response — never exposes the raw api_key
#[derive(Debug, Serialize, Deserialize)]
pub struct UserApiKeyResponse {
    pub id: Uuid,
    pub provider: String,
    pub is_valid: bool,
    pub model: Option<String>,
    pub verified_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    /// Why verification succeeded/failed (set on save & verify; None on plain list).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verify_detail: Option<String>,
}

impl From<UserApiKey> for UserApiKeyResponse {
    fn from(key: UserApiKey) -> Self {
        Self {
            id: key.id,
            provider: key.provider,
            is_valid: key.is_valid,
            model: key.model,
            verified_at: key.verified_at,
            created_at: key.created_at,
            verify_detail: None,
        }
    }
}

/// Request to save/upsert an API key.
/// The AI platform is auto-detected from the key — the user never chooses it.
#[derive(Debug, Deserialize)]
pub struct SaveApiKeyRequest {
    pub api_key: String,
    /// Optional model override for chat (e.g. "glm-5.2"). None → provider default.
    pub model: Option<String>,
}
