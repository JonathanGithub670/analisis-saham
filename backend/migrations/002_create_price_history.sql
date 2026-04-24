-- Create price history table (TimescaleDB hypertable)
CREATE TABLE IF NOT EXISTS price_history (
    id BIGSERIAL,
    symbol VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    open DOUBLE PRECISION NOT NULL,
    high DOUBLE PRECISION NOT NULL,
    low DOUBLE PRECISION NOT NULL,
    close DOUBLE PRECISION NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    UNIQUE(symbol, date)
);

CREATE INDEX idx_price_history_symbol ON price_history(symbol);
CREATE INDEX idx_price_history_symbol_date ON price_history(symbol, date DESC);
