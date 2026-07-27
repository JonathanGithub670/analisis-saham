use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

use crate::config::Config;

/// In-memory cache (moka) — replaces Redis for zero-latency real-time data.
/// Two caches with different TTLs: short for quotes/search, long for history.
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub cache: moka::future::Cache<String, String>,
    pub history_cache: moka::future::Cache<String, String>,
    pub config: Config,
    pub http_client: reqwest::Client,
}

impl AppState {
    pub async fn new() -> Self {
        let config = Config::from_env();

        // Connect to PostgreSQL
        let db = PgPoolOptions::new()
            .max_connections(10)
            .connect(&config.database_url)
            .await
            .expect("Failed to connect to PostgreSQL");
        tracing::info!("Connected to PostgreSQL");

        // In-memory cache for real-time data (60s TTL, 10k entries max)
        let cache = moka::future::Cache::builder()
            .max_capacity(10_000)
            .time_to_live(std::time::Duration::from_secs(60))
            .build();
        tracing::info!("In-memory cache initialized (60s TTL)");

        // Separate cache for historical data (1h TTL, 2k entries max)
        let history_cache = moka::future::Cache::builder()
            .max_capacity(2_000)
            .time_to_live(std::time::Duration::from_secs(3600))
            .build();
        tracing::info!("History cache initialized (3600s TTL)");

        // HTTP client for external APIs
        let http_client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            db,
            cache,
            history_cache,
            config,
            http_client,
        }
    }
}
