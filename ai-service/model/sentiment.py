"""
Sentiment Analyzer — Analyzes news sentiment for stocks using VADER.
Uses NewsAPI for fetching financial headlines.
"""

import os
import requests
from typing import List, Dict

# Download VADER lexicon on first import
import nltk
try:
    nltk.data.find('sentiment/vader_lexicon.zip')
except LookupError:
    nltk.download('vader_lexicon', quiet=True)

from nltk.sentiment.vader import SentimentIntensityAnalyzer


class SentimentAnalyzer:
    """Analyzes news sentiment for stock symbols."""

    def __init__(self):
        self.vader = SentimentIntensityAnalyzer()
        self.news_api_key = os.getenv("NEWS_API_KEY", "")

    def analyze(self, symbol: str) -> dict:
        """Analyze sentiment for a stock symbol."""
        headlines = self._fetch_headlines(symbol)

        if not headlines:
            # Return neutral if no headlines found
            return {
                "symbol": symbol.upper(),
                "overall_sentiment": "neutral",
                "compound_score": 0.0,
                "positive_ratio": 0.0,
                "negative_ratio": 0.0,
                "neutral_ratio": 1.0,
                "articles_analyzed": 0,
                "headlines": [],
            }

        # Analyze each headline
        analyzed = []
        compound_scores = []
        positive_count = 0
        negative_count = 0
        neutral_count = 0

        for headline in headlines:
            scores = self.vader.polarity_scores(headline["title"])
            compound = scores["compound"]
            compound_scores.append(compound)

            if compound >= 0.05:
                sentiment = "positive"
                positive_count += 1
            elif compound <= -0.05:
                sentiment = "negative"
                negative_count += 1
            else:
                sentiment = "neutral"
                neutral_count += 1

            analyzed.append({
                "title": headline["title"],
                "sentiment": sentiment,
                "score": round(compound, 4),
                "source": headline.get("source"),
                "url": headline.get("url"),
            })

        total = len(analyzed)
        avg_compound = sum(compound_scores) / total if total > 0 else 0.0

        # Determine overall sentiment
        if avg_compound >= 0.05:
            overall = "positive"
        elif avg_compound <= -0.05:
            overall = "negative"
        else:
            overall = "neutral"

        return {
            "symbol": symbol.upper(),
            "overall_sentiment": overall,
            "compound_score": round(avg_compound, 4),
            "positive_ratio": round(positive_count / total, 4) if total > 0 else 0.0,
            "negative_ratio": round(negative_count / total, 4) if total > 0 else 0.0,
            "neutral_ratio": round(neutral_count / total, 4) if total > 0 else 0.0,
            "articles_analyzed": total,
            "headlines": analyzed[:10],  # Limit to 10 headlines
        }

    def _fetch_headlines(self, symbol: str) -> List[Dict]:
        """Fetch news headlines from NewsAPI."""
        if not self.news_api_key:
            # Fallback: use a basic search without API key
            return self._fetch_free_headlines(symbol)

        try:
            url = "https://newsapi.org/v2/everything"
            params = {
                "q": f"{symbol} stock",
                "language": "en",
                "sortBy": "publishedAt",
                "pageSize": 20,
                "apiKey": self.news_api_key,
            }

            response = requests.get(url, params=params, timeout=10)
            if response.status_code != 200:
                return self._fetch_free_headlines(symbol)

            data = response.json()
            articles = data.get("articles", [])

            return [
                {
                    "title": article.get("title", ""),
                    "source": article.get("source", {}).get("name"),
                    "url": article.get("url"),
                }
                for article in articles
                if article.get("title")
            ]
        except Exception:
            return self._fetch_free_headlines(symbol)

    def _fetch_free_headlines(self, symbol: str) -> List[Dict]:
        """Fallback: Fetch headlines from free GNews API."""
        try:
            url = f"https://gnews.io/api/v4/search"
            params = {
                "q": f"{symbol} stock market",
                "lang": "en",
                "max": 10,
                "apikey": os.getenv("GNEWS_API_KEY", ""),
            }

            if not params["apikey"]:
                # No API key available - return empty
                return []

            response = requests.get(url, params=params, timeout=10)
            if response.status_code != 200:
                return []

            data = response.json()
            articles = data.get("articles", [])

            return [
                {
                    "title": article.get("title", ""),
                    "source": article.get("source", {}).get("name"),
                    "url": article.get("url"),
                }
                for article in articles
                if article.get("title")
            ]
        except Exception:
            return []
