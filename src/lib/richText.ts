export type RichTextMode = "inline" | "block";

const inlineTags = new Set(["A", "B", "BR", "CODE", "EM", "I", "STRONG"]);
const blockTags = new Set([...inlineTags, "LI", "OL", "P", "UL"]);
const blockedTags = new Set(["EMBED", "IFRAME", "NOSCRIPT", "OBJECT", "SCRIPT", "STYLE", "TEMPLATE"]);
const safeHrefPattern = /^(https?:|mailto:|tel:|\/|#)/i;
const bareDomainPattern = /^(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/:?#]|$)/i;

export function sanitizeRichTextHtml(input: string, mode: RichTextMode): string {
  if (!input) {
    return "";
  }

  if (typeof DOMParser === "undefined") {
    return escapeHtml(input);
  }

  const allowedTags = mode === "inline" ? inlineTags : blockTags;
  const parser = new DOMParser();
  const document = parser.parseFromString(`<div>${input}</div>`, "text/html");
  const root = document.body.firstElementChild as HTMLElement | null;

  if (!root) {
    return escapeHtml(input);
  }

  sanitizeChildren(root, allowedTags);

  return root.innerHTML;
}

function sanitizeChildren(parent: HTMLElement, allowedTags: Set<string>) {
  Array.from(parent.childNodes).forEach((node) => {
    sanitizeNode(node, allowedTags);
  });
}

function sanitizeNode(node: Node, allowedTags: Set<string>) {
  if (node.nodeType === Node.COMMENT_NODE) {
    node.parentNode?.removeChild(node);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toUpperCase();

  if (blockedTags.has(tagName)) {
    element.parentNode?.removeChild(element);
    return;
  }

  sanitizeChildren(element, allowedTags);

  if (!allowedTags.has(tagName)) {
    unwrapElement(element);
    return;
  }

  const originalHref = tagName === "A" ? element.getAttribute("href")?.trim() ?? "" : "";

  Array.from(element.attributes).forEach((attribute) => {
    element.removeAttribute(attribute.name);
  });

  if (tagName !== "A") {
    return;
  }

  const normalizedHref = normalizeHref(originalHref);

  if (!normalizedHref) {
    unwrapElement(element);
    return;
  }

  element.setAttribute("href", normalizedHref);

  if (/^https?:/i.test(normalizedHref)) {
    element.setAttribute("target", "_blank");
    element.setAttribute("rel", "noreferrer noopener");
  }
}

function unwrapElement(element: HTMLElement) {
  const parent = element.parentNode;
  if (!parent) {
    return;
  }

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
}

function escapeHtml(input: string) {
  return input.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function normalizeHref(href: string) {
  if (!href) {
    return null;
  }

  if (safeHrefPattern.test(href)) {
    return href;
  }

  if (bareDomainPattern.test(href)) {
    return `https://${href}`;
  }

  return null;
}
