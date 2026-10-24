import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { FILES, rewrite, TEMPLATE, validate } from "./init.ts";

const target = { domain: "lab.example.dev", zone: "example.dev", repo: "Jane/my-lab" };

describe("rewrite", () => {
  it("replaces domain, zone and repo (any case) and nothing else", () => {
    const text = [
      `routes: [{ "pattern": "${TEMPLATE.domain}/*", "zone_name": "${TEMPLATE.zone}" }]`,
      `url: https://github.com/${TEMPLATE.repo}`,
      `image: ghcr.io/${TEMPLATE.repo.toLowerCase()}:sha-1234567`,
      "status_url: https://other.site/status",
    ].join("\n");
    expect(rewrite(text, target)).toBe(
      [
        `routes: [{ "pattern": "lab.example.dev/*", "zone_name": "example.dev" }]`,
        "url: https://github.com/Jane/my-lab",
        "image: ghcr.io/jane/my-lab:sha-1234567",
        "status_url: https://other.site/status",
      ].join("\n"),
    );
  });

  it("leaves no template values behind in the files it manages", async () => {
    for (const file of FILES) {
      const out = rewrite(await readFile(file, "utf8"), target);
      expect(out, file).not.toContain(TEMPLATE.zone);
      expect(out.toLowerCase(), file).not.toContain(TEMPLATE.repo.toLowerCase());
    }
  });
});

describe("validate", () => {
  it("accepts a well-formed target", () => {
    expect(validate(target)).toEqual([]);
  });

  it.each([
    [{ ...target, domain: "https://lab.example.dev" }, "--domain"],
    [{ ...target, domain: "lab.other.dev" }, "inside --zone"],
    [{ ...target, repo: "my-lab" }, "--repo"],
    [{ ...target, repo: "jane/my lab; rm -rf" }, "--repo"],
  ])("rejects %o", (bad, message) => {
    expect(validate(bad).join(" ")).toContain(message);
  });
});
