use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Notification {
    pub id: i32,
    pub symbol: String,
    pub notification_type: String,  // "price_alert", "signal_change", "ai_update"
    pub title: String,
    pub message: String,
    pub is_read: bool,
    pub created_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePriceAlert {
    pub symbol: String,
    pub target_price: f64,
    pub direction: String,  // "above", "below"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiPrediction {
    pub symbol: String,
    pub prediction: String,  // "bullish", "bearish"
    pub probability: f64,
    pub features_used: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentimentResult {
    pub symbol: String,
    pub overall_sentiment: String,  // "positive", "negative", "neutral"
    pub compound_score: f64,
    pub positive_ratio: f64,
    pub negative_ratio: f64,
    pub neutral_ratio: f64,
    pub articles_analyzed: i32,
    pub headlines: Vec<SentimentHeadline>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentimentHeadline {
    pub title: String,
    pub sentiment: String,
    pub score: f64,
    pub source: Option<String>,
    pub url: Option<String>,
}
