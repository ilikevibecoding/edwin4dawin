#!/usr/bin/env python3
"""Exact replay of the full rank-seven high/high convolution cone."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from explore_rank7_three_halves_convolution import high_high
from verify_rank4_three_halves_forest_certificate import polynomial_statistics


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank7_high_high_convolution_exact_20260813.json"
EXPECTED = {
    "terms": 108_603_332,
    "negative": 0,
    "minimum": 1,
    "maximum": 41_613_599_136_000,
}


def main() -> int:
    margin, _ = high_high()
    statistics = polynomial_statistics(margin)
    assert statistics == EXPECTED
    report = {
        "status": "PASS_EXACT_FULL_RANK7_HIGH_HIGH_CONVOLUTION_CONE",
        "scope": "full high/high rank-seven convolution cone",
        "statistics": statistics,
        "warning": "This proves one of three convolution cases, not the all-forest rank-seven theorem.",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(statistics)
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(REPORT.read_bytes()).hexdigest().upper())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
