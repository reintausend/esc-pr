"""USB ESC/POS driver wrapper for the Epson TM-T88IV on macOS."""

from __future__ import annotations

from pathlib import Path

import libusb_package
import usb.backend.libusb1
import usb.core
import usb.util
from escpos.printer import Usb
from PIL import Image

from .config import Settings, load_settings

_backend: usb.backend.libusb1._LibUSB | None = None


def _ensure_usb_backend() -> usb.backend.libusb1._LibUSB:
    global _backend
    if _backend is not None:
        return _backend

    _backend = usb.backend.libusb1.get_backend(
        find_library=lambda _: libusb_package.get_library_path()
    )
    if _backend is None:
        raise RuntimeError(
            "No USB backend available. Install dependencies: "
            "pip install -r printer_setup/requirements.txt"
        )
    return _backend


def find_printer(settings: Settings | None = None) -> usb.core.Device:
    """Return the USB device if the printer is connected."""
    cfg = settings or load_settings()
    backend = _ensure_usb_backend()
    device = usb.core.find(
        idVendor=cfg.usb.vendor_id,
        idProduct=cfg.usb.product_id,
        backend=backend,
    )
    if device is None:
        raise ConnectionError(
            f"Epson TM-T88IV not found "
            f"(vendor={cfg.usb.vendor_id:#06x}, product={cfg.usb.product_id:#06x}). "
            "Check the USB cable and that the printer is powered on."
        )
    return device


def list_endpoints(device: usb.core.Device) -> list[dict[str, int | str]]:
    """List USB interface endpoints (useful when troubleshooting macOS USB issues)."""
    endpoints: list[dict[str, int | str]] = []
    config = device.get_active_configuration()
    for interface in config:
        for endpoint in interface:
            direction = (
                "IN"
                if usb.util.endpoint_direction(endpoint.bEndpointAddress)
                == usb.util.ENDPOINT_IN
                else "OUT"
            )
            endpoints.append(
                {
                    "interface": interface.bInterfaceNumber,
                    "address": endpoint.bEndpointAddress,
                    "direction": direction,
                }
            )
    return endpoints


class T88IVPrinter:
    """
    High-level wrapper around python-escpos for the TM-T88IV.

    Reads connection and print behavior from settings.yaml.
    Call finish() (or exit the context manager) to feed and optionally cut.
    """

    def __init__(
        self,
        settings: Settings | None = None,
        settings_path: Path | str | None = None,
        auto_finish: bool = True,
    ) -> None:
        if settings is not None:
            self.settings = settings
        elif settings_path is not None:
            self.settings = load_settings(settings_path)
        else:
            self.settings = load_settings()

        self._auto_finish = auto_finish
        _ensure_usb_backend()

        usb_cfg = self.settings.usb
        self._printer = Usb(
            usb_cfg.vendor_id,
            usb_cfg.product_id,
            profile=usb_cfg.profile,
            in_ep=usb_cfg.in_ep,
            out_ep=usb_cfg.out_ep,
        )

    @property
    def escpos(self) -> Usb:
        """Access the underlying python-escpos printer for advanced commands."""
        return self._printer

    @property
    def canvas_width(self) -> int:
        return self.settings.canvas.width_dots

    def text(self, content: str) -> None:
        self._printer.text(content)

    def line(self, content: str = "") -> None:
        self._printer.text(content + "\n")

    def bold(self, enabled: bool = True) -> None:
        self._printer.set(align="left", bold=enabled)

    def align(self, position: str) -> None:
        """position: 'left', 'center', or 'right'."""
        self._printer.set(align=position)

    def cut(self, mode: str | None = None) -> None:
        self._printer.cut(mode or self.settings.print.cut_mode)

    def feed(self, lines: int | None = None) -> None:
        self._printer.text("\n" * (lines if lines is not None else self.settings.print.feed_lines))

    def image(self, source: str | Path | Image.Image) -> None:
        if isinstance(source, Image.Image):
            self._printer.image(source)
        else:
            self._printer.image(str(source))

    def barcode(self, code: str, bc_type: str = "CODE128", **kwargs) -> None:
        self._printer.barcode(code, bc_type, **kwargs)

    def qr(self, content: str, **kwargs) -> None:
        self._printer.qr(content, **kwargs)

    def raw(self, data: bytes) -> None:
        """Send raw ESC/POS bytes for full control over the print stream."""
        self._printer._raw(data)

    def finish(self, *, cut: bool | None = None) -> None:
        """
        End a print job: feed blank lines and cut if enabled in settings.

        Pass cut=True/False to override settings.yaml for this job only.
        """
        should_cut = self.settings.print.cut if cut is None else cut
        if self.settings.print.feed_lines > 0:
            self.feed(self.settings.print.feed_lines)
        if should_cut:
            self.cut()

    def close(self) -> None:
        self._printer.close()

    def __enter__(self) -> T88IVPrinter:
        return self

    def __exit__(self, *args: object) -> None:
        if self._auto_finish:
            self.finish()
        self.close()
