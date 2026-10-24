import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getEntry, listSlugs } from "@/lib/journal";

export async function generateStaticParams() {
  return (await listSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/bitacora/[slug]">): Promise<Metadata> {
  const entry = await getEntry((await props.params).slug);
  if (!entry) return {};
  return { title: `${entry.meta.title} · Lab Hub`, description: entry.meta.summary };
}

export default function EntryPage(props: PageProps<"/bitacora/[slug]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
      <EntryDetail params={props.params} />
    </Suspense>
  );
}

async function EntryDetail({ params }: Pick<PageProps<"/bitacora/[slug]">, "params">) {
  const entry = await getEntry((await params).slug);
  if (!entry) notFound();
  const { meta, Content } = entry;

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link href="/bitacora" className="text-sm text-muted hover:text-fg-strong">
          ← Bitácora
        </Link>
        <h1 className="text-2xl font-medium text-fg-strong">{meta.title}</h1>
        <p className="flex flex-wrap gap-x-3 text-xs text-muted">
          <time dateTime={meta.date} className="font-mono">
            {meta.date}
          </time>
          {meta.project && (
            <Link href={`/proyectos/${meta.project}`} className="hover:text-fg-strong">
              proyecto: {meta.project}
            </Link>
          )}
          {meta.draft && <span className="text-warn">borrador</span>}
        </p>
      </header>
      <div className="prose-lab">
        <Content />
      </div>
    </article>
  );
}
