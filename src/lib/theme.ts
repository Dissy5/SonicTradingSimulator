export type SiteTheme = "dark" | "light";

export const THEME_COOKIE_NAME = "sts-theme";

export function parseSiteTheme(value: string | null | undefined): SiteTheme {
  return value === "light" ? "light" : "dark";
}

export function themeCookieValue(theme: SiteTheme): string {
  return theme;
}
