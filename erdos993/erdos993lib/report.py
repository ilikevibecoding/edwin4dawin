"""JSON reports with SHA-256 fingerprints (matching the handoff's replay style)."""

from __future__ import annotations

import datetime as _dt
import hashlib
import json
import os
import platform
import sys
from typing import Any, Dict


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest().upper()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest().upper()


def provenance(script_path: str) -> Dict[str, Any]:
    return {
        "script": os.path.basename(script_path),
        "script_sha256": sha256_file(script_path),
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "utc": _dt.datetime.now(_dt.timezone.utc).isoformat(timespec="seconds"),
    }


def write_report(path: str, payload: Dict[str, Any]) -> str:
    text = json.dumps(payload, indent=1, sort_keys=True, default=str)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)
        fh.write("\n")
    return sha256_file(path)
