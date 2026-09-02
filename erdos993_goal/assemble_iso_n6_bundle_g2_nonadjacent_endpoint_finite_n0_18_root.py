#!/usr/bin/env python3
"""Fail-closed finite N=0..18 nonadjacent endpoint-parent G2 assembly."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


BASE = Path(__file__).resolve().parent
OUTPUT = BASE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_finite_n0_18_"
    "assembled_exact_root_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_FINITE_N0_18_ROOT"
PINS = {
    "n0_13_source": (
        "assemble_iso_n6_bundle_g2_nonadjacent_endpoint_finite_n0_13_root.py",
        "594D4502041B06CD0E19A8BF37B2C5E8841C29B8986E42BB04EBF674F5455538",
    ),
    "n0_13_report": (
        "iso_n6_bundle_g2_nonadjacent_endpoint_finite_n0_13_assembled_exact_root_20260831.json",
        "F6415FA378D7696E3C8105C35C1AD79D18A17D445B0C331A7BB9E94AC892F328",
    ),
    "n14_18_source": (
        "census_iso_n6_bundle_g2_nonadjacent_endpoint_forest_jets_n14_18_root.py",
        "B31F3DE9F46C8E40744BF3BA510D8377CF90B6943AAD7848EE80F6D8D72A020F",
    ),
    "n14_18_report": (
        "iso_n6_bundle_g2_nonadjacent_endpoint_forest_jets_n14_18_exact_root_20260831.json",
        "48273DFA0C492FB6CF758F74D70B910736A0C1EF50CFF6A1F1376910CE1363A9",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(label: str) -> dict:
    return json.loads((BASE / PINS[label][0]).read_text(encoding="utf-8"))


def main() -> None:
    for filename, expected in PINS.values():
        assert sha256(BASE / filename) == expected
    low = load("n0_13_report")
    high = load("n14_18_report")
    assert low["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_FINITE_N0_13_ROOT"
    )
    assert low["aggregate"]["negative"] == 0
    assert high["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_FOREST_JETS_N14_18_ROOT"
    )
    assert high["source_sha256"] == PINS["n14_18_source"][1]
    assert high["aggregate"]["negative"] == 0
    assert high["audited_order_range"] == [14, 18]
    assert set(high["orders"]) == {str(value) for value in range(14, 19)}
    assert all(
        high["orders"][str(order)][geometry]["negative"] == 0
        for order in range(14, 19)
        for geometry in ("common0", "common1")
    )

    covered = set(range(0, 14)) | set(range(14, 19))
    assert covered == set(range(19))
    report = {
        "schema": "iso-n6-g2-nonadjacent-endpoint-finite-n0-18-assembly-v1",
        "date": "2026-08-31",
        "marker": MARKER,
        "status": "PASS exact finite N=0..18 endpoint-parent G2",
        "theorem": (
            "For every rank-six nonadjacent endpoint-parent forest bundle with "
            "0<=N<=18, in either common0 or common1 geometry and either endpoint "
            "orientation, G2 is nonnegative."
        ),
        "partition": [
            {
                "orders": "0<=N<=13",
                "certificate": PINS["n0_13_report"][0],
            },
            {
                "orders": "14<=N<=18",
                "certificate": PINS["n14_18_report"][0],
                "independent_full_runs": 2,
                "run_report_sha256": [
                    PINS["n14_18_report"][1],
                    PINS["n14_18_report"][1],
                ],
            },
        ],
        "seams": {
            "integer_order_gaps": 0,
            "boundary": "N=13/14",
            "covered_orders": [0, 18],
        },
        "aggregate": {
            "N0_8_oriented_nonadjacent_pairs": low["aggregate"]["N0_8_oriented_nonadjacent_pairs"],
            "N9_13_literal_g2_checks": low["aggregate"]["N9_13_literal_g2_checks"],
            "N14_18_literal_g2_checks_per_full_run": high["aggregate"]["literal_g2_checks"],
            "N14_18_full_runs": 2,
            "negative": 0,
            "minimum": min(low["aggregate"]["minimum"], high["aggregate"]["global_minimum"]),
        },
        "dependencies": {
            label: {"file": filename, "sha256": expected}
            for label, (filename, expected) in PINS.items()
        },
        "scope_guard": (
            "Finite N<=18 nonadjacent endpoint-parent G2 only.  The N>=19 "
            "small/large split, ordinary-parent mode, universal rank-six G2, "
            "rank seven, and Erdos Problem 993 remain separate obligations."
        ),
    }
    report["source"] = Path(__file__).name
    report["source_sha256"] = sha256(Path(__file__).resolve())
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "N14_18_checks_per_run": high["aggregate"]["literal_g2_checks"],
        "integer_order_gaps": 0,
        "negative": 0,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
