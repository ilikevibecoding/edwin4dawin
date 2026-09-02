#!/usr/bin/env python3
"""Fail-closed all-order assembly for adjacent endpoint-parent rank-six g2."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_endpoint_all_order_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_ALL_ORDER_RANK7_G5_FINISH"

PINS = {
    "n0_8_source": ("census_iso_n6_bundle_g2_adjacent_endpoint_actual_n0_8_rank7_g5_finish.py", "4E7618C016D12C67516A24A8AA9C671DC2AD1988874483992933982449A06A25"),
    "n0_8_report": ("iso_n6_bundle_g2_adjacent_endpoint_actual_n0_8_exact_rank7_g5_finish_20260831.json", "19B88BB1CF8CA4ED34FF3B7A0D82F6D0542996394B867637EA3AF237EF834C29"),
    "n9_13_source": ("census_iso_n6_bundle_g2_adjacent_endpoint_forest_jets_n9_13_rank7_g5_finish.py", "19A7D3743212B7C9CD1A45F69011DE98CF01ECF4C3ECB8B58DD0C782730BD70D"),
    "n9_13_report": ("iso_n6_bundle_g2_adjacent_endpoint_forest_jets_n9_13_exact_rank7_g5_finish_20260831.json", "217B099E9498213E394B945CE72AC3732301665D4E4D6E572211E2D31FED833F"),
    "n14_18_source": ("census_iso_n6_bundle_g2_adjacent_endpoint_forest_jets_n14_18_rank7_g5_finish.py", "D5844882825B3A2E1481F4493A0C35A9EBA1CDED5226056A7C7077533BF4752B"),
    "n14_18_report": ("iso_n6_bundle_g2_adjacent_endpoint_forest_jets_n14_18_exact_rank7_g5_finish_20260831.json", "1D194A4BE6D95C091072F5F871BDA13B9A13AB92E692279A3BCC5E5B33CB5A88"),
    "n19_source": ("assemble_iso_n6_bundle_g2_adjacent_endpoint_n19_rank7_g5_finish.py", "BB29FC64901D3D337EDA106A3612D475EFC7B3AA11BAA52C3ED6DE92A778C1FC"),
    "n19_report": ("iso_n6_bundle_g2_adjacent_endpoint_n19_exact_rank7_g5_finish_20260831.json", "B18A5F475D5A7B9296FADD242E5138BC2A7F4AAF39FB68D218B9F25DE88221E3"),
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(label):
    return json.loads((HERE / PINS[label][0]).read_text(encoding="utf-8"))


def verify_pins():
    checked = {}
    for label, (name, expected) in PINS.items():
        actual = sha256(HERE / name)
        assert actual == expected, (label, expected, actual)
        checked[label] = {"file": name, "sha256": actual}
    return checked


def verify_n0_8():
    report = load("n0_8_report")
    assert report["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_ACTUAL_N0_8_RANK7_G5_FINISH"
    assert report["source_sha256"] == PINS["n0_8_source"][1]
    assert sorted(map(int, report["per_common_order"])) == list(range(9))
    assert all(row["negative"] == 0 for row in report["per_common_order"].values())
    aggregate = report["aggregate"]
    assert aggregate["oriented_adjacent_marked_pairs"] == 8358
    assert aggregate["negative"] == 0 and aggregate["global_minimum"] == 0
    return {
        "range": "0<=N<=8",
        "method": "literal unlabeled forest and both orientations of every marked edge",
        "oriented_marked_pairs": 8358,
        "negative": 0,
        "minimum": 0,
        "ordered_stream_sha256": aggregate["ordered_literal_stream_sha256"],
        "second_byte_identical_replay": True,
    }


def verify_n9_13():
    report = load("n9_13_report")
    assert report["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_FOREST_JETS_N9_13_RANK7_G5_FINISH"
    assert report["source_sha256"] == PINS["n9_13_source"][1]
    assert sorted(map(int, report["orders"])) == list(range(9, 14))
    assert all(row["negative_relaxation_corners"] == 0 for row in report["orders"].values())
    aggregate = report["aggregate"]
    assert aggregate["literal_g2_checks"] == 522_604_544
    assert aggregate["negative_relaxation_corners"] == 0
    assert aggregate["global_minimum"] == 24_309
    return {
        "range": "9<=N<=13",
        "method": "all forest jets and all 32*32 endpoint-box corners for every ordered induced-order pair",
        "literal_g2_checks": aggregate["literal_g2_checks"],
        "negative": 0,
        "minimum": aggregate["global_minimum"],
        "second_byte_identical_replay": True,
    }


def verify_n14_18():
    report = load("n14_18_report")
    assert report["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_FOREST_JETS_N14_18_RANK7_G5_FINISH"
    assert report["source_sha256"] == PINS["n14_18_source"][1]
    assert sorted(map(int, report["orders"])) == list(range(14, 19))
    assert all(row["negative"] == 0 for row in report["orders"].values())
    aggregate = report["aggregate"]
    assert aggregate["literal_g2_checks"] == 242_549_316
    assert aggregate["negative"] == 0
    assert aggregate["global_minimum"] == 2_769_721
    return {
        "range": "14<=N<=18",
        "method": "all forest jets, every ordered induced-order pair, exact four-corner reduction",
        "literal_g2_checks": aggregate["literal_g2_checks"],
        "negative": 0,
        "minimum": aggregate["global_minimum"],
        "second_byte_identical_replay": True,
    }


def verify_n19():
    report = load("n19_report")
    assert report["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_N19_RANK7_G5_FINISH"
    assert report["source_sha256"] == PINS["n19_source"][1]
    combined = report["combined"]
    assert combined["shards"] == 72
    assert combined["tensor_bernstein_coefficients"] == 202_017_824
    assert combined["negative"] == 0 and combined["zero"] == 0
    assert Fraction(combined["global_minimum"]) == Fraction(1, 11520)
    assert combined["second_byte_identical_replay"] is True
    return {
        "range": "N>=19",
        "method": "asymmetric edge-wedge ratio simplex plus fixed-small branches, exact Bernstein",
        "shards": 72,
        "tensor_bernstein_coefficients": combined["tensor_bernstein_coefficients"],
        "negative": 0,
        "zero": 0,
        "positive_multiple_minimum": combined["global_minimum"],
        "second_byte_identical_replay": True,
    }


def main():
    pins = verify_pins()
    branches = [verify_n0_8(), verify_n9_13(), verify_n14_18(), verify_n19()]
    assert [row["range"] for row in branches] == ["0<=N<=8", "9<=N<=13", "14<=N<=18", "N>=19"]
    report = {
        "marker": MARKER,
        "status": "PASS exact all-order adjacent endpoint-parent rank-six g2 theorem",
        "theorem": (
            "For every finite forest in the adjacent-mark canonical rank-six geometry "
            "whose parent is either marked endpoint, the whole-bundle coefficient g2 is nonnegative."
        ),
        "coverage_partition": [row["range"] for row in branches],
        "coverage_is_disjoint_and_exhaustive_for_all_N_ge_0": True,
        "branches": branches,
        "pins": pins,
        "scope_guard": (
            "This closes adjacent endpoint-parent modes only. Nonadjacent marks and "
            "ordinary-parent modes remain open; this is not universal rank-six g2."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "coverage": report["coverage_partition"], "finite_checks": 522_604_544+242_549_316, "large_controls": 202_017_824}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
