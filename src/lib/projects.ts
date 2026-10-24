import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";
import type { LabManifest, LabStatus } from "./contract.ts";
import { getDb } from "./db.ts";
import { formatIssues, parseManifest } from "./lab-files.ts";

const PROJECTS_DIR = path.join(process.cwd(), "content", "projects");

// A project counts as stale when the collector hasn't heard from it in this long.
const STALE_AFTER_MS = 20 * 60 * 1000;

export type Project = {
  manifest: LabManifest;
  // Last valid /status the collector got (null if never).
  status: LabStatus | null;
  // Measured by the Hub over 30 days, not self-reported (null without checks).
  uptime: number | null;
  lastCheckedAt: number | null;
  state: "up" | "down" | "stale" | "unknown";
};

export async function loadManifests(): Promise<LabManifest[]> {
  const files = (await readdir(PROJECTS_DIR)).filter((f) => f.endsWith(".yaml")).sort();

  return Promise.all(
    files.map(async (file) => {
      const result = parseManifest(
        await readFile(path.join(PROJECTS_DIR, file), "utf8"),
        path.basename(file, ".yaml"),
      );
      if (!result.ok) throw new Error(formatIssues(`content/projects/${file}`, result.issues));
      return result.manifest;
    }),
  );
}

export async function getProjects(): Promise<Project[]> {
  "use cache";
  cacheLife("minutes");

  const db = getDb();
  const now = Date.now();
  const manifests = await loadManifests();

  return manifests
    .map((manifest): Project => {
      const { last, lastValid } = db.latest(manifest.slug);
      let state: Project["state"] = "unknown";
      if (last) state = now - last.checkedAt > STALE_AFTER_MS ? "stale" : last.ok ? "up" : "down";
      return {
        manifest,
        status: lastValid?.status ?? null,
        uptime: db.uptime(manifest.slug, now),
        lastCheckedAt: last?.checkedAt ?? null,
        state,
      };
    })
    .sort((a, b) => a.manifest.phase - b.manifest.phase || a.manifest.name.localeCompare(b.manifest.name));
}
