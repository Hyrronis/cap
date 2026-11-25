/**
 * Redirection après le lien magique : uniquement un chemin interne relatif
 * (commence par « / », pas par « // » ni « /\ »), sinon « / ». docs/securite.md §2.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (/[\u0000-\u001F\u007F]/.test(next)) return "/";
  try {
    const url = new URL(next, "http://interne.invalid");
    if (url.origin !== "http://interne.invalid") return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
