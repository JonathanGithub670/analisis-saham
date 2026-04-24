use axum::extract::{Path, Query, State};
use axum::Json;
use serde::Deserialize;

use crate::error::AppResult;
use crate::models::{CreatePriceAlert, Notification};
use crate::services::notification_service::NotificationService;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct NotificationQuery {
    pub limit: Option<i64>,
}

/// GET /api/notifications
pub async fn get_notifications(
    State(state): State<AppState>,
    Query(params): Query<NotificationQuery>,
) -> AppResult<Json<Vec<Notification>>> {
    let limit = params.limit.unwrap_or(50);
    let notifications = NotificationService::get_all(&state.db, limit).await?;
    Ok(Json(notifications))
}

/// POST /api/notifications/alerts
pub async fn create_price_alert(
    State(state): State<AppState>,
    Json(payload): Json<CreatePriceAlert>,
) -> AppResult<Json<Notification>> {
    let notification = NotificationService::create_price_alert(
        &state.db,
        &payload.symbol,
        payload.target_price,
        &payload.direction,
    )
    .await?;

    Ok(Json(notification))
}

/// PATCH /api/notifications/:id/read
pub async fn mark_notification_read(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> AppResult<Json<serde_json::Value>> {
    NotificationService::mark_read(&state.db, id).await?;
    Ok(Json(serde_json::json!({"status": "read"})))
}
