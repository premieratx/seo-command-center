import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/proxy?url=https://premierpartycruises.com/some-page
 *
 * Proxies a URL and strips X-Frame-Options / CSP headers so it can
 * be embedded in an iframe. Only allows proxying of domains that
 * belong to sites in the user's profile (validated by checking the domain).
 */
export async function GET(req: NextRequest) {
  const targetUrl = req.nextUrl.searchParams.get("url");
  if (!targetUrl) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // Basic security: only allow proxying known domains
  const allowedDomains = [
    "premierpartycruises.com",
    "www.premierpartycruises.com",
  ];

  try {
    const parsed = new URL(targetUrl);
    if (!allowedDomains.some((d) => parsed.hostname === d || parsed.hostname.endsWith("." + d))) {
      return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return new NextResponse(`Proxy error: ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "text/html";

    // For HTML responses, rewrite relative URLs to absolute
    if (contentType.includes("text/html")) {
      let html = await res.text();
      const baseUrl = new URL(targetUrl);
      const origin = baseUrl.origin;

      // Add a <base> tag so relative URLs resolve correctly
      html = html.replace(
        /<head([^>]*)>/i,
        `<head$1><base href="${origin}/" target="_self">`,
      );

      // Inject a small script to intercept navigation and keep it in the iframe
      const navScript = `
        <script>
          // Intercept link clicks to stay within the proxy
          document.addEventListener('click', function(e) {
            var link = e.target.closest('a');
            if (link && link.href) {
              var url = new URL(link.href, window.location.origin);
              // Only intercept internal links
              if (url.hostname === '${baseUrl.hostname}' || url.hostname === window.location.hostname) {
                e.preventDefault();
                // Notify parent about navigation
                window.parent.postMessage({ type: 'iframe-navigate', url: url.href.replace(url.origin, '${origin}') }, '*');
              }
            }
          }, true);
        </script>
      `;
      html = html.replace("</body>", navScript + "</body>");

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          // Remove frame-blocking headers
          "X-Frame-Options": "ALLOWALL",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // For non-HTML (CSS, JS, images), just proxy through
    const body = await res.arrayBuffer();
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Proxy failed" },
      { status: 500 },
    );
  }
}
