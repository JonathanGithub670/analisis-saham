"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import GooeyNav from "@/components/common/GooeyNav";
import {
  useThemeSettings,
  ACCENT_PRESETS,
  type AccentColor,
} from "@/contexts/ThemeSettingsContext";

export default function SettingsDrawer() {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { accentColor, setAccentColor, currentPreset } = useThemeSettings();
  const drawerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const colorOptions: { key: AccentColor; color: string }[] = Object.entries(
    ACCENT_PRESETS
  ).map(([key, preset]) => ({
    key: key as AccentColor,
    color: preset.main,
  }));

  return (
    <>
      {/* Spinning Gear Button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="fixed right-6 top-1/2 -translate-y-1/2 z-[60] w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer hover:scale-110 group"
        style={{
          background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600))",
        }}
        aria-label="Open settings"
        id="settings-gear-btn"
      >
        <svg
          className="w-6 h-6 text-white animate-[spin_6s_linear_infinite] group-hover:animate-[spin_2s_linear_infinite]"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M14.279 2.152C13.909 2 13.439 2 12.5 2s-1.408 0-1.779.152a2.008 2.008 0 0 0-1.09 1.083c-.094.223-.13.484-.145.863a1.615 1.615 0 0 1-.796 1.353a1.64 1.64 0 0 1-1.579.008c-.338-.178-.583-.276-.825-.308a2.026 2.026 0 0 0-1.49.396c-.318.242-.553.646-1.022 1.453c-.47.807-.704 1.21-.757 1.605c-.07.526.074 1.058.4 1.479c.148.192.357.353.68.555c.477.297.783.803.783 1.361c0 .558-.306 1.064-.782 1.36c-.324.203-.533.364-.682.556a1.99 1.99 0 0 0-.399 1.479c.053.394.287.798.757 1.605c.47.807.704 1.21 1.022 1.453c.424.323.96.465 1.49.396c.242-.032.487-.13.825-.308a1.64 1.64 0 0 1 1.58.008c.486.28.774.795.795 1.353c.015.38.051.64.145.863c.204.49.596.88 1.09 1.083c.37.152.84.152 1.779.152s1.409 0 1.779-.152a2.008 2.008 0 0 0 1.09-1.083c.094-.223.13-.483.145-.863c.02-.558.309-1.074.796-1.353a1.64 1.64 0 0 1 1.579-.008c.338.178.583.276.825.308c.53.07 1.066-.073 1.49-.396c.318-.242.553-.646 1.022-1.453c.47-.807.704-1.21.757-1.605a1.99 1.99 0 0 0-.4-1.479c-.148-.192-.357-.353-.68-.555c-.477-.297-.783-.803-.783-1.361c0-.558.306-1.064.782-1.36c.324-.203.533-.364.682-.556a1.99 1.99 0 0 0 .399-1.479c-.053-.394-.287-.798-.757-1.605c-.47-.807-.704-1.21-1.022-1.453a2.026 2.026 0 0 0-1.49-.396c-.242.032-.487.13-.825.308a1.64 1.64 0 0 1-1.58-.008a1.615 1.615 0 0 1-.795-1.353c-.015-.38-.051-.64-.145-.863a2.007 2.007 0 0 0-1.09-1.083"
            opacity="0.5"
          />
          <path
            d="M15.523 12c0 1.657-1.354 3-3.023 3c-1.67 0-3.023-1.343-3.023-3S10.83 9 12.5 9c1.67 0 3.023 1.343 3.023 3"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 z-[80] h-full w-[340px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-65px)] px-5 py-6 space-y-8">

          {/* ─── Dark Mode Toggle (GooeyNav) ─── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
              Mode
            </h3>
            <div className="flex justify-center">
              <GooeyNav
                items={[
                  {
                    label: "☀",
                    onClick: (e: React.MouseEvent) => {
                      if (theme === "dark") toggleTheme(e.nativeEvent);
                    },
                    isToggle: true,
                  },
                  {
                    label: "☽",
                    onClick: (e: React.MouseEvent) => {
                      if (theme === "light") toggleTheme(e.nativeEvent);
                    },
                    isToggle: true,
                  },
                ]}
                animationTime={600}
                particleCount={8}
                particleDistances={[50, 8]}
                particleR={60}
                timeVariance={200}
                colors={[1, 2, 3, 1, 2, 3, 1, 4]}
                initialActiveIndex={theme === "dark" ? 1 : 0}
                className="settings-gooey"
              />
            </div>
          </div>

          {/* ─── Color Presets ─── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Presets
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-600 mb-4">
              Choose your accent color
            </p>

            <div className="grid grid-cols-7 gap-2">
              {colorOptions.map(({ key, color }) => (
                <button
                  key={key}
                  onClick={() => setAccentColor(key)}
                  className={`group relative w-full aspect-square rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 ${
                    accentColor === key
                      ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 scale-110"
                      : ""
                  }`}
                  style={{
                    background: color,
                    ...(accentColor === key ? { ringColor: color } : {}),
                  }}
                  aria-label={`Set color to ${key}`}
                >
                  {accentColor === key && (
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Reset ─── */}
          <button
            onClick={() => setAccentColor("default")}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Reset to Default
          </button>
        </div>
      </div>
    </>
  );
}
