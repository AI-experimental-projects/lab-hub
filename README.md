# Lab Hub

Portafolio vivo: un sitio en Next.js que muestra cada proyecto del lab funcionando en producción, con estado, uptime, versión y costo leídos en vivo.

> Estado: v0 en construcción (Fase 0). Las tarjetas usan datos de ejemplo hasta que llegue el collector.

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

Ambos formatos se validan con zod en [src/lib/contract.ts](src/lib/contract.ts). Un campo fuera del contrato hace fallar el build.

## Desarrollo

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
```

## Infra

Corre en k3s en un homelab, expuesto con Cloudflare Tunnel. Ver [infra/README.md](infra/README.md).

## Licencia

[MIT](LICENSE)
