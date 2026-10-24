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

## 2. Lab Hub

El CI publica una imagen por commit en `ghcr.io/ai-experimental-projects/lab-hub:sha-<commit>`. Para desplegar un commit, cambia el tag en `infra/k8s/lab-hub/web.yaml`, haz commit y aplica:

```bash
kubectl apply -f infra/k8s/lab-hub/
kubectl -n lab-hub rollout status deploy/web
kubectl -n lab-hub port-forward svc/web 8080:80   # abrir http://localhost:8080
```

## 3. Cloudflare Tunnel

1. En el dashboard de Cloudflare: **Zero Trust → Networks → Tunnels → Create a tunnel → Cloudflared**. Ponle de nombre `homelab` y copia **solo el token** (la parte `eyJ...` del comando que muestra, no el comando entero).
2. Crea el Secret (el token nunca entra al repo):

   ```bash
   kubectl create namespace cloudflared
   read -rsp "Token: " TOKEN && echo
   kubectl -n cloudflared create secret generic cloudflared-token --from-literal=token="$TOKEN" && unset TOKEN
   kubectl apply -f infra/k8s/cloudflared/
   ```

3. En el tunnel, **Add route → Published application**: `lab.<tu-dominio>` → `http://web.lab-hub.svc.cluster.local:80`. Cloudflare crea el CNAME solo.
4. Verifica:

   ```bash
   kubectl -n cloudflared get pods        # 2/2 Running
   curl -I https://lab.<tu-dominio>       # 200
   ```
