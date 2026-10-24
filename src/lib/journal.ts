import { readdir } from "node:fs/promises";
import path from "node:path";
import type { MDXContent } from "mdx/types";
import { cacheLife } from "next/cache";
import { z } from "zod";

const JOURNAL_DIR = path.join(process.cwd(), "content", "bitacora");

// `export const metadata = {...}` at the top of every content/bitacora/*.mdx.
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
export type Entry = EntryMeta & { slug: string };

const showDrafts = process.env.NODE_ENV === "development";

async function importEntry(slug: string): Promise<{ meta: EntryMeta; Content: MDXContent }> {
  const mod = await import(`../../content/bitacora/${slug}.mdx`);
  const result = EntryMeta.safeParse(mod.metadata);
  if (!result.success) {
    throw new Error(`content/bitacora/${slug}.mdx metadata: ${result.error.message}`);
  }
  return { meta: result.data, Content: mod.default };
}

// Every file, drafts included. Route params only: drafts still 404 outside `next dev`.
export async function listSlugs(): Promise<string[]> {
  return (await readdir(JOURNAL_DIR))
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => path.basename(f, ".mdx"));
}

// Content ships with the image, so it can't change between builds.
export async function listEntries(): Promise<Entry[]> {
  "use cache";
  cacheLife("max");
  const slugs = await listSlugs();

  const entries = await Promise.all(
    slugs.map(async (slug) => ({ slug, ...(await importEntry(slug)).meta })),
  );
  return entries
    .filter((e) => showDrafts || !e.draft)
    .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export async function getEntry(slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const entries = await listEntries();
  if (!entries.some((e) => e.slug === slug)) return null;
  return importEntry(slug);
}
