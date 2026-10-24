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
import { DEFAULT_LOCALE, localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { getDictionary } from "@/i18n/server";
import { listEntries } from "@/lib/journal";
import { getManifests, getProject, localizedSummary, type RecentCheck } from "@/lib/projects";
import { alternatesFor } from "@/lib/site";

export async function generateStaticParams() {
  return (await getManifests()).map((m) => ({ slug: m.slug }));
}

export async function generateMetadata(props: PageProps<"/[lang]/projects/[slug]">): Promise<Metadata> {
  const [{ slug }, { locale }] = await Promise.all([props.params, getDictionary()]);
  const manifest = (await getManifests()).find((m) => m.slug === slug);
  if (!manifest) return {};
  const description = localizedSummary(manifest, locale);
  return {
    title: `${manifest.name} · Lab Hub`,
    description,
    alternates: alternatesFor(locale, `/projects/${slug}`),
    openGraph: { title: manifest.name, description },
  };
}

export default async function ProjectPage(props: PageProps<"/[lang]/projects/[slug]">) {
  const { t } = await getDictionary();
  return (
    <Suspense fallback={<p className="text-sm text-muted">{t.loading}</p>}>
      <ProjectDetail params={props.params} />
    </Suspense>
  );
}

async function ProjectDetail({ params }: Pick<PageProps<"/[lang]/projects/[slug]">, "params">) {
  const [{ slug }, { locale, t }] = await Promise.all([params, getDictionary()]);
  const detail = await getProject(slug);
  if (!detail) notFound();

  const { project, recent, pages } = detail;
  const { manifest, status, uptime, lastCheckedAt } = project;
  const pageLang: Locale | undefined = pages.includes(locale) ? locale : pages[0];
  const Body = pageLang
    ? (await import(`../../../../../content/projects/${pageLang === DEFAULT_LOCALE ? slug : `${slug}.${pageLang}`}.mdx`)).default
    : null;
  const entries = (await listEntries(locale)).filter((e) => e.project === slug);
  const latencies = recent.map((c) => c.latencyMs).filter((l): l is number => l !== null);
  const avgLatency = latencies.length
    ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
    : null;

  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <Link href={localePath(locale, "/")} className="text-sm text-muted hover:text-fg-strong">
          {t.project.back}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-medium text-fg-strong">{manifest.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{localizedSummary(manifest, locale)}</p>
          </div>
          <StateBadge state={project.state} t={t} />
        </div>
        <nav className="flex flex-wrap gap-4 text-sm">
          <a href={`https://${manifest.repo}`} className="text-accent hover:underline">
            {t.project.repo}
          </a>
          {manifest.demo && (
            <a href={manifest.demo} className="text-accent hover:underline">
              {t.project.demo}
            </a>
          )}
          {manifest.video && (
            <a href={manifest.video} className="text-accent hover:underline">
              {t.project.video}
            </a>
          )}
          <span className="text-muted">
            {t.card.phase} {manifest.phase}
          </span>
        </nav>
      </header>

      <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5">
        <dl className="grid grid-cols-2 gap-4 font-mono text-sm sm:grid-cols-4">
          <Stat label={t.stats.version} value={status ? status.version.slice(0, 12) : "—"} />
          <Stat label={t.stats.uptime} value={uptime !== null ? formatUptime(uptime) : "—"} />
          <Stat label={t.stats.latency} value={avgLatency !== null ? `${avgLatency} ms` : "—"} />
          <Stat label={t.stats.cost} value={status ? `$${status.cost_month_usd.toFixed(2)}` : "—"} />
          {manifest.metrics.map((key) => (
            <Stat
              key={key}
              label={key}
              value={status?.metrics[key] !== undefined ? formatMetric(status.metrics[key], locale) : "—"}
            />
          ))}
        </dl>
        <CheckHistory checks={recent} locale={locale} t={t} />
        <p className="text-xs text-muted">
          {lastCheckedAt !== null
            ? t.project.lastCheck(formatCheckedAt(lastCheckedAt, locale))
            : t.project.neverChecked}
        </p>
      </section>

      {Body && (
        <section className="prose-lab" lang={pageLang}>
          <Body />
        </section>
      )}

      {entries.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-fg-strong">{t.project.inJournal}</h2>
          <ul className="flex flex-col gap-2 text-sm">
            {entries.map((e) => (
              <li key={e.slug}>
                <Link href={localePath(locale, `/journal/${e.slug}`)} className="text-accent hover:underline">
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
function CheckHistory({ checks, locale, t }: { checks: RecentCheck[]; locale: Locale; t: Dictionary }) {
  if (checks.length === 0) return null;
  const failed = checks.filter((c) => !c.ok).length;
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-6 items-stretch gap-0.5" role="img" aria-label={t.project.historyLabel(checks.length, failed)}>
        {checks.map((c) => (
          <span
            key={c.checkedAt}
            title={`${formatCheckedAt(c.checkedAt, locale)} · ${c.ok ? `${t.project.ok}${c.latencyMs !== null ? ` · ${c.latencyMs} ms` : ""}` : t.project.fail}`}
            className={`max-w-2 flex-1 rounded-sm ${c.ok ? "bg-ok/70" : "bg-down"}`}
          />
        ))}
      </div>
      <figcaption className="text-xs text-muted">
        {t.project.history(checks.length)}
        {failed > 0 ? t.project.failed(failed) : ""}
      </figcaption>
    </figure>
  );
}
