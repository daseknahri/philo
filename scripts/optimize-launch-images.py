from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
PLAN_PATH = ROOT / "content" / "image-plan.json"
IMAGES_DIR = ROOT / "content" / "images"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert launch images to WebP and update the image plan.")
    parser.add_argument("--quality", type=int, default=84, help="WebP quality setting (default: 84).")
    parser.add_argument("--keep-source", action="store_true", help="Keep original PNG/JPG files after conversion.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    plan = json.loads(PLAN_PATH.read_text(encoding="utf-8"))
    converted = 0
    skipped = 0
    before_bytes = 0
    after_bytes = 0

    for item in plan:
        filename = item.get("filename", "")
        if not filename:
            skipped += 1
            continue

        source = IMAGES_DIR / filename
        if not source.exists():
            skipped += 1
            continue

        before_bytes += source.stat().st_size
        suffix = source.suffix.lower()

        if suffix == ".webp":
            after_bytes += source.stat().st_size
            continue

        if suffix not in {".png", ".jpg", ".jpeg"}:
            skipped += 1
            after_bytes += source.stat().st_size
            continue

        destination = source.with_suffix(".webp")

        with Image.open(source) as img:
            image = img.convert("RGBA") if img.mode in {"RGBA", "LA", "P"} else img.convert("RGB")
            image.save(destination, "WEBP", quality=args.quality, method=6)

        item["filename"] = destination.name
        after_bytes += destination.stat().st_size
        converted += 1

        if not args.keep_source:
            source.unlink()

    PLAN_PATH.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Converted: {converted}")
    print(f"Skipped: {skipped}")
    print(f"Before: {before_bytes / 1024:.1f} KB")
    print(f"After: {after_bytes / 1024:.1f} KB")
    if before_bytes:
        saved = before_bytes - after_bytes
        print(f"Saved: {saved / 1024:.1f} KB ({(saved / before_bytes) * 100:.1f}%)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
