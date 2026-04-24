use crate::error::AppResult;
use redis::AsyncCommands;

const DEFAULT_TTL: u64 = 300; // 5 minutes
const HISTORY_TTL: u64 = 3600; // 1 hour for historical data

pub struct CacheService;

impl CacheService {
    /// Get cached value by key
    pub async fn get(redis: &redis::Client, key: &str) -> AppResult<Option<String>> {
        let mut conn = redis.get_multiplexed_async_connection().await?;
        let value: Option<String> = conn.get(key).await?;
        Ok(value)
    }

    /// Set cached value with default TTL (5 min)
    pub async fn set(redis: &redis::Client, key: &str, value: &str) -> AppResult<()> {
        let mut conn = redis.get_multiplexed_async_connection().await?;
        conn.set_ex::<_, _, ()>(key, value, DEFAULT_TTL).await?;
        Ok(())
    }

    /// Set cached value with custom TTL
    pub async fn set_with_ttl(
        redis: &redis::Client,
        key: &str,
        value: &str,
        ttl_secs: u64,
    ) -> AppResult<()> {
        let mut conn = redis.get_multiplexed_async_connection().await?;
        conn.set_ex::<_, _, ()>(key, value, ttl_secs).await?;
        Ok(())
    }

    /// Cache key for stock quote
    pub fn quote_key(symbol: &str) -> String {
        format!("stockpulse:quote:{}", symbol.to_uppercase())
    }

    /// Cache key for stock history
    pub fn history_key(symbol: &str, interval: &str) -> String {
        format!("stockpulse:history:{}:{}", symbol.to_uppercase(), interval)
    }

    /// Cache key for search results
    pub fn search_key(query: &str) -> String {
        format!("stockpulse:search:{}", query.to_lowercase())
    }

    /// Cache key for indicators
    pub fn indicator_key(symbol: &str) -> String {
        format!("stockpulse:indicators:{}", symbol.to_uppercase())
    }

    /// History-specific TTL
    pub fn history_ttl() -> u64 {
        HISTORY_TTL
    }

    /// Delete a cached key
    #[allow(dead_code)]
    pub async fn delete(redis: &redis::Client, key: &str) -> AppResult<()> {
        let mut conn = redis.get_multiplexed_async_connection().await?;
        conn.del::<_, ()>(key).await?;
        Ok(())
    }
}
