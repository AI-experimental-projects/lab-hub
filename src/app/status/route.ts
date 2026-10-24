import { connection } from "next/server";
import type { LabStatus } from "@/lib/contract.ts";
import { DAY_MS, getDb } from "@/lib/db.ts";
import { loadManifests } from "@/lib/projects.ts";

// The Hub's own /status, in the same contract every project follows.
export async function GET() {
  await connection();
  const db = getDb();
  const now = Date.now();
  const manifests = await loadManifests();

  const live = manifests.filter((m) => db.latest(m.slug).last?.ok).length;
  const body: LabStatus = {
    ok: true,
    version: process.env.LAB_VERSION ?? "dev",
    uptime_30d: db.uptime("lab-hub", now) ?? 1,
    metrics: {
      projects_live: live,
      checks_24h: db.countSince(now - DAY_MS),
    },
    // Runs on the homelab; only the domain is paid.
    cost_month_usd: 0,
  };
  return Response.json(body, { headers: { "cache-control": "no-store" } });
}
