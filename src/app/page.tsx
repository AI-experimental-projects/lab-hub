import { ProjectCard } from "@/components/project-card";
import { getProjects } from "@/lib/projects";

export default async function Home() {
  const projects = await getProjects();

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-medium text-fg-strong">Proyectos</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Sistemas en producción, leídos en vivo desde el <code className="font-mono">/status</code>{" "}
          de cada proyecto.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.manifest.slug} project={project} />
        ))}
      </section>
    </div>
  );
}
