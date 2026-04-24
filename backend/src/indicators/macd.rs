use crate::models::MacdResult;

/// Calculate MACD (Moving Average Convergence Divergence)
///
/// MACD Line = EMA(12) - EMA(26)
/// Signal Line = EMA(9) of MACD Line
/// Histogram = MACD Line - Signal Line
pub fn calculate_macd(
    prices: &[f64],
    fast_period: usize,
    slow_period: usize,
    signal_period: usize,
) -> Option<MacdResult> {
    if prices.len() < slow_period + signal_period {
        return None;
    }

    // Calculate fast and slow EMAs
    let fast_ema = calculate_ema_series(prices, fast_period)?;
    let slow_ema = calculate_ema_series(prices, slow_period)?;

    // MACD line = Fast EMA - Slow EMA
    // Align from the slow_period start point
    let start = slow_period - 1;
    let macd_line: Vec<f64> = (start..prices.len())
        .map(|i| {
            let fast_idx = i - (fast_period - 1).min(i);
            let slow_idx = i - (slow_period - 1).min(i);
            let f = if fast_idx < fast_ema.len() { fast_ema[i - (prices.len() - fast_ema.len())] } else { fast_ema[0] };
            let s = if slow_idx < slow_ema.len() { slow_ema[i - (prices.len() - slow_ema.len())] } else { slow_ema[0] };
            f - s
        })
        .collect();

    if macd_line.len() < signal_period {
        return None;
    }

    // Signal line = EMA of MACD line
    let signal_ema = calculate_ema_series(&macd_line, signal_period)?;

    let macd_val = *macd_line.last()?;
    let signal_val = *signal_ema.last()?;
    let histogram = macd_val - signal_val;

    Some(MacdResult {
        macd_line: (macd_val * 100.0).round() / 100.0,
        signal_line: (signal_val * 100.0).round() / 100.0,
        histogram: (histogram * 100.0).round() / 100.0,
    })
}

/// Calculate EMA series for a given period
fn calculate_ema_series(data: &[f64], period: usize) -> Option<Vec<f64>> {
    if data.len() < period {
        return None;
    }

    let multiplier = 2.0 / (period as f64 + 1.0);
    let mut ema_values = Vec::with_capacity(data.len() - period + 1);

    // First EMA value is the SMA
    let sma: f64 = data[..period].iter().sum::<f64>() / period as f64;
    ema_values.push(sma);

    // Calculate subsequent EMA values
    for i in period..data.len() {
        let prev_ema = *ema_values.last().unwrap();
        let ema = (data[i] - prev_ema) * multiplier + prev_ema;
        ema_values.push(ema);
    }

    Some(ema_values)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_macd_calculation() {
        // Generate sample price data (50 data points)
        let prices: Vec<f64> = (0..50)
            .map(|i| 100.0 + (i as f64 * 0.5) + (i as f64 * 0.1).sin() * 5.0)
            .collect();

        let result = calculate_macd(&prices, 12, 26, 9);
        assert!(result.is_some());
    }

    #[test]
    fn test_macd_insufficient_data() {
        let prices = vec![100.0, 101.0, 102.0];
        let result = calculate_macd(&prices, 12, 26, 9);
        assert!(result.is_none());
    }

    #[test]
    fn test_ema_series() {
        let data = vec![10.0, 11.0, 12.0, 13.0, 14.0, 15.0];
        let ema = calculate_ema_series(&data, 3);
        assert!(ema.is_some());
        let ema_vals = ema.unwrap();
        assert!(!ema_vals.is_empty());
    }
}
