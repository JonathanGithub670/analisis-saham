use crate::error::{AppError, AppResult};
use crate::models::{OhlcvData, StockQuote, StockSearchResult};
use serde_json::Value;

const BASE_URL: &str = "https://www.alphavantage.co/query";

/// Alpha Vantage API client
pub struct AlphaVantageClient {
    api_key: String,
    http_client: reqwest::Client,
}

impl AlphaVantageClient {
    pub fn new(api_key: String, http_client: reqwest::Client) -> Self {
        Self { api_key, http_client }
    }

    /// Search for stocks by keyword
    pub async fn search_stocks(&self, query: &str) -> AppResult<Vec<StockSearchResult>> {
        let url = format!(
            "{}?function=SYMBOL_SEARCH&keywords={}&apikey={}",
            BASE_URL, query, self.api_key
        );

        let response: Value = self.http_client.get(&url).send().await?.json().await?;

        // Check for API error/rate limit
        Self::check_api_error(&response)?;

        let matches = response["bestMatches"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .map(|item| StockSearchResult {
                symbol: item["1. symbol"].as_str().unwrap_or("").to_string(),
                name: item["2. name"].as_str().unwrap_or("").to_string(),
                r#type: item["3. type"].as_str().map(String::from),
                region: item["4. region"].as_str().map(String::from),
                currency: item["8. currency"].as_str().map(String::from),
                match_score: item["9. matchScore"].as_str().map(String::from),
            })
            .collect();

        Ok(matches)
    }

    /// Get real-time quote for a stock
    pub async fn get_quote(&self, symbol: &str) -> AppResult<StockQuote> {
        let url = format!(
            "{}?function=GLOBAL_QUOTE&symbol={}&apikey={}",
            BASE_URL, symbol, self.api_key
        );

        let response: Value = self.http_client.get(&url).send().await?.json().await?;
        Self::check_api_error(&response)?;

        let quote = &response["Global Quote"];
        if quote.is_null() || quote.as_object().map(|o| o.is_empty()).unwrap_or(true) {
            return Err(AppError::NotFound(format!("Stock {} not found", symbol)));
        }

        Ok(StockQuote {
            symbol: quote["01. symbol"].as_str().unwrap_or(symbol).to_string(),
            name: None, // Alpha Vantage GLOBAL_QUOTE doesn't return name
            price: Self::parse_f64(quote["05. price"].as_str()),
            change: Self::parse_f64(quote["09. change"].as_str()),
            change_percent: Self::parse_percent(quote["10. change percent"].as_str()),
            volume: Self::parse_i64(quote["06. volume"].as_str()),
            high: Self::parse_f64(quote["03. high"].as_str()),
            low: Self::parse_f64(quote["04. low"].as_str()),
            open: Self::parse_f64(quote["02. open"].as_str()),
            previous_close: Self::parse_f64(quote["08. previous close"].as_str()),
            latest_trading_day: quote["07. latest trading day"].as_str().map(String::from),
        })
    }

    /// Get daily historical price data
    pub async fn get_daily(&self, symbol: &str, full: bool) -> AppResult<Vec<OhlcvData>> {
        let outputsize = if full { "full" } else { "compact" };
        let url = format!(
            "{}?function=TIME_SERIES_DAILY&symbol={}&outputsize={}&apikey={}",
            BASE_URL, symbol, outputsize, self.api_key
        );

        let response: Value = self.http_client.get(&url).send().await?.json().await?;
        Self::check_api_error(&response)?;

        let time_series = response["Time Series (Daily)"]
            .as_object()
            .ok_or_else(|| AppError::ExternalApi(format!("No daily data found for {}", symbol)))?;

        let mut data: Vec<OhlcvData> = time_series
            .iter()
            .map(|(date, values)| OhlcvData {
                date: date.clone(),
                open: Self::parse_f64(values["1. open"].as_str()),
                high: Self::parse_f64(values["2. high"].as_str()),
                low: Self::parse_f64(values["3. low"].as_str()),
                close: Self::parse_f64(values["4. close"].as_str()),
                volume: Self::parse_i64(values["5. volume"].as_str()),
            })
            .collect();

        // Sort by date ascending
        data.sort_by(|a, b| a.date.cmp(&b.date));

        Ok(data)
    }

    /// Get intraday historical price data
    pub async fn get_intraday(
        &self,
        symbol: &str,
        interval: &str,
    ) -> AppResult<Vec<OhlcvData>> {
        let interval_str = match interval {
            "1min" | "5min" | "15min" | "30min" | "60min" => interval,
            _ => "5min",
        };

        let url = format!(
            "{}?function=TIME_SERIES_INTRADAY&symbol={}&interval={}&apikey={}",
            BASE_URL, symbol, interval_str, self.api_key
        );

        let response: Value = self.http_client.get(&url).send().await?.json().await?;
        Self::check_api_error(&response)?;

        let key = format!("Time Series ({})", interval_str);
        let time_series = response[&key]
            .as_object()
            .ok_or_else(|| AppError::ExternalApi(format!("No intraday data found for {}", symbol)))?;

        let mut data: Vec<OhlcvData> = time_series
            .iter()
            .map(|(datetime, values)| OhlcvData {
                date: datetime.clone(),
                open: Self::parse_f64(values["1. open"].as_str()),
                high: Self::parse_f64(values["2. high"].as_str()),
                low: Self::parse_f64(values["3. low"].as_str()),
                close: Self::parse_f64(values["4. close"].as_str()),
                volume: Self::parse_i64(values["5. volume"].as_str()),
            })
            .collect();

        data.sort_by(|a, b| a.date.cmp(&b.date));

        Ok(data)
    }

    fn check_api_error(response: &Value) -> AppResult<()> {
        if let Some(note) = response.get("Note") {
            return Err(AppError::ExternalApi(format!(
                "Alpha Vantage rate limit: {}",
                note.as_str().unwrap_or("Rate limit exceeded")
            )));
        }
        if let Some(error) = response.get("Error Message") {
            return Err(AppError::ExternalApi(format!(
                "Alpha Vantage error: {}",
                error.as_str().unwrap_or("Unknown error")
            )));
        }
        if let Some(info) = response.get("Information") {
            return Err(AppError::ExternalApi(format!(
                "Alpha Vantage: {}",
                info.as_str().unwrap_or("API limit reached")
            )));
        }
        Ok(())
    }

    fn parse_f64(s: Option<&str>) -> f64 {
        s.and_then(|v| v.parse::<f64>().ok()).unwrap_or(0.0)
    }

    fn parse_i64(s: Option<&str>) -> i64 {
        s.and_then(|v| v.parse::<i64>().ok()).unwrap_or(0)
    }

    fn parse_percent(s: Option<&str>) -> f64 {
        s.and_then(|v| v.trim_end_matches('%').parse::<f64>().ok())
            .unwrap_or(0.0)
    }
}
