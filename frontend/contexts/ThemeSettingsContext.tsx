"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type AccentColor = "default" | "cyan" | "purple" | "blue" | "orange" | "red" | "green";

interface AccentPreset {
  name: string;
  label: string;
  main: string;
  light: string;
  dark: string;
}

interface ThemeSettingsContextType {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  currentPreset: AccentPreset;
}

export const ACCENT_PRESETS: Record<AccentColor, AccentPreset> = {
  default: {
    name: "default",
    label: "Default",
    main: "#465FFF",
    light: "#7592FF",
    dark: "#2A31D8",
  },
  cyan: {
    name: "cyan",
    label: "Cyan",
    main: "#078DEE",
    light: "#68CDF9",
    dark: "#0351AB",
  },
  purple: {
    name: "purple",
    label: "Purple",
    main: "#7635DC",
    light: "#B985F4",
    dark: "#431A9E",
  },
  blue: {
    name: "blue",
    label: "Blue",
    main: "#0C68E9",
    light: "#6BB1F8",
    dark: "#063BA7",
  },
  orange: {
    name: "orange",
    label: "Orange",
    main: "#FDA92D",
    light: "#FED680",
    dark: "#B66816",
  },
  red: {
    name: "red",
    label: "Red",
    main: "#FF3030",
    light: "#FFC1AC",
    dark: "#B71833",
  },
  green: {
    name: "green",
    label: "Green",
    main: "#12B76A",
    light: "#6CE9A6",
    dark: "#027A48",
  },
};

const STORAGE_KEY = "stockpulse-accent-color";

const ThemeSettingsContext = createContext<ThemeSettingsContextType | null>(null);

function applyAccentToDOM(preset: AccentPreset) {
  const root = document.documentElement;
  // Brand color variables used by Tailwind
  root.style.setProperty("--color-brand-500", preset.main);
  root.style.setProperty("--color-brand-400", preset.light);
  root.style.setProperty("--color-brand-600", preset.dark);
  root.style.setProperty("--color-brand-700", preset.dark);
  // GooeyNav particle & pill colors
  root.style.setProperty("--gooey-color-1", preset.main);
  root.style.setProperty("--gooey-color-2", preset.light);
  root.style.setProperty("--gooey-color-3", preset.light);
  root.style.setProperty("--gooey-color-4", `${preset.light}99`);
}

export function ThemeSettingsProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColorState] = useState<AccentColor>("default");

  const currentPreset = ACCENT_PRESETS[accentColor];

  // Sync from localStorage after mount to avoid SSR/client mismatch
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as AccentColor | null;
    if (stored && stored in ACCENT_PRESETS) {
      setAccentColorState(stored);
    }
  }, []);

  useEffect(() => {
    applyAccentToDOM(currentPreset);
  }, [currentPreset]);

  const setAccentColor = useCallback((color: AccentColor) => {
    setAccentColorState(color);
    localStorage.setItem(STORAGE_KEY, color);
  }, []);

  return (
    <ThemeSettingsContext.Provider value={{ accentColor, setAccentColor, currentPreset }}>
      {children}
    </ThemeSettingsContext.Provider>
  );
}

export function useThemeSettings() {
  const context = useContext(ThemeSettingsContext);
  if (!context) {
    throw new Error("useThemeSettings must be used within a ThemeSettingsProvider");
  }
  return context;
}
