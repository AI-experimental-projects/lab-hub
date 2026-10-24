# Seguridad del lab

Regla: **cada fase cierra con una revisión de seguridad.** Un proyecto no está terminado si no pasa su lista.

## Modelo de amenazas

El homelab es una máquina de la casa con acceso a la LAN, a Tailscale y a servicios personales. Lo que hay que evitar:

1. Que alguien use el servidor para algo distinto a servir los proyectos (proxy, minería, pivote hacia la LAN).
2. Que un proyecto exponga datos o credenciales.
3. Que un servicio comprometido alcance a los demás.

## Controles actuales (Fase 0, semana 1)

| Capa | Control | Cómo se verifica |
|---|---|---|
| LAN → host | ufw: entrada denegada por defecto; solo se permiten las redes de k3s (10.42/16, 10.43/16) y `tailscale0`. Script: `infra/host/firewall.sh`. | `sudo ufw status verbose` |
| Internet → casa | Sin puertos abiertos. Todo entra por Cloudflare Tunnel (conexión saliente). | `ss -ltn`, el router no tiene port forwarding |
| Túnel | Solo los hostnames dados de alta en el dashboard. Catch-all `http_status:404`. WARP routing apagado. | Logs de `cloudflared`: `Updated to new configuration` |
| Token del túnel | Vive solo en el Secret `cloudflared-token`. Nunca en el repo ni en el chat. | `git grep -E "eyJ[A-Za-z0-9_-]{100,}"` vacío |
| Red del cluster | NetworkPolicies con todo denegado por defecto. `cloudflared` solo sale a DNS, al edge de Cloudflare (internet público, sin rangos privados) y a `lab-hub:8080`. | Prueba con un pod de prueba con la etiqueta `app=cloudflared` |
| Repo | `main` protegido por rulesets. El CI hace push con una deploy key de un solo repo, guardada en el entorno `production` (solo `main`). Los PRs y forks no la ven. | `gh api repos/AI-experimental-projects/lab-hub/rulesets` |
| Despliegue (GitOps) | Flux lee el repo público; GitHub no tiene acceso al cluster. Flux despliega como `deployer`, con rol `admin` solo en `lab-hub` y `cloudflared`: no puede tocar `kube-system`, namespaces ni recursos de todo el cluster. `targetNamespace` fuerza el namespace de cada manifiesto. | `kubectl auth can-i --as=system:serviceaccount:flux-system:deployer create pods -n kube-system` → `no` |
| Collector (SSRF) | Contrato `https` + dominio público → DNS resuelto y revisado contra rangos privados, socket fijado a la IP revisada, sin redirecciones, timeout de 5 s y 64 KB máximo → NetworkPolicy: `web` solo sale a DNS y a 443 público. | `pnpm test` (`safe-fetch.test.ts`) |
| Contenido (MDX) | MDX se compila a código en el build, así que solo viene de `content/` en este repo (protegido por los rulesets), nunca de los repos de proyectos ni de usuarios. Los borradores (`draft: true`) solo se ven en `next dev`. El historial público de revisiones muestra solo ok/falla y latencia, nunca el mensaje de error (podría revelar IPs o nombres internos). | `/journal/<borrador>` → 404 en producción |
| Edge (Worker de respaldo) | El Worker solo sirve una copia estática de páginas públicas; en una caída responde 503 en `/status` y `/healthz` (no oculta la caída) y rechaza todo lo que no sea GET/HEAD. Sin `workers.dev` ni URLs de preview. El token de Cloudflare solo puede editar Workers y sus rutas en `beaiapp.com`, y vive en el entorno `production`. El script de copia solo descarga URLs del mismo dominio, con límites de 400 archivos y 40 MB. | `pnpm test` (`fallback.test.ts`) |
| Cabeceras HTTP | CSP (todo limitado al mismo origen; `script-src` necesita `'unsafe-inline'` porque las páginas son estáticas y Next usa scripts inline), HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. Sin `X-Powered-By`. Las páginas de respaldo llevan `script-src 'none'`. | `curl -sI https://lab.beaiapp.com/` |
| Dependencias | Dependabot semanal (npm del sitio y del Worker, Actions, Docker). `pnpm audit` limpio al cierre de la Fase 0. | `pnpm audit` |
| Pods | Pod Security `restricted`: sin root, sin capabilities, sin escalar privilegios, seccomp, raíz de solo lectura, sin token de service account. | `kubectl apply --dry-run=server` sin avisos |

