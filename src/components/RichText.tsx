import { useMemo } from "react";

import { sanitizeRichTextHtml, type RichTextMode } from "../lib/richText";

type RichTextTag = "div" | "h1" | "span";

interface RichTextProps {
  as?: RichTextTag;
  className?: string;
  html: string;
  mode: RichTextMode;
}

export function RichText({
  as: Tag = "div",
  className,
  html,
  mode,
}: RichTextProps) {
  const sanitizedHtml = useMemo(() => sanitizeRichTextHtml(html, mode), [html, mode]);

  return <Tag className={className} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}
