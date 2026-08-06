import { describe, expect, it } from "vitest";

import { parseProjectMeta } from "@/lib/content/parse-project";
import { isErr, isOk } from "@/lib/result";

const valid = `
slug: demo
name: Demo Project
tagline: A demo
status: active
visibility: public
stack: [next, ts]
links: { repo: "https://x", live: "" }
public_highlights:
  - one
  - two
`;

describe("parseProjectMeta", () => {
  it("parses a valid project.yml", () => {
    const r = parseProjectMeta(valid);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.slug).toBe("demo");
      expect(r.value.stack).toEqual(["next", "ts"]);
      expect(r.value.public_highlights).toEqual(["one", "two"]);
    }
  });

  it("applies defaults for omitted optional fields", () => {
    const r = parseProjectMeta("slug: min\nname: Minimal");
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.status).toBe("active");
      expect(r.value.visibility).toBe("public");
      expect(r.value.stack).toEqual([]);
      expect(r.value.tagline).toBe("");
    }
  });

  it("errors on invalid YAML", () => {
    const r = parseProjectMeta("slug: : :\n  - broken");
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error._tag).toBe("InvalidYaml");
  });

  it("errors on schema violation (missing required name)", () => {
    const r = parseProjectMeta("slug: no-name");
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error._tag).toBe("InvalidSchema");
      if (r.error._tag === "InvalidSchema") {
        expect(r.error.issues.join(" ")).toMatch(/name/);
      }
    }
  });

  it("rejects an unknown status value", () => {
    const r = parseProjectMeta("slug: s\nname: n\nstatus: bogus");
    expect(isErr(r)).toBe(true);
  });
});
