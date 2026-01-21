"use client";

export type Theme = "light" | "dark";
const KEY = "rf_theme";

export function getTheme(): Theme {
  const v = localStorage.getItem(KEY);
  if (v === "dark" || v === "light") return v;
  return "light";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme);
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
