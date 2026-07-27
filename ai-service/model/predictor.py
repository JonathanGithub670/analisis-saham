"""
Stock Predictor — ML model for stock direction classification.
Uses Random Forest Classifier with technical indicators as features.
"""

import numpy as np
import os
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split


MODEL_PATH = os.path.join(os.path.dirname(__file__), "stock_model.joblib")


class StockPredictor:
    """Predicts stock direction (bullish/bearish) using technical indicators."""

    def __init__(self):
        self.model = None
        self.feature_names = ["rsi", "macd", "ma20", "ma50", "volume_avg"]
        self._load_or_train_model()

    def _load_or_train_model(self):
        """Load existing model or train a new one with synthetic data."""
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
                print("[OK] Loaded existing ML model")
                return
            except Exception:
                pass

        print("[...] Training new ML model with initial data...")
        self._train_initial_model()

    def _train_initial_model(self):
        """Train model with synthetic data based on known market patterns."""
        np.random.seed(42)
        n_samples = 2000

        # Generate realistic feature distributions
        rsi = np.random.uniform(10, 90, n_samples)
        macd = np.random.normal(0, 2, n_samples)
        ma20 = np.random.uniform(50, 500, n_samples)
        ma50 = ma20 + np.random.normal(0, 20, n_samples)  # MA50 close to MA20
        volume_avg = np.random.uniform(100000, 50000000, n_samples)

        X = np.column_stack([rsi, macd, ma20, ma50, volume_avg])

        # Generate labels based on known patterns
        y = np.zeros(n_samples, dtype=int)
        for i in range(n_samples):
            score = 0
            # RSI oversold = bullish signal
            if rsi[i] < 30:
                score += 2
            elif rsi[i] > 70:
                score -= 2
            # MACD positive = bullish
            if macd[i] > 0:
                score += 1
            else:
                score -= 1
            # Golden cross (MA20 > MA50 = bullish)
            if ma20[i] > ma50[i]:
                score += 1
            else:
                score -= 1

            # Add some noise
            score += np.random.normal(0, 0.5)
            y[i] = 1 if score > 0 else 0

        # Train
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(X_train, y_train)

        accuracy = self.model.score(X_test, y_test)
        print(f"[OK] Model trained — Accuracy: {accuracy:.2%}")

        # Save model
        joblib.dump(self.model, MODEL_PATH)
        print(f"[OK] Model saved to {MODEL_PATH}")

    def predict(self, symbol: str, rsi: float, macd: float, ma20: float, ma50: float, volume_avg: float) -> dict:
        """Make a prediction for a stock."""
        features = np.array([[rsi, macd, ma20, ma50, volume_avg]])
        prediction = self.model.predict(features)[0]
        probabilities = self.model.predict_proba(features)[0]

        predicted_class = "bullish" if prediction == 1 else "bearish"
        probability = float(max(probabilities))

        return {
            "symbol": symbol.upper(),
            "prediction": predicted_class,
            "probability": round(probability, 4),
            "features_used": self.feature_names,
        }
