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

## 2. Hola mundo

```bash
kubectl apply -f infra/k8s/hello/
kubectl -n lab-hub port-forward svc/hello 8080:80   # abrir http://localhost:8080
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

3. En el tunnel, **Add route → Published application**: `lab.<tu-dominio>` → `http://hello.lab-hub.svc.cluster.local:80`. Cloudflare crea el CNAME solo.
4. Verifica:

   ```bash
   kubectl -n cloudflared get pods        # 2/2 Running
   curl -I https://lab.<tu-dominio>       # 200
   ```
