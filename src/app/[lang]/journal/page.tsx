import type { Metadata } from "next";
import Link from "next/link";
import { localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { listEntries } from "@/lib/journal";
import { alternatesFor } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getDictionary();
  return {
    title: `${t.journal.title} · Lab Hub`,
    description: t.journal.intro,
    alternates: alternatesFor(locale, "/journal"),
  };
}

export default async function JournalPage() {
  const { locale, t } = await getDictionary();
  const entries = await listEntries(locale);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-medium text-fg-strong">{t.journal.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{t.journal.intro}</p>
      </section>

      {entries.length === 0 ? (
        <p className="text-sm text-muted">{t.journal.empty}</p>
      ) : (
        <ol className="flex flex-col divide-y divide-line border-y border-line">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <Link href={localePath(locale, `/journal/${entry.slug}`)} className="group flex flex-col gap-1 py-4">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <time dateTime={entry.date} className="font-mono">
                    {entry.date}
                  </time>
                  <span>{t.journal.kind[entry.kind]}</span>
                  {entry.lang !== locale && <span>{t.journal.onlyIn}</span>}
                  {entry.draft && <span className="rounded bg-surface-2 px-2 text-warn">{t.journal.draft}</span>}
                </span>
                <span lang={entry.lang} className="text-base text-fg-strong group-hover:text-accent">
                  {entry.title}
                </span>
                <span lang={entry.lang} className="text-sm text-muted">
                  {entry.summary}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
