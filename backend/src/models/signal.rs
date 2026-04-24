use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignalResult {
    pub symbol: String,
    pub signal: String,  // "bullish", "bearish", "neutral"
    pub confidence: f64,
    pub reasons: Vec<SignalReason>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SignalReason {
    pub indicator: String,
    pub signal: String,
    pub description: String,
}
