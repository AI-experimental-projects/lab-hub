// Edge fallback for lab.beaiapp.com. Requests go to the homelab (through the
// tunnel) as usual; if it's unreachable, pages are served from the last snapshot
// with a notice, and health endpoints report the outage instead of hiding it.

export type Deps = {
  fetchOrigin: (request: Request) => Promise<Response>;
  // Static snapshot (Workers Static Assets binding).
  fetchSnapshot: (request: Request) => Promise<Response>;
  snapshotAt: string; // ISO time the snapshot was taken
  timeoutMs?: number;
};

const HEALTH_PATHS = new Set(["/status", "/healthz"]);

export async function handle(request: Request, deps: Deps): Promise<Response> {
  const url = new URL(request.url);
  let reason: string;

  try {
    const origin = await withTimeout(deps.fetchOrigin(request), deps.timeoutMs ?? 8000);
    if (origin.status < 500) return origin;
    reason = `origin returned ${origin.status}`;
  } catch (error) {
    reason = error instanceof Error ? error.message : "origin unreachable";
  }

  // Monitors must see the outage.
  if (HEALTH_PATHS.has(url.pathname)) {
    return Response.json(
      { ok: false, error: "homelab unreachable", snapshot_at: deps.snapshotAt },
      { status: 503, headers: { "cache-control": "no-store", "x-lab-fallback": reason } },
    );
  }

  // The snapshot only has pages and static files; anything else is unavailable.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Service unavailable", { status: 503 });
  }

  const snapshot = await deps.fetchSnapshot(new Request(new URL(url.pathname, url.origin), request));
  const headers = new Headers(snapshot.headers);
  headers.set("x-lab-fallback", "snapshot");
  headers.set("cache-control", "no-store");

  const type = headers.get("content-type") ?? "";
  if (!type.includes("text/html")) {
    return new Response(snapshot.body, { status: snapshot.status, headers });
  }

  headers.delete("content-length");
  // Fallback pages carry no scripts at all; say so.
  headers.set(
    "content-security-policy",
    "default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'",
  );
  headers.set("x-frame-options", "DENY");
  headers.set("x-content-type-options", "nosniff");
  const html = await snapshot.text();
  return new Response(injectNotice(html, deps.snapshotAt), {
    status: snapshot.ok ? 200 : snapshot.status,
    headers,
  });
}

export function injectNotice(html: string, snapshotAt: string): string {
  const spanish = /<html[^>]*\blang="es"/.test(html);
  const time = snapshotAt.slice(0, 16).replace("T", " ") + " UTC";
  const text = spanish
    ? `Copia del sitio de ${time}. El homelab no responde ahora mismo; los datos en vivo vuelven cuando regrese.`
    : `Snapshot from ${time}. The homelab isn't responding right now; live data returns when it's back.`;
  const notice =
    `<div role="status" style="background:#2a2417;color:#c9b07a;border-bottom:1px solid #3a3220;` +
    `padding:10px 16px;font:14px/1.4 system-ui,sans-serif;text-align:center">${text}</div>`;
  // Serve the snapshot as plain HTML: hydrating would let React drop the notice and
  // the client router would keep calling the unreachable origin. Links still work.
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\b[^>]*\b(?:rel="(?:modulepreload|preload)"[^>]*as="script"|as="script"[^>]*rel="(?:modulepreload|preload)")[^>]*>/gi, "")
    .replace(/<body[^>]*>/, (body) => body + notice);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`origin timed out after ${ms} ms`)), ms);
    promise.then(
      (v) => (clearTimeout(timer), resolve(v)),
      (e) => (clearTimeout(timer), reject(e)),
    );
  });
}
