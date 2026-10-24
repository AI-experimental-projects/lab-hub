import type { Locale } from "./config.ts";

const en = {
  meta: {
    description: "Projects in production: live status, uptime, version and cost.",
  },
  nav: { projects: "Projects", journal: "Journal", switchTo: "Español", switchLabel: "Ver en español" },
  home: {
    title: "Projects",
    intro: "Systems in production, read live from each project's /status.",
  },
  state: { up: "Online", down: "Failing", stale: "No recent data", unknown: "No data" },
  stats: {
    version: "version",
    uptime: "uptime 30d",
    cost: "cost/mo",
    latency: "avg latency",
  },
  card: { phase: "Phase", checked: "checked", repo: "repo" },
  project: {
    back: "← Projects",
    repo: "Repository",
    demo: "Demo",
    video: "Video",
    lastCheck: (time: string) => `Last check ${time}. The Hub fetches /status every 5 minutes.`,
    neverChecked: "The Hub hasn't checked this project yet.",
    history: (n: number) => (n === 1 ? "Last check" : `Last ${n} checks`),
    failed: (n: number) => ` · ${n} failed`,
    historyLabel: (n: number, failed: number) => `${n} recent checks, ${failed} failed`,
    ok: "ok",
    fail: "failed",
    inJournal: "In the journal",
  },
  journal: {
    title: "Journal",
    intro: "Experiment notes, decisions and case studies.",
    empty: "No entries published yet.",
    back: "← Journal",
    draft: "draft",
    project: "project",
    onlyIn: "Only in Spanish",
    kind: { nota: "Note", "caso-de-estudio": "Case study" },
  },
  notFound: { title: "This page doesn't exist", back: "Back to projects" },
  loading: "Loading…",
};

export type Dictionary = typeof en;

const es: Dictionary = {
  meta: {
    description: "Proyectos en producción: estado, uptime, versión y costo en vivo.",
  },
  nav: { projects: "Proyectos", journal: "Bitácora", switchTo: "English", switchLabel: "View in English" },
  home: {
    title: "Proyectos",
    intro: "Sistemas en producción, leídos en vivo desde el /status de cada proyecto.",
  },
  state: { up: "En línea", down: "Con fallas", stale: "Sin datos recientes", unknown: "Sin datos" },
  stats: {
    version: "versión",
    uptime: "uptime 30d",
    cost: "costo/mes",
    latency: "latencia prom.",
  },
  card: { phase: "Fase", checked: "revisado", repo: "repo" },
  project: {
    back: "← Proyectos",
    repo: "Repositorio",
    demo: "Demo",
    video: "Video",
    lastCheck: (time: string) => `Última revisión ${time}. El Hub pide el /status cada 5 minutos.`,
    neverChecked: "El Hub todavía no ha revisado este proyecto.",
    history: (n: number) => (n === 1 ? "Última revisión" : `Últimas ${n} revisiones`),
    failed: (n: number) => ` · ${n} con falla`,
    historyLabel: (n: number, failed: number) => `${n} revisiones recientes, ${failed} con falla`,
    ok: "ok",
    fail: "falla",
    inJournal: "En la bitácora",
  },
  journal: {
    title: "Bitácora",
    intro: "Notas de experimentos, decisiones y casos de estudio.",
    empty: "Todavía no hay entradas publicadas.",
    back: "← Bitácora",
    draft: "borrador",
    project: "proyecto",
    onlyIn: "Solo en inglés",
    kind: { nota: "Nota", "caso-de-estudio": "Caso de estudio" },
  },
  notFound: { title: "Esta página no existe", back: "Volver a los proyectos" },
  loading: "Cargando…",
};

export const DICTIONARIES: Record<Locale, Dictionary> = { en, es };
