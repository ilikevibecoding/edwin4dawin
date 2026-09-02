#!/usr/bin/env python3
"""Fail-closed assembly of all ten selected-edge singleton-g1 branches."""

from __future__ import annotations

import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

from probe_exact_iso_n5_bundle_g1_singleton_ordinary_selected_edge_refined_g1_bernstein import (
    MARKER as PROBE_MARKER,
    cases,
    key,
)
from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_batch_g1_bernstein import (
    branch_key,
    canonical_branches,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
OUTPUT = HERE / "iso_n5_bundle_g1_singleton_ordinary_selected_edge_theorem_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_SELECTED_EDGE_THEOREM_G1_BERNSTEIN"

PROBE_SOURCE = "probe_exact_iso_n5_bundle_g1_singleton_ordinary_selected_edge_refined_g1_bernstein.py"
PROBE_REPORT = "iso_n5_bundle_g1_singleton_ordinary_selected_edge_refined_probe_g1_bernstein_20260830.json"
LEAF_FINITE_SOURCE = "census_exact_iso_n5_bundle_g1_singleton_ordinary_index72_leaf_n14_15_g1_bernstein.py"
LEAF_FINITE_REPORT = "iso_n5_bundle_g1_singleton_ordinary_index72_leaf_n14_15_exact_g1_bernstein_20260830.json"
LEAF_TAIL_SOURCE = "prove_exact_iso_n5_bundle_g1_singleton_ordinary_index72_leaf_n16_plus_g1_bernstein.py"
LEAF_TAIL_REPORT = "iso_n5_bundle_g1_singleton_ordinary_index72_leaf_n16_plus_exact_g1_bernstein_20260830.json"
BATCH_SOURCE = "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_batch_g1_bernstein.py"
SIMPLEX_SOURCE = "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein.py"
S_SOURCE = "assemble_iso_n5_s_all_marked_forests_root.py"
S_REPORT = "iso_n5_s_all_marked_forests_exact_root_20260830.json"
N4_SOURCE = "assemble_iso_all_forest_n4_bundle_induction_root.py"
N4_REPORT = "iso_all_forest_n4_bundle_induction_exact_root_20260829.json"
PAYMENT_SOURCE = "derive_iso_n5_bundle_g1_singleton_ordinary_payment_g1_bernstein.py"
PAYMENT_REPORT = "iso_n5_bundle_g1_singleton_ordinary_payment_exact_g1_bernstein_20260830.json"
PARENT_SOURCE = "derive_iso_n5_bundle_g1_singleton_ordinary_parent_cone_g1_bernstein.py"
PARENT_REPORT = "iso_n5_bundle_g1_singleton_ordinary_parent_cone_exact_g1_bernstein_20260830.json"

EXPECTED_HASHES = {
    PROBE_SOURCE: "1B09ED17299429D3FE8C83608A85BCC16AFA29B7CBACDE4C66C75B90DC13824A",
    PROBE_REPORT: "0A661FA1F1B7FCACF937C873B3B3554B6CC0BA6BBBE035D412CBD2CEBB68D090",
    LEAF_FINITE_SOURCE: "B1CEDFD13DEA4A441A4DD129EEBB15E98FF52238C934FC322D712BDCED4E0E48",
    LEAF_FINITE_REPORT: "6643B765E5E6D94FAAA921B26D1B53C2AA955B7F1F4D85D4FFAB9EF4806009DB",
    LEAF_TAIL_SOURCE: "F8681E84B53BC5724BB5CC564FFEB2A33D2AB615A671BBEBDF12519D7F73050F",
    LEAF_TAIL_REPORT: "CBEBA972A7DE8D0C2FA7D8D91159B37ABB7D9114AEFC1EC855227DA68957EF38",
    S_SOURCE: "E56AA4AD8AF3FE936DAF8354A6D7BAD1BAC5AFDCCD6C4436FB198A0FC76D479E",
    S_REPORT: "E4FDD1215C0924A40E2B6D47BAC9CF5BB54830686AAB6E5F1188D8F25F386CBE",
    N4_SOURCE: "9A11F120B02BD477069A28443B0244B3B592A69F1A2E060A5283B7D4453F6720",
    N4_REPORT: "28682176B3A1402BF115C6294280B979CD418B291809782881998379DDD3131C",
    PAYMENT_SOURCE: "2225C499187485A4F3757802ACB4837EA47A4F168D6C28C723D96F3C7C0E36E4",
    PAYMENT_REPORT: "A8124941D5064C98B25A3330E907CA172A9E13E40FAECD8D3FA342E910683465",
    PARENT_SOURCE: "B8365AD19EB91425B7A7437B87D27E8B5CB98ACCBE17ABB22F79F2996A92F531",
    PARENT_REPORT: "37E9E21521C5564D00A376F22E3C2D568CE8E4D67F8A37DB021C21FE11A2B41F",
}

TARGET_KEYS = {
    70: "111/001/00/LL/0/P/full",
    72: "111/001/00/LL/1/P/full",
    76: "111/001/00/LU/1/P/full",
    82: "111/001/00/UL/1/P/full",
    94: "111/001/00/ZZ/0/P/full",
    96: "111/001/10/LL/0/P/full",
    106: "111/011/00/LL/1/P/full",
    112: "111/100/00/LL/0/P/full",
    124: "111/100/01/LL/0/P/full",
    130: "111/101/10/LL/0/P/full",
}


def sha256(name: str) -> str:
    return hashlib.sha256((HERE / name).read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    for name, expected in EXPECTED_HASHES.items():
        assert sha256(name) == expected, (name, sha256(name), expected)

    branches = canonical_branches()
    assert len(branches) == 136
    assert {
        index: branch_key(branches[index]) for index in sorted(TARGET_KEYS)
    } == TARGET_KEYS

    case_rows = cases()
    assert len(case_rows) == 22
    grouped = defaultdict(list)
    for row in case_rows:
        grouped[row["target_index"]].append(key(row))
    assert set(grouped) == set(TARGET_KEYS)
    assert {index: len(rows) for index, rows in grouped.items()} == {
        70: 3, 72: 2, 76: 1, 82: 1, 94: 1,
        96: 1, 106: 4, 112: 4, 124: 1, 130: 4,
    }

    # Exact zero/positive truth-table exhaustiveness.  F means an unrestricted
    # nonnegative selected excess and therefore requires no split.
    #
    # 70: y=z=0 makes p-v an isolated selected edge, hence xp=0, contrary to P.
    # 72/76/82: p-v plus the distinct unmarked u-v centre forces y>0.
    # 94: xv=0 forces z=0; positive xp then forces y>0.
    # 96: p-v plus the distinct unmarked p-u centre forces z>0.
    # 106: the two selected edges at p force z>0.
    # 112: no further forced selected excess; all x/y zero-positive cells occur.
    # 124: u-v plus the distinct unmarked p-v centre forces y>0.
    # 130: the selected path u-v-p forces y>0.
    expected_states = {
        70: {"FZP", "FPZ", "FPP"},
        72: {"FPZ", "FPP"},
        76: {"FPF"},
        82: {"FPF"},
        94: {"FPZ"},
        96: {"FFP"},
        106: {"ZZP", "ZPP", "PZP", "PPP"},
        112: {"ZZF", "ZPF", "PZF", "PPF"},
        124: {"FPF"},
        130: {"ZPZ", "ZPP", "PPZ", "PPP"},
    }
    actual_states = {
        index: {"".join(row["states"]) for row in case_rows if row["target_index"] == index}
        for index in TARGET_KEYS
    }
    assert actual_states == expected_states
    leaf_row = next(
        row for row in case_rows
        if row["target_index"] == 72 and row["states"] == ("F", "P", "Z")
    )
    assert leaf_row["positive_parent_interval"] == "lower"
    positive_z_row = next(
        row for row in case_rows
        if row["target_index"] == 72 and row["states"] == ("F", "P", "P")
    )
    assert positive_z_row["positive_parent_interval"] == "full"

    probe = load(PROBE_REPORT)
    assert probe["marker"] == PROBE_MARKER
    assert probe["case_count"] == 22 and probe["passed"] == 21 and probe["failed"] == 1
    assert [row["case"] for row in probe["rows"]] == [key(row) for row in case_rows]
    failed_probe_rows = [row for row in probe["rows"] if not row["passed"]]
    assert [row["case"] for row in failed_probe_rows] == [key(leaf_row)]
    assert all(row["passed"] for row in probe["rows"] if row is not failed_probe_rows[0])
    assert probe["source_sha256"] == EXPECTED_HASHES[PROBE_SOURCE]
    assert probe["dependencies_sha256"][SIMPLEX_SOURCE] == sha256(SIMPLEX_SOURCE)
    assert probe["dependencies_sha256"][PARENT_SOURCE] == EXPECTED_HASHES[PARENT_SOURCE]

    finite = load(LEAF_FINITE_REPORT)
    assert finite["marker"] == (
        "PASS_EXACT_FINITE_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_"
        "INDEX72_LEAF_N14_15_G1_BERNSTEIN"
    )
    assert finite["orders"] == [14, 15]
    assert finite["classified_cells"] == 3900
    assert finite["global_minimum"]["value"] == 498153
    assert finite["source_sha256"] == EXPECTED_HASHES[LEAF_FINITE_SOURCE]

    tail = load(LEAF_TAIL_REPORT)
    assert tail["marker"] == (
        "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_"
        "INDEX72_LEAF_N16_PLUS_G1_BERNSTEIN"
    )
    assert tail["order_base"] == 16
    assert tail["branch"] == key(leaf_row)
    assert tail["negative_coefficients"] == 0
    assert tail["minimum_coefficient"] == "31"
    assert tail["source_sha256"] == EXPECTED_HASHES[LEAF_TAIL_SOURCE]

    universal_s = load(S_REPORT)
    assert universal_s["marker"] == "PASS_EXACT_ISO_N5_S_ALL_MARKED_FORESTS_ROOT"
    assert universal_s["source_sha256"] == EXPECTED_HASHES[S_SOURCE]
    universal_n4 = load(N4_REPORT)
    assert universal_n4["marker"] == "PASS_EXACT_ALL_MARKED_FOREST_N4_BUNDLE_INDUCTION_ROOT"
    assert universal_n4["source_sha256"] == EXPECTED_HASHES[N4_SOURCE]
    payment = load(PAYMENT_REPORT)
    assert payment["marker"] == "DERIVED_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_PAYMENT_G1_BERNSTEIN"
    assert payment["source_sha256"] == EXPECTED_HASHES[PAYMENT_SOURCE]
    parent = load(PARENT_REPORT)
    assert parent["marker"] == "DERIVED_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_PARENT_CONE_G1_BERNSTEIN"
    assert parent["source_sha256"] == EXPECTED_HASHES[PARENT_SOURCE]

    passing_elevations = Counter(
        row["attempts"][-1]["elevation"] for row in probe["rows"] if row["passed"]
    )
    report = {
        "marker": MARKER,
        "theorem": (
            "Raw singleton-ordinary rank-five g1 is nonnegative for every "
            "n>=14 forest cell in all ten selected-edge canonical rows."
        ),
        "canonical_target_count": len(TARGET_KEYS),
        "canonical_targets": TARGET_KEYS,
        "refined_cell_count": len(case_rows),
        "direct_exact_cone_cells": 21,
        "index72_leaf_cell": {
            "finite_orders": [14, 15],
            "finite_classified_cells": finite["classified_cells"],
            "finite_minimum": finite["global_minimum"]["value"],
            "tail_order_base": tail["order_base"],
            "tail_coefficients": tail["statistics"]["homogeneous_coefficients"],
            "tail_minimum_coefficient": tail["minimum_coefficient"],
        },
        "logic": (
            "On 21 refined cells the exact strong-parent-cone numerator is "
            "nonnegative and its denominator is positive; universal S(C)>=0 "
            "and N4(D)>=0 then pay raw g1.  The remaining index72 p-leaf "
            "cell is checked directly in orders 14,15 and has its own exact "
            "strong-cone tail for n>=16."
        ),
        "passing_elevation_histogram": dict(sorted(passing_elevations.items())),
        "state_truth_table": {str(index): sorted(states) for index, states in expected_states.items()},
        "structural_exhaustiveness_checked": True,
        "scope": (
            "Exact raw-g1 all-order n>=14 theorem for the ten displayed "
            "selected-edge singleton-ordinary canonical branches only. No other mode, "
            "all-N5, or Problem 993 claim."
        ),
        "pinned_artifacts_sha256": EXPECTED_HASHES,
        "dependencies_sha256": {
            name: sha256(name) for name in (BATCH_SOURCE, SIMPLEX_SOURCE)
        },
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "output": OUTPUT.name,
        "canonical_target_count": len(TARGET_KEYS),
        "refined_cell_count": len(case_rows),
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
