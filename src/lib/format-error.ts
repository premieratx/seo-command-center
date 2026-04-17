/**
 * Produce a human-readable message from ANY thrown value.
 *
 * This exists because Supabase's PostgrestError (and many fetch/JSON errors)
 * are plain objects, not `Error` instances. Doing `String(err)` on them
 * returns the infamous "[object Object]" which is useless for debugging.
 *
 * Supports:
 *  - native Error instances
 *  - Supabase PostgrestError (`{ message, details, hint, code }`)
 *  - fetch-style `{ error: "..." }` or `{ error: { message } }` objects
 *  - plain strings
 *  - anything else (falls back to JSON.stringify)
 */
export function formatError(e: unknown): string {
  if (e == null) return "Unknown error";

  if (typeof e === "string") return e;

  if (e instanceof Error) return e.message || e.name || "Error";

  if (typeof e === "object") {
    const o = e as Record<string, unknown>;

    // Supabase PostgrestError shape
    const msg = typeof o.message === "string" ? o.message : undefined;
    const details = typeof o.details === "string" ? o.details : undefined;
    const hint = typeof o.hint === "string" ? o.hint : undefined;
    const code = typeof o.code === "string" || typeof o.code === "number" ? String(o.code) : undefined;

    // Fetch-response-style { error: "..." } or { error: { message: "..." } }
    let nested: string | undefined;
    if (o.error) {
      if (typeof o.error === "string") nested = o.error;
      else if (typeof o.error === "object" && o.error && typeof (o.error as any).message === "string") {
        nested = (o.error as any).message;
      }
    }

    const parts = [msg, nested, details, hint, code ? `(code ${code})` : undefined].filter(Boolean);
    if (parts.length) return parts.join(" — ");

    try {
      const json = JSON.stringify(e);
      if (json && json !== "{}") return json;
    } catch {
      /* fall through */
    }
  }

  return String(e);
}
