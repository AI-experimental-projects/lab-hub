import { handle } from "./fallback.ts";

interface Env {
  SNAPSHOT: { fetch: (request: Request) => Promise<Response> };
  SNAPSHOT_AT: string;
}

const worker = {
  fetch(request: Request, env: Env): Promise<Response> {
    return handle(request, {
      // A Worker's fetch to its own route goes to the origin (the tunnel), not back to itself.
      fetchOrigin: (r) => fetch(r),
      fetchSnapshot: (r) => env.SNAPSHOT.fetch(r),
      snapshotAt: env.SNAPSHOT_AT,
    });
  },
};

export default worker;
