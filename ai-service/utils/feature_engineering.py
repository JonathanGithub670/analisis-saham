"""
Feature Engineering — Transforms raw price data into ML features.
"""

import pandas as pd
import numpy as np


def compute_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    """Compute RSI from a price series."""
    delta = prices.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


def compute_macd(prices: pd.Series, fast=12, slow=26, signal=9) -> pd.DataFrame:
    """Compute MACD line, signal line, and histogram."""
    ema_fast = prices.ewm(span=fast, adjust=False).mean()
    ema_slow = prices.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line

    return pd.DataFrame({
        "macd_line": macd_line,
        "signal_line": signal_line,
        "histogram": histogram,
    })


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute all technical features from OHLCV data.
    Input DataFrame must have columns: open, high, low, close, volume
    """
    result = df.copy()

    # RSI
    result["rsi"] = compute_rsi(df["close"])

    # MACD
    macd = compute_macd(df["close"])
    result["macd"] = macd["macd_line"]

    # Moving Averages
    result["ma20"] = df["close"].rolling(window=20).mean()
    result["ma50"] = df["close"].rolling(window=50).mean()

    # Volume average
    result["volume_avg"] = df["volume"].rolling(window=20).mean()

    # Target: next day direction (1=up, 0=down)
    result["next_close"] = df["close"].shift(-1)
    result["target"] = (result["next_close"] > df["close"]).astype(int)

    # Drop NaN rows
    result = result.dropna()

    return result
