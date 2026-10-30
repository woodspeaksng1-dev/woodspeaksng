/**
 * Structured data for search engines (schema.org JSON-LD). Rendered on the server
 * from our own data only. `<` is escaped so text can never close the script tag.
 * This is the one other place `dangerouslySetInnerHTML` is allowed (see CLAUDE.md).
 * Several items go out as one `@graph` object: a bare array breaks scripts (Safari's
 * among them) that read `@context` off the top level.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const doc = Array.isArray(data)
    ? {
        "@context": "https://schema.org",
        "@graph": data.map((item) => Object.fromEntries(Object.entries(item).filter(([k]) => k !== "@context"))),
      }
    : data;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(doc).replace(/</g, "\\u003c") }}
    />
  );
}
