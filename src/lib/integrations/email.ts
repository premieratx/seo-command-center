/**
 * Email delivery via Resend API.
 * Key resolution: RESEND_API_KEY env → Supabase app_config
 */

import { createClient } from "@supabase/supabase-js";

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

async function getResendKey(): Promise<string | null> {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anonKey) {
      const supabase = createClient(url, anonKey);
      const { data } = await supabase.from("app_config").select("value").eq("key", "resend_api_key").single();
      if (data?.value) return data.value;
    }
  } catch { /* fall through */ }
  return null;
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = await getResendKey();
  if (!key) {
    console.log("[email] (dry-run — no RESEND_API_KEY)");
    return { ok: true, id: "dry-run" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: payload.from || "SEO Command Center <noreply@seo-command-center.netlify.app>",
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.message || `HTTP ${res.status}` };
    }
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Email send failed" };
  }
}

export function renderWeeklyDigest(data: {
  userEmail: string;
  siteName: string;
  newRecommendations: Array<{ title: string; description: string | null; category: string }>;
  recentFixes: number;
  scoreChange: number | null;
  dashboardUrl: string;
}): string {
  const recsHtml = data.newRecommendations
    .map(
      (r) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #262626;">
            <div style="color: #3b82f6; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">${r.category.replace("_", " ")}</div>
            <div style="color: #ededed; font-size: 15px; font-weight: 600; margin-top: 4px;">${r.title}</div>
            ${r.description ? `<div style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">${r.description}</div>` : ""}
          </td>
        </tr>
      `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>SEO Weekly Digest</title></head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #0a0a0a;">
    <tr><td align="center" style="padding: 40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background: #141414; border: 1px solid #262626; border-radius: 12px;">
        <tr><td style="padding: 32px 32px 16px;">
          <div style="font-size: 14px; color: #737373; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">SEO Command Center</div>
          <h1 style="color: #ededed; font-size: 24px; margin: 8px 0 0; font-weight: 700;">Weekly Digest · ${data.siteName}</h1>
          ${data.scoreChange !== null ? `<div style="color: ${data.scoreChange >= 0 ? "#22c55e" : "#ef4444"}; font-size: 14px; margin-top: 8px;">SEO Score ${data.scoreChange >= 0 ? "+" : ""}${data.scoreChange} this week</div>` : ""}
        </td></tr>

        <tr><td style="padding: 0 32px 16px;">
          <div style="color: #a1a1aa; font-size: 14px;">
            ${data.newRecommendations.length} new recommendations ready for review ·
            ${data.recentFixes} fixes applied this week
          </div>
        </td></tr>

        <tr><td style="padding: 0 32px 24px;">
          <h2 style="color: #ededed; font-size: 16px; margin: 24px 0 8px; font-weight: 600;">Fresh Recommendations</h2>
          <table width="100%" cellpadding="0" cellspacing="0">${recsHtml}</table>
        </td></tr>

        <tr><td align="center" style="padding: 0 32px 32px;">
          <a href="${data.dashboardUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Open Dashboard</a>
        </td></tr>

        <tr><td style="padding: 24px 32px; border-top: 1px solid #262626; text-align: center;">
          <div style="color: #737373; font-size: 12px;">
            SEO Command Center · <a href="${data.dashboardUrl}" style="color: #737373;">Unsubscribe</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();
}
