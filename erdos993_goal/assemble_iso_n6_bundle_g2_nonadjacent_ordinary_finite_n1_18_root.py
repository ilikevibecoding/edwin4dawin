#!/usr/bin/env python3
"""Fail-closed finite N=1..18 ordinary-parent G2 assembly."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_finite_n1_18_"
    "assembled_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
    "FINITE_N1_18_ROOT"
)
PINS = {
    "n1_13_source": (
        "assemble_iso_n6_bundle_g2_nonadjacent_ordinary_finite_n1_13_root.py",
        "FF4946880BC7E17A7A796A08A3D44E0098AA213E09775E797882AFA785C8E51C",
    ),
    "n1_13_report": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_finite_n1_13_"
        "assembled_exact_root_20260831.json",
        "EB66A3A3A1FC12BAC2ADEC46DD8DF2FBF3B127B39B8B4415276B13A171B70869",
    ),
    "n14_18_source": (
        "assemble_iso_n6_bundle_g2_nonadjacent_ordinary_finite_n14_18_root.py",
        "92BFA742FACDFF07B08A0302480909E1E55FABFCF3540412145E8A8DEA4DA0DA",
    ),
    "n14_18_report": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_finite_n14_18_"
        "assembled_exact_root_20260831.json",
        "3FCAFC810D02D3136C3FB25FAD60D245F43ED1FCCD066817819E3CADB91E83D7",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(label: str) -> dict:
    return json.loads((HERE / PINS[label][0]).read_text(encoding="utf-8"))


def main() -> None:
    for filename, expected in PINS.values():
        assert sha256(HERE / filename) == expected
    low = load("n1_13_report")
    high = load("n14_18_report")
    assert low["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_FINITE_N1_13_ROOT"
    )
    assert high["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_FINITE_N14_18_ROOT"
    )
    assert low["aggregate"]["negative"] == 0
    assert high["aggregate"]["negative"] == 0
    report = {
        "marker": MARKER,
        "status": "PASS exact finite N=1..18 ordinary-parent G2",
        "theorem_component": (
            "For every rank-six nonadjacent ordinary-parent forest bundle "
            "with 1<=N<=18, G2 is nonnegative; N=0 is vacuous."
        ),
        "coverage": {
            "N0": "vacuous ordinary-parent mode",
            "N1_13": low["coverage"],
            "N14_18": high["coverage"],
        },
        "aggregate": {
            "N1_13_literal_triples": low["aggregate"]["literal_triples"],
            "N14_18_corner_paid_checks": (
                high["aggregate"]["literal_corner_paid_checks"]
            ),
            "negative": 0,
            "minimum": min(
                low["aggregate"]["minimum"],
                high["aggregate"]["minimum"],
            ),
        },
        "dependencies": {
            label: {"file": filename, "sha256": expected}
            for label, (filename, expected) in PINS.items()
        },
        "scope_guard": (
            "Finite N<=18 ordinary-parent G2 only. N>=19, endpoint-parent "
            "mode, and complete rank-six G2 assembly remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
