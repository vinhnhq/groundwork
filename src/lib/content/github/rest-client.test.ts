import { afterEach, describe, expect, it, vi } from "vitest";
import type { Repo } from "@/lib/content/github/client";
import { createRestGitHubClient } from "@/lib/content/github/rest-client";

/**
 * The REST client cannot be exercised against live GitHub here — there is no
 * token — so it is pinned against a stubbed fetch instead. This is the code
 * most likely to be wrong the first time a real token appears, and "we could
 * not test it" is the reason to test the parts that do not need a network, not
 * a reason to ship it unchecked.
 */

const repo: Repo = { owner: "acme", name: "checkout", branch: "main" };

type Call = { url: string; init?: RequestInit };

function stubFetch(responder: (call: Call) => { status?: number; body: unknown }) {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const call = { url: String(url), init };
    calls.push(call);
    const { status = 200, body } = responder(call);
    return new Response(JSON.stringify(body), { status });
  });
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe("rest GitHub client", () => {
  it("sends the token and the API version on every request", async () => {
    const calls = stubFetch(() => ({ body: { content: "", encoding: "base64" } }));
    await createRestGitHubClient("tok").getFile(repo, "__project__/project.yml");

    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer tok");
    expect(headers["x-github-api-version"]).toBe("2022-11-28");
  });

  it("decodes base64 file contents", async () => {
    stubFetch(() => ({
      body: { content: Buffer.from("# Hello", "utf8").toString("base64"), encoding: "base64" },
    }));

    expect(await createRestGitHubClient("tok").getFile(repo, "a.md")).toBe("# Hello");
  });

  it("asks for the repo's branch, not just the default", async () => {
    const calls = stubFetch(() => ({ body: { content: "", encoding: "base64" } }));
    await createRestGitHubClient("tok").getFile({ ...repo, branch: "develop" }, "__project__/x.md");

    expect(calls[0].url).toContain("/repos/acme/checkout/contents/__project__/x.md");
    expect(calls[0].url).toContain("ref=develop");
  });

  it("returns null rather than throwing on a missing file", async () => {
    stubFetch(() => ({ status: 404, body: { message: "Not Found" } }));
    expect(await createRestGitHubClient("tok").getFile(repo, "nope.md")).toBeNull();
  });

  it("maps a directory listing, and returns empty when the path is absent", async () => {
    stubFetch(() => ({
      body: [
        { name: "0001-a.md", type: "file" },
        { name: "assets", type: "dir" },
      ],
    }));
    const listed = await createRestGitHubClient("tok").listDir(repo, "docs");
    expect(listed).toEqual([
      { name: "0001-a.md", type: "file" },
      { name: "assets", type: "dir" },
    ]);

    vi.unstubAllGlobals();
    stubFetch(() => ({ status: 404, body: {} }));
    expect(await createRestGitHubClient("tok").listDir(repo, "gone")).toEqual([]);
  });

  it("reads the head sha of the branch", async () => {
    const calls = stubFetch(() => ({ body: { object: { sha: "abc123" } } }));
    expect(await createRestGitHubClient("tok").headSha(repo)).toBe("abc123");
    expect(calls[0].url).toContain("/git/ref/heads/main");
  });

  it("creates a branch as a fully-qualified ref", async () => {
    const calls = stubFetch(() => ({ body: {} }));
    await createRestGitHubClient("tok").createBranch(repo, "groundwork/x", "abc123");

    expect(calls[0].url).toContain("/git/refs");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      ref: "refs/heads/groundwork/x",
      sha: "abc123",
    });
  });

  /** GitHub needs the blob sha present to update and absent to create. */
  it("includes the existing blob sha when updating a file", async () => {
    const calls = stubFetch((call) =>
      call.init?.method === "PUT" ? { body: {} } : { body: { sha: "blob1" } },
    );

    await createRestGitHubClient("tok").putFile(repo, "br", "a.md", "hi", "msg");
    const put = calls.find((c) => c.init?.method === "PUT");
    const body = JSON.parse(String(put?.init?.body));

    expect(body.sha).toBe("blob1");
    expect(body.branch).toBe("br");
    expect(Buffer.from(body.content, "base64").toString("utf8")).toBe("hi");
  });

  it("omits the sha when the file does not exist yet", async () => {
    const calls = stubFetch((call) =>
      call.init?.method === "PUT" ? { body: {} } : { status: 404, body: {} },
    );

    await createRestGitHubClient("tok").putFile(repo, "br", "new.md", "hi", "msg");
    const put = calls.find((c) => c.init?.method === "PUT");

    expect(JSON.parse(String(put?.init?.body))).not.toHaveProperty("sha");
  });

  it("opens a PR against the repo's branch and returns its url", async () => {
    const calls = stubFetch(() => ({
      body: { html_url: "https://github.com/acme/checkout/pull/7", number: 7 },
    }));

    const pr = await createRestGitHubClient("tok").openPullRequest(repo, "head", "title", "body");
    expect(pr).toEqual({ url: "https://github.com/acme/checkout/pull/7", number: 7 });
    expect(JSON.parse(String(calls[0].init?.body)).base).toBe("main");
  });

  it("returns null when the PR call fails", async () => {
    stubFetch(() => ({ status: 422, body: { message: "already exists" } }));
    expect(await createRestGitHubClient("tok").openPullRequest(repo, "head", "t", "b")).toBeNull();
  });
});
