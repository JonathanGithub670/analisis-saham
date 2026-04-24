use crate::error::AppResult;
use crate::models::*;
use crate::services::alpha_vantage::AlphaVantageClient;
use crate::services::cache_service::CacheService;
use crate::indicators;
use crate::state::AppState;

pub struct StockService;

impl StockService {
    /// Search stocks with caching
    pub async fn search(state: &AppState, query: &str) -> AppResult<Vec<StockSearchResult>> {
        let cache_key = CacheService::search_key(query);

        // Check cache first
        if let Some(cached) = CacheService::get(&state.redis, &cache_key).await? {
            if let Ok(results) = serde_json::from_str(&cached) {
                tracing::debug!("Cache hit for search: {}", query);
                return Ok(results);
            }
        }

        // Fetch from Alpha Vantage
        let client = AlphaVantageClient::new(
            state.config.alpha_vantage_api_key.clone(),
            state.http_client.clone(),
        );
        let results = client.search_stocks(query).await?;

        // Cache results
        if let Ok(json) = serde_json::to_string(&results) {
            let _ = CacheService::set(&state.redis, &cache_key, &json).await;
        }

        Ok(results)
    }

    /// Get stock quote with caching
    pub async fn get_quote(state: &AppState, symbol: &str) -> AppResult<StockQuote> {
        let cache_key = CacheService::quote_key(symbol);

        // Check cache
        if let Some(cached) = CacheService::get(&state.redis, &cache_key).await? {
            if let Ok(quote) = serde_json::from_str(&cached) {
                tracing::debug!("Cache hit for quote: {}", symbol);
                return Ok(quote);
            }
        }

        // Fetch from Alpha Vantage
        let client = AlphaVantageClient::new(
            state.config.alpha_vantage_api_key.clone(),
            state.http_client.clone(),
        );
        let quote = client.get_quote(symbol).await?;

        // Cache
        if let Ok(json) = serde_json::to_string(&quote) {
            let _ = CacheService::set(&state.redis, &cache_key, &json).await;
        }

        Ok(quote)
    }

    /// Get historical daily data with caching
    pub async fn get_history(
        state: &AppState,
        symbol: &str,
        interval: &str,
    ) -> AppResult<Vec<OhlcvData>> {
        let cache_key = CacheService::history_key(symbol, interval);

        // Check cache
        if let Some(cached) = CacheService::get(&state.redis, &cache_key).await? {
            if let Ok(data) = serde_json::from_str(&cached) {
                tracing::debug!("Cache hit for history: {} {}", symbol, interval);
                return Ok(data);
            }
        }

        let client = AlphaVantageClient::new(
            state.config.alpha_vantage_api_key.clone(),
            state.http_client.clone(),
        );

        let data = match interval {
            "1d" | "daily" => client.get_daily(symbol, false).await?,
            "1min" | "5min" | "15min" | "30min" | "60min" => {
                client.get_intraday(symbol, interval).await?
            }
            _ => client.get_daily(symbol, false).await?,
        };

        // Cache with longer TTL for historical data
        if let Ok(json) = serde_json::to_string(&data) {
            let _ = CacheService::set_with_ttl(
                &state.redis,
                &cache_key,
                &json,
                CacheService::history_ttl(),
            )
            .await;
        }

        // Store in database for persistence
        Self::store_history(&state.db, symbol, &data).await.ok();

        Ok(data)
    }

    /// Calculate indicators for a stock
    pub async fn get_indicators(state: &AppState, symbol: &str) -> AppResult<IndicatorResult> {
        let cache_key = CacheService::indicator_key(symbol);

        // Check cache
        if let Some(cached) = CacheService::get(&state.redis, &cache_key).await? {
            if let Ok(result) = serde_json::from_str(&cached) {
                return Ok(result);
            }
        }

        // Get historical data
        let history = Self::get_history(state, symbol, "1d").await?;

        let closes: Vec<f64> = history.iter().map(|h| h.close).collect();
        let volumes: Vec<i64> = history.iter().map(|h| h.volume).collect();

        let rsi = indicators::calculate_rsi(&closes, 14);
        let macd = indicators::calculate_macd(&closes, 12, 26, 9);
        let ma20 = indicators::calculate_sma(&closes, 20);
        let ma50 = indicators::calculate_sma(&closes, 50);
        let volume_avg = indicators::calculate_volume_average(&volumes, 20);
        let volume_trend = indicators::detect_volume_trend(&volumes, 20);

        let result = IndicatorResult {
            symbol: symbol.to_uppercase(),
            rsi,
            macd,
            ma20,
            ma50,
            volume_avg,
            volume_trend,
        };

        // Cache
        if let Ok(json) = serde_json::to_string(&result) {
            let _ = CacheService::set(&state.redis, &cache_key, &json).await;
        }

        Ok(result)
    }

