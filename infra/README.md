# Homelab infra

Single-node k3s, exposed to the internet through Cloudflare Tunnel. No home ports are opened: `cloudflared` runs inside the cluster and sends traffic out to Cloudflare.

```
internet ──▶ Cloudflare ──tunnel──▶ cloudflared (pod) ──▶ Service ──▶ pod
```

## 1. Install k3s

```bash
./infra/k3s/install.sh
```

Needs `sudo`. Installs the `stable` channel without Traefik or ServiceLB and leaves the kubeconfig in `~/.kube/config`.

Then the host firewall (blocks the LAN, allows k3s and Tailscale networks):

```bash
./infra/host/firewall.sh
```

## 2. Namespaces and Flux (GitOps)

Namespaces are cluster-wide objects and are applied by hand. Everything else is deployed by Flux from `main`:

```bash
kubectl apply -f infra/k8s/cluster/
kubectl apply -k infra/flux
kubectl -n flux-system wait --for=condition=Available deploy --all --timeout=180s
kubectl apply -f infra/flux/sync/
flux get kustomizations          # lab-hub and cloudflared Ready
```

Flux deploys as the `deployer` account, which only has permissions inside `lab-hub` and `cloudflared`.

### How a release ships

```
push to main ─▶ CI: validate, test, lint, build ─▶ image ghcr.io/…:sha-<commit>
             ─▶ CI: commit "deploy: web sha-<commit>" on web.yaml
             ─▶ Flux (in the cluster) sees the commit and rolls out
```

GitHub never connects to the cluster: Flux reads the public repo. After each push, `git pull --rebase` brings in the bot's deploy commit.

To roll back: `git revert` the `deploy: …` commit (or any `infra/k8s/` change) and push.

The bot pushes with a deploy key (SSH, this repo only) stored as the `DEPLOY_KEY` secret on the `production` environment, which only `main` can use. To create or rotate it:

```bash
./infra/github/setup-deploy-key.sh            # delete the old key first under Settings → Deploy keys
```

## 3. Cloudflare Tunnel

1. In the Cloudflare dashboard: **Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared**. Name it `homelab` and copy **only the token** (the `eyJ...` part of the shown command, not the whole command).
2. Create the Secret (the token never enters the repo):

   ```bash
   read -rsp "Token: " TOKEN && echo
   kubectl -n cloudflared create secret generic cloudflared-token --from-literal=token="$TOKEN" && unset TOKEN
   ```

3. On the tunnel, **Add route → Published application**: `lab.<your-domain>` → `http://web.lab-hub.svc.cluster.local:80`. Cloudflare creates the CNAME by itself.
4. Verify:

   ```bash
   kubectl -n cloudflared get pods        # 2/2 Running
   curl -I https://lab.<your-domain>      # 200
   ```

## 4. Edge backup (Cloudflare Worker)

`infra/edge/` is a Worker in front of `lab.beaiapp.com`: it forwards every request to the homelab and, if that fails (5xx or more than 8 s), serves the last snapshot of the site with a notice. `/status` and `/healthz` answer 503 in that case so monitors see the outage.

The snapshot is taken by `scripts/snapshot.ts` (pages from `sitemap.xml` and their static assets). The `edge.yml` workflow refreshes it every 30 minutes and deploys the Worker; if the site is down at that moment, it does not overwrite the good snapshot.

One-time setup:

1. **Cloudflare API token.** Under **My Profile → API Tokens → Create Token → Custom token**, with these permissions:
   - Account · Workers Scripts · Edit
   - Zone · Workers Routes · Edit, only for the `beaiapp.com` zone
2. **Store it in GitHub** (`production` environment, `main` only):

   ```bash
   gh secret set CLOUDFLARE_API_TOKEN --env production -R AI-experimental-projects/lab-hub
   gh variable set CLOUDFLARE_ACCOUNT_ID --env production -R AI-experimental-projects/lab-hub --body <account-id>
   ```

3. Run the **Edge snapshot** workflow by hand (Actions → Run workflow).

---

[Spanish version](README.es.md)
