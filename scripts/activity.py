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


def route_columns(width, height, reverse=False):
    columns = range(width - 1, -1, -1) if reverse else range(width)
    points = []
    for index, column in enumerate(columns):
        rows = range(height) if index % 2 == 0 else range(height - 1, -1, -1)
        points.extend((column, row) for row in rows)
    return points


def route_rows(width, height):
    points = []
    for index, row in enumerate(range(height)):
        columns = range(width - 1, -1, -1) if index % 2 else range(width)
        points.extend((column, row) for column in columns)
    return points


def route_diagonal(width, height):
    points = []
    for shift in range(width + height - 1):
        line = []
        for row in range(height):
            column = shift - row
            if 0 <= column < width:
                line.append((column, row))
        if shift % 2:
            line.reverse()
        points.extend(line)
    return points


def route_hunt(weeks):
    targets = [(column, row) for column, week in enumerate(weeks) for row, level in enumerate(week) if level]
    if len(targets) < 2:
        return route_columns(len(weeks), 7)
    current = min(targets)
    remaining = set(targets)
    remaining.remove(current)
    points = [current]
    while remaining:
        nxt = min(remaining, key=lambda cell: abs(cell[0] - current[0]) + abs(cell[1] - current[1]))
        points.extend(orthogonal_steps(current, nxt))
        current = nxt
        remaining.remove(nxt)
    return points


def orthogonal_steps(origin, dest):
    x, y = origin
    tx, ty = dest
    steps = []
    while x != tx:
        x += 1 if tx > x else -1
        steps.append((x, y))
    while y != ty:
        y += 1 if ty > y else -1
        steps.append((x, y))
    return steps


def orthogonalize(points):
    if not points:
        return []
    path = [points[0]]
    for dest in points[1:]:
        path.extend(orthogonal_steps(path[-1], dest))
    return path


def snake_patterns(weeks):
    width = len(weeks)
    height = 7
    colors = ("#c084fc", "#4c9dff", "#ff5d73", "#3ee0a0")
    paths = (
        route_columns(width, height),
        route_rows(width, height),
        route_diagonal(width, height),
        route_hunt(weeks),
    )
    return [(orthogonalize(path), color) for path, color in zip(paths, colors)]


def head_path(patterns, lineup=22):
    sky = -6
    start = patterns[0][0][0]
    color0 = patterns[0][1]
    head = (start[0], sky)
    path = [(head[0], head[1], color0)]

    def push(points, color):
        for x, y in points:
            if (x, y) != path[-1][:2]:
                path.append((x, y, color))

    for points, color in patterns:
        push(transit(path[-1][:2], points[0], sky), color)
        push(points, color)
    tail_tip = (head[0] - (lineup - 1), sky)
    push(transit(path[-1][:2], tail_tip, sky), color0)
    push(orthogonal_steps(path[-1][:2], head), color0)
    return path


def transit(origin, dest, sky):
    x, y = origin
    steps = []
    while y > sky:
        y -= 1
        steps.append((x, y))
    while x != dest[0]:
        x += 1 if dest[0] > x else -1
        steps.append((x, y))
    while y < dest[1]:
        y += 1
        steps.append((x, y))
    while y > dest[1]:
        y -= 1
        steps.append((x, y))
    return steps


