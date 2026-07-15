"""Helpers for building print-ready bitmaps at the configured canvas size."""

from __future__ import annotations

from dataclasses import replace
from pathlib import Path

from PIL import Image, ImageDraw

from .config import ImageSettings, Settings, load_settings

VALID_FIT_MODES = ("width", "height", "contain", "cover", "none")


def create_canvas(
    height_dots: int | None = None,
    settings: Settings | None = None,
) -> Image.Image:
    """
    Create a 1-bit PIL image sized for the printer canvas.

    Width comes from settings.yaml (512 dots for standard TM-T88IV).
    Height defaults to settings.canvas.height_dots; pass height_dots to override.
    """
    cfg = settings or load_settings()
    width = cfg.canvas.width_dots
    height = height_dots if height_dots is not None else cfg.canvas.height_dots

    if height is None:
        raise ValueError(
            "Canvas height is not set. Pass height_dots to create_canvas() "
            "or set canvas.height_dots in settings.yaml."
        )

    fill = 1 if cfg.canvas.background == "white" else 0
    image = Image.new("1", (width, height), fill)
    return image


def create_draw_context(
    height_dots: int | None = None,
    settings: Settings | None = None,
) -> tuple[Image.Image, ImageDraw.ImageDraw, Settings]:
    """Return (image, draw, settings) ready for custom drawing."""
    cfg = settings or load_settings()
    image = create_canvas(height_dots=height_dots, settings=cfg)
    return image, ImageDraw.Draw(image), cfg


def _resolve_image_options(
    settings: Settings,
    *,
    resize: bool | None = None,
    keep_aspect_ratio: bool | None = None,
    fit: str | None = None,
    max_width_dots: int | None = None,
    max_height_dots: int | None = None,
    grayscale: bool | None = None,
) -> ImageSettings:
    """Merge CLI/runtime overrides with settings.yaml image section."""
    img = settings.image
    resolved = ImageSettings(
        resize=img.resize if resize is None else resize,
        keep_aspect_ratio=(
            img.keep_aspect_ratio if keep_aspect_ratio is None else keep_aspect_ratio
        ),
        fit=(fit or img.fit).lower(),
        max_width_dots=max_width_dots if max_width_dots is not None else img.max_width_dots,
        max_height_dots=(
            max_height_dots if max_height_dots is not None else img.max_height_dots
        ),
        grayscale=img.grayscale if grayscale is None else grayscale,
    )

    if resolved.fit == "none":
        resolved = replace(resolved, resize=False)

    if resolved.fit not in VALID_FIT_MODES:
        raise ValueError(
            f"Invalid fit mode '{resolved.fit}'. "
            f"Use one of: {', '.join(VALID_FIT_MODES)}"
        )

    return resolved


def _load_image(source: str | Path | Image.Image) -> Image.Image:
    if isinstance(source, Image.Image):
        return source.copy()
    path = Path(source)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {path}")
    return Image.open(path)


def _target_box(
    options: ImageSettings,
    settings: Settings,
) -> tuple[int, int | None]:
    max_width = options.max_width_dots or settings.canvas.width_dots
    max_height = options.max_height_dots
    return max_width, max_height


def _resize_image(
    image: Image.Image,
    options: ImageSettings,
    settings: Settings,
) -> Image.Image:
    if not options.resize:
        return image

    max_width, max_height = _target_box(options, settings)
    src_w, src_h = image.size

    if options.fit == "width":
        if src_w <= max_width and options.keep_aspect_ratio:
            return image
        new_w = max_width
        new_h = int(src_h * max_width / src_w) if options.keep_aspect_ratio else src_h
        if not options.keep_aspect_ratio:
            new_h = max_height or src_h
        return image.resize((new_w, new_h), Image.Resampling.LANCZOS)

    if options.fit == "height":
        if max_height is None:
            raise ValueError("fit: height requires max_height_dots in settings or --max-height")
        new_h = max_height
        new_w = int(src_w * max_height / src_h) if options.keep_aspect_ratio else src_w
        if not options.keep_aspect_ratio:
            new_w = max_width
        return image.resize((new_w, new_h), Image.Resampling.LANCZOS)

    if options.fit == "contain":
        if max_height is None:
            scale = max_width / src_w
        else:
            scale = min(max_width / src_w, max_height / src_h)
        new_w = max(1, int(src_w * scale))
        new_h = max(1, int(src_h * scale))
        return image.resize((new_w, new_h), Image.Resampling.LANCZOS)

    if options.fit == "cover":
        if max_height is None:
            raise ValueError("fit: cover requires max_height_dots in settings or --max-height")
        scale = max(max_width / src_w, max_height / src_h)
        scaled_w = max(1, int(src_w * scale))
        scaled_h = max(1, int(src_h * scale))
        scaled = image.resize((scaled_w, scaled_h), Image.Resampling.LANCZOS)
        left = (scaled_w - max_width) // 2
        top = (scaled_h - max_height) // 2
        return scaled.crop((left, top, left + max_width, top + max_height))

    return image


def prepare_image(
    source: str | Path | Image.Image,
    settings: Settings | None = None,
    *,
    resize: bool | None = None,
    keep_aspect_ratio: bool | None = None,
    fit: str | None = None,
    max_width_dots: int | None = None,
    max_height_dots: int | None = None,
    grayscale: bool | None = None,
) -> Image.Image:
    """
    Load and optionally resize an image for thermal printing.

    Behavior is controlled by settings.yaml (image section) and optional overrides.
    """
    cfg = settings or load_settings()
    options = _resolve_image_options(
        cfg,
        resize=resize,
        keep_aspect_ratio=keep_aspect_ratio,
        fit=fit,
        max_width_dots=max_width_dots,
        max_height_dots=max_height_dots,
        grayscale=grayscale,
    )

    image = _load_image(source)

    if options.grayscale and image.mode not in ("L", "1"):
        image = image.convert("L")

    return _resize_image(image, options, cfg)
