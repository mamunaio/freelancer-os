"use client";

import { useTranslations } from "next-intl";

import { ProjectCard } from "./project-card";
import type { ProjectRow } from "@/features/projects/queries";
import type { Locale } from "@/i18n/routing";

interface Props {
  locale: Locale;
  projects: ProjectRow[];
  onEdit: (project: ProjectRow) => void;
}

export function ProjectsListView({ locale, projects, onEdit }: Props) {
  const t = useTranslations("Projects.stats");
  const pinned = projects.filter((p) => p.pinned);
  const rest = projects.filter((p) => !p.pinned);

  return (
    <div className="space-y-5">
      {pinned.length > 0 && (
        <section className="space-y-2">
          <p className="eyebrow">{t("pinned")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pinned.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                locale={locale}
                onEdit={() => onEdit(project)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        {pinned.length > 0 && rest.length > 0 && (
          <p className="eyebrow">{t("active")}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              locale={locale}
              onEdit={() => onEdit(project)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
