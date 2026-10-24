import { ProjectCard } from "@/components/project-card";
import { getDictionary } from "@/i18n/server";
import { getProjects } from "@/lib/projects";

export default async function Home() {
  const [{ locale, t }, projects] = await Promise.all([getDictionary(), getProjects()]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-medium text-fg-strong">{t.home.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{t.home.intro}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.manifest.slug} project={project} locale={locale} t={t} />
        ))}
      </section>
    </div>
  );
}
