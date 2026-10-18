/**
 * Where to go after signing in: only a path inside this site. A full URL, a protocol-relative "//host" or a "/\host"
 * (which browsers read as "//host") is ignored, so a link to the sign-in page can never send someone to another site.
 */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/")) return null;
  if (next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) return null;
  return next;
}
