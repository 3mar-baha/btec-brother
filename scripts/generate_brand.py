#!/usr/bin/env python3
"""Generate the BTEC Hub brand assets (deterministic, supersampled for crispness).

Emblem: three ascending rounded bars (Pass / Merit / Distinction) leading up to
an orange apex triangle ("hub"). Horizontal lockup pairs the emblem with
"BTEC" (primary) + "HUB" (orange) set in Segoe UI Bold.

Outputs (written to ./public relative to the repo root):
  logo-light.png, logo-dark.png, favicon.ico, apple-icon.png,
  icon-192.png, icon-512.png
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

# Brand palette
INK = (32, 32, 32)        # #202020
WHITE = (252, 252, 252)   # #fcfcfc
ORANGE = (234, 40, 4)     # #ea2804

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"  # Segoe UI Bold

SS = 4  # supersampling factor for anti-aliased edges/text

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")


def _draw_emblem(draw: ImageDraw.ImageDraw, box, primary, accent) -> None:
    """Draw the 3-step emblem inside `box` (x0, y0, x1, y1) in draw space."""
    x0, y0, x1, y1 = box
    W = x1 - x0
    H = y1 - y0

    def X(f: float) -> float:
        return x0 + f * W

    def Y(f: float) -> float:
        return y0 + f * H

    bar_w = 0.205
    gap = 0.08
    left = 0.095
    bottom = 0.95
    heights = [0.30, 0.50, 0.70]  # Pass, Merit, Distinction

    tops = []
    cx = left
    for hh in heights:
        bx0 = cx
        bx1 = cx + bar_w
        by0 = bottom - hh
        by1 = bottom
        radius = min(0.10 * W, (by1 - by0) * H * 0.5, (bx1 - bx0) * W * 0.5)
        draw.rounded_rectangle(
            [X(bx0), Y(by0), X(bx1), Y(by1)], radius=radius, fill=primary
        )
        tops.append((bx0, bx1, by0))
        cx += bar_w + gap

    # Orange apex triangle rising seamlessly from the tallest bar
    bx0, bx1, by0 = tops[-1]
    flare = 0.015
    apex_top = 0.055
    draw.polygon(
        [
            (X(bx0 - flare), Y(by0)),
            (X(bx1 + flare), Y(by0)),
            (X((bx0 + bx1) / 2), Y(apex_top)),
        ],
        fill=accent,
    )


def _downscale(img: Image.Image) -> Image.Image:
    return img.resize((img.width // SS, img.height // SS), Image.LANCZOS)


def render_horizontal(primary) -> Image.Image:
    """Render the horizontal lockup (emblem + BTEC HUB) at 1x size."""
    emblem = 200 * SS
    font_px = 150 * SS
    gap = 28 * SS
    pad = 6 * SS

    font = ImageFont.truetype(FONT_BOLD, font_px)
    probe = ImageDraw.Draw(Image.new("RGBA", (8, 8), (0, 0, 0, 0)))

    btec_w = probe.textlength("BTEC", font=font)
    space_w = probe.textlength(" ", font=font)
    hub_w = probe.textlength("HUB", font=font)
    text_w = btec_w + space_w + hub_w

    asc, desc = font.getmetrics()
    line_h = asc + desc

    total_w = pad + emblem + gap + int(text_w) + pad
    total_h = pad + max(emblem, line_h) + pad

    img = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    content_h = total_h - 2 * pad
    emblem_y = pad + (content_h - emblem) // 2
    _draw_emblem(draw, (pad, emblem_y, pad + emblem, emblem_y + emblem), primary, ORANGE)

    text_top = pad + (content_h - line_h) // 2
    tx = pad + emblem + gap
    draw.text((tx, text_top), "BTEC", font=font, fill=primary, anchor="lt")
    draw.text((tx + btec_w + space_w, text_top), "HUB", font=font, fill=ORANGE, anchor="lt")

    return _downscale(img)


def render_badge(size: int, primary, accent, background) -> Image.Image:
    """Render a rounded-square badge of `size` px containing the emblem."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    radius = int(big * 0.225)
    draw.rounded_rectangle([0, 0, big - 1, big - 1], radius=radius, fill=background)

    # Inset the emblem inside the badge with padding
    inset = int(big * 0.12)
    _draw_emblem(
        draw, (inset, inset, big - inset, big - inset), primary, accent
    )

    return _downscale(img)


def main() -> None:
    os.makedirs(PUBLIC, exist_ok=True)

    # Horizontal lockups
    light = render_horizontal(INK)
    light.save(os.path.join(PUBLIC, "logo-light.png"))
    print(f"logo-light.png {light.width}x{light.height}")

    dark = render_horizontal(WHITE)
    dark.save(os.path.join(PUBLIC, "logo-dark.png"))
    print(f"logo-dark.png {dark.width}x{dark.height}")

    # App icons / favicon (ink badge, white steps, orange apex)
    badge_512 = render_badge(512, WHITE, ORANGE, INK)
    badge_512.save(os.path.join(PUBLIC, "icon-512.png"))
    print("icon-512.png 512x512")

    badge_192 = badge_512.resize((192, 192), Image.LANCZOS)
    badge_192.save(os.path.join(PUBLIC, "icon-192.png"))
    print("icon-192.png 192x192")

    badge_180 = badge_512.resize((180, 180), Image.LANCZOS)
    badge_180.save(os.path.join(PUBLIC, "apple-icon.png"))
    print("apple-icon.png 180x180")

    badge_48 = badge_512.resize((48, 48), Image.LANCZOS)
    badge_48.save(
        os.path.join(PUBLIC, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    print("favicon.ico 16/32/48")


if __name__ == "__main__":
    main()
