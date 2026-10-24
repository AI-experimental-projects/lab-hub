import { isLocale } from "@/i18n/config";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { OG_SIZE, ogCard } from "@/lib/og";
import { getManifests, localizedSummary } from "@/lib/projects";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Lab Hub project";

export async function generateStaticParams() {
  return (await getManifests()).map((m) => ({ slug: m.slug }));
}

// Image routes are Route Handlers: next/root-params isn't available, so read `params`.
export default async function Image({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const locale = isLocale(lang) ? lang : "en";
  const t = DICTIONARIES[locale];
  const manifest = (await getManifests()).find((m) => m.slug === slug);
  if (!manifest) return ogCard({ eyebrow: "Lab Hub", title: t.home.title, subtitle: t.meta.description });
  return ogCard({
    eyebrow: `${t.card.phase} ${manifest.phase}`,
    title: manifest.name,
    subtitle: localizedSummary(manifest, locale),
  });
}
