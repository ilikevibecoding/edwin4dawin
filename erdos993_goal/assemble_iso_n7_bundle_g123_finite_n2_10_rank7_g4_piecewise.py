#!/usr/bin/env python3
"""Freeze the exhaustive finite rank-seven G1/G2/G3 base through order ten."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g123_finite_n2_10_assembled_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N2_10_ASSEMBLED_RANK7_G4_PIECEWISE"
LOW_SOURCE = HERE / "probe_iso_n7_bundle_finite_root.py"
LOW_SOURCE_SHA256 = (
    "4CE45144F9A1FA1B749FA49C1FB51AAB5C61A5F98A27FA3604DE247F80A726D8"
)
LOW_REPORT = HERE / "iso_n7_bundle_finite_probe_root_20260830.json"
LOW_REPORT_SHA256 = (
    "EC5A384BF8F2F1384E8D55EBE402581353DB91D23FD7500476A2B75359A49F50"
)
HIGH_SOURCE = HERE / "census_iso_n7_bundle_g123_finite_n8_10_rank7_g4_piecewise.py"
HIGH_SOURCE_SHA256 = (
    "2D3FC608EC1EB28DCF1021D9FE8D67A211F0BE2E0D1DF1B7CE8AC0EA3A196EB5"
)
HIGH_REPORT = HERE / (
    "iso_n7_bundle_g123_finite_n8_10_exact_rank7_g4_piecewise_20260831.json"
)
HIGH_REPORT_SHA256 = (
    "0990267B2353F4AC2AC9D72B8052B99E1D7D43A6FD2DD6E4D26736988239AF72"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(path: Path, digest: str) -> dict:
    assert sha256(path) == digest
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    assert sha256(LOW_SOURCE) == LOW_SOURCE_SHA256
    assert sha256(HIGH_SOURCE) == HIGH_SOURCE_SHA256
    low = load(LOW_REPORT, LOW_REPORT_SHA256)
    high = load(HIGH_REPORT, HIGH_REPORT_SHA256)
    assert low["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_FINITE_ROOT"
    assert low["atlas_orders"] == [2, 7]
    assert low["negative_count"] == 0
    assert low["source_sha256"] == LOW_SOURCE_SHA256
    assert high["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N8_10_RANK7_G4_PIECEWISE"
    )
    assert high["negative_count"] == 0
    assert high["source_sha256"] == HIGH_SOURCE_SHA256
    assert [row["order"] for row in high["orders"]] == [8, 9, 10]
    assert sum(row["unlabeled_forests"] for row in high["orders"]) == 558
    assert high["total_bundle_cells"] == 21847
    for index in (1, 2, 3):
        assert low["global_minima"][f"g{index}"]["value"] >= 0
        assert high["global_minima"][f"g{index}"]["value"] >= 0

    report = {
        "marker": MARKER,
        "status": "proved exact finite exhaustion",
        "theorem": (
            "For every forest C of order 2<=n<=10, every distinct marked pair, "
            "and every canonical deepest eligible bundle cell, the literal "
            "rank-seven bundle coefficients G1,G2,G3 are nonnegative."
        ),
        "orders": [2, 10],
        "coefficients": ["G1", "G2", "G3"],
        "negative_count": 0,
        "coverage": {
            "n2_n7_marked_cells_including_fixtures": low[
                "marked_cells_including_fixtures"
            ],
            "n2_n7_bundle_cells": low["bundle_cells"],
            "n8_n10_unlabeled_forests": high["total_unlabeled_forests"],
            "n8_n10_marked_pairs": high["total_marked_pairs"],
            "n8_n10_bundle_cells": high["total_bundle_cells"],
        },
        "minima": {
            f"g{index}": min(
                low["global_minima"][f"g{index}"]["value"],
                high["global_minima"][f"g{index}"]["value"],
            )
            for index in (1, 2, 3)
        },
        "dependencies_sha256": {
            LOW_SOURCE.name: LOW_SOURCE_SHA256,
            LOW_REPORT.name: LOW_REPORT_SHA256,
            HIGH_SOURCE.name: HIGH_SOURCE_SHA256,
            HIGH_REPORT.name: HIGH_REPORT_SHA256,
        },
        "scope": (
            "Finite canonical bundle cells through order ten only. Terminal "
            "rank-seven values and every order n>=11 remain separate; no "
            "universal rank-seven coefficient or all-N7 theorem is asserted."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative_count": 0,
        "orders": report["orders"],
        "coefficients": report["coefficients"],
        "minima": report["minima"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