## Pendiente

- [x] Firewall del host activo (2026-10-23). 6443 y 10250 siguen escuchando, pero ya no son accesibles desde la LAN.
- [x] Probado desde otra laptop de la LAN: `nc -zv 192.168.1.74 6443` da timeout (2026-10-23).
- [x] GitHub (2026-10-23): ruleset `main-integrity` (nadie hace force push ni borra `main`) y `main-only-owner` (solo admins de la org y la deploy key del CI pueden hacer push a `main`).
- [x] Prueba de caída (2026-10-24): con `web` en 0 réplicas, el sitio sirvió la copia con aviso, `/status` dio 503 y UptimeRobot mandó la alerta DOWN; el sitio volvió en ~14 s al reactivar Flux.
- [ ] Cloudflare: activar Bot Fight Mode y una regla de rate limiting para `lab.beaiapp.com`.
- [ ] Rotar el token del túnel si alguna vez aparece en un log, captura o chat (**Tunnel → Refresh token → Rotate**).

## Revisión de cierre: Fase 0 (2026-10-24)

- Agregadas las cabeceras de seguridad y quitado `X-Powered-By`.
- `undici` vulnerable dentro de `wrangler` (solo herramienta de CI) forzado a la versión corregida.
- Dependabot configurado.
- Pendiente en ajustes del repo: secret scanning, push protection y alertas de Dependabot.

## Lista por fase

Cada proyecto nuevo pasa por esto antes de anunciarse:

- **Exposición:** ¿qué hostnames publica? ¿Algún panel de administración? Los paneles van detrás de Cloudflare Access, nunca abiertos.
- **Red:** NetworkPolicy propia; solo la salida que necesita, a destinos concretos.
- **Pods:** cumple `restricted`.
- **Secretos:** ninguno en el repo; `git grep` y secret scanning de GitHub activos.
- **`/status`:** solo los campos del contrato (el validador lo hace cumplir).
- **Dependencias:** Dependabot activo; imágenes con versión fija.
- **Costo:** límites de recursos en cada pod y alertas de presupuesto en AWS, para que nadie convierta el lab en una factura.

Riesgos que ya se ven venir en fases siguientes:

| Fase | Riesgo | Mitigación planeada |
|---|---|---|
| 0 · sem. 3 | Quien pueda hacer push a `main` despliega en el cluster. | Flux limitado a 2 namespaces; ruleset en `main`; los PRs de forks no tienen permisos de escritura. |
| 0 · sem. 4 | El collector hace peticiones a las URLs de `lab.yaml` (SSRF): un `status_url` malicioso podría apuntar a la LAN. | Hecho: tres capas (contrato, `safe-fetch` con DNS revisado y socket fijado, NetworkPolicy de salida solo a HTTPS público). Con tests. |
| 0 · sem. 8 | El Hub como plantilla pública recibe PRs de terceros. | El CI de PRs externos no tiene acceso a secretos; revisión manual de `lab.yaml`. |
| 1 · EvalGate | La GitHub Action corre código de PRs y usa API keys de LLMs. | `pull_request` (no `pull_request_target`), keys con presupuesto limitado, sin secretos para forks. |
| 2 · Sim2Sim | Jobs de GPU en AWS. | Presupuesto con alerta y apagado automático; IAM con mínimo privilegio. |
| 3 · FleetOps | Agente LLM con herramientas sobre robots. | Toda acción física requiere aprobación humana; las herramientas del agente son de solo lectura por defecto. |
| 4 · PolicyCI | Despliegue OTA a robots. | Artefactos firmados; solo despliega lo que pasó por EvalGate. |
| 5 · TwinArm | Brazo físico conectado a la red. | El brazo no es accesible desde internet; los comandos pasan por FleetOps con aprobación. |

---

[English version](security.md)
