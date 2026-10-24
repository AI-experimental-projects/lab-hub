import type { Metadata } from "next";
import { localePath, type Locale } from "../i18n/config.ts";

export const SITE_URL = "https://lab.beaiapp.com";

// Canonical URL for this locale plus hreflang links to every version of the page.
export function alternatesFor(locale: Locale, path: string): Metadata["alternates"] {
  return {
    canonical: localePath(locale, path),
    languages: {
      en: localePath("en", path),
      es: localePath("es", path),
      "x-default": localePath("en", path),
    },
  };
}
