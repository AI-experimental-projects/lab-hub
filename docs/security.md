# Lab security

Rule: **every phase ends with a security review.** A project is not done until it passes its checklist.

## Threat model

The homelab is a home machine with LAN, Tailscale and personal services access. What to avoid:

1. Someone using the server for anything other than serving the projects (proxy, mining, pivoting into the LAN).
2. A project exposing data or credentials.
3. One compromised service reaching the others.

## Current controls (Phase 0, week 1)

| Layer | Control | How it is verified |
|---|---|---|
| LAN → host | ufw: inbound denied by default; only k3s networks (10.42/16, 10.43/16) and `tailscale0` are allowed. Script: `infra/host/firewall.sh`. | `sudo ufw status verbose` |
| Internet → home | No open ports. Everything arrives through Cloudflare Tunnel (outbound). | `ss -ltn`, the router has no port forwarding |
| Tunnel | Only hostnames registered in the dashboard. Catch-all `http_status:404`. WARP routing off. | `cloudflared` logs: `Updated to new configuration` |
| Tunnel token | Lives only in the `cloudflared-token` Secret. Never in the repo or chat. | `git grep -E "eyJ[A-Za-z0-9_-]{100,}"` empty |
| Cluster network | NetworkPolicies default-deny. `cloudflared` only reaches DNS, Cloudflare edge (public internet, no private ranges) and `lab-hub:8080`. | Test with a probe pod labeled `app=cloudflared` |
| Repo | `main` protected by rulesets. CI pushes with a single-repo deploy key stored on `production` (`main` only). PRs and forks never see it. | `gh api repos/AI-experimental-projects/lab-hub/rulesets` |
| Deploy (GitOps) | Flux reads the public repo; GitHub has no cluster access. Flux deploys as `deployer`, `admin` only in `lab-hub` and `cloudflared`: it cannot touch `kube-system`, namespaces, or cluster-scoped resources. `targetNamespace` pins every manifest. | `kubectl auth can-i --as=system:serviceaccount:flux-system:deployer create pods -n kube-system` → `no` |
| Collector (SSRF) | Contract `https` + public domain → DNS resolved and checked against private ranges, socket pinned to the checked IP, no redirects, 5 s timeout, 64 KB max → NetworkPolicy: `web` only reaches DNS and public 443. | `pnpm test` (`safe-fetch.test.ts`) |
| Content (MDX) | MDX compiles to code at build time and only comes from `content/` in this repo (ruleset-protected), never from project repos or users. Drafts (`draft: true`) only appear in `next dev`. The public revision history shows ok/fail and latency only, never the error message (it could leak IPs or internal names). | `/journal/<draft>` → 404 in production |
| Edge (backup Worker) | The Worker only serves a static copy of public pages; on outage it answers 503 on `/status` and `/healthz` (it does not hide the outage) and rejects anything other than GET/HEAD. No `workers.dev` or preview URLs. The Cloudflare token can only edit Workers and their routes on `beaiapp.com`, and lives on `production`. The snapshot script only downloads same-domain URLs, capped at 400 files and 40 MB. | `pnpm test` (`fallback.test.ts`) |
| HTTP headers | CSP (all same-origin; `script-src` needs `'unsafe-inline'` because pages are static and Next uses inline scripts), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. No `X-Powered-By`. Backup pages use `script-src 'none'`. | `curl -sI https://lab.beaiapp.com/` |
| Dependencies | Weekly Dependabot (site and Worker npm, Actions, Docker). `pnpm audit` clean at Phase 0 close. | `pnpm audit` |
| Pods | Pod Security `restricted`: no root, no capabilities, no privilege escalation, seccomp, read-only root, no service account token. | `kubectl apply --dry-run=server` with no warnings |

## Outstanding

- [x] Host firewall active (2026-10-23). 6443 and 10250 still listen but are no longer reachable from the LAN.
- [x] Tested from another LAN laptop: `nc -zv 192.168.1.74 6443` times out (2026-10-23).
- [x] GitHub (2026-10-23): `main-integrity` ruleset (no force push or delete of `main`) and `main-only-owner` (only org admins and the CI deploy key can push to `main`).
- [x] Outage drill (2026-10-24): with `web` at 0 replicas the site served the snapshot with a notice, `/status` returned 503 and UptimeRobot sent the DOWN alert; the site came back in ~14 s after Flux was re-enabled.
- [ ] Cloudflare: turn on Bot Fight Mode and a rate-limit rule for `lab.beaiapp.com`.
- [ ] Rotate the tunnel token if it ever appears in a log, screenshot or chat (**Tunnel → Refresh token → Rotate**).

## Phase 0 close review (2026-10-24)

- Security headers added and `X-Powered-By` removed.
- Vulnerable `undici` inside `wrangler` (CI tool only) pinned to the fixed version.
- Dependabot configured.
- Still open in repo settings: secret scanning, push protection and Dependabot alerts.

## Per-phase checklist

Every new project goes through this before it is announced:

- **Exposure:** which hostnames does it publish? Any admin panel? Panels sit behind Cloudflare Access, never open.
- **Network:** its own NetworkPolicy; only the egress it needs, to concrete destinations.
- **Pods:** satisfies `restricted`.
- **Secrets:** none in the repo; `git grep` and GitHub secret scanning on.
- **`/status`:** only the contract fields (the validator enforces this).
- **Dependencies:** Dependabot on; pinned image versions.
- **Cost:** resource limits on every pod and budget alerts in AWS so nobody turns the lab into an invoice.

Risks already visible in later phases:

| Phase | Risk | Planned mitigation |
|---|---|---|
| 0 · wk 3 | Anyone who can push to `main` deploys to the cluster. | Flux limited to 2 namespaces; `main` ruleset; fork PRs have no write access. |
| 0 · wk 4 | The collector requests `lab.yaml` URLs (SSRF): a malicious `status_url` could point at the LAN. | Done: three layers (contract, `safe-fetch` with checked DNS and pinned socket, NetworkPolicy egress only to public HTTPS). Tested. |
| 0 · wk 8 | The Hub as a public template receives third-party PRs. | External PR CI has no secrets; manual review of `lab.yaml`. |
| 1 · EvalGate | The GitHub Action runs PR code and uses LLM API keys. | `pull_request` (not `pull_request_target`), budget-limited keys, no secrets for forks. |
| 2 · Sim2Sim | GPU jobs on AWS. | Budget with alert and auto-shutdown; least-privilege IAM. |
| 3 · FleetOps | LLM agent with tools over robots. | Every physical action needs human approval; agent tools are read-only by default. |
| 4 · PolicyCI | OTA deploy to robots. | Signed artifacts; only deploys what passed EvalGate. |
| 5 · TwinArm | Physical arm on the network. | The arm is not reachable from the internet; commands go through FleetOps with approval. |

---

[Spanish version](security.es.md)
