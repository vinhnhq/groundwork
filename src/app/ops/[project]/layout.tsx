import { notFound } from "next/navigation";
import { ProjectShell } from "@/components/app-shell/project-shell";
import { HeaderActions, SidebarProfile } from "@/components/app-shell/user-chrome";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/auth/roles";
import { getContentSource } from "@/lib/content";
import { buildDocTree } from "@/lib/content/doc-tree";
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

  // Built here, in the layout, so the sidebar tree survives navigation between
  // documents — React keeps the layout mounted, so collapsed folders and the
  // tree's scroll position persist while you read.
  const docTree = buildDocTree(docs, slug);

  return (
    <ProjectShell
      slug={slug}
      name={project.meta.name}
      counts={{
        docs: docs.length,
        tasks: tasks.length,
        ready: tasks.filter(isStartable).length,
      }}
      docTree={docTree}
      mayGround={can(role, "grounding.read")}
      mayAgent={can(role, "agent.run")}
      headerActions={<HeaderActions />}
      profile={<SidebarProfile />}
    >
      {children}
    </ProjectShell>
  );
}
