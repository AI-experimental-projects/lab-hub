import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { type LabManifest, LabStatus } from "./contract.ts";
import { formatIssues, parseManifest } from "./lab-files.ts";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type Project = {
  manifest: LabManifest;
  // null until the project answers /status (or has no status_url yet)
  status: LabStatus | null;
  // true while status comes from content/sample-status.json instead of the collector
  sample: boolean;
};

async function loadManifests(): Promise<LabManifest[]> {
  const dir = path.join(CONTENT_DIR, "projects");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".yaml")).sort();

  return Promise.all(
    files.map(async (file) => {
      const result = parseManifest(
        await readFile(path.join(dir, file), "utf8"),
        path.basename(file, ".yaml"),
      );
      if (!result.ok) throw new Error(formatIssues(`content/projects/${file}`, result.issues));
      return result.manifest;
    }),
  );
}

// Placeholder until the collector (week 4) writes real /status snapshots to SQLite.
async function loadSampleStatus(): Promise<Record<string, LabStatus>> {
  const raw = JSON.parse(
    await readFile(path.join(CONTENT_DIR, "sample-status.json"), "utf8"),
  );
  const entries = Object.entries(raw).map(([slug, value]) => {
    const result = LabStatus.safeParse(value);
    if (!result.success) {
      throw new Error(`content/sample-status.json [${slug}]: ${result.error.message}`);
    }
    return [slug, result.data] as const;
  });
  return Object.fromEntries(entries);
}

export async function getProjects(): Promise<Project[]> {
  "use cache";
  const [manifests, sample] = await Promise.all([loadManifests(), loadSampleStatus()]);

  return manifests
    .map((manifest) => ({
      manifest,
      status: sample[manifest.slug] ?? null,
      sample: manifest.slug in sample,
    }))
    .sort((a, b) => a.manifest.phase - b.manifest.phase || a.manifest.name.localeCompare(b.manifest.name));
}
