# Infra del homelab

k3s de un solo nodo, expuesto a internet con Cloudflare Tunnel. No se abre ningún puerto de la casa: `cloudflared` corre dentro del cluster y saca el tráfico hacia Cloudflare.

```
internet ──▶ Cloudflare ──tunnel──▶ cloudflared (pod) ──▶ Service ──▶ pod
```

## 1. Instalar k3s

```bash
./infra/k3s/install.sh
```

Pide `sudo`. Instala el canal `stable` sin Traefik ni ServiceLB y deja el kubeconfig en `~/.kube/config`.

Después, el firewall del host (bloquea la LAN, deja pasar las redes de k3s y Tailscale):

```bash
./infra/host/firewall.sh
```

## 2. Namespaces y Flux (GitOps)

Los namespaces son objetos de todo el cluster y se aplican a mano. Todo lo demás lo despliega Flux desde `main`:

```bash
kubectl apply -f infra/k8s/cluster/
kubectl apply -k infra/flux
kubectl -n flux-system wait --for=condition=Available deploy --all --timeout=180s
kubectl apply -f infra/flux/sync/
flux get kustomizations          # lab-hub y cloudflared en Ready
```

Flux despliega con la cuenta `deployer`, que solo tiene permisos dentro de `lab-hub` y `cloudflared`.

### Cómo se despliega una versión

```
push a main ─▶ CI: validate, test, lint, build ─▶ imagen ghcr.io/…:sha-<commit>
            ─▶ CI: commit "deploy: web sha-<commit>" en web.yaml
            ─▶ Flux (dentro del cluster) ve el commit y hace el rollout
```

GitHub nunca se conecta al cluster: Flux lee el repo público. Después de cada push, `git pull --rebase` trae el commit de deploy del bot.

Para revertir: `git revert` del commit `deploy: …` (o de cualquier cambio en `infra/k8s/`) y push.

El bot hace push con una deploy key (SSH, solo este repo) guardada como secreto `DEPLOY_KEY` del entorno `production`, que solo `main` puede usar. Para crearla o rotarla:

```bash
./infra/github/setup-deploy-key.sh            # borra antes la llave vieja en Settings → Deploy keys
```

## 3. Cloudflare Tunnel

1. En el dashboard de Cloudflare: **Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared**. Ponle de nombre `homelab` y copia **solo el token** (la parte `eyJ...` del comando que muestra, no el comando entero).
2. Crea el Secret (el token nunca entra al repo):

   ```bash
   read -rsp "Token: " TOKEN && echo
   kubectl -n cloudflared create secret generic cloudflared-token --from-literal=token="$TOKEN" && unset TOKEN
   ```

3. En el tunnel, **Add route → Published application**: `lab.<tu-dominio>` → `http://web.lab-hub.svc.cluster.local:80`. Cloudflare crea el CNAME solo.
4. Verifica:

   ```bash
   kubectl -n cloudflared get pods        # 2/2 Running
   curl -I https://lab.<tu-dominio>       # 200
   ```
