import { z } from "zod";

// Hosts the collector must never be pointed at. The collector also runs behind a
// NetworkPolicy that blocks private ranges; this is the first line of defense.
const BLOCKED_HOST =
  /^(localhost|.*\.localhost|.*\.local|.*\.internal|.*\.lan|.*\.home|.*\.svc|.*\.cluster\.local)$/i;
const IP_LITERAL = /^(\d{1,3}(\.\d{1,3}){3}|\[[0-9a-f:.]+\])$/i;

// A public https URL on a real domain: no IPs, no internal names, no credentials, no custom port.
const PublicHttpsUrl = z.url({ protocol: /^https$/, hostname: z.regexes.domain }).check((ctx) => {
  const url = new URL(ctx.value);
  if (IP_LITERAL.test(url.hostname) || BLOCKED_HOST.test(url.hostname)) {
    ctx.issues.push({ code: "custom", message: "must be a public domain", input: ctx.value });
  }
  if (url.username || url.password) {
    ctx.issues.push({ code: "custom", message: "must not contain credentials", input: ctx.value });
  }
  if (url.port) {
    ctx.issues.push({ code: "custom", message: "must use the default https port", input: ctx.value });
  }
});

// lab.yaml: what every project publishes at the root of its repo.
// `.strict()` rejects unknown fields so a project can't leak extra data.
export const LabManifest = z
  .object({
    name: z.string().min(1).max(40),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase letters, digits and dashes"),
    phase: z.number().int().min(0).max(6),
    summary: z.string().min(1).max(160),
    repo: z
      .string()
      .regex(/^github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/, "must look like github.com/<owner>/<repo>"),
    demo: PublicHttpsUrl.optional(),
    status_url: PublicHttpsUrl.optional(),
    metrics: z
      .array(z.string().regex(/^[a-z0-9_]+$/, "snake_case metric name"))
      .max(6)
      .refine((m) => new Set(m).size === m.length, "metrics must be unique")
      .default([]),
    video: PublicHttpsUrl.optional(),
  })
  .strict();

export type LabManifest = z.infer<typeof LabManifest>;

// GET /status: what every project exposes for the Hub to pull.
export const LabStatus = z
  .object({
    ok: z.boolean(),
    version: z.string().max(40),
    uptime_30d: z.number().min(0).max(1),
    metrics: z.record(z.string().regex(/^[a-z0-9_]+$/), z.number().finite()),
    cost_month_usd: z.number().min(0),
  })
  .strict();

export type LabStatus = z.infer<typeof LabStatus>;
