import { readdir } from "node:fs/promises";
import path from "node:path";
import type { MDXContent } from "mdx/types";
import { cacheLife } from "next/cache";
import { z } from "zod";
import { DEFAULT_LOCALE, type Locale } from "../i18n/config.ts";

const JOURNAL_DIR = path.join(process.cwd(), "content", "journal");

// `export const metadata = {...}` at the top of every content/journal/*.mdx.
export const EntryMeta = z
  .object({
    title: z.string().min(1).max(100),
    date: z.iso.date(),
    summary: z.string().min(1).max(240),
    kind: z.enum(["nota", "caso-de-estudio"]).default("nota"),
    // Slug of a project in content/projects, when the entry is about one.
    project: z.string().optional(),
    // Drafts render in `next dev` only.
    draft: z.boolean().default(false),
  })
  .strict();

export type EntryMeta = z.infer<typeof EntryMeta>;
// `lang` is the language the entry is actually shown in (it may fall back).
export type Entry = EntryMeta & { slug: string; lang: Locale };

const showDrafts = process.env.NODE_ENV === "development";

// <slug>.mdx is English, <slug>.es.mdx is Spanish.
const fileFor = (slug: string, lang: Locale) => (lang === DEFAULT_LOCALE ? slug : `${slug}.${lang}`);

async function availability(): Promise<Map<string, Set<Locale>>> {
  const map = new Map<string, Set<Locale>>();
  for (const file of await readdir(JOURNAL_DIR)) {
    const m = file.match(/^([a-z0-9-]+?)(?:\.(es))?\.mdx$/);
    if (!m) continue;
    const langs = map.get(m[1]) ?? new Set<Locale>();
    langs.add((m[2] as Locale | undefined) ?? DEFAULT_LOCALE);
    map.set(m[1], langs);
  }
  return map;
}

async function importEntry(slug: string, lang: Locale): Promise<{ meta: EntryMeta; Content: MDXContent }> {
  const file = fileFor(slug, lang);
  const mod = await import(`../../content/journal/${file}.mdx`);
  const result = EntryMeta.safeParse(mod.metadata);
  if (!result.success) {
    throw new Error(`content/journal/${file}.mdx metadata: ${result.error.message}`);
  }
  return { meta: result.data, Content: mod.default };
}

// Every slug, drafts included. Route params only: drafts still 404 outside `next dev`.
export async function listSlugs(): Promise<string[]> {
  return [...(await availability()).keys()];
}

// The requested language when the entry has it, otherwise the other one.
function pick(langs: Set<Locale>, want: Locale): Locale {
  return langs.has(want) ? want : [...langs][0];
}

// Content ships with the image, so it can't change between builds.
export async function listEntries(want: Locale): Promise<Entry[]> {
  "use cache";
  cacheLife("max");

  const entries = await Promise.all(
    [...(await availability())].map(async ([slug, langs]) => {
      const lang = pick(langs, want);
      return { slug, lang, ...(await importEntry(slug, lang)).meta };
    }),
  );
  return entries
    .filter((e) => showDrafts || !e.draft)
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export async function getEntry(slug: string, want: Locale) {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const entry = (await listEntries(want)).find((e) => e.slug === slug);
  if (!entry) return null;
  return { ...(await importEntry(slug, entry.lang)), lang: entry.lang };
}
