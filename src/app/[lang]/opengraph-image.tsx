import { isLocale } from "@/i18n/config";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { OG_SIZE, ogCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Lab Hub";

// Image routes are Route Handlers: next/root-params isn't available, so read `params`.
export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const t = DICTIONARIES[isLocale(lang) ? lang : "en"];
  return ogCard({ eyebrow: "Lab Hub", title: t.home.title, subtitle: t.meta.description });
}
