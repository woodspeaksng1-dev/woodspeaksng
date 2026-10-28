/**
 * Structured data for search engines (schema.org JSON-LD). Rendered on the server
 * from our own data only. `<` is escaped so text can never close the script tag.
 * This is the one other place `dangerouslySetInnerHTML` is allowed (see CLAUDE.md).
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
