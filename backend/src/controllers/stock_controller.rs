use axum::extract::{Path, Query, State};
use axum::Json;
use serde::Deserialize;

use crate::error::AppResult;
use crate::models::*;
use crate::services::stock_service::StockService;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: String,
}

#[derive(Deserialize)]
pub struct HistoryQuery {
    pub interval: Option<String>,
}

/// GET /api/stocks/search?q=AAPL
pub async fn search_stocks(
    State(state): State<AppState>,
    Query(params): Query<SearchQuery>,
) -> AppResult<Json<Vec<StockSearchResult>>> {
    let results = StockService::search(&state, &params.q).await?;
    Ok(Json(results))
}

/// GET /api/stocks/:symbol
pub async fn get_stock(
    State(state): State<AppState>,
    Path(symbol): Path<String>,
) -> AppResult<Json<StockQuote>> {
    let quote = StockService::get_quote(&state, &symbol).await?;
    Ok(Json(quote))
}

/// GET /api/stocks/:symbol/history?interval=1d
pub async fn get_stock_history(
    State(state): State<AppState>,
    Path(symbol): Path<String>,
    Query(params): Query<HistoryQuery>,
) -> AppResult<Json<Vec<OhlcvData>>> {
    let interval = params.interval.unwrap_or_else(|| "1d".to_string());
    let history = StockService::get_history(&state, &symbol, &interval).await?;
    Ok(Json(history))
}

