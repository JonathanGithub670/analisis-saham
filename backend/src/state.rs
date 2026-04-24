use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

use crate::config::Config;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: redis::Client,
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

        // Connect to Redis
        let redis = redis::Client::open(config.redis_url.as_str())
            .expect("Failed to create Redis client");
        // Test redis connection
        let mut conn = redis.get_multiplexed_async_connection().await
            .expect("Failed to connect to Redis");
        let _: String = redis::cmd("PING").query_async(&mut conn).await
            .expect("Failed to ping Redis");
        tracing::info!("Connected to Redis");

        // HTTP client for external APIs
        let http_client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            db,
            redis,
            config,
            http_client,
        }
    }
}
