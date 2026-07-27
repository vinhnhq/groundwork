import "server-only";
import type { BacklogWriter, WriteMode } from "@/lib/content/write";
import { createWriter, isWriterMocked, parseWriteMode } from "@/lib/content/writers";
import { serverEnv } from "@/lib/env-server";

export type WriterInfo = {
  mode: WriteMode;
  mocked: boolean;
  describe: string;
  writer: BacklogWriter;
};

/** The configured write transport, plus what to tell the user about it. */
export function getWriter(): WriterInfo {
  const env = serverEnv();
  const mode = parseWriteMode(env.WRITE_BACK);
  const writer = createWriter(mode, env.GITHUB_TOKEN);

  return {
    mode,
    mocked: isWriterMocked(mode, env.GITHUB_TOKEN),
    describe: writer.describe,
    writer,
  };
}
