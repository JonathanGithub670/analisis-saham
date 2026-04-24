use axum::extract::{Path, State};
use axum::Json;

use crate::error::AppResult;
use crate::models::{AiPrediction, SentimentResult};
use crate::ai::client::AiServiceClient;
use crate::services::stock_service::StockService;
use crate::state::AppState;

/// GET /api/stocks/:symbol/ai
pub async fn get_ai_prediction(
    State(state): State<AppState>,
    Path(symbol): Path<String>,
) -> AppResult<Json<AiPrediction>> {
    // Get current indicators to send to AI service
    let indicators = StockService::get_indicators(&state, &symbol).await?;

    let client = AiServiceClient::new(
        state.config.ai_service_url.clone(),
        state.http_client.clone(),
    );

    let prediction = client.predict(&symbol, &indicators).await?;
    Ok(Json(prediction))
}

/// GET /api/stocks/:symbol/sentiment
pub async fn get_sentiment(
    State(state): State<AppState>,
    Path(symbol): Path<String>,
) -> AppResult<Json<SentimentResult>> {
    let client = AiServiceClient::new(
        state.config.ai_service_url.clone(),
        state.http_client.clone(),
    );

    let sentiment = client.get_sentiment(&symbol).await?;
    Ok(Json(sentiment))
}
