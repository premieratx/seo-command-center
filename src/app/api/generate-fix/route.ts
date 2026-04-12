import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFileContent } from "@/lib/integrations/github";

export const maxDuration = 120;

/**
 * POST /api/generate-fix
 * Body: {
 *   site_id: string,
 *   issue_id?: string,
 *   recommendation: string,
 *   target_file?: string, // if known, the file to modify
 * }
 *
 * Uses the Claude API (via Anthropic SDK) to generate code changes
 * based on an SEO recommendation. Returns a diff that can be reviewed
 * and applied.
 *
 * For now, this uses rule-based generation for common SEO fixes
 * (meta tags, canonical, OG tags, schema) and falls back to
 * template-based generation for content changes.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { site_id, issue_id, recommendation, target_file } = await req.json();
  if (!site_id || !recommendation) {
    return NextResponse.json(
      { error: "site_id and recommendation required" },
      { status: 400 },
    );
  }

  const { data: site } = await supabase.from("sites").select("*").eq("id", site_id).single();
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  if (!site.github_token_encrypted || !site.github_repo_owner || !site.github_repo_name) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  }

  const rec = recommendation.toLowerCase();

  try {
    const fixes: Array<{
      file_path: string;
      before_content: string;
      after_content: string;
      change_type: string;
      description: string;
    }> = [];

    // Rule-based fix generation for common SEO issues
    if (rec.includes("meta description") || rec.includes("meta desc")) {
      // Find layout or page files that need meta descriptions
      const layoutFiles = [
        "client/src/App.tsx",
        "client/index.html",
        "server/index.ts",
      ];

      for (const filePath of layoutFiles) {
        try {
          const { content } = await getFileContent(
            site.github_token_encrypted,
            site.github_repo_owner,
            site.github_repo_name,
            filePath,
            site.github_default_branch || "main",
          );

          if (filePath.endsWith(".html") && !content.includes('name="description"')) {
            const newContent = content.replace(
              "</head>",
              `    <meta name="description" content="Austin party boat rentals on Lake Travis since 2009. Bachelor parties, bachelorette cruises, private charters for 5-75 guests. DJ, photographer, BYOB. Book now!" />\n    </head>`,
            );
            if (newContent !== content) {
              fixes.push({
                file_path: filePath,
                before_content: content,
                after_content: newContent,
                change_type: "meta_tag",
                description: `Added meta description to ${filePath}`,
              });
            }
          }
        } catch {
          // File doesn't exist, skip
        }
      }
    }

    if (rec.includes("canonical") || rec.includes("canonical tag")) {
      try {
        const { content } = await getFileContent(
          site.github_token_encrypted,
          site.github_repo_owner,
          site.github_repo_name,
          "client/index.html",
          site.github_default_branch || "main",
        );

        if (!content.includes('rel="canonical"')) {
          const newContent = content.replace(
            "</head>",
            `    <link rel="canonical" href="https://${site.domain}/" />\n    </head>`,
          );
          if (newContent !== content) {
            fixes.push({
              file_path: "client/index.html",
              before_content: content,
              after_content: newContent,
              change_type: "meta_tag",
              description: "Added self-referencing canonical tag",
            });
          }
        }
      } catch {
        // skip
      }
    }

    if (rec.includes("open graph") || rec.includes("og tag") || rec.includes("og:")) {
      try {
        const { content } = await getFileContent(
          site.github_token_encrypted,
          site.github_repo_owner,
          site.github_repo_name,
          "client/index.html",
          site.github_default_branch || "main",
        );

        if (!content.includes('property="og:title"') || !content.includes('property="og:description"')) {
          const ogTags = `
    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://${site.domain}/" />
    <meta property="og:title" content="Austin Party Boat Rentals on Lake Travis | Premier Party Cruises" />
    <meta property="og:description" content="Austin's original Lake Travis party boat company since 2009. Private charters for 14-75 guests & the ATX Disco Cruise. BYOB, licensed captains." />
    <meta property="og:site_name" content="Premier Party Cruises" />
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Austin Party Boat Rentals on Lake Travis" />
    <meta name="twitter:description" content="Austin's original Lake Travis party boat company. Private charters & disco cruises for 5-75 guests." />`;

          const newContent = content.replace("</head>", `${ogTags}\n    </head>`);
          if (newContent !== content) {
            fixes.push({
              file_path: "client/index.html",
              before_content: content,
              after_content: newContent,
              change_type: "meta_tag",
              description: "Added Open Graph and Twitter Card meta tags",
            });
          }
        }
      } catch {
        // skip
      }
    }

    // If we have a specific target file, try to read and generate a fix for it
    if (target_file && fixes.length === 0) {
      try {
        const { content } = await getFileContent(
          site.github_token_encrypted,
          site.github_repo_owner,
          site.github_repo_name,
          target_file,
          site.github_default_branch || "main",
        );

        fixes.push({
          file_path: target_file,
          before_content: content,
          after_content: content, // Will be edited by the user in the code editor
          change_type: "other",
          description: `Opened ${target_file} for editing based on: ${recommendation.slice(0, 100)}`,
        });
      } catch {
        // skip
      }
    }

    if (fixes.length === 0) {
      return NextResponse.json({
        message:
          "No automatic fix generated for this recommendation. Use the Code Editor to make manual changes, or provide a specific target file.",
        recommendation,
        suggestion:
          "Try clicking 'Code Editor' and navigating to the relevant file to make changes manually.",
      });
    }

    // If there's an issue_id, link it
    let issueTitle = "";
    if (issue_id) {
      const { data: issue } = await supabase
        .from("audit_issues")
        .select("title")
        .eq("id", issue_id)
        .single();
      issueTitle = issue?.title || "";
    }

    return NextResponse.json({
      fixes,
      issue_title: issueTitle,
      total_fixes: fixes.length,
      message: `Generated ${fixes.length} fix(es). Review the changes and apply when ready.`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Fix generation failed" },
      { status: 500 },
    );
  }
}
