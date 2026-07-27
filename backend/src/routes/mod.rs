use axum::{
    routing::{get, patch, post, delete},
    Router,
};

use crate::controllers::*;
use crate::state::AppState;

pub fn api_routes() -> Router<AppState> {
    Router::new()
        // Auth routes
        .route("/auth/register", post(auth_controller::register))
        .route("/auth/login", post(auth_controller::login))
        .route("/auth/refresh", post(auth_controller::refresh))
        .route("/auth/logout", post(auth_controller::logout))
        .route("/auth/me", get(auth_controller::me))
        // API Key management (user's own AI provider keys)
        .route("/auth/api-keys", post(api_key_controller::save_api_key))
        .route("/auth/api-keys", get(api_key_controller::list_api_keys))
        .route("/auth/api-keys/verify", post(api_key_controller::verify_api_key))
        .route("/auth/api-keys/{id}", delete(api_key_controller::delete_api_key))
        // Stock routes
        .route("/stocks/search", get(stock_controller::search_stocks))
        .route("/stocks/{symbol}", get(stock_controller::get_stock))
        .route("/stocks/{symbol}/history", get(stock_controller::get_stock_history))
        // Indicator routes
        .route("/stocks/{symbol}/indicators", get(indicator_controller::get_indicators))
        // Signal routes
        .route("/stocks/{symbol}/signal", get(signal_controller::get_signal))
        // AI routes (Phase 2)
        .route("/stocks/{symbol}/ai", get(ai_controller::get_ai_prediction))
        .route("/stocks/{symbol}/sentiment", get(ai_controller::get_sentiment))
        // Notification routes (Phase 3)
        .route("/notifications", get(notification_controller::get_notifications))
        .route("/notifications/alerts", post(notification_controller::create_price_alert))
        .route("/notifications/{id}/read", patch(notification_controller::mark_notification_read))

        // AI Chat (uses user's stored API keys)
        .route("/ai/chat", post(chat_controller::chat))

        // Health check
        .route("/health", get(health_check))
}

async fn health_check() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "healthy",
        "service": "StockPulse Backend",
        "version": "0.1.0"
    }))
}
