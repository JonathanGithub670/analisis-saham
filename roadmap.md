# 📈 Stock Analysis App Roadmap (Rust + Next.js + AI)

## Overview

This document defines the full roadmap, architecture, and implementation plan for building a stock analysis application that provides:

* Stock search (Indonesia & global)
* Price charts
* Technical indicators
* Bullish/Bearish signals
* AI-based predictions (Phase 2+)
* Broker summary (optional)
* Sentiment analysis
* Notifications

---

# 🧱 1. System Architecture

## High-Level Architecture

Frontend (Next.js)

* UI Dashboard
* Chart Visualization
* Search & Filters

Backend (Rust - Axum / Actix)

* REST API
* Data Processing
* Indicator Engine
* AI Integration Layer

AI Service (Python - FastAPI)

* ML Model Inference
* Prediction API

Database

* PostgreSQL (core data)
* TimescaleDB (time-series stock data)

Cache

* Redis (price caching & performance)

External APIs

* Stock price providers (Yahoo Finance, Alpha Vantage, etc.)

---

## Architecture Flow

1. User searches stock
2. Frontend calls Rust API
3. Rust fetches:

   * Cached data (Redis) OR
   * External API
4. Rust calculates indicators
5. Rust calls AI service (optional)
6. Response returned to frontend

---

# ⚙️ 2. Backend (Rust) Design

## Tech Stack

* Axum / Actix Web
* Tokio (async runtime)
* Reqwest (HTTP client)
* Serde (serialization)
* SQLx / Diesel (database ORM)
* Redis client

---

## Folder Structure

```
backend/
├── src/
│   ├── main.rs
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── indicators/
│   ├── models/
│   ├── utils/
│   └── ai/
```

---

## API Endpoints

### 1. Search Stock

```
GET /api/stocks/search?q=BBCA
```

Response:

```
{
  "symbol": "BBCA",
  "name": "Bank Central Asia"
}
```

---

### 2. Get Stock Detail

```
GET /api/stocks/{symbol}
```

Response:

```
{
  "symbol": "BBCA",
  "price": 9850,
  "change": 1.2,
  "volume": 1200000
}
```

---

### 3. Get Historical Data

```
GET /api/stocks/{symbol}/history?interval=1d
```

---

### 4. Indicators

```
GET /api/stocks/{symbol}/indicators
```

Response:

```
{
  "rsi": 32,
  "macd": -1.2,
  "ma20": 9800,
  "ma50": 9500
}
```

---

### 5. Signal (Bullish/Bearish)

```
GET /api/stocks/{symbol}/signal
```

Logic Example:

* RSI < 30 → Bullish
* RSI > 70 → Bearish
* MA20 > MA50 → Bullish trend

Response:

```
{
  "signal": "bullish",
  "confidence": 0.65
}
```

---

### 6. AI Prediction

```
GET /api/stocks/{symbol}/ai
```

---

# 📊 3. Indicator Engine

Implement:

* RSI
* MACD
* Moving Average (MA20, MA50)
* Volume trend

Example (pseudo):

```
fn calculate_rsi(prices: Vec<f64>) -> f64
fn calculate_ma(prices: Vec<f64>, period: usize) -> f64
```

---

# 🤖 4. AI Service (Python)

## Tech Stack

* FastAPI
* Scikit-learn / TensorFlow
* Pandas / NumPy

---

## Folder Structure

```
ai-service/
├── app.py
├── model/
├── data/
└── utils/
```

---

## Model Type (Phase 2)

### Classification Model

Predict:

* Up (1)
* Down (0)

---

## Features

* RSI
* MACD
* MA20
* MA50
* Volume

---

## Example Model (Python)

```
from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier()

model.fit(X_train, y_train)
```

---

## API Endpoint

```
POST /predict
```

Request:

```
{
  "rsi": 32,
  "macd": -1.2,
  "ma20": 9800,
  "ma50": 9500
}
```

Response:

```
{
  "prediction": "bullish",
  "probability": 0.72
}
```

---

## Rust → Python Integration

Use HTTP call:

```
POST http://ai-service:8000/predict
```

Rust example:

```
let response = client.post("http://ai-service/predict")
    .json(&payload)
    .send()
    .await?;
```

---

# 🎨 5. Frontend (Next.js)

## Tech Stack

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* Chart Library (TradingView / Recharts)

---

## Folder Structure

```
frontend/
├── app/
├── components/
├── services/
├── hooks/
└── types/
```

---

## Pages

### 1. Home

* Search bar
* Popular stocks

### 2. Stock Detail

* Chart
* Indicators
* Signal
* AI prediction

---

## Components

* StockSearch
* StockChart
* IndicatorPanel
* SignalBadge
* AIAnalysisCard

---

## Example UI Data

```
Stock: BBCA

Price: 9,850
Trend: Bullish

Indicators:
- RSI: 32
- MA20: 9800
- MA50: 9500

AI Analysis:
- Prediction: Bullish
- Probability: 72%
```

---

# 🚀 6. Development Phases

---

## ✅ Phase 1 (MVP)

### Features

* Stock search
* Chart
* Technical indicators
* Simple signal (rule-based)

### Requirements

* Stock API (Indonesia/global)
* Indicator calculations in Rust
* Basic UI dashboard

---

## 🚀 Phase 2

### Features

* AI prediction (classification)
* Global stock support

### Requirements

* ML model (Python)
* Feature engineering
* API integration Rust ↔ Python

---

## 🔥 Phase 3

### Features

* Broker summary (optional)
* Sentiment analysis
* Notifications

---

## Broker Summary

Requires:

* Premium data source
* Parsing broker codes (XL, CC, etc.)

---

## Sentiment Analysis

Sources:

* News APIs
* Social media

Model:

* NLP sentiment classifier

---

## Notifications

Types:

* Price alerts
* Signal change
* AI prediction update

Tech:

* WebSocket / Firebase / Email

---

# 🧰 7. Infrastructure

## Deployment

* Backend: Docker + VPS
* AI Service: Docker
* Frontend: Vercel

---

## Dev Tools

* Docker Compose
* GitHub Actions (CI/CD)

---

## Example docker-compose

```
services:
  backend:
    build: ./backend
  ai:
    build: ./ai-service
  db:
    image: postgres
  redis:
    image: redis
```

---

# ⚠️ 8. Important Notes

* AI predictions are probabilistic, not guaranteed
* Financial data may require paid APIs
* Broker summary is hardest feature (data access issue)
* Avoid misleading claims (use "probability", not certainty)

---

# ✅ Final Summary

This roadmap provides:

* Full-stack architecture (Rust + Next.js)
* API design
* AI integration
* Scalable roadmap (MVP → Advanced)

---

# 👉 Suggested Next Step

Start with:

1. Backend API (Rust)
2. Stock data integration
3. Indicator engine
4. Simple UI (Next.js)
