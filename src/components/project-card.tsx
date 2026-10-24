import Link from "next/link";
import type { Project } from "@/lib/projects";

export const STATE = {
  up: { label: "En línea", dot: "bg-ok", text: "text-ok" },
  down: { label: "Con fallas", dot: "bg-down", text: "text-down" },
  stale: { label: "Sin datos recientes", dot: "bg-warn", text: "text-warn" },
  unknown: { label: "Sin datos", dot: "bg-muted", text: "text-muted" },
} as const;

export function formatUptime(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatMetric(value: number) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(value);
}

export function formatCheckedAt(ms: number) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(ms);
}

export function ProjectCard({ project }: { project: Project }) {
  const { manifest, status, uptime, lastCheckedAt } = project;

  return (
    <article className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-medium text-fg-strong">
            <Link href={`/proyectos/${manifest.slug}`} className="hover:text-accent">
              {manifest.name}
            </Link>
          </h2>
          <p className="mt-1 text-sm text-muted">{manifest.summary}</p>
        </div>
        <StateBadge state={project.state} />
      </div>

      <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4 font-mono text-sm">
        <Stat label="versión" value={status ? status.version.slice(0, 12) : "—"} />
        <Stat label="uptime 30d" value={uptime !== null ? formatUptime(uptime) : "—"} />
        <Stat label="costo/mes" value={status ? `$${status.cost_month_usd.toFixed(2)}` : "—"} />
      </dl>

      {manifest.metrics.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 font-mono text-sm">
          {manifest.metrics.map((key) => (
            <Stat
              key={key}
              label={key}
              value={status?.metrics[key] !== undefined ? formatMetric(status.metrics[key]) : "—"}
            />
          ))}
        </dl>
      )}

      <footer className="mt-auto flex items-center justify-between gap-3 text-xs text-muted">
        <span>Fase {manifest.phase}</span>
        <span className="flex items-center gap-3">
          {lastCheckedAt !== null && <span>revisado {formatCheckedAt(lastCheckedAt)}</span>}
          <a href={`https://${manifest.repo}`} className="hover:text-fg-strong">
            repo
          </a>
        </span>
      </footer>
    </article>
  );
}

export function StateBadge({ state }: { state: Project["state"] }) {
  const s = STATE[state];
  return (
    <span className={`flex shrink-0 items-center gap-2 text-xs ${s.text}`}>
      <span className={`size-2 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
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
