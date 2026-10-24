import { describe, expect, it } from "vitest";
import { isPublicAddress, safeGetJson } from "./safe-fetch.ts";

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1",
    "10.42.0.17", // k3s pod
    "10.43.0.1", // k8s API service
    "192.168.1.74", // the homelab on the LAN
    "192.168.1.1", // home router
    "172.16.5.5",
    "100.104.164.69", // Tailscale (CGNAT)
    "169.254.169.254", // cloud metadata
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fd7a:115c:a1e0::a101:a4d9", // Tailscale IPv6 (ULA)
    "fe80::1",
    "::ffff:192.168.1.1", // IPv4-mapped private
    "::ffff:127.0.0.1",
    "::ffff:c0a8:101", // 192.168.1.1, hex form
    "not-an-ip",
  ])("blocks %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(["1.1.1.1", "104.21.42.13", "8.8.8.8", "2606:4700:4700::1111", "::ffff:1.1.1.1"])(
    "allows %s",
    (address) => {
      expect(isPublicAddress(address)).toBe(true);
    },
  );
});

describe("safeGetJson", () => {
  it("refuses plain http", async () => {
    await expect(safeGetJson("http://example.com/status")).rejects.toThrow("only https");
  });

  it("refuses hosts that resolve to private addresses", async () => {
    await expect(safeGetJson("https://localhost/status")).rejects.toThrow("non-public address");
  });
});
