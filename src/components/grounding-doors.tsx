"use client";

import { Briefcase, Layers, Wrench } from "lucide-react";
import { useState } from "react";

import { CopyContext } from "@/components/copy-context";
import { Reveal } from "@/components/reveal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BrainAudience } from "@/lib/brain";

export type Door = {
  audience: BrainAudience;
  label: string;
  blurb: string;
  text: string;
};

const ICON: Record<BrainAudience, typeof Wrench> = {
  tech: Wrench,
  biz: Briefcase,
  both: Layers,
};

/**
 * One digest per audience, behind a switch.
 *
 * All three are rendered server-side and shipped together, so switching is
 * instant and the character counts are comparable at a glance — the number is
 * how you notice that `biz` is genuinely smaller because the reasoning is gone,
 * not merely relabelled.
 */
export function GroundingDoors({ project, doors }: { project: string; doors: Door[] }) {
  const [audience, setAudience] = useState<BrainAudience>("both");
  const active = doors.find((d) => d.audience === audience) ?? doors[0];
  if (!active) return null;

  const Icon = ICON[active.audience];

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-base">{active.label}</CardTitle>
          </div>
          <Tabs value={audience} onValueChange={(v) => setAudience(v as BrainAudience)}>
            <TabsList aria-label="Digest audience">
              {doors.map((door) => (
                <TabsTrigger
                  key={door.audience}
                  value={door.audience}
                  data-testid={`audience-${door.audience}`}
                >
                  {door.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <CardDescription>{active.blurb}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <CopyContext
          key={active.audience}
          text={active.text}
          exportHref={`/ops/${project}/context.md?audience=${active.audience}`}
        />
        {/* Keyed on the audience so switching re-runs the entrance: the digests
            differ by thousands of characters, and a silent swap of a wall of
            monospace is easy to miss. */}
        <Reveal key={active.audience}>
          <pre
            data-testid="digest-preview"
            className="max-h-96 overflow-auto rounded-lg bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap"
          >
            {active.text}
          </pre>
        </Reveal>
      </CardContent>
    </Card>
  );
}
