#!/usr/bin/env python3
"""Fail-closed finite N=1..13 nonadjacent ordinary-parent G2 assembly."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_FINITE_N1_13_ROOT"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_finite_n1_13_"
    "assembled_exact_root_20260831.json"
)
FILES = {
    "n1_8_python": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_actual_n1_8_exact_root_20260831.json",
        "15AEB1C663087F05F63AB19B40EE6B1ACD10C00C75E926CB53A16C345AD3324F",
    ),
    "n1_8_cross_validation": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_literal_cpp_n1_8_cross_validation_exact_root_20260831.json",
        "B37A696DB383D9BB8622A2AE3F31E6CE618A2AE83DDA666C8A535DF630A9ACC5",
    ),
    "n9_13_assembler": (
        "assemble_iso_n6_bundle_g2_nonadjacent_ordinary_literal_n9_13_complete_root.py",
        "6088C1761260F1FB57C9638E3B41EF7610FE947D5396A474DB4E6BD48F52A864",
    ),
    "n9_13_report": (
        "iso_n6_bundle_g2_nonadjacent_ordinary_literal_n9_13_complete_exact_root_20260831.json",
        "F2443C6BD2D30CFECCA45015DBE0B86B6A724F963D2DF811E3FA87AB04677DA9",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str) -> dict:
    return json.loads((HERE / FILES[key][0]).read_text(encoding="utf-8"))


def main() -> None:
    for filename, expected in FILES.values():
        assert sha256(HERE / filename) == expected
    n1_8 = load("n1_8_python")
    cross = load("n1_8_cross_validation")
    n9_13 = load("n9_13_report")
    assert n1_8["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_TOTAL_N1_8_ROOT"
    )
    assert cross["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
        "LITERAL_CPP_AGAINST_PYTHON_N1_8_ROOT"
    )
    assert n9_13["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
        "LITERAL_N9_13_COMPLETE_ROOT"
    )
    assert n1_8["aggregate"]["unordered_nonedge_parent_triples"] == 144637
    assert n1_8["aggregate"]["negative_ordinary_g2"] == 0
    assert cross["aggregate"]["triples"] == 144637
    assert cross["aggregate"]["negative"] == 0
    assert cross["aggregate"]["global_minimum"] == 0
    assert n9_13["aggregate"] == {
        "literal_triples": 36673945,
        "minimum": 124519,
        "negative": 0,
    }
    assert set(n9_13["rows"]) == {
        f"N{order}_common{geometry}"
        for order in range(9, 14)
        for geometry in (0, 1)
    }

    report = {
        "marker": MARKER,
        "status": "PASS exact finite N=1..13 nonadjacent ordinary-parent G2",
        "theorem_component": (
            "For every rank-six nonadjacent ordinary-parent forest bundle with "
            "1<=N<=13, the coefficient g2 is nonnegative. N=0 is vacuous "
            "because no ordinary parent p distinct from both marks exists."
        ),
        "coverage": {
            "N0": "vacuous ordinary-parent mode",
            "N1_8": (
                "all unlabeled forests through marked order 10; every unordered "
                "nonedge and every ordinary p; independent C++/Python agreement"
            ),
            "N9_13": (
                "all unlabeled forests of marked orders 11..15; every unordered "
                "nonedge, every ordinary p, and both common-neighbor geometries"
            ),
        },
        "aggregate": {
            "literal_triples": 144637 + 36673945,
            "negative": 0,
            "minimum": 0,
        },
        "dependencies": {
            key: {"file": value[0], "sha256": value[1]}
            for key, value in FILES.items()
        },
        "scope_guard": (
            "This closes only finite N<=13 for the rank-six nonadjacent "
            "ordinary-parent G2 mode. N>=14 and other bundle coefficients are separate."
        ),
        "source_sha256": hashlib.sha256(
            Path(__file__).read_bytes()
        ).hexdigest().upper(),
    }
    assert report["aggregate"]["literal_triples"] == 36818582
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **report["aggregate"]}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
