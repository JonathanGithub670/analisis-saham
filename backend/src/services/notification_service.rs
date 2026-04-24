use crate::error::AppResult;
use crate::models::Notification;
use sqlx::PgPool;

pub struct NotificationService;

impl NotificationService {
    /// Get all notifications (newest first)
    pub async fn get_all(db: &PgPool, limit: i64) -> AppResult<Vec<Notification>> {
        let notifications = sqlx::query_as::<_, Notification>(
            "SELECT id, symbol, notification_type, title, message, is_read, created_at FROM notifications ORDER BY created_at DESC LIMIT $1"
        )
        .bind(limit)
        .fetch_all(db)
        .await?;

        Ok(notifications)
    }

    /// Create a new notification
    pub async fn create(
        db: &PgPool,
        symbol: &str,
        notification_type: &str,
        title: &str,
        message: &str,
    ) -> AppResult<Notification> {
        let notification = sqlx::query_as::<_, Notification>(
            r#"
            INSERT INTO notifications (symbol, notification_type, title, message)
            VALUES ($1, $2, $3, $4)
            RETURNING id, symbol, notification_type, title, message, is_read, created_at
            "#
        )
        .bind(symbol)
        .bind(notification_type)
        .bind(title)
        .bind(message)
        .fetch_one(db)
        .await?;

        Ok(notification)
    }

    /// Mark notification as read
    pub async fn mark_read(db: &PgPool, id: i32) -> AppResult<()> {
        sqlx::query("UPDATE notifications SET is_read = true WHERE id = $1")
            .bind(id)
            .execute(db)
            .await?;
        Ok(())
    }

    /// Create a price alert notification
    pub async fn create_price_alert(
        db: &PgPool,
        symbol: &str,
        target_price: f64,
        direction: &str,
    ) -> AppResult<Notification> {
        let title = format!("Price Alert: {} {} ${:.2}", symbol, direction, target_price);
        let message = format!(
            "Alert will trigger when {} price goes {} ${:.2}",
            symbol, direction, target_price
        );

        Self::create(db, symbol, "price_alert", &title, &message).await
    }
}
