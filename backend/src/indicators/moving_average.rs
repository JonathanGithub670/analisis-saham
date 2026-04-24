/// Calculate Simple Moving Average (SMA)
///
/// SMA = Sum of prices / Period
pub fn calculate_sma(prices: &[f64], period: usize) -> Option<f64> {
    if prices.len() < period {
        return None;
    }

    let recent = &prices[prices.len() - period..];
    let sum: f64 = recent.iter().sum();
    let sma = sum / period as f64;

    Some((sma * 100.0).round() / 100.0)
}

/// Calculate Exponential Moving Average (EMA)
///
/// EMA = Price * multiplier + Previous EMA * (1 - multiplier)
/// multiplier = 2 / (period + 1)
#[allow(dead_code)]
pub fn calculate_ema(prices: &[f64], period: usize) -> Option<f64> {
    if prices.len() < period {
        return None;
    }

    let multiplier = 2.0 / (period as f64 + 1.0);

    // First EMA = SMA
    let mut ema: f64 = prices[..period].iter().sum::<f64>() / period as f64;

    // Apply EMA formula for remaining prices
    for &price in &prices[period..] {
        ema = (price - ema) * multiplier + ema;
    }

    Some((ema * 100.0).round() / 100.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sma() {
        let prices = vec![10.0, 20.0, 30.0, 40.0, 50.0];
        let sma = calculate_sma(&prices, 3);
        assert!(sma.is_some());
        assert_eq!(sma.unwrap(), 40.0); // (30 + 40 + 50) / 3
    }

    #[test]
    fn test_sma_insufficient_data() {
        let prices = vec![10.0, 20.0];
        let sma = calculate_sma(&prices, 5);
        assert!(sma.is_none());
    }

    #[test]
    fn test_ema() {
        let prices = vec![10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0];
        let ema = calculate_ema(&prices, 5);
        assert!(ema.is_some());
        let ema_val = ema.unwrap();
        assert!(ema_val > 15.0 && ema_val < 20.0);
    }
}