def snake_svg(weeks, palette):
    base = 3
    longest = 22
    patterns = snake_patterns(weeks)
    route = head_path(patterns, longest)
    period = len(route) - 1
    height = 7
    width = len(weeks)
    empty = palette[0]
    duration = max(42000, period * 32)
    step = duration / period

    def percent(frame_index):
        return frame_index / period * 100

    eats = []
    seen = set()
    bag = []
    for index, (column, row, _color) in enumerate(route[:-1]):
        on_board = 0 <= row < height and 0 <= column < width
        if not on_board:
            if bag:
                eats.append(bag)
                bag = []
            seen = set()
            continue
        if weeks[column][row] and (column, row) not in seen:
            seen.add((column, row))
            bag.append(index)
    if bag:
        eats.append(bag)

    hides = []
    off = False
    for index, (_column, row, _color) in enumerate(route):
        if row < 0:
            if not off:
                start = index
                off = True
            finish = index
        elif off:
            if finish - start > longest:
                hides.append((start + finish) // 2)
            off = False

    rules = [
        ":root{"
        f"--ce:{empty};--c1:{palette[1]};--c2:{palette[2]};--c3:{palette[3]};--c4:{palette[4]};"
        "--bar:#3ee0a0;--bd:#1b1f230a}"
        ".c{shape-rendering:geometricPrecision;fill:var(--ce);stroke:var(--bd);stroke-width:1px;"
        "width:11px;height:11px}"
        ".s{shape-rendering:geometricPrecision;opacity:1;"
        f"animation-name:trail,show;animation-duration:{duration}ms,{duration}ms;"
        "animation-timing-function:linear,linear;animation-iteration-count:infinite,infinite}"
        f".u{{fill:var(--bar);transform-origin:0 0;transform:scaleX(0);animation:grow linear {duration}ms infinite}}"
        "@keyframes show{0%,100%{opacity:1}}"
    ]
    keys = []
    previous = None
    for index, (column, row, color) in enumerate(route):
        spot = (column, row, color)
        if spot == previous and index not in (0, period):
            continue
        previous = spot
        keys.append(f"{percent(index):.3f}%{{transform:translate({column * 16}px,{row * 16}px);fill:{color}}}")
    rules.append(f"@keyframes trail{{{''.join(keys)}}}")

    bar = [f"0%{{transform:scaleX(0)}}"]
    drawing = False
    for index, (column, row, _color) in enumerate(route[:-1]):
        on_board = 0 <= row < height and 0 <= column < width
        if on_board and not drawing:
            bar.append(f"{percent(index):.2f}%{{transform:scaleX(0)}}")
            drawing = True
        elif on_board:
            last = index
        elif drawing:
            bar.append(f"{percent(last):.2f}%{{transform:scaleX(1)}}")
            drawing = False
    bar.append("100%{transform:scaleX(0)}")
    rules.append(f"@keyframes grow{{{''.join(bar)}}}")

    rects = []
    eaten_index = 0
    for column, week in enumerate(weeks):
        for row, level in enumerate(week):
            klass = "c"
            if level:
                color = palette[min(level, 4)]
                visits = [step for step, cell in enumerate(route[:-1]) if cell[0] == column and cell[1] == row]
                bounds = [0, *hides, period]
                frames = [f"0%{{fill:{color}}}"]
                previous = 0.0
                for opened, closed in zip(bounds, bounds[1:]):
                    eaten_at = [step for step in visits if opened <= step < closed]
                    if not eaten_at:
                        continue
                    mark = percent(eaten_at[0])
                    if mark > previous:
                        frames.append(f"{mark:.2f}%{{fill:{empty}}}")
                        previous = mark
                    if closed < period:
                        back = percent(closed)
                        if back > previous + 0.08:
                            frames.append(f"{back:.2f}%{{fill:{color}}}")
                            previous = back
                frames.append(f"100%{{fill:{empty}}}")
                name = f"e{eaten_index}"
                eaten_index += 1
                rules.append(f"@keyframes {name}{{{''.join(frames)}}}")
                rules.append(f".c.{name}{{fill:{color};animation:{name} {duration}ms linear infinite}}")
                klass = f"c {name}"
            rects.append(f'<rect class="{klass}" x="{column * 16 + 2}" y="{row * 16 + 2}" rx="2" ry="2"/>')

    for segment in range(longest):
        delay = 0 if segment == 0 else -(duration - segment * step)
        size = max(8.0, 14.0 - segment * 0.28)
        inset = (16 - size) / 2
        opacity = 1
        appear = "show"
        if segment >= base:
            opacity = 0
            frames = ["0%{opacity:0}"]
            previous = 0.0
            need = segment - base
            for group_index, group in enumerate(eats):
                if len(group) <= need:
                    continue
                show = percent(group[need])
                hide = 100.0
                later = [hide_at for hide_at in hides if hide_at > group[need]]
                if later:
                    hide = percent(later[0])
                elif group_index + 1 < len(eats):
                    hide = percent(eats[group_index + 1][0])
                if show <= previous:
                    show = previous + 0.02
                if hide > show:
                    frames.append(f"{show:.2f}%{{opacity:1}}")
                    frames.append(f"{min(99.9, hide):.2f}%{{opacity:0}}")
                    previous = hide
            frames.append("100%{opacity:0}")
            appear = f"a{segment}"
            rules.append(f"@keyframes {appear}{{{''.join(frames)}}}")
        column, row, color = route[(period - segment) % period]
        rules.append(
            f".s.t{segment}{{animation-name:trail,{appear};animation-delay:{delay:.2f}ms,0ms;"
            f"opacity:{opacity};fill:{color};transform:translate({column * 16}px,{row * 16}px)}}"
        )
        rects.append(
            f'<rect class="s t{segment}" x="{inset:.1f}" y="{inset:.1f}" width="{size:.1f}" height="{size:.1f}" rx="4" ry="4"/>'
        )

    rects.append(f'<rect class="u" x="2" y="128" width="{width * 16 - 6}" height="10" rx="5"/>')
    return (
        f'<svg viewBox="-8 -24 {width * 16 + 20} 176" width="{width * 16 + 20}" height="176" xmlns="http://www.w3.org/2000/svg">'
        f"<style>{''.join(rules)}</style>{''.join(rects)}</svg>"
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
