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


def contribution_weeks(cells, today):
    sunday = today - timedelta(days=(today.weekday() + 1) % 7)
    start = sunday - timedelta(weeks=52)
    weeks = []
    for index in range(53):
        week = []
        for row in range(7):
            day = start + timedelta(days=index * 7 + row)
            week.append(0 if day > today else cells.get(day, (0, 0))[1])
        weeks.append(week)
    return weeks


def snake_route(weeks):
    points = []
    for column, _week in enumerate(weeks):
        rows = range(7) if column % 2 == 0 else range(6, -1, -1)
        points.extend((column, row) for row in rows)
    warmup = [(3, -1), (2, -1), (1, -1), (0, -1)]
    last_column, _last_row = points[-1]
    leaving = [(last_column + 1 + step, -1) for step in range(5)]
    return warmup + points + leaving


def snake_svg(weeks, palette):
    route = snake_route(weeks)
    segments = 4
    hold = 48
    frames = list(range(segments - 1, len(route))) + [len(route) - 1] * hold
    last = len(frames) - 1
    empty = palette[0]

    def at(frame, segment):
        index = frame - segment
        return route[index] if index >= 0 else route[0]

    def percent(frame_index):
        return frame_index / last * 100

    grid_done = percent((len(route) - 5 - 1) - (segments - 1))
    rules = [
        ":root{"
        f"--ce:{empty};--c1:{palette[1]};--c2:{palette[2]};--c3:{palette[3]};--c4:{palette[4]};"
        "--cs:#c084fc;--bar:#3ee0a0;--bd:#1b1f230a}"
        ".c{shape-rendering:geometricPrecision;fill:var(--ce);stroke:var(--bd);stroke-width:1px;"
        "width:11px;height:11px;animation:none 24000ms linear infinite}"
        ".s{shape-rendering:geometricPrecision;fill:var(--cs);animation:none linear 24000ms infinite}"
        ".u{fill:var(--bar);transform-origin:0 0;transform:scaleX(0);animation:grow linear 24000ms infinite}"
        f"@keyframes grow{{0%{{transform:scaleX(0)}}{grid_done:.2f}%,100%{{transform:scaleX(1)}}}}"
    ]
    eaten = []
    rects = []
    eaten_index = 0
    for column, week in enumerate(weeks):
        for row, level in enumerate(week):
            klass = "c"
            if level:
                color = f"var(--c{min(level, 4)})"
                step = next(i for i, (x, y) in enumerate(route) if (x, y) == (column, row))
                frame_index = step - (segments - 1)
                mark = percent(frame_index)
                name = f"e{eaten_index}"
                eaten_index += 1
                rules.append(
                    f"@keyframes {name}{{{mark:.2f}%{{fill:{color}}}{mark + 0.08:.2f}%,100%{{fill:var(--ce)}}}}"
                )
                rules.append(f".c.{name}{{fill:{color};animation-name:{name}}}")
                klass = f"c {name}"
                eaten.append((column, row))
            rects.append(
                f'<rect class="{klass}" x="{column * 16 + 2}" y="{row * 16 + 2}" rx="2" ry="2"/>'
            )

    for segment in range(segments):
        keys = []
        previous = None
        for frame_index, frame in enumerate(frames):
            column, row = at(frame, segment)
            if (column, row) == previous and frame_index not in (0, last):
                continue
            previous = (column, row)
            keys.append(f"{percent(frame_index):.2f}%{{transform:translate({column * 16}px,{row * 16}px)}}")
        rules.append(f"@keyframes s{segment}{{{''.join(keys)}}}")
        column, row = at(frames[0], segment)
        size = 13.2 - segment * 1.5
        inset = (16 - size) / 2
        rules.append(
            f".s.s{segment}{{animation-name:s{segment};transform:translate({column * 16}px,{row * 16}px)}}"
        )
        rects.append(
            f'<rect class="s s{segment}" x="{inset:.1f}" y="{inset:.1f}" width="{size:.1f}" height="{size:.1f}" rx="4" ry="4"/>'
        )

    width = len(weeks) * 16
    rects.append(f'<rect class="u" x="2" y="128" width="{width - 6}" height="10" rx="5"/>')
    style = "".join(rules)
    return (
        f'<svg viewBox="-8 -24 {width + 20} 176" width="{width + 20}" height="176" xmlns="http://www.w3.org/2000/svg">'
        f"<style>{style}</style>{''.join(rects)}</svg>"
    )


def draw_snake(cells, today):
    weeks = contribution_weeks(cells, today)
    dark = ("#161b22", "#01311f", "#034525", "#0f6d31", "#00c647")
    light = ("#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39")
    (ROOT / "assets" / "snake-dark.svg").write_text(snake_svg(weeks, dark), encoding="utf-8")
    (ROOT / "assets" / "snake.svg").write_text(snake_svg(weeks, light), encoding="utf-8")
    filled = sum(level > 0 for week in weeks for level in week)
    print(f"ular {len(weeks)} minggu, {filled} kotak terisi")


def main():
    today = date.today()
    cells = load(today)
    counted = {day: count for day, (count, _) in cells.items() if day <= today}
    first = min(day for day, count in counted.items() if count)
    total = sum(counted.values())
    current, _, current_end = current_streak(cells, today)
    longest, long_start, long_end = longest_streak(cells, today)
    draw_streak(total, first, current, current_end, longest, long_start, long_end)
    draw_snake(cells, today)
    print(f"total {total}")
    print(f"pertama {first.isoformat()}")
    print(f"beruntun {current} {None if not current_end else current_end.isoformat()}")
    print(f"terpanjang {longest} {long_start.isoformat()} {long_end.isoformat()}")


if __name__ == "__main__":
    main()
