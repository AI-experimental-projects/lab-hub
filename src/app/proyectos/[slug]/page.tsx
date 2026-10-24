import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  formatCheckedAt,
  formatMetric,
  formatUptime,
  Stat,
  StateBadge,
} from "@/components/project-card";
import { listEntries } from "@/lib/journal";
import { getManifests, getProject, type RecentCheck } from "@/lib/projects";

export async function generateStaticParams() {
  return (await getManifests()).map((m) => ({ slug: m.slug }));
}

export async function generateMetadata(props: PageProps<"/proyectos/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const manifest = (await getManifests()).find((m) => m.slug === slug);
  return manifest ? { title: `${manifest.name} · Lab Hub`, description: manifest.summary } : {};
}

export default function ProjectPage(props: PageProps<"/proyectos/[slug]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
      <ProjectDetail params={props.params} />
    </Suspense>
  );
}

async function ProjectDetail({ params }: Pick<PageProps<"/proyectos/[slug]">, "params">) {
  const { slug } = await params;
  const detail = await getProject(slug);
  if (!detail) notFound();

  const { project, recent, hasPage } = detail;
  const { manifest, status, uptime, lastCheckedAt } = project;
  const Body = hasPage ? (await import(`../../../../content/projects/${slug}.mdx`)).default : null;
  const entries = (await listEntries()).filter((e) => e.project === slug);
  const latencies = recent.map((c) => c.latencyMs).filter((l): l is number => l !== null);
  const avgLatency = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;

  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <Link href="/" className="text-sm text-muted hover:text-fg-strong">
          ← Proyectos
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-medium text-fg-strong">{manifest.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{manifest.summary}</p>
          </div>
          <StateBadge state={project.state} />
        </div>
        <nav className="flex flex-wrap gap-4 text-sm">
          <a href={`https://${manifest.repo}`} className="text-accent hover:underline">
            Repositorio
          </a>
          {manifest.demo && (
            <a href={manifest.demo} className="text-accent hover:underline">
              Demo
            </a>
          )}
          {manifest.video && (
            <a href={manifest.video} className="text-accent hover:underline">
              Video
            </a>
          )}
          <span className="text-muted">Fase {manifest.phase}</span>
        </nav>
      </header>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
        <dl className="grid grid-cols-2 gap-4 font-mono text-sm sm:grid-cols-4">
          <Stat label="versión" value={status ? status.version.slice(0, 12) : "—"} />
          <Stat label="uptime 30d" value={uptime !== null ? formatUptime(uptime) : "—"} />
          <Stat label="latencia prom." value={avgLatency !== null ? `${avgLatency} ms` : "—"} />
          <Stat label="costo/mes" value={status ? `$${status.cost_month_usd.toFixed(2)}` : "—"} />
          {manifest.metrics.map((key) => (
            <Stat
              key={key}
              label={key}
              value={status?.metrics[key] !== undefined ? formatMetric(status.metrics[key]) : "—"}
            />
          ))}
        </dl>
        <CheckHistory checks={recent} />
        <p className="text-xs text-muted">
          {lastCheckedAt !== null
            ? `Última revisión ${formatCheckedAt(lastCheckedAt)}. El Hub pide el /status cada 5 minutos.`
            : "El Hub todavía no ha revisado este proyecto."}
        </p>
      </section>

      {Body && (
        <section className="prose-lab">
          <Body />
        </section>
      )}

      {entries.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-fg-strong">En la bitácora</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {entries.map((e) => (
              <li key={e.slug}>
                <Link href={`/bitacora/${e.slug}`} className="text-accent hover:underline">
                  {e.title}
                </Link>{" "}
                <span className="font-mono text-xs text-muted">{e.date}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

// One tick per check, oldest on the left. Only pass/fail and latency are public.
function CheckHistory({ checks }: { checks: RecentCheck[] }) {
  if (checks.length === 0) return null;
  const failed = checks.filter((c) => !c.ok).length;
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-6 items-stretch gap-0.5" role="img" aria-label={`${checks.length} revisiones recientes, ${failed} con falla`}>
        {checks.map((c) => (
          <span
            key={c.checkedAt}
            title={`${formatCheckedAt(c.checkedAt)} · ${c.ok ? `ok${c.latencyMs !== null ? ` · ${c.latencyMs} ms` : ""}` : "falla"}`}
            className={`max-w-2 flex-1 rounded-sm ${c.ok ? "bg-ok/70" : "bg-down"}`}
          />
        ))}
      </div>
      <figcaption className="text-xs text-muted">
        {checks.length === 1 ? "Última revisión" : `Últimas ${checks.length} revisiones`}
        {failed > 0 ? ` · ${failed} con falla` : ""}
      </figcaption>
    </figure>
  );
}
