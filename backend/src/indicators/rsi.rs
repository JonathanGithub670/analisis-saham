/// Calculate the Relative Strength Index (RSI)
///
/// RSI = 100 - (100 / (1 + RS))
/// RS = Average Gain / Average Loss over `period` periods
///
/// Default period is 14.
pub fn calculate_rsi(prices: &[f64], period: usize) -> Option<f64> {
    if prices.len() < period + 1 {
        return None;
    }

    let mut gains = Vec::new();
    let mut losses = Vec::new();

    // Calculate price changes
    for i in 1..prices.len() {
        let change = prices[i] - prices[i - 1];
        if change > 0.0 {
            gains.push(change);
            losses.push(0.0);
        } else {
            gains.push(0.0);
            losses.push(change.abs());
        }
    }

    if gains.len() < period {
        return None;
    }

    // Calculate initial average gain and loss
    let mut avg_gain: f64 = gains[..period].iter().sum::<f64>() / period as f64;
    let mut avg_loss: f64 = losses[..period].iter().sum::<f64>() / period as f64;

    // Smooth using Wilder's smoothing method
    for i in period..gains.len() {
        avg_gain = (avg_gain * (period as f64 - 1.0) + gains[i]) / period as f64;
        avg_loss = (avg_loss * (period as f64 - 1.0) + losses[i]) / period as f64;
    }

    if avg_loss == 0.0 {
        return Some(100.0);
    }

    let rs = avg_gain / avg_loss;
    let rsi = 100.0 - (100.0 / (1.0 + rs));

    Some((rsi * 100.0).round() / 100.0) // Round to 2 decimals
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rsi_calculation() {
        let prices = vec![
            44.0, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84,
            46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22,
        ];
        let rsi = calculate_rsi(&prices, 14);
        assert!(rsi.is_some());
        let rsi_val = rsi.unwrap();
        assert!(rsi_val > 0.0 && rsi_val < 100.0);
    }

    #[test]
    fn test_rsi_insufficient_data() {
        let prices = vec![44.0, 44.34, 44.09];
        let rsi = calculate_rsi(&prices, 14);
        assert!(rsi.is_none());
    }

    #[test]
    fn test_rsi_all_gains() {
        let prices: Vec<f64> = (0..20).map(|i| 100.0 + i as f64).collect();
        let rsi = calculate_rsi(&prices, 14);
        assert!(rsi.is_some());
        assert_eq!(rsi.unwrap(), 100.0);
    }
}
