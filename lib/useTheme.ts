"use client";

import { useEffect, useState } from "react";
import type { Theme } from "./theme";
import { getStoredTheme, setStoredTheme, applyTheme } from "./theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return getStoredTheme();
  });

  useEffect(() => {
    applyTheme(theme);

    function onThemeEvent(e: Event) {
      const ce = e as CustomEvent<Theme>;
      if (ce.detail === "dark" || ce.detail === "light") setTheme(ce.detail);
    }

    function onStorage(e: StorageEvent) {
      if (e.key === "rf_theme") setTheme(getStoredTheme());
    }

    window.addEventListener("rf-theme", onThemeEvent as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("rf-theme", onThemeEvent as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [theme]);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredTheme(next);
  }

  function setThemeTo(next: Theme) {
    setTheme(next);
    setStoredTheme(next);
  }

  return { theme, toggleTheme, setThemeTo };
}
