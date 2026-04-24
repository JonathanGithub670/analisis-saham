use chrono::NaiveDateTime;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
#[allow(dead_code)]
pub struct Stock {
    pub id: i32,
    pub symbol: String,
    pub name: String,
    pub exchange: Option<String>,
    pub sector: Option<String>,
    pub currency: Option<String>,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockSearchResult {
    pub symbol: String,
    pub name: String,
    pub r#type: Option<String>,
    pub region: Option<String>,
    pub currency: Option<String>,
    pub match_score: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockQuote {
    pub symbol: String,
    pub name: Option<String>,
    pub price: f64,
    pub change: f64,
    pub change_percent: f64,
    pub volume: i64,
    pub high: f64,
    pub low: f64,
    pub open: f64,
    pub previous_close: f64,
    pub latest_trading_day: Option<String>,
}

