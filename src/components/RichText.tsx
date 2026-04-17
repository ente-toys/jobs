import { useMemo } from "react";

import {
  sanitizeRichTextHtml,
  type RichTextFormat,
  type RichTextMode,
} from "../lib/richText";

type RichTextTag = "div" | "h1" | "span";

interface RichTextProps {
  as?: RichTextTag;
  className?: string;
  format?: RichTextFormat;
  html: string;
  mode: RichTextMode;
}

export function RichText({
  as: Tag = "div",
  className,
  format = "html",
  html,
  mode,
}: RichTextProps) {
  const sanitizedHtml = useMemo(
    () => sanitizeRichTextHtml(html, mode, format),
    [format, html, mode],
  );

  return <Tag className={className} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}
