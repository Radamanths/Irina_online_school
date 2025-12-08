"""Utility for extracting hex palettes from Virgo SVG/bitmap assets."""

from __future__ import annotations

import argparse
import base64
import dataclasses
import datetime as dt
import io
import json
import pathlib
import re
from typing import Iterable, List, Sequence

from PIL import Image


SUPPORTED_EXTS = {".svg", ".png", ".jpg", ".jpeg", ".webp"}
BASE64_PATTERN = re.compile(r"data:image/(?:png|jpeg|jpg);base64,([^\"')]+)", re.IGNORECASE)
ROOT = pathlib.Path(__file__).resolve().parent


@dataclasses.dataclass
class PaletteItem:
    name: str
    source: str
    colors: List[str]


def resolve_target(raw: str) -> pathlib.Path:
    path = pathlib.Path(raw).expanduser()
    if not path.is_absolute():
        path = ROOT / path
    return path


def find_files(targets: Sequence[str]) -> List[pathlib.Path]:
    """Expand user targets into a deduplicated list of files to scan."""

    paths: List[pathlib.Path] = []
    for raw in targets:
        path = resolve_target(raw)
        if not path.exists():
            continue
        if path.is_file():
            if path.suffix.lower() in SUPPORTED_EXTS:
                paths.append(path)
            continue
        for ext in SUPPORTED_EXTS:
            paths.extend(sorted(path.rglob(f"*{ext}")))
    # Remove duplicates while preserving order
    seen = set()
    unique: List[pathlib.Path] = []
    for candidate in paths:
        if candidate in seen:
            continue
        seen.add(candidate)
        unique.append(candidate)
    return unique


def decode_svg_image(path: pathlib.Path) -> List[Image.Image]:
    """Return a list of Pillow images decoded from embedded base64 blocks."""

    text = path.read_text(encoding="utf-8")
    matches = BASE64_PATTERN.findall(text)
    images: List[Image.Image] = []
    for payload in matches:
        try:
            data = base64.b64decode(payload)
        except ValueError:
            continue
        image = Image.open(io.BytesIO(data)).convert("RGB")
        images.append(image)
    return images


def load_image(path: pathlib.Path) -> List[Image.Image]:
    if path.suffix.lower() == ".svg":
        return decode_svg_image(path)
    return [Image.open(path).convert("RGB")]


def dominant_hexes(img: Image.Image, sample: int, limit: int) -> List[str]:
    """Return up to `limit` distinct hex codes ranked by frequency."""

    resized = img.resize((sample, sample))
    colors = resized.getcolors(sample * sample) or []
    colors.sort(reverse=True)
    result: List[str] = []
    for _, color in colors:
        hex_code = "#%02x%02x%02x" % color
        if hex_code not in result:
            result.append(hex_code)
        if len(result) >= limit:
            break
    return result


def extract_palette(path: pathlib.Path, sample: int, limit: int) -> PaletteItem | None:
    images = load_image(path)
    if not images:
        return None
    swatches: List[str] = []
    for image in images:
        swatches.extend(dominant_hexes(image, sample, limit))
    # Preserve order but ensure uniqueness
    seen = set()
    unique_swatches: List[str] = []
    for color in swatches:
        if color in seen:
            continue
        seen.add(color)
        unique_swatches.append(color)
        if len(unique_swatches) >= limit:
            break
    if not unique_swatches:
        return None
    return PaletteItem(name=path.stem, source=str(path), colors=unique_swatches)


def parse_args() -> argparse.Namespace:
    default_source = ROOT / "Сайт_Брендбук/Брендбук/градиенты"
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "inputs",
        nargs="*",
        default=[str(default_source)],
        help="Files or directories to scan (defaults to брендбук/градиенты)",
    )
    parser.add_argument("-o", "--output", type=pathlib.Path, help="Optional JSON output path")
    parser.add_argument("--top", type=int, default=6, help="Number of unique colors per asset")
    parser.add_argument(
        "--sample",
        type=int,
        default=80,
        help="Square size for downsampling before counting colors (default: 80)",
    )
    parser.add_argument(
        "--flatten",
        action="store_true",
        help="Emit simple {name: [hex]} dict instead of detailed metadata",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.output and not args.output.is_absolute():
        args.output = (ROOT / args.output).resolve()
    files = find_files(args.inputs)
    palettes: List[PaletteItem] = []
    for path in files:
        item = extract_palette(path, sample=args.sample, limit=args.top)
        if item:
            palettes.append(item)

    if args.flatten:
        payload = {item.name: item.colors for item in palettes}
    else:
        payload = {
            "generated": dt.datetime.utcnow().isoformat() + "Z",
            "sources": [str(p) for p in files],
            "settings": {"top": args.top, "sample": args.sample},
            "palette": [dataclasses.asdict(item) for item in palettes],
        }

    text = json.dumps(payload, ensure_ascii=False, indent=2)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text, encoding="utf-8")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
