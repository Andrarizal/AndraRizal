"""Draw the profile contribution card from GitHub's public calendar.

The calendar already includes private contribution counts when that profile
setting is on, and it never includes repository names. This script only
keeps the daily totals.
"""

import os
import re
import subprocess
import tempfile
from datetime import date, timedelta
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

USER = "Andrarizal"
ROOT = Path(__file__).resolve().parents[1]
BG = (14, 17, 24)
RAISE = (22, 27, 38)
LINE = (36, 48, 68)
INK = (238, 243, 251)
MUTED = (154, 171, 194)
DATE = (126, 141, 163)
BLUE = (76, 157, 255)
RED = (255, 93, 115)
GREEN = (
    (33, 38, 45),
    (14, 68, 41),
    (0, 109, 50),
    (38, 166, 65),
    (57, 211, 83),
)
MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def font(size, bold=False):
    if os.name == "nt":
        path = r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf"
    else:
        name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
        path = f"/usr/share/fonts/truetype/dejavu/{name}"
    return ImageFont.truetype(path, size)


def fetch_year(year):
    url = f"https://github.com/users/{USER}/contributions?from={year}-01-01&to={year}-12-31"
    dest = Path(tempfile.gettempdir()) / f"andra-contrib-{year}.html"
    curl = "curl.exe" if os.name == "nt" else "curl"
    subprocess.run(
        [curl, "-fsSL", "-A", "Mozilla/5.0", "-o", str(dest), url],
        check=True,
    )
    return dest.read_text(encoding="utf-8")


def parse_year(html, year):
    cells = {}
    pattern = re.compile(
        r'data-date="(\d{4}-\d{2}-\d{2})"[^>]*data-level="(\d)"'
        r"(?:(?!data-date=).){0,900}?tool-tip[^>]*>\s*(.*?)\s*</tool-tip>",
        re.S,
    )
    for day, level, tip in pattern.findall(html):
        if not day.startswith(f"{year}-"):
            continue
        tip = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", tip)).strip()
        count = 0 if tip.lower().startswith("no ") else int(re.search(r"\d+", tip).group(0))
        cells[date.fromisoformat(day)] = (count, int(level))
    if len(cells) < 300:
        raise SystemExit(f"Kalender {year} tidak lengkap ({len(cells)} hari).")
    return cells


def load(today):
    cells = {}
    for year in range(2020, today.year + 1):
        cells.update(parse_year(fetch_year(year), year))
    return cells


def longest_streak(cells, today):
    start = min(day for day, (count, _) in cells.items() if count and day <= today)
    best = run = 0
    best_end = start
    day = start
    while day <= today:
        if cells.get(day, (0, 0))[0]:
            run += 1
            if run > best:
                best = run
                best_end = day
        else:
            run = 0
        day += timedelta(days=1)
    return best, best_end - timedelta(days=best - 1), best_end


def current_streak(cells, today):
    probe = today if cells.get(today, (0, 0))[0] else today - timedelta(days=1)
    run = 0
    day = probe
    while cells.get(day, (0, 0))[0]:
        run += 1
        day -= timedelta(days=1)
    if not run:
        return 0, None, None
    return run, probe - timedelta(days=run - 1), probe


def stamp(day):
    return f"{day.day} {MONTHS[day.month - 1]} {day.year}"


def span(a, b):
    if a.year == b.year and a.month == b.month:
        return f"{a.day}–{b.day} {MONTHS[a.month - 1]} {a.year}"
    if a.year == b.year:
        return f"{a.day} {MONTHS[a.month - 1]} – {b.day} {MONTHS[b.month - 1]} {a.year}"
    return f"{stamp(a)} – {stamp(b)}"


def center(draw, text, font_, cx, y, fill):
    box = draw.textbbox((0, 0), text, font=font_)
    draw.text((cx - (box[2] - box[0]) / 2, y), text, font=font_, fill=fill)


def flame(draw, cx, cy):
    draw.ellipse((cx - 13, cy - 2, cx + 13, cy + 20), fill=RED)
    draw.polygon([(cx, cy - 20), (cx + 13, cy + 6), (cx - 13, cy + 6)], fill=RED)
    draw.polygon([(cx - 8, cy + 2), (cx - 2, cy + 16), (cx + 2, cy - 2)], fill=(255, 122, 64))
    draw.ellipse((cx - 6, cy + 4, cx + 6, cy + 16), fill=(255, 206, 120))
    draw.polygon([(cx, cy - 8), (cx + 5, cy + 8), (cx - 5, cy + 8)], fill=(255, 206, 120))


