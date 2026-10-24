// Starts the status collector inside the Node.js server: no extra service and no
// public "collect" endpoint that someone could hammer.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.LAB_COLLECTOR === "off") return;
  const { startCollector } = await import("./lib/collector-loop.ts");
  startCollector();
}
