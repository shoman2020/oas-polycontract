"""Build the README's looping project overview GIF. Requires Pillow."""

from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "project-flow.gif"
WIDTH, HEIGHT = 1320, 760
BG = "#0B1020"
PANEL = "#121B2E"
PANEL_ACTIVE = "#16283A"
LINE = "#2C3A55"
TEXT = "#F3F6FC"
MUTED = "#AAB7CC"
TEAL = "#62D5C2"
BLUE = "#85B6FF"
PURPLE = "#C6A5FF"
AMBER = "#FFD27A"
RED = "#FF9C9C"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    candidates = [Path("C:/Windows/Fonts") / name, Path("/usr/share/fonts/truetype/dejavu") / ("DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf")]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


F_TITLE = font(30, True)
F_SUBTITLE = font(16)
F_SECTION = font(18, True)
F_BODY = font(14)
F_SMALL = font(12)
F_COMMAND = font(17, True)
F_BIG = font(29, True)


def rounded(draw, box, fill=PANEL, outline=LINE, radius=16, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def text(draw, xy, value, fill=TEXT, use_font=F_BODY, anchor=None):
    draw.text(xy, value, fill=fill, font=use_font, anchor=anchor)


def wrapped(draw, xy, value, chars, fill=MUTED, use_font=F_BODY, spacing=5):
    draw.multiline_text(xy, "\n".join(wrap(value, chars)), fill=fill, font=use_font, spacing=spacing)


def arrow(draw, points, color=LINE, width=3, head=9):
    draw.line(points, fill=color, width=width, joint="curve")
    x0, y0 = points[-2]
    x1, y1 = points[-1]
    if abs(x1 - x0) >= abs(y1 - y0):
        direction = 1 if x1 > x0 else -1
        triangle = [(x1, y1), (x1 - direction * head, y1 - head // 2), (x1 - direction * head, y1 + head // 2)]
    else:
        direction = 1 if y1 > y0 else -1
        triangle = [(x1, y1), (x1 - head // 2, y1 - direction * head), (x1 + head // 2, y1 - direction * head)]
    draw.polygon(triangle, fill=color)


def base(title, subtitle, frame_number):
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    text(draw, (52, 38), title, use_font=F_TITLE)
    text(draw, (54, 83), subtitle, fill=MUTED, use_font=F_SUBTITLE)
    rounded(draw, (1156, 37, 1268, 70), fill="#172338", outline="#344563", radius=14)
    text(draw, (1212, 53), f"{frame_number}/4", fill=TEAL, use_font=F_SMALL, anchor="mm")
    return image, draw


def phases(draw, active):
    items = [
        ("0 Scaffold", "done"), ("1 Contract", "done"), ("2 Governance", "done"),
        ("3 Clients", "done"), ("4 Debug", "done"), ("5 Migration", "conditional"),
        ("6 Local run", "done"), ("7 CI/security", "active"), ("8 Docs", "done"),
        ("9 Scaffolder", "later"),
    ]
    x0, y0, w, gap = 50, 656, 228, 12
    for index, (label, status) in enumerate(items):
        row, col = divmod(index, 5)
        x = x0 + col * (w + gap)
        y = y0 + row * 42
        highlight = index == active
        fill = "#193B3B" if highlight else PANEL
        outline = TEAL if highlight else LINE
        color = TEAL if highlight or status == "done" else (AMBER if status == "conditional" else MUTED)
        rounded(draw, (x, y, x + w, y + 32), fill=fill, outline=outline, radius=10, width=2 if highlight else 1)
        text(draw, (x + 12, y + 16), label, fill=color, use_font=F_SMALL, anchor="lm")


def architecture_frame(active_tick):
    image, draw = base("One contract per API boundary", "Contracts are reviewed once; native tests and purpose-built tools consume them.", 1)
    text(draw, (54, 132), "SOURCES", fill=BLUE, use_font=F_SMALL)
    text(draw, (506, 132), "CHECKS", fill=TEAL, use_font=F_SMALL)
    text(draw, (1002, 132), "WHAT THEY PROVE", fill=PURPLE, use_font=F_SMALL)

    sources = [
        ("Root Product Catalog OAS", "Design scaffold; compatibility baseline", BLUE),
        ("Demo Product OAS", "Live API contract for the runnable example", TEAL),
        ("Inventory OAS", "Contract for the downstream dependency", AMBER),
        ("WebSocket and Kafka AsyncAPI", "Message contract examples; lint only", PURPLE),
    ]
    for i, (title, note, color) in enumerate(sources):
        y = 160 + i * 106
        rounded(draw, (52, y, 390, y + 82))
        text(draw, (72, y + 20), title, fill=color, use_font=F_SECTION)
        wrapped(draw, (72, y + 45), note, 39, use_font=F_SMALL, spacing=2)

    checks = [
        ("Spectral + oasdiff", "Style, validity, breaking changes"),
        ("Specmatic + WireMock", "Provider, consumer mock, dependency"),
        ("Schemathesis", "Stateless fuzzing + linked stateful order flows"),
        ("Seven languages + Playwright", "Live API response and stateful lifecycle validation"),
    ]
    for i, (title, note) in enumerate(checks):
        y = 170 + i * 105
        rounded(draw, (506, y, 890, y + 76), fill=PANEL_ACTIVE if i == active_tick else PANEL,
                outline=TEAL if i == active_tick else LINE, width=2 if i == active_tick else 1)
        text(draw, (528, y + 20), title, fill=TEAL if i == active_tick else TEXT, use_font=F_SECTION)
        text(draw, (528, y + 48), note, fill=MUTED, use_font=F_SMALL)

    results = [
        ("Stable API shape", "Status, media type, and body match OAS"),
        ("Clear behavior", "Business assertions live in code"),
        ("Controlled dependencies", "Inventory calls are deterministic"),
        ("Consistent debugging", "Swagger UI and Prism use the root OAS"),
    ]
    for i, (title, note) in enumerate(results):
        y = 170 + i * 105
        rounded(draw, (1002, y, 1267, y + 76))
        text(draw, (1020, y + 20), title, fill=PURPLE, use_font=F_SECTION)
        wrapped(draw, (1020, y + 45), note, 34, use_font=F_SMALL, spacing=2)

    for source_index, check_index in [(0, 0), (0, 3), (1, 0), (1, 1), (1, 2), (1, 3), (2, 1), (3, 0)]:
        sy = 160 + source_index * 106 + 41
        cy = 170 + check_index * 105 + 38
        color = TEAL if (source_index + check_index + active_tick) % 4 == 0 else LINE
        arrow(draw, [(390, sy), (452, sy), (452, cy), (496, cy)], color, 2)
    for i in range(4):
        y = 208 + i * 105
        arrow(draw, [(894, y), (950, y), (950, 208 + i * 105), (992, 208 + i * 105)],
              TEAL if i == active_tick else LINE, 2)

    phases(draw, 3)
    return image


def pipeline_frame(active_step):
    image, draw = base("How the project runs", "One command runs the same containerized pipeline locally and in Ubuntu CI.", 2)
    steps = [
        "Lint OAS\nand AsyncAPI", "Check baseline\ncompatibility", "Build app\nand clients",
        "WireMock +\nSpecmatic", "Stateless +\nstateful tests", "Seven languages\n+ Playwright", "Smart Mock\nconsumer tests",
    ]
    x0, y, w, gap = 52, 218, 154, 20
    for i, label in enumerate(steps):
        x = x0 + i * (w + gap)
        if x + w > 1268:
            break
        active = i == active_step
        rounded(draw, (x, y, x + w, y + 110), fill=PANEL_ACTIVE if active else PANEL,
                outline=TEAL if active else LINE, width=2 if active else 1)
        text(draw, (x + 14, y + 30), f"{i + 1:02}", fill=TEAL if active else BLUE, use_font=F_SECTION)
        draw.multiline_text((x + 14, y + 59), label, fill=TEXT, font=F_BODY, spacing=4)
        if i < 6:
            arrow(draw, [(x + w + 3, y + 55), (x + w + gap - 4, y + 55)], TEAL if i == active_step else LINE)

    rounded(draw, (52, 390, 790, 546), fill="#101A2C")
    text(draw, (76, 419), "RUN LOCALLY", fill=BLUE, use_font=F_SMALL)
    rounded(draw, (76, 440, 748, 503), fill="#070B14", outline="#26344D", radius=12)
    text(draw, (98, 472), "$ bash ./run.sh", fill=TEAL, use_font=F_COMMAND, anchor="lm")
    text(draw, (76, 528), "Provider, fuzz, and client tests call the healthy app; the consumer mock check is separate.", fill=MUTED, use_font=F_SMALL)

    rounded(draw, (824, 390, 1268, 546), fill="#101A2C")
    text(draw, (850, 419), "STATELESS + STATEFUL", fill=AMBER, use_font=F_SMALL)
    wrapped(draw, (850, 445), "Fuzz the read-only Product API independently. Follow OAS links through create, read, confirm, and delete on the separate in-memory Order API.", 48, use_font=F_BODY)
    phases(draw, 6)
    return image


def fuzz_frame(active):
    image, draw = base("Fuzzing and stateful coverage", "Use generated inputs for independent requests; add sequences when the API has a lifecycle.", 3)
    boxes = [
        (52, 164, 638, 570, "STATELESS FUZZING", TEAL,
         "Schemathesis generates independent requests from the OAS and checks responses, boundaries, and coverage.",
         ["Run by `bash ./run.sh` after the provider starts", "Finds path, input, status, and schema gaps", "Latest measured sample: 115 cases in 2.07s"]),
        (682, 164, 1268, 570, "STATEFUL TESTING", AMBER,
         "A stateful suite follows related operations across one workflow and keeps the server state between requests.",
         ["Create → read → confirm → delete → verify 404", "OAS links pass returned IDs between operations", "Separate in-memory example; Product API stays GET-only"]),
    ]
    for i, (x1, y1, x2, y2, title, color, intro, bullets) in enumerate(boxes):
        rounded(draw, (x1, y1, x2, y2), fill=PANEL_ACTIVE if i == active else PANEL,
                outline=color if i == active else LINE, width=2 if i == active else 1)
        text(draw, (x1 + 28, y1 + 40), title, fill=color, use_font=F_SECTION)
        wrapped(draw, (x1 + 28, y1 + 86), intro, 57, fill=TEXT, use_font=F_BODY, spacing=6)
        for j, item in enumerate(bullets):
            cy = y1 + 190 + j * 61
            rounded(draw, (x1 + 28, cy, x2 - 28, cy + 43), fill="#0E1627", outline="#25344C", radius=10)
            draw.ellipse((x1 + 44, cy + 17, x1 + 53, cy + 26), fill=color)
            text(draw, (x1 + 66, cy + 22), item, fill=MUTED, use_font=F_SMALL, anchor="lm")
    phases(draw, 2)
    return image


def performance_frame():
    image, draw = base("Performance: measured, with context", "This cold Ubuntu sample is useful for tuning, but it is not a green end-to-end baseline.", 4)
    metrics = [
        (52, "~67 sec", "Container builds", "Historical run: app, WireMock, seven clients", BLUE),
        (478, "2.07 sec", "Schemathesis fuzzing", "115 generated cases; ST204 found", TEAL),
        (904, "2m44 sec", "Full CI job", "Includes post-pipeline image scans", PURPLE),
    ]
    for x, number, label, note, color in metrics:
        rounded(draw, (x, 188, x + 364, 376), fill=PANEL_ACTIVE, outline=color, width=2)
        text(draw, (x + 26, 227), number, fill=color, use_font=F_BIG)
        text(draw, (x + 26, 281), label, use_font=F_SECTION)
        wrapped(draw, (x + 26, 318), note, 40, use_font=F_SMALL)

    rounded(draw, (52, 414, 1268, 572), fill="#101A2C")
    text(draw, (78, 447), "WHAT THE RUN SHOWS", fill=AMBER, use_font=F_SMALL)
    wrapped(draw, (78, 475), "Cold image builds dominate this sample. Contract lint and compatibility finished in about six seconds; generated fuzz cases took about two seconds. The run stopped on the TRACE /healthz method check before client suites ran; that finding is fixed in the current source. Use successful runs to establish a reproducible baseline and compare warm-cache times.", 132, fill=TEXT, use_font=F_BODY, spacing=5)
    phases(draw, 7)
    return image


def slide_transition_frames(current, following, steps=8):
    """Yield frames that slide the current picture left and the next one in."""
    for step in range(1, steps + 1):
        offset = round(WIDTH * step / steps)
        frame = Image.new("RGB", (WIDTH, HEIGHT), BG)
        frame.paste(current, (-offset, 0))
        frame.paste(following, (WIDTH - offset, 0))
        yield frame


def main():
    slides = [
        architecture_frame(0),
        pipeline_frame(2),
        fuzz_frame(0),
        performance_frame(),
        architecture_frame(2),
        pipeline_frame(4),
        fuzz_frame(1),
        architecture_frame(3),
    ]
    slide_durations = [800, 850, 1000, 1100, 550, 550, 650, 550]
    animation = []
    durations = []
    for index, slide in enumerate(slides):
        animation.append(slide)
        durations.append(slide_durations[index])
        next_slide = slides[(index + 1) % len(slides)]
        for transition in slide_transition_frames(slide, next_slide):
            animation.append(transition)
            durations.append(45)

    animation[0].save(
        OUTPUT,
        save_all=True,
        append_images=animation[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(OUTPUT)


if __name__ == "__main__":
    main()

