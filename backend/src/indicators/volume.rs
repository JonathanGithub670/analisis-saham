/// Calculate the average volume over a period
pub fn calculate_volume_average(volumes: &[i64], period: usize) -> Option<f64> {
    if volumes.len() < period {
        return None;
    }

    let recent = &volumes[volumes.len() - period..];
    let sum: i64 = recent.iter().sum();
    let avg = sum as f64 / period as f64;

    Some((avg * 100.0).round() / 100.0)
}

/// Detect volume trend by comparing recent volume to its moving average
///
/// Returns "high", "normal", or "low"
pub fn detect_volume_trend(volumes: &[i64], period: usize) -> Option<String> {
    if volumes.len() < period + 1 {
        return None;
    }

    let avg = calculate_volume_average(&volumes[..volumes.len() - 1], period)?;
    let current = *volumes.last()? as f64;

    let ratio = current / avg;

    let trend = if ratio > 1.5 {
        "high".to_string()
    } else if ratio < 0.5 {
        "low".to_string()
    } else {
        "normal".to_string()
    };

    Some(trend)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_volume_average() {
        let volumes = vec![1000, 2000, 3000, 4000, 5000];
        let avg = calculate_volume_average(&volumes, 3);
        assert!(avg.is_some());
        assert_eq!(avg.unwrap(), 4000.0); // (3000 + 4000 + 5000) / 3
    }

    #[test]
    fn test_volume_trend_high() {
        let volumes = vec![1000, 1000, 1000, 1000, 5000];
        let trend = detect_volume_trend(&volumes, 3);
        assert_eq!(trend, Some("high".to_string()));
    }

    #[test]
    fn test_volume_trend_normal() {
        let volumes = vec![1000, 1000, 1000, 1000, 1000];
        let trend = detect_volume_trend(&volumes, 3);
        assert_eq!(trend, Some("normal".to_string()));
    }
}
