"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Mermaid } from "@/components/mermaid";

/** Resolve a relative asset src against the doc's dir → the project asset route. */
function resolveSrc(src: string, slug: string, docDir: string): string {
  if (/^(https?:|data:|\/)/.test(src)) return src;
  const parts = `${docDir}/${src}`.split("/");
  const stack: string[] = [];
  for (const p of parts) {
    if (p === "" || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  return `/ops/${slug}/asset/${stack.join("/")}`;
}

export function Markdown({
  content,
  slug,
  docDir,
}: {
  content: string;
  slug: string;
  docDir: string;
}) {
  return (
    <div className="prose prose-neutral max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            if (/language-mermaid/.test(className ?? "")) {
              return <Mermaid chart={String(children).trim()} />;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          img({ src, alt }) {
            const resolved = typeof src === "string" ? resolveSrc(src, slug, docDir) : "";
            // biome-ignore lint/performance/noImgElement: doc images have arbitrary dims; next/image is unsuitable
            return <img src={resolved} alt={alt ?? ""} className="max-w-full rounded-md" />;
          },
          a({ href, children }) {
            const external = typeof href === "string" && /^https?:/.test(href);
            return (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
