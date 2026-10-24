import type { MetadataRoute } from "next";
import { LOCALES, localePath } from "@/i18n/config";
import { listEntries } from "@/lib/journal";
import { getManifests } from "@/lib/projects";
import { SITE_URL } from "@/lib/site";

// Every page in both languages, each pointing at its other versions.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [manifests, entries] = await Promise.all([getManifests(), listEntries("en")]);
  const paths = [
    "/",
    "/journal",
    ...manifests.map((m) => `/projects/${m.slug}`),
    ...entries.filter((e) => !e.draft).map((e) => `/journal/${e.slug}`),
  ];

  return paths.flatMap((path) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}${localePath(locale, path)}`,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}${localePath(l, path)}`])),
      },
    })),
  );
}
