import { describe, expect, it } from "vitest";
import { collectOnce } from "./collector.ts";
import type { LabManifest } from "./contract.ts";
import { DAY_MS, LabDb } from "./db.ts";

const manifest = (slug: string, status_url?: string): LabManifest => ({
  name: slug,
  slug,
  phase: 1,
  summary: "test",
  repo: `github.com/org/${slug}`,
  status_url,
  metrics: [],
});

const goodStatus = {
  ok: true,
  version: "1.2.3",
  uptime_30d: 0.99,
  metrics: { runs_24h: 4 },
  cost_month_usd: 1.5,
};

describe("collectOnce", () => {
  it("records valid, invalid, failing and down projects independently", async () => {
    const db = new LabDb(":memory:");
    const responses: Record<string, () => unknown> = {
      "https://good.example.com/status": () => goodStatus,
      "https://down.example.com/status": () => ({ ...goodStatus, ok: false }),
      "https://leaky.example.com/status": () => ({ ...goodStatus, db_password: "hunter2" }),
      "https://dead.example.com/status": () => {
        throw new Error("timed out after 5000 ms");
      },
    };

    await collectOnce(
      [
        manifest("good", "https://good.example.com/status"),
        manifest("down", "https://down.example.com/status"),
        manifest("leaky", "https://leaky.example.com/status"),
        manifest("dead", "https://dead.example.com/status"),
        manifest("no-status"),
      ],
      db,
      { fetchJson: async (url) => responses[url]() },
    );

    expect(db.latest("good").last).toMatchObject({ ok: true, status: goodStatus, error: null });
    expect(db.latest("down").last).toMatchObject({ ok: false, status: { ok: false } });
    // Extra fields are rejected and never stored.
    expect(db.latest("leaky").last).toMatchObject({ ok: false, status: null, error: "response breaks the /status contract" });
    expect(db.latest("dead").last).toMatchObject({ ok: false, error: "timed out after 5000 ms" });
    expect(db.latest("no-status").last).toBeNull();
  });

  it("keeps the last valid status when a later check fails", async () => {
    const db = new LabDb(":memory:");
    let t = 1_000;
    let fail = false;
    const opts = {
      now: () => t,
      fetchJson: async () => {
        if (fail) throw new Error("HTTP 502");
        return goodStatus;
      },
    };
    await collectOnce([manifest("p", "https://p.example.com/status")], db, opts);
    t += 60_000;
    fail = true;
    await collectOnce([manifest("p", "https://p.example.com/status")], db, opts);

    const { last, lastValid } = db.latest("p");
    expect(last?.error).toBe("HTTP 502");
    expect(lastValid?.status?.version).toBe("1.2.3");
  });
});

describe("LabDb.uptime", () => {
  it("is the share of ok checks in the window, ignoring older ones", () => {
    const db = new LabDb(":memory:");
    const now = 100 * DAY_MS;
    const check = (daysAgo: number, ok: boolean) =>
      db.record({ slug: "p", checkedAt: now - daysAgo * DAY_MS, ok, latencyMs: 10, status: null, error: null });

    check(40, false); // outside 30 days
    check(3, true);
    check(2, true);
    check(1, true);
    check(0, false);

    expect(db.uptime("p", now)).toBe(0.75);
    expect(db.uptime("other", now)).toBeNull();
  });
});
