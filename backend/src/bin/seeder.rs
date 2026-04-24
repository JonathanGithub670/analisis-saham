use argon2::{
    password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
    Argon2,
};
use sqlx::postgres::PgPoolOptions;
use uuid::Uuid;

#[tokio::main]
async fn main() {
    if dotenvy::dotenv().is_err() {
        dotenvy::from_filename("../.env").ok();
    }

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let db = PgPoolOptions::new()
        .max_connections(2)
        .connect(&database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    println!("Connected to database");

    // Seed users
    let users = vec![
        ("admin", "admin@stockpulse.com", "admin123"),
        ("demo", "demo@stockpulse.com", "demo1234"),
    ];

    let argon2 = Argon2::default();

    for (username, email, password) in &users {
        // Check if user already exists
        let exists: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)")
            .bind(email)
            .fetch_one(&db)
            .await
            .unwrap_or(false);

        if exists {
            println!("User {} already exists, skipping", email);
            continue;
        }

        let salt = SaltString::generate(&mut OsRng);
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .expect("Failed to hash password")
            .to_string();

        let id = Uuid::new_v4();
        let now = chrono::Utc::now();

        sqlx::query(
            "INSERT INTO users (id, email, username, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)"
        )
        .bind(id)
        .bind(email)
        .bind(username)
        .bind(&password_hash)
        .bind(now)
        .bind(now)
        .execute(&db)
        .await
        .expect("Failed to insert user");

        println!("Created user: {} ({})", username, email);
    }

    println!("\nSeeding complete!");
    println!("You can now login with:");
    println!("  Email: admin@stockpulse.com | Password: admin123");
    println!("  Email: demo@stockpulse.com  | Password: demo1234");
}
