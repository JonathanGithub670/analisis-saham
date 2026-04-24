"""
Model Trainer — Utility for retraining the stock prediction model
with real historical data from the database.
"""

import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "stock_model.joblib")


def train_from_dataframe(df: pd.DataFrame) -> dict:
    """
    Train model from a DataFrame with columns:
    - rsi, macd, ma20, ma50, volume_avg
    - target (1=bullish, 0=bearish)
    """
    feature_cols = ["rsi", "macd", "ma20", "ma50", "volume_avg"]

    X = df[feature_cols].values
    y = df["target"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1,
    )

    # Cross-validation
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="accuracy")

    # Final training
    model.fit(X_train, y_train)

    # Evaluation
    y_pred = model.predict(X_test)
    accuracy = model.score(X_test, y_test)
    report = classification_report(y_test, y_pred, output_dict=True)

    # Save
    joblib.dump(model, MODEL_PATH)

    return {
        "accuracy": accuracy,
        "cv_mean": cv_scores.mean(),
        "cv_std": cv_scores.std(),
        "report": report,
        "feature_importance": dict(zip(feature_cols, model.feature_importances_.tolist())),
    }


if __name__ == "__main__":
    print("Run this module with a DataFrame to retrain the model.")
    print("Example:")
    print("  from model.trainer import train_from_dataframe")
    print("  result = train_from_dataframe(df)")
