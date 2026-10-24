// Makes a fresh copy of the template yours: rewrites the domain, Cloudflare zone and
// GitHub repo everywhere they're hardcoded (site URL, Flux source, Worker route,
// k8s image, the Hub's own lab.yaml).
//
//   node scripts/init.ts --domain lab.example.com --repo you/lab-hub [--zone example.com] [--dry-run]
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

// Values this repo ships with.
export const TEMPLATE = {
  domain: "lab.beaiapp.com",
  zone: "beaiapp.com",
  repo: "AI-experimental-projects/lab-hub",
};

export const FILES = [
  "src/lib/site.ts",
  "content/projects/lab-hub.yaml",
  "content/projects/lab-hub.mdx",
  "content/projects/lab-hub.es.mdx",
  "infra/k8s/lab-hub/web.yaml",
  "infra/flux/sync/sync.yaml",
  "infra/edge/wrangler.jsonc",
  "infra/github/setup-deploy-key.sh",
];

export type Target = { domain: string; zone: string; repo: string };

export function validate({ domain, zone, repo }: Target): string[] {
  const errors: string[] = [];
  const host = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  if (!host.test(domain)) errors.push(`--domain "${domain}" is not a hostname like lab.example.com`);
  if (!host.test(zone)) errors.push(`--zone "${zone}" is not a domain like example.com`);
  else if (domain !== zone && !domain.endsWith(`.${zone}`)) errors.push(`--domain must be inside --zone (${zone})`);
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repo)) errors.push(`--repo "${repo}" must look like owner/name`);
  return errors;
}

// Order matters: the full domain before the zone it contains.
export function rewrite(text: string, to: Target): string {
  return text
    .replaceAll(TEMPLATE.domain, to.domain)
    .replaceAll(TEMPLATE.zone, to.zone)
    .replaceAll(TEMPLATE.repo, to.repo)
    .replaceAll(TEMPLATE.repo.toLowerCase(), to.repo.toLowerCase());
}

async function main() {
  const { values } = parseArgs({
    options: {
      domain: { type: "string" },
      zone: { type: "string" },
      repo: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  if (!values.domain || !values.repo) {
    console.error("usage: node scripts/init.ts --domain lab.example.com --repo you/lab-hub [--zone example.com] [--dry-run]");
    process.exit(1);
  }
  const target: Target = {
    domain: values.domain.toLowerCase(),
    zone: (values.zone ?? values.domain.split(".").slice(-2).join(".")).toLowerCase(),
    repo: values.repo,
  };
  const errors = validate(target);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }

  for (const file of FILES) {
    const before = await readFile(file, "utf8");
    const after = rewrite(before, target);
    if (after === before) continue;
    if (!values["dry-run"]) await writeFile(file, after);
    console.log(`${values["dry-run"] ? "would update" : "updated"} ${file}`);
  }
  console.log(`
Next:
  1. Replace content/journal/* with your own entries (or delete them).
  2. Edit content/projects/lab-hub.yaml if you want a different summary.
  3. Follow infra/README.md: k3s, firewall, Flux, Cloudflare Tunnel, deploy key, edge Worker.`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
