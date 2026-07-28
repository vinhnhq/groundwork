import Link from "next/link";
import type { IntegrationState } from "@/lib/ops/integrations";
import { listIntegrations } from "@/lib/ops/integrations";

export const dynamic = "force-dynamic";

const STATE_STYLE: Record<IntegrationState, string> = {
  live: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  mock: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  disabled: "bg-muted text-muted-foreground",
};

const STATE_LABEL: Record<IntegrationState, string> = {
  live: "live",
  mock: "mock",
  disabled: "off",
};

export default function IntegrationsPage() {
  const integrations = listIntegrations();
  const mocked = integrations.filter((i) => i.state === "mock").length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/ops" className="text-sm text-muted-foreground hover:underline">
          ← ops
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every swappable seam, what is actually running behind it, and the variable that makes it
          real. {mocked > 0 && `${mocked} are still mocked.`}
        </p>
      </div>

      <ul className="flex flex-col gap-3" data-testid="integrations">
        {integrations.map((integration) => (
          <li key={integration.name} className="rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-medium">{integration.name}</h2>
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATE_STYLE[integration.state]}`}
              >
                {STATE_LABEL[integration.state]}
              </span>
            </div>

            <p className="mt-1.5 text-sm">{integration.detail}</p>

            {integration.state !== "live" && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                <span className="font-medium">To activate: </span>
                {integration.activate}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5">
              {integration.env.map((name) => (
                <code
                  key={name}
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                >
                  {name}
                </code>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
