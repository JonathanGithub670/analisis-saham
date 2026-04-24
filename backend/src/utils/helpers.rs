use chrono::NaiveDate;

/// Format large numbers with commas (e.g., 1,234,567)
#[allow(dead_code)]
pub fn format_number(n: i64) -> String {
    let s = n.to_string();
    let mut result = String::new();
    for (i, c) in s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            result.push(',');
        }
        result.push(c);
    }
    result.chars().rev().collect()
}

/// Parse a date string in various formats
#[allow(dead_code)]
pub fn parse_date(date_str: &str) -> Option<NaiveDate> {
    // Try common formats
    NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
        .or_else(|_| NaiveDate::parse_from_str(date_str, "%Y/%m/%d"))
        .or_else(|_| NaiveDate::parse_from_str(date_str, "%d-%m-%Y"))
        .ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_number() {
        assert_eq!(format_number(1234567), "1,234,567");
        assert_eq!(format_number(100), "100");
        assert_eq!(format_number(1000), "1,000");
    }
}
