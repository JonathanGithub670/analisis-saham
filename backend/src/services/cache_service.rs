use crate::error::AppResult;

/// In-memory cache service powered by `moka`.
/// Provides zero-latency caching without external infrastructure.
///
/// Two cache tiers:
///   - `cache`: 60s TTL for quotes, search, indicators (real-time freshness)
///   - `history_cache`: 1h TTL for historical OHLCV data (rarely changes)
pub struct CacheService;

impl CacheService {
    /// Get cached value by key (from standard cache)
    pub async fn get(
        cache: &moka::future::Cache<String, String>,
        key: &str,
    ) -> AppResult<Option<String>> {
        Ok(cache.get(key).await)
    }

    /// Get cached value from history cache (longer TTL)
    pub async fn get_history(
        cache: &moka::future::Cache<String, String>,
        key: &str,
    ) -> AppResult<Option<String>> {
        Ok(cache.get(key).await)
    }

    /// Set cached value in standard cache (60s TTL)
    pub async fn set(
        cache: &moka::future::Cache<String, String>,
        key: &str,
        value: &str,
    ) -> AppResult<()> {
        cache.insert(key.to_string(), value.to_string()).await;
        Ok(())
    }

    /// Set cached value in history cache (1h TTL)
    pub async fn set_history(
        cache: &moka::future::Cache<String, String>,
        key: &str,
        value: &str,
    ) -> AppResult<()> {
        cache.insert(key.to_string(), value.to_string()).await;
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

    /// Invalidate cached entries for a symbol (e.g. after data refresh)
    #[allow(dead_code)]
    pub async fn invalidate_symbol(
        cache: &moka::future::Cache<String, String>,
        history_cache: &moka::future::Cache<String, String>,
        symbol: &str,
    ) {
        let sym = symbol.to_uppercase();
        cache.invalidate(&Self::quote_key(&sym)).await;
        cache.invalidate(&Self::search_key(&sym)).await;
        cache.invalidate(&Self::indicator_key(&sym)).await;
        history_cache.invalidate(&Self::history_key(&sym, "1d")).await;
    }

    /// Clear all caches (useful for testing or forced refresh)
    #[allow(dead_code)]
    pub async fn clear_all(
        cache: &moka::future::Cache<String, String>,
        history_cache: &moka::future::Cache<String, String>,
    ) -> AppResult<()> {
        cache.invalidate_all();
        history_cache.invalidate_all();
        // Ensure invalidation is processed
        cache.run_pending_tasks().await;
        history_cache.run_pending_tasks().await;
        Ok(())
    }
}
