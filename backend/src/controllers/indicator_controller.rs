use axum::extract::{Path, State};
use axum::Json;

use crate::error::AppResult;
use crate::models::IndicatorResult;
use crate::services::stock_service::StockService;
use crate::state::AppState;

/// GET /api/stocks/:symbol/indicators
pub async fn get_indicators(
    State(state): State<AppState>,
    Path(symbol): Path<String>,
) -> AppResult<Json<IndicatorResult>> {
    let result = StockService::get_indicators(&state, &symbol).await?;
    Ok(Json(result))
}
