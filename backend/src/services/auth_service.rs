use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, TokenData, Validation};
use rand::Rng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;
use validator::Validate;

use crate::config::Config;
use crate::error::{AppError, AppResult};
use crate::models::{
    LoginRequest, LogoutRequest, RefreshRequest, RegisterRequest, TokenResponse, User,
    UserResponse,
};

/// JWT Claims payload
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String, // user ID
    pub email: String,
    pub exp: usize, // expiry timestamp
    pub iat: usize, // issued at
}

/// Hash a password using Argon2id
pub fn hash_password(password: &str) -> AppResult<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default(); // Argon2id variant by default

    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|h| h.to_string())
        .map_err(|e| AppError::Internal(format!("Password hashing failed: {}", e)))
}

/// Verify a password against its Argon2id hash
pub fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
    let parsed_hash = PasswordHash::new(hash)
        .map_err(|e| AppError::Internal(format!("Invalid password hash format: {}", e)))?;

    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok())
}

/// Generate a JWT access token
pub fn generate_access_token(user: &User, config: &Config) -> AppResult<String> {
    let now = Utc::now();
    let exp = now + Duration::seconds(config.jwt_access_expiry_secs as i64);

    let claims = Claims {
        sub: user.id.to_string(),
        email: user.email.clone(),
        exp: exp.timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("Token generation failed: {}", e)))
}

/// Verify and decode a JWT access token
pub fn verify_access_token(token: &str, config: &Config) -> AppResult<TokenData<Claims>> {
    let mut validation = Validation::default();
    validation.validate_exp = true;

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(config.jwt_secret.as_bytes()),
        &validation,
    )
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => {
            AppError::Unauthorized("Token has expired".to_string())
        }
        jsonwebtoken::errors::ErrorKind::InvalidToken => {
            AppError::Unauthorized("Invalid token".to_string())
        }
        _ => AppError::Unauthorized(format!("Token validation failed: {}", e)),
    })
}

/// Generate a random refresh token string
fn generate_refresh_token_string() -> String {
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..64).map(|_| rng.gen::<u8>()).collect();
    hex::encode(bytes)
}

/// Hash a refresh token for database storage (SHA-256)
fn hash_refresh_token(token: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(token.as_bytes());
    hex::encode(hasher.finalize())
}

/// Register a new user
pub async fn register_user(
    db: &PgPool,
    request: RegisterRequest,
) -> AppResult<UserResponse> {
    // Validate input
    request
        .validate()
        .map_err(|e| AppError::ValidationError(format!("{}", e)))?;

    // Check if email already exists
    let existing = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE email = $1")
        .bind(&request.email)
        .fetch_one(db)
        .await?;

    if existing > 0 {
        return Err(AppError::Conflict("Email already registered".to_string()));
    }

    // Hash password
    let password_hash = hash_password(&request.password)?;

    // Insert user
    let user = sqlx::query_as::<_, User>(
        r#"
        INSERT INTO users (email, username, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, email, username, password_hash, created_at, updated_at
        "#,
    )
    .bind(&request.email)
    .bind(&request.username)
    .bind(&password_hash)
    .fetch_one(db)
    .await?;

    tracing::info!("New user registered: {} ({})", user.username, user.email);

    Ok(UserResponse::from(user))
}

/// Login a user and issue token pair
pub async fn login_user(
    db: &PgPool,
    config: &Config,
    request: LoginRequest,
) -> AppResult<TokenResponse> {
    // Find user by email
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE email = $1")
        .bind(&request.email)
        .fetch_optional(db)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Invalid email or password".to_string()))?;

    // Verify password
    let is_valid = verify_password(&request.password, &user.password_hash)?;
    if !is_valid {
        return Err(AppError::Unauthorized(
            "Invalid email or password".to_string(),
        ));
    }

    // Generate tokens
    let access_token = generate_access_token(&user, config)?;
    let refresh_token = generate_refresh_token_string();
    let refresh_token_hash = hash_refresh_token(&refresh_token);

    // Store refresh token hash in database
    let expires_at = Utc::now() + Duration::seconds(config.jwt_refresh_expiry_secs as i64);
    sqlx::query(
        r#"
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(user.id)
    .bind(&refresh_token_hash)
    .bind(expires_at)
    .execute(db)
    .await?;

    tracing::info!("User logged in: {} ({})", user.username, user.email);

    Ok(TokenResponse {
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: config.jwt_access_expiry_secs,
    })
}

/// Refresh tokens — validate refresh token and issue new pair
pub async fn refresh_tokens(
    db: &PgPool,
    config: &Config,
    request: RefreshRequest,
) -> AppResult<TokenResponse> {
    let token_hash = hash_refresh_token(&request.refresh_token);

    // Find the refresh token in database
    let stored_token = sqlx::query_as::<_, crate::models::RefreshTokenRow>(
        r#"
        SELECT id, user_id, token_hash, expires_at, revoked, created_at
        FROM refresh_tokens
        WHERE token_hash = $1
        "#,
    )
    .bind(&token_hash)
    .fetch_optional(db)
    .await?
    .ok_or_else(|| AppError::Unauthorized("Invalid refresh token".to_string()))?;

    // Check if revoked
    if stored_token.revoked {
        return Err(AppError::Unauthorized(
            "Refresh token has been revoked".to_string(),
        ));
    }

    // Check if expired
    if stored_token.expires_at < Utc::now() {
        return Err(AppError::Unauthorized(
            "Refresh token has expired".to_string(),
        ));
    }

    // Revoke the old refresh token (rotation)
    sqlx::query("UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1")
        .bind(stored_token.id)
        .execute(db)
        .await?;

    // Get user
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(stored_token.user_id)
        .fetch_one(db)
        .await?;

    // Generate new token pair
    let new_access_token = generate_access_token(&user, config)?;
    let new_refresh_token = generate_refresh_token_string();
    let new_refresh_token_hash = hash_refresh_token(&new_refresh_token);

    // Store new refresh token
    let expires_at = Utc::now() + Duration::seconds(config.jwt_refresh_expiry_secs as i64);
    sqlx::query(
        r#"
        INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(user.id)
    .bind(&new_refresh_token_hash)
    .bind(expires_at)
    .execute(db)
    .await?;

    tracing::info!("Tokens refreshed for user: {}", user.email);

    Ok(TokenResponse {
        access_token: new_access_token,
        refresh_token: new_refresh_token,
        token_type: "Bearer".to_string(),
        expires_in: config.jwt_access_expiry_secs,
    })
}

/// Logout — revoke the refresh token
pub async fn logout_user(db: &PgPool, request: LogoutRequest) -> AppResult<()> {
    let token_hash = hash_refresh_token(&request.refresh_token);

    let result =
        sqlx::query("UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1 AND revoked = FALSE")
            .bind(&token_hash)
            .execute(db)
            .await?;

    if result.rows_affected() == 0 {
        tracing::warn!("Logout attempted with invalid or already-revoked refresh token");
    } else {
        tracing::info!("User logged out successfully");
    }

    // Always return success (don't reveal whether token existed)
    Ok(())
}

/// Get user by ID
pub async fn get_user_by_id(db: &PgPool, user_id: Uuid) -> AppResult<UserResponse> {
    let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
        .bind(user_id)
        .fetch_optional(db)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".to_string()))?;

    Ok(UserResponse::from(user))
}
