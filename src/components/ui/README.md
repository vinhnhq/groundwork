# `components/ui` — pristine shadcn

**Do not edit anything in this folder.**

These files are shadcn primitives, kept byte-identical to what the generator
produces so `bunx shadcn@latest add <name>` can overwrite them at any time
without losing local work. They are excluded from lint and format (`.oxlintrc.json`
and `.oxfmtrc.json`) for the same reason: reformatting them is itself a
modification, and it turns the next upstream update into a diff full of noise.

## Where tweaks go

Anything Groundwork-specific lives **outside** this folder, in
`src/components/*`, as a wrapper that composes the primitive:

```tsx
// src/components/badges.tsx — a wrapper, edit freely
import { Badge } from "@/components/ui/badge";

export function TierBadge({ tier }: { tier?: AutonomyTier }) {
  return <Badge variant="secondary">{...}</Badge>;
}
```

That is the wrapper-over-pristine rule from `CLAUDE.md`. The test is simple: if
you are about to change a file in this folder, you want a wrapper instead.

## Adding a component

```bash
bunx shadcn@latest add table   # writes here, untouched
```

`components.json` at the repo root points the generator at this folder.
