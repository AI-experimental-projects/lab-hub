import { LabStatus, type LabManifest } from "./contract.ts";
import { DAY_MS, type LabDb } from "./db.ts";
import { safeGetJson } from "./safe-fetch.ts";

type Fetcher = (url: string) => Promise<unknown>;

// Pulls /status from every project that declares one and records the result.
// Projects never push to the Hub; a failing project only affects its own row.
export async function collectOnce(
  manifests: LabManifest[],
  db: LabDb,
  { fetchJson = safeGetJson as Fetcher, now = Date.now } = {},
) {
  await Promise.all(
    manifests
      .filter((m) => m.status_url)
      .map(async (m) => {
        const started = now();
        try {
          const raw = await fetchJson(m.status_url!);
          const latencyMs = now() - started;
          const parsed = LabStatus.safeParse(raw);
          if (!parsed.success) {
            db.record({ slug: m.slug, checkedAt: started, ok: false, latencyMs, status: null, error: "response breaks the /status contract" });
            return;
          }
          db.record({ slug: m.slug, checkedAt: started, ok: parsed.data.ok, latencyMs, status: parsed.data, error: null });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          db.record({ slug: m.slug, checkedAt: started, ok: false, latencyMs: null, status: null, error: message.slice(0, 200) });
        }
      }),
  );
  // Uptime is reported over 30 days; keep a little more.
  db.prune(now() - 35 * DAY_MS);
}
