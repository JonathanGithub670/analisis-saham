use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndicatorResult {
    pub symbol: String,
    pub rsi: Option<f64>,
    pub macd: Option<MacdResult>,
    pub ma20: Option<f64>,
    pub ma50: Option<f64>,
    pub volume_avg: Option<f64>,
    pub volume_trend: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MacdResult {
    pub macd_line: f64,
    pub signal_line: f64,
    pub histogram: f64,
}
