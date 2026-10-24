import { describe, expect, it } from "vitest";
import { handle, injectNotice } from "./fallback.ts";

const SNAPSHOT_AT = "2026-10-24T03:15:00.000Z";
const page = (lang: string) => `<html lang="${lang}"><body class="x"><main>hub</main></body></html>`;

function deps(origin: () => Promise<Response>, snapshot?: Record<string, Response>) {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      fetchOrigin: origin,
      fetchSnapshot: async (r: Request) => {
        calls.push(new URL(r.url).pathname);
        return snapshot?.[new URL(r.url).pathname] ?? new Response("nope", { status: 404 });
      },
      snapshotAt: SNAPSHOT_AT,
      timeoutMs: 50,
    },
  };
}

const html = (body: string) => new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });

describe("handle", () => {
  it("passes healthy origin responses through untouched", async () => {
    const { deps: d, calls } = deps(async () => new Response("live", { status: 200 }));
    const res = await handle(new Request("https://lab.example.com/"), d);
    expect(await res.text()).toBe("live");
    expect(calls).toEqual([]);
  });

  it("passes origin 404s through (not an outage)", async () => {
    const { deps: d } = deps(async () => new Response("missing", { status: 404 }));
    expect((await handle(new Request("https://lab.example.com/x"), d)).status).toBe(404);
  });

  it.each([
    ["a 530 from the tunnel", async () => new Response("", { status: 530 })],
    ["a network error", async () => Promise.reject(new Error("connect failed"))],
    ["a timeout", () => new Promise<Response>(() => {})],
  ])("serves the snapshot with a notice on %s", async (_, origin) => {
    const { deps: d, calls } = deps(origin, { "/projects/lab-hub": html(page("en")) });
    const res = await handle(new Request("https://lab.example.com/projects/lab-hub?x=1"), d);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-lab-fallback")).toBe("snapshot");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toContain("Snapshot from 2026-10-24 03:15 UTC");
    expect(calls).toEqual(["/projects/lab-hub"]);
  });

  it("reports health endpoints as down instead of serving the snapshot", async () => {
    const { deps: d, calls } = deps(async () => new Response("", { status: 502 }));
    const res = await handle(new Request("https://lab.example.com/status"), d);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, snapshot_at: SNAPSHOT_AT });
    expect(calls).toEqual([]);
  });

  it("serves static files from the snapshot without touching them", async () => {
    const css = new Response("body{}", { headers: { "content-type": "text/css" } });
    const { deps: d } = deps(async () => new Response("", { status: 530 }), { "/_next/static/a.css": css });
    const res = await handle(new Request("https://lab.example.com/_next/static/a.css"), d);
    expect(await res.text()).toBe("body{}");
  });

  it("refuses non-GET requests during an outage", async () => {
    const { deps: d } = deps(async () => new Response("", { status: 530 }));
    const res = await handle(new Request("https://lab.example.com/", { method: "POST" }), d);
    expect(res.status).toBe(503);
  });
});

describe("injectNotice", () => {
  it("strips scripts so React can't hydrate the notice away", () => {
    const withScripts =
      `<html lang="en"><head><link rel="preload" as="script" href="/_next/a.js"/><link rel="stylesheet" href="/a.css"/></head>` +
      `<body><main>hub</main><script src="/_next/a.js" async=""></script><script>self.__next_f.push([1,"x"])</script></body></html>`;
    const out = injectNotice(withScripts, SNAPSHOT_AT);
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toContain('as="script"');
    expect(out).toContain('rel="stylesheet"');
    expect(out).toContain("<main>hub</main>");
  });

  it("adds the notice right after <body> in the page's language", () => {
    expect(injectNotice(page("es"), SNAPSHOT_AT)).toMatch(/<body class="x"><div role="status"[^>]*>Copia del sitio de 2026-10-24 03:15 UTC/);
    expect(injectNotice(page("en"), SNAPSHOT_AT)).toContain(">Snapshot from");
  });
});
