import type { Metadata } from "next";
import Link from "next/link";
import { listEntries } from "@/lib/journal";

export const metadata: Metadata = {
  title: "Bitácora · Lab Hub",
  description: "Notas de experimentos y casos de estudio del lab.",
};

const KIND_LABEL = { nota: "Nota", "caso-de-estudio": "Caso de estudio" } as const;

export default async function JournalPage() {
  const entries = await listEntries();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-medium text-fg-strong">Bitácora</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Notas de experimentos, decisiones y casos de estudio.
        </p>
      </section>

      {entries.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay entradas publicadas.</p>
      ) : (
        <ol className="flex flex-col divide-y divide-line border-y border-line">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <Link href={`/bitacora/${entry.slug}`} className="group flex flex-col gap-1 py-4">
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <time dateTime={entry.date} className="font-mono">
                    {entry.date}
                  </time>
                  <span>{KIND_LABEL[entry.kind]}</span>
                  {entry.draft && <span className="rounded bg-surface-2 px-2 text-warn">borrador</span>}
                </span>
                <span className="text-base text-fg-strong group-hover:text-accent">{entry.title}</span>
                <span className="text-sm text-muted">{entry.summary}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
