/// Application configuration loaded from environment variables.

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub alpha_vantage_api_key: String,
    pub ai_service_url: String,
    pub backend_host: String,
    pub backend_port: u16,
    // JWT Auth config
    pub jwt_secret: String,
    pub jwt_access_expiry_secs: u64,
    pub jwt_refresh_expiry_secs: u64,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            database_url: std::env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            redis_url: std::env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string()),
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
        }
    }
}
