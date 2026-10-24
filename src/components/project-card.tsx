import type { Project } from "@/lib/projects";

const STATE = {
  up: { label: "En línea", dot: "bg-ok", text: "text-ok" },
  down: { label: "Con fallas", dot: "bg-down", text: "text-down" },
  unknown: { label: "Sin datos", dot: "bg-muted", text: "text-muted" },
} as const;

function formatUptime(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatMetric(value: number) {
  return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(value);
}

export function ProjectCard({ project }: { project: Project }) {
  const { manifest, status, sample } = project;
  const state = STATE[status === null ? "unknown" : status.ok ? "up" : "down"];

  return (
    <article className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-medium text-fg-strong">{manifest.name}</h2>
          <p className="mt-1 text-sm text-muted">{manifest.summary}</p>
        </div>
        <span className={`flex shrink-0 items-center gap-2 text-xs ${state.text}`}>
          <span className={`size-2 rounded-full ${state.dot}`} aria-hidden />
          {state.label}
        </span>
      </div>

      <dl className="grid grid-cols-3 gap-3 border-t border-line pt-4 font-mono text-sm">
        <Stat label="versión" value={status ? `v${status.version}` : "—"} />
        <Stat label="uptime 30d" value={status ? formatUptime(status.uptime_30d) : "—"} />
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

      <footer className="mt-auto flex items-center justify-between text-xs text-muted">
        <span>Fase {manifest.phase}</span>
        {sample && <span className="rounded bg-surface-2 px-2 py-0.5">datos de ejemplo</span>}
      </footer>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-fg-strong">{value}</dd>
    </div>
  );
}
