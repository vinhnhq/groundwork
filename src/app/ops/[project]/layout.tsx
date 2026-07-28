import { notFound } from "next/navigation";
import { ProjectShell } from "@/components/app-shell/project-shell";
import { UserChrome } from "@/components/app-shell/user-chrome";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/auth/roles";
import { getContentSource } from "@/lib/content";
import { isStartable } from "@/lib/tasks/dor";
import { parseBacklog } from "@/lib/tasks/parse-backlog";

export const dynamic = "force-dynamic";

/**
 * Wraps every project section in the workspace chrome, so the nav persists
 * across Overview / Docs / Tasks / Grounding / Triage and reading a doc keeps
 * you inside the project rather than dumping you on a bare page.
 */
export default async function ProjectLayout({
  params,
  children,
}: {
  params: Promise<{ project: string }>;
  children: React.ReactNode;
}) {
  const { project: slug } = await params;
  const source = getContentSource();

  const [project, session, docs, backlog] = await Promise.all([
    source.getProject(slug),
    getSession(),
    source.listDocs(slug),
    source.readBacklog(slug),
  ]);
  if (!project) notFound();

  const tasks = backlog ? parseBacklog(backlog, slug) : [];
  const role = session?.user.role ?? "client";

  return (
    <ProjectShell
      slug={slug}
      name={project.meta.name}
      status={project.meta.status}
      counts={{
        docs: docs.length,
        tasks: tasks.length,
        ready: tasks.filter(isStartable).length,
      }}
      mayGround={can(role, "grounding.read")}
      mayAgent={can(role, "agent.run")}
      userChrome={<UserChrome />}
    >
      {children}
    </ProjectShell>
  );
}
