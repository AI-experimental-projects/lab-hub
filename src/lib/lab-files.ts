import { parse, YAMLParseError } from "yaml";
import type { z } from "zod";
import { LabManifest } from "./contract.ts";

export type Issue = { path: string; message: string };

export type ManifestResult =
  | { ok: true; manifest: LabManifest }
  | { ok: false; issues: Issue[] };

function toIssues(error: z.ZodError): Issue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

// Parses one lab.yaml. `expectedSlug` is the file name without extension, when known.
export function parseManifest(text: string, expectedSlug?: string): ManifestResult {
  let raw: unknown;
  try {
    raw = parse(text);
  } catch (error) {
    const message = error instanceof YAMLParseError ? error.message.split("\n")[0] : String(error);
    return { ok: false, issues: [{ path: "(yaml)", message }] };
  }

  const result = LabManifest.safeParse(raw);
  if (!result.success) return { ok: false, issues: toIssues(result.error) };

  if (expectedSlug !== undefined && result.data.slug !== expectedSlug) {
    return {
      ok: false,
      issues: [{ path: "slug", message: `must match the file name ("${expectedSlug}")` }],
    };
  }
  return { ok: true, manifest: result.data };
}

export function formatIssues(file: string, issues: Issue[]): string {
  return [`✗ ${file}`, ...issues.map((i) => `    ${i.path}: ${i.message}`)].join("\n");
}
