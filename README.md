# Lab Hub

Portafolio vivo: un sitio en Next.js que muestra cada proyecto del lab funcionando en producción, con estado, uptime, versión y costo leídos en vivo.

> Estado: v0 en construcción (Fase 0). El primer proyecto en vivo es el propio Hub; cada proyecto nuevo del roadmap se conecta con su `lab.yaml`.

## Cómo funciona

El Hub **jala** datos de los proyectos; los proyectos nunca le envían nada. Conectar un proyecto nuevo es solo agregar su `lab.yaml`.

Cada proyecto publica un `lab.yaml`:

```yaml
name: EvalGate
slug: evalgate
phase: 1
summary: Evals como gate de despliegue para agentes y políticas de robot
repo: github.com/AI-experimental-projects/evalgate
demo: https://evalgate.example.com
status_url: https://evalgate.example.com/status
metrics: [runs_24h, gate_blocks_7d, p95_latency_ms]
```

Y expone `GET /status`:

```json
{
  "ok": true,
  "version": "0.3.1",
  "uptime_30d": 0.997,
  "metrics": { "runs_24h": 42, "gate_blocks_7d": 3, "p95_latency_ms": 840 },
  "cost_month_usd": 4.2
}
```

Ambos formatos se validan con zod en [src/lib/contract.ts](src/lib/contract.ts). Un campo fuera del contrato hace fallar el build (`pnpm validate`).

## Collector

Corre dentro del servidor de Next.js (`src/instrumentation.ts`): cada 5 minutos pide el `status_url` de cada proyecto, valida la respuesta contra el contrato y la guarda en SQLite (`node:sqlite`). El uptime de 30 días lo mide el Hub; no es el que reporta cada proyecto. El Hub también se revisa a sí mismo a través de su URL pública.

Las URLs vienen de archivos que cualquiera podría proponer en un PR, así que el collector está protegido contra SSRF en tres capas:

1. **Contrato:** solo `https` a dominios públicos; sin IPs, nombres internos, credenciales ni puertos.
2. **Petición** ([src/lib/safe-fetch.ts](src/lib/safe-fetch.ts)): resuelve el DNS, rechaza si alguna IP es privada o reservada y fija el socket a la IP revisada (contra DNS rebinding). Sin redirecciones, con timeout de 5 s y respuestas de máximo 64 KB.
3. **Red** (NetworkPolicy): el pod solo puede salir a DNS y a HTTPS en internet público.

## Desarrollo

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm validate   # revisa content/projects/*.yaml
pnpm test
pnpm build
```

## Infra

Corre en k3s en un homelab, expuesto con Cloudflare Tunnel. Ver [infra/README.md](infra/README.md).

## Licencia

[MIT](LICENSE)
