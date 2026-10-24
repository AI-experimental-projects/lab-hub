import { listEntries } from "@/lib/journal";
import { SITE_URL } from "@/lib/site";
import type { Locale } from "@/i18n/config";

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(_req: Request, ctx: { params: Promise<{ lang: string }> }) {
  const { lang } = await ctx.params;
  const locale = (lang === "es" ? "es" : "en") as Locale;
  const entries = await listEntries(locale);
  const base = locale === "es" ? `${SITE_URL}/es/journal` : `${SITE_URL}/journal`;
  const items = entries
    .map((e) => {
      const link = `${base}/${e.slug}`;
      return [
        "    <item>",
        `      <title>${xmlEscape(e.title)}</title>`,
        `      <link>${xmlEscape(link)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        `      <pubDate>${new Date(e.date).toUTCString()}</pubDate>`,
        "    </item>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Lab Hub journal</title>
    <link>${xmlEscape(base)}</link>
    <description>Notes from the homelab</description>
    <language>${locale}</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
