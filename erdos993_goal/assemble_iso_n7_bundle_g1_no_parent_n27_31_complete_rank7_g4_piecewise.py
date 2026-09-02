#!/usr/bin/env python3
"""Fail-closed complete assembly for high-degree G1 orders 27..31."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_no_parent_n27_31_complete_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N27_31_COMPLETE_"
    "RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_no_parent_n27_31_degree2_subdivision_batch_rank7_g4_piecewise.py":
        "94AB169428838AB1E54A53202DE27881152AFB9D2538E70C3E5FE721FDF023C9",
    "iso_n7_bundle_g1_no_parent_n27_31_degree2_subdivision_batch_exact_rank7_g4_piecewise_20260831.json":
        "84F7B9D4F29004D29B3618F9FF0DCC11A1796F8D0EA1965C226647492F891775",
    "prove_iso_n7_bundle_g1_no_parent_n27_31_degree2free_core_leaf_batch_rank7_g4_piecewise.py":
        "0EC3C28AA33174F23611AA31E96F81D4CB7424BD97268D8FBBFDE806CF597926",
    "iso_n7_bundle_g1_no_parent_n27_31_degree2free_core_leaf_batch_exact_rank7_g4_piecewise_20260831.json":
        "E6986EDF9E64C9F6F9786FAEF4D287CA5268A296473E4CA4986886C16844F114",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name
    degree2 = json.loads((
        HERE / "iso_n7_bundle_g1_no_parent_n27_31_degree2_subdivision_batch_"
        "exact_rank7_g4_piecewise_20260831.json"
    ).read_text(encoding="utf-8"))
    degree2free = json.loads((
        HERE / "iso_n7_bundle_g1_no_parent_n27_31_degree2free_core_leaf_batch_"
        "exact_rank7_g4_piecewise_20260831.json"
    ).read_text(encoding="utf-8"))
    assert degree2["status"] == degree2free["status"] == "proved exact"
    assert degree2[
        "coverage_gap_within_stated_degree2_orders_27_31_scope"
    ] is None
    assert degree2free[
        "coverage_gap_within_stated_degree2free_orders_27_31_scope"
    ] is None
    assert degree2["final_order31_all_tree_lower_bound_after_combining_degree2free"] == (
        "29401386223/14"
    )

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every order m in 27..31 and every connected m-vertex tree "
            "W with maximum degree at least four and at least three "
            "branching vertices, the exact rank-seven common0/sum0 "
            "no-parent coefficient G1 is strictly positive."
        ),
        "exhaustive_partition": {
            "degree_two": {
                "marker": degree2["marker"],
                "orders": [27, 31],
                "coverage_gap": None,
            },
            "degree_two_free": {
                "marker": degree2free["marker"],
                "orders": [27, 31],
                "coverage_gap": None,
            },
            "exhaustive": (
                "At each order, every actual tree either contains a "
                "degree-two vertex or contains none."
            ),
        },
        "all_tree_lower_bounds": {
            order: degree2["sequential_payment"][order]["all_tree_lower_bound"]
            for order in map(str, range(27, 32))
        },
        "coverage_gap_within_stated_actual_orders_27_31_scope": None,
        "scope_guard": (
            "Rank-seven G1 only, actual connected trees, common0/sum0 "
            "no-parent only, orders 27..31, maximum degree>=4, and at "
            "least three branching vertices."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "orders": [27, 31],
        "all_actual_trees_in_scope": "proved exact",
        "coverage_gap_within_stated_actual_orders_27_31_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
