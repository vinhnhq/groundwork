import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadPortfolio } from "@/lib/ops/load";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await loadPortfolio();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Groundwork</h1>
        <p className="max-w-xl text-muted-foreground ">
          Keeps a whole team's AI agents grounded in the same docs, and lets the people who don't
          use git keep the backlog in sync. Your project Markdown stays the single source of truth.
        </p>
        <Button asChild className="w-fit">
          <Link href="/ops">
            Open ops console
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Projects
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public projects configured.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.slug}>
                <Card className="h-full">
                <CardContent className="flex flex-col gap-3">
                <div>
                  <h3 className="font-medium">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground ">{p.tagline}</p>
                </div>
                {p.highlights.length > 0 && (
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground ">
                    {p.highlights.map((h) => (
                      <li key={h} className="flex gap-2">
                        <span className="text-muted-foreground">·</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {p.stack.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
                </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
