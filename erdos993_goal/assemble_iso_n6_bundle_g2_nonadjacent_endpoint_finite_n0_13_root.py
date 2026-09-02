#!/usr/bin/env python3
"""Fail-closed finite N=0..13 nonadjacent endpoint-parent G2 assembly."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_finite_n0_13_"
    "assembled_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "FINITE_N0_13_ROOT"
)
PINS = {
    "occupation_source": (
        "derive_iso_n6_bundle_g2_nonadjacent_endpoint_parent_occupation_root.py",
        "6316FB51C60CA4F592B0148A16F041FB39245047F62626BAF4AF10D775593677",
    ),
    "occupation_report": (
        "iso_n6_bundle_g2_nonadjacent_endpoint_parent_occupation_"
        "exact_root_20260831.json",
        "9DDD8602D189BFE8F932E70919970F663B9DFA1F36AC60DF1BBCC2BA7DA58437",
    ),
    "n0_8_source": (
        "census_iso_n6_bundle_g2_nonadjacent_endpoint_actual_n0_8_root.py",
        "F20FB811A3F90F79C20B707483D83A7B26EB0F1463C5981D5162E487E10AB171",
    ),
    "n0_8_report": (
        "iso_n6_bundle_g2_nonadjacent_endpoint_actual_n0_8_"
        "exact_root_20260831.json",
        "94B42BFBE25683A56784415FD4ACFF5DD08F5F8F72E2BDD8C11CF51B661F37D7",
    ),
    "n9_13_source": (
        "census_iso_n6_bundle_g2_nonadjacent_endpoint_forest_jets_n9_13_root.py",
        "3A48C33F87D1F5A94FBFD3B6A7AE1103E7F175A8B01282E1FA7CA78412032A75",
    ),
    "n9_13_report": (
        "iso_n6_bundle_g2_nonadjacent_endpoint_forest_jets_n9_13_"
        "exact_root_20260831.json",
        "C2A988268D170965617BF59EED484BF03A66C6C30765ABC9DD02630DB038152C",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(label: str) -> dict:
    return json.loads((HERE / PINS[label][0]).read_text(encoding="utf-8"))


def main() -> None:
    for filename, expected in PINS.values():
        assert sha256(HERE / filename) == expected
    occupation = load("occupation_report")
    low = load("n0_8_report")
    high = load("n9_13_report")
    assert occupation["endpoint_u_split"] == (
        "A2(A)+L2(A,B)+M2(A,C)+R2(B,C)+R2(A,D)"
    )
    assert low["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_ACTUAL_N0_8_ROOT"
    )
    assert high["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
        "FOREST_JETS_N9_13_ROOT"
    )
    assert low["source_sha256"] == PINS["n0_8_source"][1]
    assert high["source_sha256"] == PINS["n9_13_source"][1]
    assert low["aggregate"]["negative"] == 0
    assert high["aggregate"]["negative_relaxation_corners"] == 0
    assert set(high["orders"]) == {str(order) for order in range(9, 14)}
    report = {
        "marker": MARKER,
        "status": "PASS exact finite N=0..13 endpoint-parent G2",
        "theorem_component": (
            "For every rank-six nonadjacent endpoint-parent forest bundle "
            "with 0<=N<=13, G2 is nonnegative."
        ),
        "coverage": {
            "N0_8": low["coverage_argument"],
            "N9_13": high["exactness"],
            "functional": occupation["endpoint_u_split"],
            "endpoint_v": (
                "covered by the exact B,C swap identity in the occupation report"
            ),
        },
        "aggregate": {
            "N0_8_oriented_nonadjacent_pairs": (
                low["aggregate"]["oriented_nonadjacent_marked_pairs"]
            ),
            "N9_13_literal_g2_checks": (
                high["aggregate"]["literal_g2_checks"]
            ),
            "negative": 0,
            "minimum": min(
                low["aggregate"]["global_minimum"],
                high["aggregate"]["global_minimum"],
            ),
        },
        "dependencies": {
            label: {"file": filename, "sha256": expected}
            for label, (filename, expected) in PINS.items()
        },
        "scope_guard": (
            "Finite N<=13 endpoint-parent G2 only. N>=14, ordinary-parent "
            "mode, and universal rank-six G2 assembly remain separate."
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
