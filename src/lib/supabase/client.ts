import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client. Reads NEXT_PUBLIC_SUPABASE_* at runtime.
//
// Returns a stub client when env vars are missing (which only happens during
// static prerender at build time). The stub silently rejects every call so a
// page that calls createClient() at module-scope no longer kills the whole
// `next build` — it just renders an empty shell that hydrates real data on
// the client.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (typeof window !== "undefined") {
      // Real browser request without env — should never happen in production.
      // Throw loudly so the bug is obvious.
      throw new Error(
        "Supabase env vars missing in the browser. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
    }
    // Server / build-time prerender — return a no-op shim so the build can
    // continue. Hydration will create a real client once it reaches the
    // browser.
    return makeStub();
  }
  return createBrowserClient(url, key);
}

function makeStub(): ReturnType<typeof createBrowserClient> {
  const noop = async () => ({ data: null, error: null });
  // Mimics enough of the Supabase API surface that pages touching it during
  // prerender don't blow up. Real usage in the browser hits the real client.
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: noop,
      signOut: noop,
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: noop, maybeSingle: noop, limit: () => ({}) }),
        order: () => ({}),
        limit: () => ({}),
      }),
      insert: noop,
      update: () => ({ eq: noop }),
      delete: () => ({ eq: noop }),
    }),
  } as unknown as ReturnType<typeof createBrowserClient>;
}
