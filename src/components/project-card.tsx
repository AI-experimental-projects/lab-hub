import Link from "next/link";
import { INTL, localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { localizedSummary, type Project } from "@/lib/projects";

const STATE_STYLE = {
  up: { dot: "bg-ok", text: "text-ok" },
  down: { dot: "bg-down", text: "text-down" },
  stale: { dot: "bg-warn", text: "text-warn" },
  unknown: { dot: "bg-muted", text: "text-muted" },
} as const;

export function formatUptime(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatMetric(value: number, locale: Locale) {
  return new Intl.NumberFormat(INTL[locale], { maximumFractionDigits: 1 }).format(value);
}

export function formatCheckedAt(ms: number, locale: Locale) {
  return new Intl.DateTimeFormat(INTL[locale], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(ms);
}

type Props = { project: Project; locale: Locale; t: Dictionary };

export function ProjectCard({ project, locale, t }: Props) {
  const { manifest, status, uptime, lastCheckedAt } = project;

  return (
    <article className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-medium text-fg-strong">
            <Link href={localePath(locale, `/projects/${manifest.slug}`)} className="hover:text-accent">
              {manifest.name}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-muted">{localizedSummary(manifest, locale)}</p>
        </div>
        <StateBadge state={project.state} t={t} />
      </div>

      <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4 font-mono text-sm">
        <Stat label={t.stats.version} value={status ? status.version.slice(0, 12) : "—"} />
        <Stat label={t.stats.uptime} value={uptime !== null ? formatUptime(uptime) : "—"} />
        <Stat label={t.stats.cost} value={status ? `$${status.cost_month_usd.toFixed(2)}` : "—"} />
      </dl>

      {manifest.metrics.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 font-mono text-sm">
          {manifest.metrics.map((key) => (
            <Stat
              key={key}
              label={key}
              value={status?.metrics[key] !== undefined ? formatMetric(status.metrics[key], locale) : "—"}
            />
          ))}
        </dl>
      )}

      <footer className="mt-auto flex items-center justify-between gap-3 text-xs text-muted">
        <span>
          {t.card.phase} {manifest.phase}
        </span>
        <span className="flex items-center gap-3">
          {lastCheckedAt !== null && (
            <span>
              {t.card.checked} {formatCheckedAt(lastCheckedAt, locale)}
            </span>
          )}
          <a href={`https://${manifest.repo}`} className="hover:text-fg-strong">
            {t.card.repo}
          </a>
        </span>
      </footer>
    </article>
  );
}

export function StateBadge({ state, t }: { state: Project["state"]; t: Dictionary }) {
  const s = STATE_STYLE[state];
  return (
    <span className={`flex shrink-0 items-center gap-2 text-xs ${s.text}`}>
      <span className={`size-2 rounded-full ${s.dot}`} aria-hidden />
      {t.state[state]}
    </span>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-fg-strong">{value}</dd>
    </div>
  );
}
