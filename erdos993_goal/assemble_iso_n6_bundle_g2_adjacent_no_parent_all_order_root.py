#!/usr/bin/env python3
"""Fail-closed all-order assembly for adjacent no-parent rank-six g2."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_no_parent_all_order_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_NO_PARENT_ALL_ORDER_ROOT"

PINS = {
    "n0_8_source": (
        "census_iso_n6_bundle_g2_adjacent_actual_n0_8_root.py",
        "E9313516252B730839F2522EA0AB0718E591F4CD97213FD12ABB5A7E037B8375",
    ),
    "n0_8_report": (
        "iso_n6_bundle_g2_adjacent_actual_n0_8_exact_root_20260831.json",
        "CFE871011DB0A3D59317B0731EF93FA5F004EF502AB4EA68B3EF5CEEFDBE1258",
    ),
    "n0_13_box_source": (
        "census_iso_n6_bundle_g2_adjacent_forest_jets_n0_13_box_root.py",
        "C661BEF4782E7AC02FE02E7890F54B6178F25FB4506D97BB665F55301C6739B1",
    ),
    "n0_13_box_report": (
        "iso_n6_bundle_g2_adjacent_forest_jets_n0_13_box_exact_root_20260831.json",
        "B7E4AE81E727D45F082E9F47ABB4BEA3A28BE4E92F37F455856EBC560053CEB5",
    ),
    "n14_18_source": (
        "census_iso_n6_bundle_g2_adjacent_forest_jets_n14_18_root.py",
        "94F0B3191CB1FA6DDD38FAA3BA4C81E589DFC38FC0BC9217FF601E86C9428CDD",
    ),
    "n14_18_report": (
        "iso_n6_bundle_g2_adjacent_forest_jets_n14_18_exact_root_20260831.json",
        "F5DBC9C5E75ACA132C1A149A683D9615D8283A385BC2900758199A947BF16255",
    ),
    "n19_source": (
        "assemble_iso_n6_bundle_g2_adjacent_no_parent_n19_root.py",
        "98BBEEF3227DC1E4EE05E23D03E20037CE55E119356A02AA61B1C4FB5AF52C51",
    ),
    "n19_report": (
        "iso_n6_bundle_g2_adjacent_no_parent_n19_exact_root_20260831.json",
        "F0A336F022748A26631F6705AB9FF723B109FCAA7A2B961B96B56FBD92C2D3EC",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def verify_pins() -> dict[str, dict[str, str]]:
    checked = {}
    for label, (name, expected) in PINS.items():
        actual = sha256(HERE / name)
        assert actual == expected, (label, expected, actual)
        checked[label] = {"file": name, "sha256": actual}
    return checked


def verify_n0_8() -> dict[str, object]:
    report = load(PINS["n0_8_report"][0])
    assert report["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ACTUAL_N0_8_ROOT"
    assert report["source_sha256"] == PINS["n0_8_source"][1]
    assert sorted(map(int, report["per_common_order"])) == list(range(9))
    assert all(row["negative"] == 0 for row in report["per_common_order"].values())
    aggregate = report["aggregate"]
    assert aggregate["adjacent_marked_pairs"] == 4179
    assert aggregate["negative"] == 0
    assert aggregate["global_minimum"] == 0
    return {
        "range": "0<=N<=8",
        "method": "literal unlabeled marked-forest census",
        "adjacent_marked_pairs": aggregate["adjacent_marked_pairs"],
        "negative": 0,
        "minimum": aggregate["global_minimum"],
        "ordered_literal_stream_sha256": aggregate["ordered_literal_stream_sha256"],
    }


def verify_n9_13() -> dict[str, object]:
    report = load(PINS["n0_13_box_report"][0])
    assert report["marker"] == "OBSTRUCTION_ISO_N6_BUNDLE_G2_ADJACENT_FOREST_JETS_N0_13_BOX_ROOT"
    assert report["source_sha256"] == PINS["n0_13_box_source"][1]
    selected = {str(n): report["orders"][str(n)] for n in range(9, 14)}
    assert all(row["negative_relaxation_corners"] == 0 for row in selected.values())
    assert all(row["minimum"] > 0 for row in selected.values())
    checks = sum(row["literal_g2_checks"] for row in selected.values())
    assert checks == 279_957_504
    minimum = min(row["minimum"] for row in selected.values())
    assert minimum == 25_483
    return {
        "range": "9<=N<=13",
        "method": "all forest i0..i7 jets and all 32*32 endpoint-box corners",
        "literal_g2_checks": checks,
        "negative": 0,
        "minimum": minimum,
        "scope_note": (
            "The pinned report's obstruction marker comes only from N<=8; "
            "those orders are replaced by the literal coupled census."
        ),
        "per_order_stream_sha256": {
            n: row["ordered_jet_minimum_stream_sha256"] for n, row in selected.items()
        },
    }


def verify_n14_18() -> dict[str, object]:
    report = load(PINS["n14_18_report"][0])
    assert report["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_FOREST_JETS_N14_18_ROOT"
    assert report["source_sha256"] == PINS["n14_18_source"][1]
    assert sorted(map(int, report["orders"])) == list(range(14, 19))
    assert all(row["negative"] == 0 for row in report["orders"].values())
    aggregate = report["aggregate"]
    assert aggregate["literal_g2_checks"] == 127_775_280
    assert aggregate["negative"] == 0
    assert aggregate["global_minimum"] == 2_737_380
    return {
        "range": "14<=N<=18",
        "method": "all forest i0..i7 jets and exact four-corner reduction",
        "literal_g2_checks": aggregate["literal_g2_checks"],
        "negative": 0,
        "minimum": aggregate["global_minimum"],
    }


def verify_n19() -> dict[str, object]:
    report = load(PINS["n19_report"][0])
    assert report["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_NO_PARENT_N19_ROOT"
    assert report["source_sha256"] == PINS["n19_source"][1]
    combined = report["combined"]
    assert combined["shards"] == 36
    assert combined["tensor_bernstein_coefficients"] == 101_008_912
    assert combined["negative"] == 0 and combined["zero"] == 0
    assert Fraction(combined["global_minimum"]) == Fraction(1, 11520)
    assert report["coverage"]["exhaustive"] is True
    return {
        "range": "N>=19",
        "method": "edge-wedge ratio simplex, all induced orders, exact Bernstein",
        "shards": combined["shards"],
        "tensor_bernstein_coefficients": combined["tensor_bernstein_coefficients"],
        "negative": 0,
        "zero": 0,
        "positive_multiple_minimum": combined["global_minimum"],
    }


def main() -> None:
    pins = verify_pins()
    branches = [verify_n0_8(), verify_n9_13(), verify_n14_18(), verify_n19()]
    report = {
        "marker": MARKER,
        "status": "PASS exact all-order adjacent no-parent rank-six g2 theorem",
        "theorem": (
            "For every finite forest in the adjacent-mark canonical no-parent "
            "rank-six whole-bundle geometry, the coefficient g2 is nonnegative."
        ),
        "coverage_partition": [branch["range"] for branch in branches],
        "coverage_is_disjoint_and_exhaustive_for_all_N_ge_0": True,
        "branches": branches,
        "pins": pins,
        "scope_guard": (
            "This closes the adjacent no-parent geometry only. Nonadjacent marks "
            "and parent-mode transfer remain before universal rank-six g2."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_partition": report["coverage_partition"],
        "literal_finite_checks": branches[1]["literal_g2_checks"] + branches[2]["literal_g2_checks"],
        "large_tensor_bernstein_coefficients": branches[3]["tensor_bernstein_coefficients"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
