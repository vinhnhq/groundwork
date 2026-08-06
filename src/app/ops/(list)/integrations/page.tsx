import Link from "next/link";
import { requireCapability } from "@/app/ops/guard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { IntegrationState } from "@/lib/ops/integrations";
import { listIntegrations } from "@/lib/ops/integrations";

export const dynamic = "force-dynamic";

/** Live earns the filled variant; mock keeps its amber warning; off is neutral. */
const STATE_VARIANT: Record<IntegrationState, "default" | "secondary" | "outline"> = {
  live: "default",
  mock: "secondary",
  disabled: "outline",
};

const STATE_TINT: Partial<Record<IntegrationState, string>> = {
  mock: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

const STATE_LABEL: Record<IntegrationState, string> = {
  live: "live",
  mock: "mock",
  disabled: "off",
};

export default async function IntegrationsPage() {
  // This page prints every environment variable name and which seams are live.
  // The proxy gates it, but only while its five-minute cookie cache is warm —
  // this is the check that holds when it is not.
  await requireCapability("integrations.view");

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
          <li key={integration.name}>
            <Card size="sm">
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{integration.name}</h2>
                  <Badge
                    variant={STATE_VARIANT[integration.state]}
                    className={STATE_TINT[integration.state]}
                  >
                    {STATE_LABEL[integration.state]}
                  </Badge>
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
                    <Badge key={name} variant="secondary" className="font-mono text-[11px]">
                      {name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
