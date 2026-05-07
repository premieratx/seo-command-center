#!/usr/bin/env python3
"""
Second-pass fixups for the dark→light conversion. Catches edge cases where
the naive replacement broke things:

  1. Saturated colored buttons (bg-blue-600, bg-green-600, etc.) had
     `text-white` flipped to `text-zinc-900` — that ruins contrast on a
     dark-saturated background. Revert to `text-white` when adjacent to
     such a bg.
  2. Dark zinc backgrounds (bg-zinc-700/800/900) used in original code
     should also flip to light.
  3. Recharts inline color props (stroke="#262626", background="#0a0a0a")
     swapped for light equivalents.
"""

import re
import os
from pathlib import Path

ROOT = Path("/home/user/seo-command-center/src")

SATURATED_COLORS = ["blue", "green", "red", "amber", "yellow", "purple", "pink", "indigo", "rose", "violet", "fuchsia", "orange", "emerald", "teal", "cyan", "sky"]
DARK_SHADES = ["500", "600", "700", "800", "900"]

# Match `className="..."` strings that include both a dark saturated bg AND
# text-zinc-900, and within those replace the text-zinc-900 → text-white.
def fix_button_text(text: str) -> str:
    # Pattern matches a className-like sequence (between quotes or backticks)
    # containing both bg-{color}-{shade} AND text-zinc-900.
    pattern = re.compile(r'(["\'`])([^"\'`]*?)\1', re.DOTALL)
    def replace_in_class(match):
        quote = match.group(1)
        body = match.group(2)
        if "text-zinc-900" not in body:
            return match.group(0)
        # Look for any bg-{saturated}-{dark}
        has_dark_bg = any(
            re.search(rf"\bbg-{c}-(?:{'|'.join(DARK_SHADES)})\b", body)
            for c in SATURATED_COLORS
        )
        if has_dark_bg:
            new_body = body.replace("text-zinc-900", "text-white")
            return f"{quote}{new_body}{quote}"
        return match.group(0)
    return pattern.sub(replace_in_class, text)


# Recharts uses literal hex colors via inline props (not Tailwind classes), so
# the first script missed them. Rewrite the most common ones.
RECHARTS_REPLACEMENTS = {
    'stroke="#262626"': 'stroke="#e4e4e7"',  # zinc-200
    'stroke="#1f1f1f"': 'stroke="#f4f4f5"',  # zinc-100
    'stroke="#71717a"': 'stroke="#71717a"',  # zinc-500 — stays
    'background: "#0a0a0a"': 'background: "#ffffff"',
    'background: "#141414"': 'background: "#ffffff"',
    'border: "1px solid #262626"': 'border: "1px solid #e4e4e7"',
    'border: "1px solid #1f1f1f"': 'border: "1px solid #f4f4f5"',
}

# Dark zinc backgrounds that should flip
ZINC_BG_FIXUPS = {
    "bg-zinc-900": "bg-white",
    "bg-zinc-800": "bg-zinc-100",
    "bg-zinc-700": "bg-zinc-200",
    "border-zinc-900": "border-zinc-200",
    "border-zinc-800": "border-zinc-200",
    "border-zinc-700": "border-zinc-300",
}

# Reset scrollbar thumb references hard-coded in CSS — leave for layout/css fixup


def transform_file(path: Path) -> bool:
    text = path.read_text()
    original = text

    text = fix_button_text(text)

    for src, dst in RECHARTS_REPLACEMENTS.items():
        text = text.replace(src, dst)

    for src, dst in ZINC_BG_FIXUPS.items():
        # Only replace the bare class, not part of a longer one.
        text = re.sub(rf"\b{re.escape(src)}\b", dst, text)

    if text != original:
        path.write_text(text)
        return True
    return False


def main():
    files_changed = 0
    for ext in ("*.tsx", "*.ts", "*.css"):
        for f in ROOT.rglob(ext):
            if "node_modules" in f.parts:
                continue
            if transform_file(f):
                files_changed += 1
                print(f"  ✓ {f.relative_to(ROOT)}")
    print(f"\nFixups: {files_changed} files modified.")


if __name__ == "__main__":
    main()
