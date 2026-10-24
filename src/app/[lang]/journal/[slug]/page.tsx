import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/server";
import { getEntry, listSlugs } from "@/lib/journal";

export async function generateStaticParams() {
  return (await listSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/[lang]/journal/[slug]">): Promise<Metadata> {
  const [{ slug }, { locale }] = await Promise.all([props.params, getDictionary()]);
  const entry = await getEntry(slug, locale);
  if (!entry) return {};
  return { title: `${entry.meta.title} · Lab Hub`, description: entry.meta.summary };
}

export default async function EntryPage(props: PageProps<"/[lang]/journal/[slug]">) {
  const { t } = await getDictionary();
  return (
    <Suspense fallback={<p className="text-sm text-muted">{t.loading}</p>}>
      <EntryDetail params={props.params} />
    </Suspense>
  );
}

async function EntryDetail({ params }: Pick<PageProps<"/[lang]/journal/[slug]">, "params">) {
  const [{ slug }, { locale, t }] = await Promise.all([params, getDictionary()]);
  const entry = await getEntry(slug, locale);
  if (!entry) notFound();
  const { meta, Content, lang } = entry;

  return (
    <article className="flex flex-col gap-8" lang={lang}>
      <header className="flex flex-col gap-2">
        <Link href={localePath(locale, "/journal")} className="text-sm text-muted hover:text-fg-strong">
          {t.journal.back}
        </Link>
        <h1 className="text-2xl font-medium text-fg-strong">{meta.title}</h1>
        <p className="flex flex-wrap gap-x-3 text-xs text-muted">
          <time dateTime={meta.date} className="font-mono">
            {meta.date}
          </time>
          {meta.project && (
            <Link href={localePath(locale, `/projects/${meta.project}`)} className="hover:text-fg-strong">
              {t.journal.project}: {meta.project}
            </Link>
          )}
          {lang !== locale && <span>{t.journal.onlyIn}</span>}
          {meta.draft && <span className="text-warn">{t.journal.draft}</span>}
        </p>
      </header>
      <div className="prose-lab">
        <Content />
      </div>
    </article>
  );
}
