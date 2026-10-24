import { z } from "zod";

// lab.yaml: what every project publishes at the root of its repo.
// `.strict()` rejects unknown fields so a project can't leak extra data.
export const LabManifest = z
  .object({
    name: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    phase: z.number().int().min(0).max(6),
    summary: z.string().min(1).max(160),
    repo: z.string().min(1),
    demo: z.url().optional(),
    status_url: z.url().optional(),
    metrics: z.array(z.string().regex(/^[a-z0-9_]+$/)).default([]),
    video: z.url().optional(),
  })
  .strict();

export type LabManifest = z.infer<typeof LabManifest>;

// GET /status: what every project exposes for the Hub to pull.
export const LabStatus = z
  .object({
    ok: z.boolean(),
    version: z.string(),
    uptime_30d: z.number().min(0).max(1),
    metrics: z.record(z.string(), z.number()),
    cost_month_usd: z.number().min(0),
  })
  .strict();

export type LabStatus = z.infer<typeof LabStatus>;
