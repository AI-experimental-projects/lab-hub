import { describe, expect, it } from "vitest";
import { parseManifest } from "./lab-files.ts";

const valid = `
name: EvalGate
slug: evalgate
phase: 1
summary: Evals como gate de despliegue
repo: github.com/AI-experimental-projects/evalgate
status_url: https://evalgate.beaiapp.com/status
metrics: [runs_24h, p95_latency_ms]
`;

const withField = (line: string) => `${valid}\n${line}\n`;
const replacing = (from: string, to: string) => valid.replace(from, to);

function issuesOf(text: string, slug?: string) {
  const result = parseManifest(text, slug);
  return result.ok ? [] : result.issues;
}

describe("parseManifest", () => {
  it("accepts a valid manifest", () => {
    const result = parseManifest(valid, "evalgate");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.manifest.metrics).toEqual(["runs_24h", "p95_latency_ms"]);
  });

  it("defaults metrics to an empty list", () => {
    const result = parseManifest(valid.replace(/metrics:.*\n/, ""));
    expect(result.ok && result.manifest.metrics).toEqual([]);
  });

  it("accepts an optional Spanish summary", () => {
    const result = parseManifest(withField("summary_es: Evals como gate"));
    expect(result.ok && result.manifest.summary_es).toBe("Evals como gate");
  });

  it("rejects fields outside the contract", () => {
    expect(issuesOf(withField("api_key: sk-123"))).toEqual([
      expect.objectContaining({ message: expect.stringMatching(/api_key/) }),
    ]);
  });

  it("rejects a slug that doesn't match the file name", () => {
    expect(issuesOf(valid, "other")).toEqual([
      { path: "slug", message: 'must match the file name ("other")' },
    ]);
  });

  it("reports broken YAML instead of throwing", () => {
    expect(issuesOf("name: [unclosed")[0].path).toBe("(yaml)");
  });

  it("rejects duplicate metrics", () => {
    expect(issuesOf(replacing("[runs_24h, p95_latency_ms]", "[runs_24h, runs_24h]"))[0].path).toBe(
      "metrics",
    );
  });

  it("rejects a malformed repo", () => {
    expect(issuesOf(replacing("github.com/AI-experimental-projects/evalgate", "evalgate"))[0].path).toBe(
      "repo",
    );
  });
});

// status_url is fetched server-side by the collector, so it must not reach internal targets (SSRF).
describe("status_url", () => {
  const blocked = [
    ["plain http", "http://evalgate.beaiapp.com/status"],
    ["localhost", "https://localhost/status"],
    ["IPv4 literal", "https://192.168.1.1/status"],
    ["cloud metadata IP", "https://169.254.169.254/latest"],
    ["IPv6 literal", "https://[::1]/status"],
    ["cluster service", "https://web.lab-hub.svc.cluster.local/status"],
    [".local name", "https://nas.local/status"],
    [".internal name", "https://db.internal/status"],
    ["credentials", "https://user:pass@evalgate.beaiapp.com/status"],
    ["custom port", "https://evalgate.beaiapp.com:6443/status"],
    ["other scheme", "file:///etc/passwd"],
  ];

  it.each(blocked)("rejects %s", (_, url) => {
    const issues = issuesOf(replacing("https://evalgate.beaiapp.com/status", url));
    expect(issues.map((i) => i.path)).toContain("status_url");
  });

  it("accepts a public https URL with a path and query", () => {
    expect(issuesOf(replacing("/status", "/api/status?v=1"))).toEqual([]);
  });
});
