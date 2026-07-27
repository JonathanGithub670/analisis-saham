/// Application configuration loaded from environment variables.

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub alpha_vantage_api_key: String,
    pub ai_service_url: String,
    pub backend_host: String,
    pub backend_port: u16,
    // JWT Auth config
    pub jwt_secret: String,
    pub jwt_access_expiry_secs: u64,
    pub jwt_refresh_expiry_secs: u64,
    pub api_key_encryption_key: String,
    // Server-configured AI (single provider/key/model for the whole app).
    pub ai_provider: String,
    pub ai_api_key: String,
    pub ai_model: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            database_url: std::env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            alpha_vantage_api_key: std::env::var("ALPHA_VANTAGE_API_KEY")
                .expect("ALPHA_VANTAGE_API_KEY must be set"),
            ai_service_url: std::env::var("AI_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:8000".to_string()),
            backend_host: std::env::var("BACKEND_HOST")
                .unwrap_or_else(|_| "0.0.0.0".to_string()),
            backend_port: std::env::var("BACKEND_PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()
                .expect("BACKEND_PORT must be a valid u16"),
            jwt_secret: std::env::var("JWT_SECRET")
                .expect("JWT_SECRET must be set"),
            jwt_access_expiry_secs: std::env::var("JWT_ACCESS_EXPIRY_SECS")
                .unwrap_or_else(|_| "900".to_string())
                .parse()
                .expect("JWT_ACCESS_EXPIRY_SECS must be a valid u64"),
            jwt_refresh_expiry_secs: std::env::var("JWT_REFRESH_EXPIRY_SECS")
                .unwrap_or_else(|_| "604800".to_string())
                .parse()
                .expect("JWT_REFRESH_EXPIRY_SECS must be a valid u64"),
            api_key_encryption_key: std::env::var("API_KEY_ENCRYPTION_KEY")
                .unwrap_or_else(|_| "stockpulse-default-api-key-encryption-key".to_string()),
            // AI provider used by /api/ai/chat. One of: claude, chatgpt, gemini,
            // deepseek, groq, glm. Defaults to glm (Zhipu).
            ai_provider: std::env::var("AI_PROVIDER")
                .unwrap_or_else(|_| "glm".to_string()),
            // The raw API key (e.g. Zhipu "id.secret"). Empty → chat returns an error.
            ai_api_key: std::env::var("AI_API_KEY").unwrap_or_default(),
            // Model name, e.g. glm-5.2, gpt-4o-mini. Empty → provider default.
            ai_model: std::env::var("AI_MODEL").unwrap_or_default(),
        }
    }
}
