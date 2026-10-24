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
| Pods | Pod Security `restricted`: sin root, sin capabilities, sin escalar privilegios, seccomp, raíz de solo lectura, sin token de service account. | `kubectl apply --dry-run=server` sin avisos |

## Pendiente

- [x] Firewall del host activo (2026-10-23). 6443 y 10250 siguen escuchando, pero ya no son accesibles desde la LAN.
- [ ] Probar desde otro equipo de la LAN que 6443 y 10250 no responden (`nc -zv 192.168.1.74 6443`).
- [ ] Cloudflare: activar Bot Fight Mode y una regla de rate limiting para `lab.beaiapp.com`.
- [ ] Rotar el token del túnel si alguna vez aparece en un log, captura o chat (**Tunnel → Refresh token → Rotate**).

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
| 0 · sem. 4 | El collector hace peticiones a las URLs de `lab.yaml` (SSRF): un `status_url` malicioso podría apuntar a la LAN. | Solo `https`, lista de dominios permitidos, y NetworkPolicy que no deja salir a rangos privados. |
| 0 · sem. 8 | El Hub como plantilla pública recibe PRs de terceros. | El CI de PRs externos no tiene acceso a secretos; revisión manual de `lab.yaml`. |
| 1 · EvalGate | La GitHub Action corre código de PRs y usa API keys de LLMs. | `pull_request` (no `pull_request_target`), keys con presupuesto limitado, sin secretos para forks. |
| 2 · Sim2Sim | Jobs de GPU en AWS. | Presupuesto con alerta y apagado automático; IAM con mínimo privilegio. |
| 3 · FleetOps | Agente LLM con herramientas sobre robots. | Toda acción física requiere aprobación humana; las herramientas del agente son de solo lectura por defecto. |
| 4 · PolicyCI | Despliegue OTA a robots. | Artefactos firmados; solo despliega lo que pasó por EvalGate. |
| 5 · TwinArm | Brazo físico conectado a la red. | El brazo no es accesible desde internet; los comandos pasan por FleetOps con aprobación. |
