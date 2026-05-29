"use client";

import { createContext, useContext, useEffect } from "react";

import { THEME_COOKIE_NAME, type SiteTheme } from "@/lib/theme";

type ThemeContextValue = {
  theme: SiteTheme;
};

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark" });

export function applySiteTheme(theme: SiteTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

type ThemeProviderProps = {
  initialTheme: SiteTheme;
  children: React.ReactNode;
};

export function ThemeProvider({ initialTheme, children }: ThemeProviderProps) {
  useEffect(() => {
    applySiteTheme(initialTheme);
  }, [initialTheme]);

  return (
    <ThemeContext.Provider value={{ theme: initialTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useSiteTheme() {
  return useContext(ThemeContext);
}
