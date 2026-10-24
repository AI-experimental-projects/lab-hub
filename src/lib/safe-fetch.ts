import { lookup } from "node:dns/promises";
import https from "node:https";
import { BlockList, isIP } from "node:net";

// Everything that isn't the public internet: loopback, private, link-local (cloud
// metadata), CGNAT (Tailscale), multicast, reserved, documentation ranges.
const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

// IPv4-mapped IPv6 (::ffff:a.b.c.d). Kept out of `blocked`: Node's BlockList would
// match every IPv4 address against this subnet.
const ipv4Mapped = new BlockList();
ipv4Mapped.addSubnet("::ffff:0:0", 96, "ipv6");

function mappedToIpv4(address: string): string {
  const dotted = address.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return dotted[1];
  const [hi, lo] = address.split(":").slice(-2).map((h) => parseInt(h, 16));
  return [hi >> 8, hi & 255, lo >> 8, lo & 255].join(".");
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family === 6) {
    if (ipv4Mapped.check(address, "ipv6")) return isPublicAddress(mappedToIpv4(address));
    return !blocked.check(address, "ipv6");
  }
  return false;
}

export class FetchError extends Error {}

type Options = { timeoutMs?: number; maxBytes?: number };

// GET an https URL that came from untrusted config (a lab.yaml).
// - every resolved address must be public, and the socket is pinned to the one we
//   checked, so DNS can't swap in a private IP afterwards (rebinding)
// - no redirects, bounded time and body size
export async function safeGetJson(
  rawUrl: string,
  { timeoutMs = 5000, maxBytes = 64 * 1024 }: Options = {},
): Promise<unknown> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new FetchError("only https is allowed");
  if (url.username || url.password || url.port) throw new FetchError("credentials and ports are not allowed");

  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (addresses.length === 0) throw new FetchError("host did not resolve");
  const bad = addresses.find((a) => !isPublicAddress(a.address));
  if (bad) throw new FetchError(`host resolves to a non-public address (${bad.address})`);
  const pinned = addresses[0];

  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: { accept: "application/json", "user-agent": "lab-hub-collector" },
        timeout: timeoutMs,
        lookup: (_host, options, callback) => {
          if ((options as { all?: boolean }).all) {
            (callback as (e: null, a: { address: string; family: number }[]) => void)(null, [pinned]);
          } else {
            callback(null, pinned.address, pinned.family);
          }
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new FetchError(`HTTP ${response.statusCode}`));
          return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) {
            request.destroy(new FetchError(`response larger than ${maxBytes} bytes`));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch {
            reject(new FetchError("response is not valid JSON"));
          }
        });
      },
    );
    request.on("timeout", () => request.destroy(new FetchError(`timed out after ${timeoutMs} ms`)));
    request.on("error", reject);
  });
}
