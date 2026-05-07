#!/usr/bin/env python3
"""
One-shot dark→light theme conversion for the SEO Command Center.

Walks every .tsx / .ts / .css under src/ and applies a deterministic
class-name remapping:

  - Dark hex backgrounds  (#0a0a0a, #141414, ...) → semantic light Tailwind classes
  - Dark hex borders      (#262626, #1f1f1f, ...) → light borders
  - Dark hex divide       → light divide
  - text-white            → text-zinc-900
  - text-zinc-{100..400}  → inverted (-100 → -900, etc.) so muted/strong reads
                            correctly on a white canvas

Accent colors (red/green/blue/amber semantic shades, gold #d4af37, brand
yellow #F4C430, etc.) are deliberately left alone — they read fine on a
light canvas and we want to keep brand identity untouched.

Idempotent: run twice and nothing changes the second time.
"""

import os
import re
import sys
from pathlib import Path

ROOT = Path("/home/user/seo-command-center/src")

# ─── Backgrounds ───────────────────────────────────────────────────────────
# Page canvas: tiny gray so cards stand out
# Cards: white
# Subtle accents: zinc-100/200
BG_MAP = {
    "bg-[#0a0a0a]": "bg-zinc-50",
    "bg-[#0d0d0d]": "bg-zinc-50",
    "bg-[#0e0e0e]": "bg-zinc-50",
    "bg-[#0f0f0f]": "bg-zinc-100",
    "bg-[#141414]": "bg-white",
    "bg-[#161616]": "bg-white",
    "bg-[#181818]": "bg-zinc-100",
    "bg-[#18181b]": "bg-zinc-100",
    "bg-[#1a1a1a]": "bg-zinc-100",
    "bg-[#1c1c1e]": "bg-zinc-100",
    "bg-[#1e1e1e]": "bg-zinc-100",
    "bg-[#1f1f1f]": "bg-zinc-200",
    "bg-[#242424]": "bg-zinc-200",
    "bg-[#252527]": "bg-zinc-200",
    "bg-[#262626]": "bg-zinc-200",
    "bg-[#2a2a2a]": "bg-zinc-300",
    "bg-[#2c2c2e]": "bg-zinc-300",
    "bg-[#3a3a3c]": "bg-zinc-300",
    # transparent overlays w/ /opacity suffix
    "bg-[#0a0a0a]/95": "bg-white/95",
    "bg-[#0a0a0a]/90": "bg-white/90",
    "bg-[#0a0a0a]/80": "bg-white/80",
    "bg-[#141414]/95": "bg-white/95",
    "bg-[#141414]/90": "bg-white/90",
    "bg-[#141414]/80": "bg-white/80",
}

BORDER_MAP = {
    "border-[#262626]": "border-zinc-200",
    "border-[#1f1f1f]": "border-zinc-100",
    "border-[#1a1a1a]": "border-zinc-100",
    "border-[#404040]": "border-zinc-300",
    "border-[#2a2a2a]": "border-zinc-200",
    "border-[#3a3a3c]": "border-zinc-300",
    "border-[#18181b]": "border-zinc-200",
}

DIVIDE_MAP = {
    "divide-[#1f1f1f]": "divide-zinc-100",
    "divide-[#1a1a1a]": "divide-zinc-100",
    "divide-[#262626]": "divide-zinc-200",
}

# Tailwind grays — invert so visual hierarchy survives the theme flip
GRAY_TEXT_MAP = {
    "text-white": "text-zinc-900",
    "text-zinc-100": "text-zinc-900",
    "text-zinc-200": "text-zinc-800",
    "text-zinc-300": "text-zinc-700",
    "text-zinc-400": "text-zinc-600",
    # zinc-500 stays — it's the symmetric middle
    "text-zinc-600": "text-zinc-400",
    "text-zinc-700": "text-zinc-300",
    "text-zinc-800": "text-zinc-200",
    "text-zinc-900": "text-zinc-100",
    "text-[#ededed]": "text-zinc-900",
    "text-[#1f1f1f]": "text-zinc-900",
    "text-[#18181b]": "text-zinc-900",
}

GRAY_BG_MAP = {
    "bg-zinc-900": "bg-white",
    "bg-zinc-800": "bg-zinc-100",
    "bg-zinc-700": "bg-zinc-200",
    # 600/500/400 are accent territory — leave them alone
    "bg-zinc-100": "bg-zinc-100",  # stays
}

GRAY_BORDER_MAP = {
    "border-zinc-900": "border-zinc-200",
    "border-zinc-800": "border-zinc-200",
    "border-zinc-700": "border-zinc-300",
    "border-zinc-600": "border-zinc-300",
}

# Hover state → light hover
HOVER_MAP = {
    "hover:bg-[#181818]": "hover:bg-zinc-50",
    "hover:bg-[#1a1a1a]": "hover:bg-zinc-50",
    "hover:bg-[#141414]": "hover:bg-zinc-50",
    "hover:bg-[#0f0f0f]": "hover:bg-zinc-50",
    "hover:bg-[#262626]": "hover:bg-zinc-200",
    "hover:bg-[#1f1f1f]": "hover:bg-zinc-100",
}

# Combined map — order matters for longest-first matching (so hover: variants
# don't get partially rewritten by the bare bg- map first).
ALL_MAPS = [
    HOVER_MAP,
    BG_MAP,
    BORDER_MAP,
    DIVIDE_MAP,
    GRAY_TEXT_MAP,
    GRAY_BG_MAP,
    GRAY_BORDER_MAP,
]


def collect_replacements():
    out = []
    for m in ALL_MAPS:
        for src, dst in m.items():
            if src == dst:
                continue
            out.append((src, dst))
    # Sort longest-first so prefix variants don't get clobbered.
    out.sort(key=lambda p: -len(p[0]))
    return out


def transform_file(path: Path, pairs):
    text = path.read_text()
    original = text
    for src, dst in pairs:
        # Plain string replace — class names are unambiguous.
        text = text.replace(src, dst)
    if text != original:
        path.write_text(text)
        return True
    return False


def main():
    pairs = collect_replacements()
    print(f"Applying {len(pairs)} replacements...")
    files_changed = 0
    for ext in ("*.tsx", "*.ts", "*.css"):
        for f in ROOT.rglob(ext):
            if "node_modules" in f.parts:
                continue
            if transform_file(f, pairs):
                files_changed += 1
                print(f"  ✓ {f.relative_to(ROOT)}")
    print(f"\nDone — {files_changed} files modified.")


if __name__ == "__main__":
    main()
