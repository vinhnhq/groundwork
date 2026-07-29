import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/**
 * The ops session guard, and nothing visual.
 *
 * Chrome differs by area: the list pages get a top bar `(list)/layout.tsx`,
 * while a project owns the whole viewport for its sidebar workspace. Rendering
 * a shared header here put a sticky bar on top of the sidebar's fixed column.
 */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  // The proxy already gated this. Repeated so no ops route can ever render
  // without a session if that matcher is narrowed.
  if (!(await getSession())) redirect("/sign-in");

  return <div className="flex min-h-svh flex-col">{children}</div>;
}
