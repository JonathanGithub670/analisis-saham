use crate::error::{AppError, AppResult};
use crate::models::{AiPrediction, IndicatorResult, SentimentResult};
use serde_json::json;

pub struct AiServiceClient {
    base_url: String,
    http_client: reqwest::Client,
}

impl AiServiceClient {
    pub fn new(base_url: String, http_client: reqwest::Client) -> Self {
        Self { base_url, http_client }
    }

    /// Call AI service for stock prediction
    pub async fn predict(
        &self,
        symbol: &str,
        indicators: &IndicatorResult,
    ) -> AppResult<AiPrediction> {
        let payload = json!({
            "symbol": symbol,
            "rsi": indicators.rsi.unwrap_or(50.0),
            "macd": indicators.macd.as_ref().map(|m| m.macd_line).unwrap_or(0.0),
            "ma20": indicators.ma20.unwrap_or(0.0),
            "ma50": indicators.ma50.unwrap_or(0.0),
            "volume_avg": indicators.volume_avg.unwrap_or(0.0),
        });

        let response = self
            .http_client
            .post(format!("{}/predict", self.base_url))
            .json(&payload)
            .send()
            .await
            .map_err(|e| AppError::ExternalApi(format!("AI service unreachable: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::ExternalApi(
                "AI service returned an error".to_string(),
            ));
        }

        let prediction: AiPrediction = response.json().await
            .map_err(|e| AppError::ExternalApi(format!("Invalid AI response: {}", e)))?;

        Ok(prediction)
    }

    /// Call AI service for sentiment analysis
    pub async fn get_sentiment(&self, symbol: &str) -> AppResult<SentimentResult> {
        let payload = json!({ "symbol": symbol });

        let response = self
            .http_client
            .post(format!("{}/sentiment", self.base_url))
            .json(&payload)
            .send()
            .await
            .map_err(|e| AppError::ExternalApi(format!("AI service unreachable: {}", e)))?;

        if !response.status().is_success() {
            return Err(AppError::ExternalApi(
                "AI sentiment service returned an error".to_string(),
            ));
        }

        let sentiment: SentimentResult = response.json().await
            .map_err(|e| AppError::ExternalApi(format!("Invalid sentiment response: {}", e)))?;

        Ok(sentiment)
    }
}
