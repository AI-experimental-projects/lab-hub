// English is the default and lives at the root (/projects/x); Spanish under /es.
export const LOCALES = ["en", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const isLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);

// Public URL for a path in a locale: "/projects/x" or "/es/projects/x".
export function localePath(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path;
  return locale === DEFAULT_LOCALE ? clean || "/" : `/${locale}${clean}`;
}

// Intl locale for dates and numbers.
export const INTL: Record<Locale, string> = { en: "en-US", es: "es-MX" };
