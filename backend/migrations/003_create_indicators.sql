-- Create cached indicators table
CREATE TABLE IF NOT EXISTS indicators (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    rsi DOUBLE PRECISION,
    macd_line DOUBLE PRECISION,
    macd_signal DOUBLE PRECISION,
    macd_histogram DOUBLE PRECISION,
    ma20 DOUBLE PRECISION,
    ma50 DOUBLE PRECISION,
    volume_avg DOUBLE PRECISION,
    volume_trend VARCHAR(20),
    calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(symbol)
);
