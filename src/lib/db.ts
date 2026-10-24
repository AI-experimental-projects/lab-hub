import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { LabStatus } from "./contract.ts";

// One row per collector check. `status_json` is only stored for valid responses.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS checks (
    id          INTEGER PRIMARY KEY,
    slug        TEXT    NOT NULL,
    checked_at  INTEGER NOT NULL,   -- unix ms
    ok          INTEGER NOT NULL,   -- 1 = reachable, valid and reporting ok
    latency_ms  INTEGER,
    status_json TEXT,
    error       TEXT
  );
  CREATE INDEX IF NOT EXISTS checks_slug_time ON checks (slug, checked_at);
`;

const DAY_MS = 24 * 60 * 60 * 1000;

export type Check = {
  slug: string;
  checkedAt: number;
  ok: boolean;
  latencyMs: number | null;
  status: LabStatus | null;
  error: string | null;
};

export class LabDb {
  private db: DatabaseSync;

  constructor(file: string) {
    if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 2000;");
    this.db.exec(SCHEMA);
  }

  record(check: Check) {
    this.db
      .prepare(
        "INSERT INTO checks (slug, checked_at, ok, latency_ms, status_json, error) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        check.slug,
        check.checkedAt,
        check.ok ? 1 : 0,
        check.latencyMs,
        check.status ? JSON.stringify(check.status) : null,
        check.error,
      );
  }

  // Most recent check, and the most recent one that returned a valid status.
  latest(slug: string): { last: Check | null; lastValid: Check | null } {
    const row = (sql: string) =>
      this.db.prepare(sql).get(slug) as Record<string, unknown> | undefined;
    return {
      last: toCheck(row("SELECT * FROM checks WHERE slug = ? ORDER BY checked_at DESC LIMIT 1")),
      lastValid: toCheck(
        row("SELECT * FROM checks WHERE slug = ? AND status_json IS NOT NULL ORDER BY checked_at DESC LIMIT 1"),
      ),
    };
  }

  // Share of checks in the window that were ok; null when there are none.
  uptime(slug: string, now: number, windowMs = 30 * DAY_MS): number | null {
    const r = this.db
      .prepare("SELECT COUNT(*) AS n, SUM(ok) AS up FROM checks WHERE slug = ? AND checked_at >= ?")
      .get(slug, now - windowMs) as { n: number; up: number | null };
    return r.n === 0 ? null : (r.up ?? 0) / r.n;
  }

  // Newest first. Errors are left out: this feeds public pages.
  recent(slug: string, limit: number): { checkedAt: number; ok: boolean; latencyMs: number | null }[] {
    const rows = this.db
      .prepare("SELECT checked_at, ok, latency_ms FROM checks WHERE slug = ? ORDER BY checked_at DESC LIMIT ?")
      .all(slug, limit) as { checked_at: number; ok: number; latency_ms: number | null }[];
    return rows.map((r) => ({ checkedAt: r.checked_at, ok: r.ok === 1, latencyMs: r.latency_ms }));
  }

  countSince(since: number): number {
    return (this.db.prepare("SELECT COUNT(*) AS n FROM checks WHERE checked_at >= ?").get(since) as {
      n: number;
    }).n;
  }

  prune(olderThan: number) {
    this.db.prepare("DELETE FROM checks WHERE checked_at < ?").run(olderThan);
  }
}

function toCheck(row: Record<string, unknown> | undefined): Check | null {
  if (!row) return null;
  const parsed = row.status_json ? LabStatus.safeParse(JSON.parse(String(row.status_json))) : null;
  return {
    slug: String(row.slug),
    checkedAt: Number(row.checked_at),
    ok: row.ok === 1,
    latencyMs: row.latency_ms == null ? null : Number(row.latency_ms),
    status: parsed?.success ? parsed.data : null,
    error: row.error == null ? null : String(row.error),
  };
}

let shared: LabDb | null = null;

export function getDb(): LabDb {
  shared ??= new LabDb(process.env.LAB_DB_PATH ?? path.join(process.cwd(), "data", "lab.db"));
  return shared;
}

export { DAY_MS };
