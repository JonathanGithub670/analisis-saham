import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeSettingsProvider } from "@/contexts/ThemeSettingsContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StockPulse -- AI-Powered Stock Analysis",
  description:
    "Real-time stock analysis with technical indicators, AI predictions, and sentiment analysis. Powered by Rust, Next.js, and Machine Learning.",
  keywords: ["stocks", "analysis", "trading", "AI", "indicators", "RSI", "MACD"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900" suppressHydrationWarning>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        <ThemeProvider>
          <ThemeSettingsProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