    /// Generate trading signal
    pub async fn get_signal(state: &AppState, symbol: &str) -> AppResult<SignalResult> {
        let indicator_data = Self::get_indicators(state, symbol).await?;
        let mut reasons = Vec::new();
        let mut bullish_count = 0;
        let mut bearish_count = 0;
        let mut total_signals = 0;

        // RSI Signal
        if let Some(rsi) = indicator_data.rsi {
            total_signals += 1;
            if rsi < 30.0 {
                bullish_count += 1;
                reasons.push(SignalReason {
                    indicator: "RSI".to_string(),
                    signal: "bullish".to_string(),
                    description: format!("RSI at {:.1} — oversold territory (< 30)", rsi),
                });
            } else if rsi > 70.0 {
                bearish_count += 1;
                reasons.push(SignalReason {
                    indicator: "RSI".to_string(),
                    signal: "bearish".to_string(),
                    description: format!("RSI at {:.1} — overbought territory (> 70)", rsi),
                });
            } else {
                reasons.push(SignalReason {
                    indicator: "RSI".to_string(),
                    signal: "neutral".to_string(),
                    description: format!("RSI at {:.1} — neutral zone", rsi),
                });
            }
        }

        // MA Cross Signal
        if let (Some(ma20), Some(ma50)) = (indicator_data.ma20, indicator_data.ma50) {
            total_signals += 1;
            if ma20 > ma50 {
                bullish_count += 1;
                reasons.push(SignalReason {
                    indicator: "MA Cross".to_string(),
                    signal: "bullish".to_string(),
                    description: format!("MA20 ({:.2}) > MA50 ({:.2}) — Golden Cross", ma20, ma50),
                });
            } else {
                bearish_count += 1;
                reasons.push(SignalReason {
                    indicator: "MA Cross".to_string(),
                    signal: "bearish".to_string(),
                    description: format!("MA20 ({:.2}) < MA50 ({:.2}) — Death Cross", ma20, ma50),
                });
            }
        }

        // MACD Signal
        if let Some(ref macd) = indicator_data.macd {
            total_signals += 1;
            if macd.histogram > 0.0 {
                bullish_count += 1;
                reasons.push(SignalReason {
                    indicator: "MACD".to_string(),
                    signal: "bullish".to_string(),
                    description: format!(
                        "MACD histogram positive ({:.2}) — bullish momentum",
                        macd.histogram
                    ),
                });
            } else {
                bearish_count += 1;
                reasons.push(SignalReason {
                    indicator: "MACD".to_string(),
                    signal: "bearish".to_string(),
                    description: format!(
                        "MACD histogram negative ({:.2}) — bearish momentum",
                        macd.histogram
                    ),
                });
            }
        }

        // Volume Signal
        if let Some(ref trend) = indicator_data.volume_trend {
            total_signals += 1;
            match trend.as_str() {
                "high" => {
                    bullish_count += 1;
                    reasons.push(SignalReason {
                        indicator: "Volume".to_string(),
                        signal: "bullish".to_string(),
                        description: "Volume significantly above average — strong interest".to_string(),
                    });
                }
                "low" => {
                    bearish_count += 1;
                    reasons.push(SignalReason {
                        indicator: "Volume".to_string(),
                        signal: "bearish".to_string(),
                        description: "Volume significantly below average — weak interest".to_string(),
                    });
                }
                _ => {
                    reasons.push(SignalReason {
                        indicator: "Volume".to_string(),
                        signal: "neutral".to_string(),
                        description: "Volume at normal levels".to_string(),
                    });
                }
            }
        }

        // Determine overall signal
        let (signal, confidence) = if total_signals == 0 {
            ("neutral".to_string(), 0.0)
        } else {
            let confidence = if bullish_count > bearish_count {
                bullish_count as f64 / total_signals as f64
            } else if bearish_count > bullish_count {
                bearish_count as f64 / total_signals as f64
            } else {
                0.5
            };

            let signal = if bullish_count > bearish_count {
                "bullish"
            } else if bearish_count > bullish_count {
                "bearish"
            } else {
                "neutral"
            };

            (signal.to_string(), (confidence * 100.0).round() / 100.0)
        };

        Ok(SignalResult {
            symbol: symbol.to_uppercase(),
            signal,
            confidence,
            reasons,
        })
    }

    /// Store price history in database
    async fn store_history(
        db: &sqlx::PgPool,
        symbol: &str,
        data: &[OhlcvData],
    ) -> AppResult<()> {
        for item in data {
            if let Ok(date) = chrono::NaiveDate::parse_from_str(&item.date, "%Y-%m-%d") {
                sqlx::query(
                    r#"
                    INSERT INTO price_history (symbol, date, open, high, low, close, volume)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (symbol, date) DO UPDATE SET
                        open = EXCLUDED.open,
                        high = EXCLUDED.high,
                        low = EXCLUDED.low,
                        close = EXCLUDED.close,
                        volume = EXCLUDED.volume
                    "#
                )
                .bind(symbol.to_uppercase())
                .bind(date)
                .bind(item.open)
                .bind(item.high)
                .bind(item.low)
                .bind(item.close)
                .bind(item.volume)
                .execute(db)
                .await
                .ok();
            }
        }
        Ok(())
    }
}
