import { describe, expect, it } from "vitest";
import { isLocale, localePath } from "./config.ts";

describe("localePath", () => {
  it.each([
    ["en", "/", "/"],
    ["en", "/projects/x", "/projects/x"],
    ["es", "/", "/es"],
    ["es", "/journal", "/es/journal"],
  ] as const)("%s %s -> %s", (locale, path, expected) => {
    expect(localePath(locale, path)).toBe(expected);
  });
});

describe("isLocale", () => {
  it("accepts only supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("es")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("../")).toBe(false);
  });
});
