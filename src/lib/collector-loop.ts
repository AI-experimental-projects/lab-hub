import { collectOnce } from "./collector.ts";
import { getDb } from "./db.ts";
import { loadManifests } from "./projects.ts";

const INTERVAL_MS = Number(process.env.LAB_COLLECT_INTERVAL_MS ?? 5 * 60 * 1000);
// Give the server time to start listening; the Hub also checks its own public /status.
const FIRST_RUN_DELAY_MS = 15_000;

let started = false;

export function startCollector() {
  if (started) return;
  started = true;

  const run = async () => {
    try {
      await collectOnce(await loadManifests(), getDb());
    } catch (error) {
      console.error("[collector] run failed:", error);
    }
  };

  setTimeout(run, FIRST_RUN_DELAY_MS).unref();
  setInterval(run, INTERVAL_MS).unref();
  console.log(`[collector] every ${INTERVAL_MS / 1000}s`);
}
