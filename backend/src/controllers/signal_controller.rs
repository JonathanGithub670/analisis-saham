use axum::extract::{Path, State};
use axum::Json;

use crate::error::AppResult;
use crate::models::SignalResult;
use crate::services::stock_service::StockService;
use crate::state::AppState;

/// GET /api/stocks/:symbol/signal
pub async fn get_signal(
    State(state): State<AppState>,
    Path(symbol): Path<String>,
) -> AppResult<Json<SignalResult>> {
    let result = StockService::get_signal(&state, &symbol).await?;
    Ok(Json(result))
}
