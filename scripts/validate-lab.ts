// Validates lab.yaml files against the Lab Hub contract.
//
//   node scripts/validate-lab.ts                 # every content/projects/*.yaml
//   node scripts/validate-lab.ts path/lab.yaml   # specific files (e.g. from another repo)
//
// Exits 1 if any file is invalid or two files share a slug.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { formatIssues, parseManifest } from "../src/lib/lab-files.ts";

const PROJECTS_DIR = "content/projects";

async function defaultFiles(): Promise<string[]> {
  const files = await readdir(PROJECTS_DIR);
  return files.filter((f) => f.endsWith(".yaml")).sort().map((f) => path.join(PROJECTS_DIR, f));
}

const args = process.argv.slice(2);
const files = args.length > 0 ? args : await defaultFiles();
// Inside content/projects the file name is the slug; a standalone lab.yaml has no such rule.
const slugFromName = (file: string) =>
  path.dirname(file) === PROJECTS_DIR ? path.basename(file, ".yaml") : undefined;

let failed = 0;
const seen = new Map<string, string>();

for (const file of files) {
  const result = parseManifest(await readFile(file, "utf8"), slugFromName(file));
  if (!result.ok) {
    failed++;
    console.error(formatIssues(file, result.issues));
    continue;
  }
  const other = seen.get(result.manifest.slug);
  if (other) {
    failed++;
    console.error(formatIssues(file, [{ path: "slug", message: `already used by ${other}` }]));
    continue;
  }
  seen.set(result.manifest.slug, file);
  console.log(`✓ ${file}`);
}

if (failed > 0) {
  console.error(`\n${failed} of ${files.length} lab.yaml file(s) invalid`);
  process.exit(1);
}
