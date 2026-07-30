"use client";

import { FileText, ListTodo, Paperclip, Sparkles, X } from "lucide-react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Badge } from "@/components/ui/badge";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message";
import type { Citation, TriageKind } from "@/lib/triage/types";

/** A project document, as the tagger offers it. */
export type TaggableDoc = {
  id: string;
  kind: string;
  title: string;
  /** `__project__`-relative path — the mention menu's secondary line. */
  relPath?: string;
};

/**
 * The bubble a verdict earns.
 *
 * `destructive` for a duplicate, because that verdict says "do not create this";
 * the rest are informational and stay muted, so the one that wants a decision is
 * the one that looks different.
 */
const KIND_BUBBLE: Record<TriageKind, "muted" | "destructive"> = {
  duplicate: "destructive",
  overlaps: "muted",
  "needs-spike": "muted",
  "new-task": "muted",
};

const KIND_TINT: Partial<Record<TriageKind, string>> = {
  overlaps: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "needs-spike": "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  "new-task": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

/** The idea you sent, as your turn in the thread. */
export function IdeaMessage({ text, tagged }: { text: string; tagged: TaggableDoc[] }) {
  return (
    <Message align="end">
      <MessageContent>
        <Bubble align="end">
          <BubbleContent>{text}</BubbleContent>
        </Bubble>
        {tagged.length > 0 && (
          <AttachmentGroup className="justify-end">
            {tagged.map((doc) => (
              <DocAttachment key={doc.id} doc={doc} />
            ))}
          </AttachmentGroup>
        )}
      </MessageContent>
    </Message>
  );
}

/** The agent's reply: a verdict, its reasoning, and what it read to get there. */
export function VerdictMessage({
  kind,
  message,
  citations,
}: {
  kind: TriageKind;
  message: string;
  citations: Citation[];
}) {
  return (
    <Message>
      <MessageAvatar>
        <Sparkles className="size-4" aria-hidden />
      </MessageAvatar>
      <MessageContent>
        <Bubble variant={KIND_BUBBLE[kind]}>
          <BubbleContent className="flex flex-col items-start gap-2">
            <Badge
              variant={kind === "duplicate" ? "destructive" : "secondary"}
              className={KIND_TINT[kind]}
            >
              {kind}
            </Badge>
            <p>{message}</p>
          </BubbleContent>
        </Bubble>

        {citations.length > 0 && (
          <>
            {/* A separator marker rather than a heading: this is a caption on the
                message above it, not a new section of the page. */}
            <Marker variant="separator">
              <MarkerIcon>
                <Paperclip aria-hidden />
              </MarkerIcon>
              <MarkerContent>grounded in</MarkerContent>
            </Marker>
            <AttachmentGroup>
              {citations.map((c) => (
                <Attachment key={`${c.kind}-${c.ref}`}>
                  <AttachmentMedia>
                    {c.kind === "task" ? (
                      <ListTodo aria-hidden />
                    ) : (
                      <FileText aria-hidden />
                    )}
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{c.label}</AttachmentTitle>
                    <AttachmentDescription>{c.kind}</AttachmentDescription>
                  </AttachmentContent>
                </Attachment>
              ))}
            </AttachmentGroup>
          </>
        )}
      </MessageContent>
    </Message>
  );
}

/**
 * One tagged document, optionally removable.
 *
 * `onRemove` is absent once the idea has been sent — the tags that shaped a
 * verdict are part of the record, and letting them be edited afterwards would
 * make the transcript disagree with the analysis it produced.
 */
export function DocAttachment({
  doc,
  onRemove,
}: {
  doc: TaggableDoc;
  onRemove?: () => void;
}) {
  return (
    <Attachment>
      <AttachmentMedia>
        <FileText aria-hidden />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{doc.title}</AttachmentTitle>
        <AttachmentDescription>{doc.kind}</AttachmentDescription>
      </AttachmentContent>
      {onRemove && (
        <AttachmentActions>
          <AttachmentAction aria-label={`Remove ${doc.title}`} onClick={onRemove}>
            <X aria-hidden />
          </AttachmentAction>
        </AttachmentActions>
      )}
    </Attachment>
  );
}