def draw_streak(total, first, current, current_end, longest, long_start, long_end):
    image = Image.new("RGB", (1400, 400), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((8, 8, 1391, 391), radius=22, outline=LINE, width=2)
    for x in (466, 933):
        draw.line((x, 64, x, 336), fill=LINE, width=2)

    number = font(76, bold=True)
    label = font(24)
    small = font(20)
    center(draw, f"{total:,}".replace(",", "."), number, 237, 112, INK)
    center(draw, "Total kontribusi", label, 237, 248, MUTED)
    center(draw, f"{stamp(first)} – sekarang", small, 237, 286, DATE)

    draw.ellipse((628, 86, 772, 230), outline=BLUE, width=12)
    flame(draw, 700, 74)
    center(draw, str(current), number, 700, 112, INK)
    center(draw, "Beruntun saat ini", label, 700, 248, BLUE)
    when = stamp(current_end) if current_end else "hari ini kosong"
    center(draw, when, small, 700, 286, DATE)

    center(draw, str(longest), number, 1166, 112, INK)
    center(draw, "Terpanjang", label, 1166, 248, MUTED)
    center(draw, span(long_start, long_end), small, 1166, 286, DATE)
    image.save(ROOT / "assets" / "streak.png", "PNG")


def draw_grid(cells, today):
    weeks = []
    sunday = today - timedelta(days=(today.weekday() + 1) % 7)
    start = sunday - timedelta(weeks=52)
    day = start
    while day <= today:
        if not weeks or len(weeks[-1]) == 7:
            weeks.append([])
        weeks[-1].append(day)
        day += timedelta(days=1)

    step = 18
    cell = 14
    left = 86
    top = 64
    width = left + len(weeks) * step + 48
    height = top + 7 * step + 78
    image = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((8, 8, width - 9, height - 9), radius=22, outline=LINE, width=2)

    small = font(16)
    tiny = font(15)
    for index, name in ((1, "Sen"), (3, "Rab"), (5, "Jum")):
        draw.text((28, top + index * step - 1), name, font=tiny, fill=DATE)

    labeled = set()
    for column, week in enumerate(weeks):
        x = left + column * step
        for day in week:
            if day.day == 1 and day.month not in labeled:
                labeled.add(day.month)
                draw.text((x, 32), MONTHS[day.month - 1], font=small, fill=DATE)
            _, level = cells.get(day, (0, 0))
            y = top + ((day.weekday() + 1) % 7) * step
            draw.rounded_rectangle((x, y, x + cell, y + cell), radius=3, fill=GREEN[min(level, 4)])

    legend = "Lebih sedikit"
    box = draw.textbbox((0, 0), legend, font=tiny)
    lx = width - 48 - (box[2] - box[0]) - 5 * 20 - 90
    ly = top + 7 * step + 16
    draw.text((lx, ly), legend, font=tiny, fill=DATE)
    for i, color in enumerate(GREEN):
        x = lx + (box[2] - box[0]) + 12 + i * 20
        draw.rounded_rectangle((x, ly + 2, x + cell, ly + 2 + cell), radius=3, fill=color)
    draw.text((lx + (box[2] - box[0]) + 12 + 5 * 20, ly), "Lebih banyak", font=tiny, fill=DATE)
    note = "Termasuk kontribusi repositori privat. Nama repositori tidak ditampilkan."
    draw.text((left, ly + 28), note, font=tiny, fill=MUTED)
    image.save(ROOT / "assets" / "contrib.png", "PNG")


def main():
    today = date.today()
    cells = load(today)
    counted = {day: count for day, (count, _) in cells.items() if day <= today}
    first = min(day for day, count in counted.items() if count)
    total = sum(counted.values())
    current, _, current_end = current_streak(cells, today)
    longest, long_start, long_end = longest_streak(cells, today)
    draw_streak(total, first, current, current_end, longest, long_start, long_end)
    draw_grid(cells, today)
    print(f"total {total}")
    print(f"pertama {first.isoformat()}")
    print(f"beruntun {current} {None if not current_end else current_end.isoformat()}")
    print(f"terpanjang {longest} {long_start.isoformat()} {long_end.isoformat()}")


if __name__ == "__main__":
    main()
