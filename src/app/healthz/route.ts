// Liveness/readiness probe for Kubernetes. Not part of the public lab contract.
export function GET() {
  return Response.json({ ok: true });
}
