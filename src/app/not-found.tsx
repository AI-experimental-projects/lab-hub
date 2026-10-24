import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="text-2xl font-medium text-fg-strong">Esta página no existe</h1>
      <Link href="/" className="text-sm text-accent hover:underline">
        Volver a los proyectos
      </Link>
    </div>
  );
}
