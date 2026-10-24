// Takes a static snapshot of the public site for the edge fallback Worker.
//
//   node scripts/snapshot.ts [outDir]     (default: infra/edge/snapshot)
//
// Pages come from sitemap.xml; their /_next/static files (and fonts referenced
// from CSS) are downloaded alongside. Exits 2 without writing anything if the site
// isn't healthy, so a good snapshot is never replaced by error pages.
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const SITE = process.env.SNAPSHOT_SITE ?? "https://lab.beaiapp.com";
const OUT = process.argv[2] ?? "infra/edge/snapshot";
const MAX_FILES = 400;
const MAX_BYTES = 40 * 1024 * 1024;

class Unhealthy extends Error {}

async function get(pathname: string): Promise<Response> {
  const url = new URL(pathname, SITE);
  if (url.origin !== new URL(SITE).origin) throw new Error(`refusing off-site URL ${url}`);
  const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
  if (res.headers.get("x-lab-fallback")) throw new Unhealthy(`${pathname} is already served from a snapshot`);
  if (res.status !== 200) throw new Unhealthy(`${pathname} returned ${res.status}`);
  return res;
}

// "/" -> index.html, "/es" -> es.html, "/projects/x" -> projects/x.html
function pageFile(pathname: string): string {
  return pathname === "/" ? "index.html" : `${pathname.slice(1)}.html`;
}

const STATIC_REF = /\/_next\/static\/[A-Za-z0-9._~\-/%@]+/g;

async function main() {
  const status = (await (await get("/status")).json()) as { ok?: boolean };
  if (status.ok !== true) throw new Unhealthy("/status is not ok");

  const sitemap = await (await get("/sitemap.xml")).text();
  const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  if (pages.length === 0) throw new Unhealthy("sitemap has no pages");

  const files = new Map<string, Uint8Array>();
  const assets = new Set<string>();
  let bytes = 0;
  const add = (file: string, data: Uint8Array) => {
    bytes += data.byteLength;
    if (files.size >= MAX_FILES || bytes > MAX_BYTES) throw new Error("snapshot exceeds size limits");
    files.set(file, data);
  };

  for (const page of pages) {
    const html = await (await get(page)).text();
    add(pageFile(page), new TextEncoder().encode(html));
    for (const ref of html.matchAll(STATIC_REF)) assets.add(ref[0]);
  }

  for (const asset of assets) {
    const data = new Uint8Array(await (await get(asset)).arrayBuffer());
    add(asset.slice(1), data);
    if (asset.endsWith(".css")) {
      for (const ref of new TextDecoder().decode(data).matchAll(STATIC_REF)) {
        if (!assets.has(ref[0])) {
          assets.add(ref[0]);
          add(ref[0].slice(1), new Uint8Array(await (await get(ref[0])).arrayBuffer()));
        }
      }
    }
  }
  for (const extra of ["/robots.txt", "/sitemap.xml"]) {
    add(extra.slice(1), new Uint8Array(await (await get(extra)).arrayBuffer()));
  }

  await rm(OUT, { recursive: true, force: true });
  for (const [file, data] of files) {
    const target = path.join(OUT, file);
    if (!target.startsWith(path.resolve(OUT) + path.sep) && !target.startsWith(OUT + path.sep)) {
      throw new Error(`refusing to write outside ${OUT}: ${file}`);
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data);
  }
  console.log(`snapshot: ${pages.length} pages, ${files.size} files, ${(bytes / 1024).toFixed(0)} KB -> ${OUT}`);
}

main().catch((error) => {
  console.error(`snapshot: ${error.message}`);
  process.exit(error instanceof Unhealthy ? 2 : 1);
});
