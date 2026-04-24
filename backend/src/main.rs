use std::net::SocketAddr;
use axum::Router;
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod error;
mod state;
mod routes;
mod controllers;
mod services;
mod indicators;
mod models;
mod ai;
mod utils;
mod middleware;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "stockpulse_backend=debug,tower_http=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables (try current dir first, then parent dir)
    if dotenvy::dotenv().is_err() {
        dotenvy::from_filename("../.env").ok();
    }

    // Build application state
    let app_state = state::AppState::new().await;

    // Run database migrations
    tracing::info!("Running database migrations...");
    sqlx::migrate!("./migrations")
        .run(&app_state.db)
        .await
        .expect("Failed to run database migrations");
    tracing::info!("Migrations completed successfully");

    // Build CORS layer
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .nest("/api", routes::api_routes())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(app_state.clone());

    // Start server using config values
    let addr: SocketAddr = format!("{}:{}", app_state.config.backend_host, app_state.config.backend_port)
        .parse()
        .unwrap();
    tracing::info!("🚀 StockPulse Backend running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
