FROM rust:1.88-slim AS builder

WORKDIR /app

# Install PostgreSQL client libraries
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY Cargo.toml Cargo.lock* ./

# Create dummy main for dependency caching
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release 2>/dev/null || true

# Remove dummy build artifacts so cargo is forced to rebuild
RUN rm -rf src target/release/stockpulse-backend target/release/deps/stockpulse_backend*

# Copy actual source
COPY src/ src/
COPY migrations/ migrations/

# Build
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/stockpulse-backend /app/stockpulse-backend
COPY --from=builder /app/migrations /app/migrations

EXPOSE 3001

CMD ["./stockpulse-backend"]
