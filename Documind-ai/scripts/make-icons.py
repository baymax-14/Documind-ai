"""Draw DocuMind's raster icons from the brand mark geometry.

The mark (see src/Brand.jsx and public/favicon.svg) lives on a 32-unit grid:
a page with a clipped corner outlined in ink, two ink text lines, and one red
cited line pulled out past the page's right edge.

Run from the Documind-ai folder:  python scripts/make-icons.py
Writes into public/: favicon.ico (16, 32, 48), apple-touch-icon.png (180),
icon-192.png, icon-512.png and icon-maskable-512.png.
"""

from pathlib import Path

from PIL import Image, ImageDraw

INK = (11, 11, 11, 255)
RED = (211, 17, 15, 255)
PAPER = (241, 241, 239, 255)  # the site's grey ground
WHITE = (255, 255, 255, 255)

# Page outline (stroke 2.5 centred on the path M5 2.5 H19.5 L26.5 9.5 V29.5 H5 Z),
# drawn as the outer edge filled with ink and the inner edge filled with paper.
# The 45-degree edge x - y = 17 is offset by 1.25 * sqrt(2) on either side.
OUTER = [(3.75, 1.25), (20.018, 1.25), (27.75, 8.982), (27.75, 30.75), (3.75, 30.75)]
INNER = [(6.25, 3.75), (18.982, 3.75), (25.25, 10.018), (25.25, 28.25), (6.25, 28.25)]
# Text lines: x, y, width, height
INK_LINES = [(9.5, 13, 10, 2.5), (9.5, 23.5, 7, 2.5)]
CITED = (9.5, 17.75, 21, 3.25)


def draw_mark(size, ground, mark_fraction, page_fill=WHITE, supersample=8):
    """Square icon of `size` px; the mark's 32-unit box fills `mark_fraction` of it."""
    big = size * supersample
    img = Image.new('RGBA', (big, big), ground)
    d = ImageDraw.Draw(img)
    unit = big * mark_fraction / 32
    # Centre the visible mark (x 3.75..30.5, y 1.25..30.75) in the square
    ox = (big - (30.5 + 3.75) * unit) / 2
    oy = (big - (30.75 + 1.25) * unit) / 2

    def pt(x, y):
        return (ox + x * unit, oy + y * unit)

    def rect(x, y, w, h, fill):
        d.rectangle([pt(x, y), pt(x + w, y + h)], fill=fill)

    d.polygon([pt(*p) for p in OUTER], fill=INK)
    d.polygon([pt(*p) for p in INNER], fill=page_fill)
    for line in INK_LINES:
        rect(*line, INK)
    rect(*CITED, RED)
    return img.resize((size, size), Image.LANCZOS)


def main():
    out = Path(__file__).resolve().parent.parent / 'public'

    # Browser tab fallback: transparent ground, page filled white, mark fills the square
    ico = [draw_mark(s, (0, 0, 0, 0), 1.0) for s in (16, 32, 48)]
    ico[-1].save(out / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico[:-1])

    # Home-screen icons sit on the site's grey ground; the platform rounds the corners
    draw_mark(180, PAPER, 0.66).convert('RGB').save(out / 'apple-touch-icon.png', optimize=True)
    draw_mark(192, PAPER, 0.66).save(out / 'icon-192.png', optimize=True)
    draw_mark(512, PAPER, 0.66).save(out / 'icon-512.png', optimize=True)
    # Maskable: the mark stays inside the central 80% safe zone of any mask shape
    draw_mark(512, PAPER, 0.52).save(out / 'icon-maskable-512.png', optimize=True)

    for name in ('favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'):
        print(f'{name:24s} {(out / name).stat().st_size / 1024:6.1f} KB')


if __name__ == '__main__':
    main()
