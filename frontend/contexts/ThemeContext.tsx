"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (e?: React.MouseEvent | MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

/**
 * Calculate the maximum distance from a point to any corner of the viewport.
 * This determines the max radius the circle needs to cover the entire screen.
 */
function getMaxRadius(x: number, y: number): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return Math.ceil(
    Math.max(
      Math.hypot(x, y),
      Math.hypot(w - x, y),
      Math.hypot(x, h - y),
      Math.hypot(w - x, h - y)
    )
  );
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe initial state. The real value is synced from the DOM (set by
  // /theme-init.js before hydration) inside the mount effect below, so the
  // server and first client render agree and hydration stays stable.
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  const animatingRef = useRef(false);

  // Sync state from the DOM class once, after mount (client-only).
  useEffect(() => {
    const initial: Theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    setTheme(initial);
    setMounted(true);
  }, []);

  // Apply theme changes to <html> and persist — only after initial sync.
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("stockpulse-theme", theme);
  }, [theme, mounted]);

  const toggleTheme = useCallback(
    (e?: React.MouseEvent | MouseEvent) => {
      if (animatingRef.current) return;

      const nextTheme: Theme = theme === "dark" ? "light" : "dark";

      // Determine the origin of the click for the circle reveal
      let x = window.innerWidth / 2;
      let y = 0;
      if (e) {
        x = e.clientX;
        y = e.clientY;
      }

      const maxRadius = getMaxRadius(x, y);
      const DURATION = 600;

      // --- Try native View Transition API first (Chrome 111+) ---
      if (typeof document !== "undefined" && "startViewTransition" in document) {
        animatingRef.current = true;

        // Safety timeout — always unlock after max duration
        const safetyTimer = setTimeout(() => {
          animatingRef.current = false;
        }, DURATION + 500);

        try {
          const transition = (document as unknown as { startViewTransition: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> } })
            .startViewTransition(() => {
              setTheme(nextTheme);
            });

          transition.ready.then(() => {
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${maxRadius}px at ${x}px ${y}px)`,
                ],
              },
              {
                duration: DURATION,
                easing: "cubic-bezier(0.4, 0, 0.2, 1)",
                pseudoElement: "::view-transition-new(root)",
              }
            );
          }).catch(() => {});

          transition.finished.then(() => {
            clearTimeout(safetyTimer);
            animatingRef.current = false;
          }).catch(() => {
            animatingRef.current = false;
          });
        } catch {
          clearTimeout(safetyTimer);
          animatingRef.current = false;
          setTheme(nextTheme);
        }

        return;
      }

      // --- Fallback: Manual overlay animation ---
      animatingRef.current = true;

      // Colors for the overlay
      const overlayColor = nextTheme === "dark"
        ? "rgba(17, 24, 39, 1)"    // gray-900
        : "rgba(249, 250, 251, 1)"; // gray-50

      // Create the overlay element
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        pointer-events: none;
        background: ${overlayColor};
        clip-path: circle(0px at ${x}px ${y}px);
        transition: clip-path ${DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);
      `;
      document.body.appendChild(overlay);

      // Force a reflow then start the animation
      void overlay.offsetWidth;
      overlay.style.clipPath = `circle(${maxRadius}px at ${x}px ${y}px)`;

      // At the midpoint of the animation, switch the actual theme
      const midpoint = DURATION * 0.35;
      setTimeout(() => {
        setTheme(nextTheme);
      }, midpoint);

      // Remove overlay after animation completes
      setTimeout(() => {
        overlay.style.opacity = "0";
        overlay.style.transition = "opacity 200ms ease";
        setTimeout(() => {
          try {
            document.body.removeChild(overlay);
          } catch {
            // already removed
          }
          animatingRef.current = false;
        }, 200);
      }, DURATION);
    },
    [theme]
  );

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
