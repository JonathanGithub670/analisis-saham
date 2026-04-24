"""
StockPulse AI Service — FastAPI Application
Provides ML prediction and sentiment analysis endpoints.
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv

from model.predictor import StockPredictor
from model.sentiment import SentimentAnalyzer

load_dotenv()

app = FastAPI(
    title="StockPulse AI Service",
    description="ML Prediction & Sentiment Analysis for Stock Analysis",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models
predictor = StockPredictor()
sentiment_analyzer = SentimentAnalyzer()


# --- Request/Response Models ---

class PredictRequest(BaseModel):
    symbol: str
    rsi: float = 50.0
    macd: float = 0.0
    ma20: float = 0.0
    ma50: float = 0.0
    volume_avg: float = 0.0


class PredictResponse(BaseModel):
    symbol: str
    prediction: str
    probability: float
    features_used: List[str]


class SentimentRequest(BaseModel):
    symbol: str


class SentimentHeadline(BaseModel):
    title: str
    sentiment: str
    score: float
    source: Optional[str] = None
    url: Optional[str] = None


class SentimentResponse(BaseModel):
    symbol: str
    overall_sentiment: str
    compound_score: float
    positive_ratio: float
    negative_ratio: float
    neutral_ratio: float
    articles_analyzed: int
    headlines: List[SentimentHeadline]


# --- Endpoints ---

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "StockPulse AI Service",
        "version": "0.1.0",
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """Predict stock direction using ML model."""
    try:
        result = predictor.predict(
            symbol=request.symbol,
            rsi=request.rsi,
            macd=request.macd,
            ma20=request.ma20,
            ma50=request.ma50,
            volume_avg=request.volume_avg,
        )
        return PredictResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sentiment", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest):
    """Analyze news sentiment for a stock."""
    try:
        result = sentiment_analyzer.analyze(request.symbol)
        return SentimentResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
