"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

const readStoredTheme = () => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const persistTheme = (value: "light" | "dark") => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage unavailable */
  }
};

const resolvePreferredTheme = () => {
  if (typeof window === "undefined") {
    return false;
  }
  const stored = readStoredTheme();
  if (stored === "dark") {
    return true;
  }
  if (stored === "light") {
    return false;
  }
  return window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)").matches : false;
};

export function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(() => resolvePreferredTheme());

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    persistTheme(isDark ? "dark" : "light");
  }, [isDark]);

  const handleToggle = () => {
    setIsDark(prev => !prev);
  };

  return (
    <button
      id="themeToggle"
      className="theme-toggle"
      aria-label="Переключить тему"
      type="button"
      onClick={handleToggle}
    >
      <span className="theme-toggle__glow" aria-hidden="true" />
      <span className="icon" aria-hidden="true">
        {isDark ? "☀️" : "🌙"}
      </span>
    </button>
  );
}
