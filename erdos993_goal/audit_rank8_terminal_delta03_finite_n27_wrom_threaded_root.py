#!/usr/bin/env python3
"""Independent bounded audit of the complete order-27 threaded WROM census."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from audit_rank8_terminal_delta03_finite_n23 import (
    KNOWN_FREE_TREE_COUNTS,
    adjacency_from_layout,
    deltas03,
    generate_wrom,
    path_minima,
)


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json"
ORDER = 27
TREES = 751_065_460
ROOTS = TREES * ORDER

# Filled only after the non-overwriting primary run completes.
PRIMARY_EXPECTED_SHA256 = "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787"

EXPECTED = {
    "verify_rank8_terminal_delta03_finite_wrom_threaded_root.rs":
        "D72084ED90E55501B881179DDA73148D64FCB29431102ADF5674E018380D2F89",
    "verify_rank8_terminal_delta03_finite_wrom_threaded_root.exe":
        "DC711B103514AF1DA5B303C8234F89A06FC61C19A5153D717164BF879AB37C47",
    "verify_rank8_terminal_delta5_finite.rs":
        "2C76D7E7C9312331F799AB252FC806056D0201BE25AFA18446B218515F2EE2D6",
    "run_rank8_terminal_delta03_finite_wrom_threaded_n27_root.py":
        "96991244BFB88BF8F18E2F5B3D5FE7153265C464323C3345DFD99E8551F02939",
    "audit_rank8_terminal_delta03_finite_wrom_threaded_equivalence_root.py":
        "F74D0637C41B874A53F503C8AD716BAE9CCAFA803CB3B23DD575A2A4E3EBB5A9",
    "rank8_terminal_delta03_finite_wrom_threaded_equivalence_root_20260823.json":
        "C4B6B3134AC23F5D9C1C3E8C2EA16118CC23E30B748274D14BD62718ED8EC29A",
    "audit_rank8_terminal_delta03_finite_n23.py":
        "F026F75B38DF3647ECF6DE04F479DE9CB006552925E2772AD7CB32135B4CEFA3",
    "rank8_terminal_delta03_finite_n23_independent_audit_exact_20260820.json":
        "6161599896A4E9991B9D6E0B131D4075EC3C4230B9DB0A038CAF6108747427F4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def i128_audit() -> dict:
    c7 = math.comb(ORDER, 7)
    c8 = math.comb(ORDER, 8)
    h6 = math.comb(ORDER - 1, 6)
    h7 = math.comb(ORDER - 1, 7)
    # The census evaluates t=1..4. Coefficientwise domination by an empty
    # graph gives these deliberately loose upper bounds at t=4.
    p7 = math.comb(ORDER + 4, 7) + h6
    p8 = math.comb(ORDER + 4, 8) + h7
    p9_open = math.comb(ORDER + 4, 9)
    term1 = 8 * c7 * h6 * (16 * p8 * p8 + p7 * p8 + 18 * p7 * p9_open)
    term2 = 8 * h6 * p7 * (16 * c8 * c8 + c7 * c8)
    term3 = 9 * c7 * p7 * (14 * h7 * h7 + h6 * h7)
    residual_bound = term1 + term2 + term3
    delta3_bound = 8 * residual_bound
    i128_max = 2**127 - 1
    assert delta3_bound < i128_max
    assert 2**ORDER < i128_max
    return {
        "coefficient_bounds": {"c7": c7, "c8": c8, "h6": h6, "h7": h7},
        "smoothed_bounds": {"p7": p7, "p8": p8, "p9_open": p9_open},
        "absolute_residual_bound": residual_bound,
        "absolute_delta3_bound": delta3_bound,
        "delta3_bound_bits": delta3_bound.bit_length(),
        "i128_positive_bits": 127,
        "integer_margin_floor": i128_max // delta3_bound,
    }


def small_generator_replay() -> dict:
    counts = {}
    for order in range(1, 14):
        layouts = generate_wrom(order)
        assert len(layouts) == KNOWN_FREE_TREE_COUNTS[order]
        assert len(set(layouts)) == len(layouts)
        counts[str(order)] = len(layouts)
    return counts


def witness_audit(primary: dict) -> dict:
    minima = [int(value) for value in primary["acceptance"]["global_minima"]]
    witnesses = primary["acceptance"]["minimum_witnesses"]
    assert len(witnesses) == 4
    rebuilt = []
    for rank, witness in enumerate(witnesses):
        layout = [int(value) for value in witness["layout"]]
        root = int(witness["root"])
        assert len(layout) == ORDER and 0 <= root < ORDER
        values = deltas03(adjacency_from_layout(layout), root)
        assert values[rank] == minima[rank]
        rebuilt.append({
            "rank": rank,
            "layout": layout,
            "root": root,
            "all_four_values": values,
            "reported_global_minimum": minima[rank],
        })

    expected_path_minima, expected_path_roots = path_minima(ORDER)
    assert expected_path_roots == [0, 0, 0, 0]
    assert minima == expected_path_minima
    return {
        "minimum_witnesses_rebuilt_by_generic_tree_DP": rebuilt,
        "path_endpoint": {
            "layout": list(range(ORDER)),
            "root": 0,
            "values": expected_path_minima,
            "matches_every_global_minimum": True,
        },
    }


def main() -> None:
    assert len(PRIMARY_EXPECTED_SHA256) == 64 and "TO_FILL" not in PRIMARY_EXPECTED_SHA256
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    assert sha256(PRIMARY) == PRIMARY_EXPECTED_SHA256
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27"
    assert primary["scope"] == {
        "core_order": ORDER,
        "free_trees": TREES,
        "all_rooted_pairs": ROOTS,
        "ranks": [0, 1, 2, 3],
        "claim": "finite exact order-27 census only",
    }
    acceptance = primary["acceptance"]
    assert acceptance["active_rooted_pairs"] == ROOTS
    assert acceptance["negative_counts"] == [0, 0, 0, 0]
    assert acceptance["active_minima"] == acceptance["global_minima"]
    assert all(int(value) > 0 for value in acceptance["global_minima"])
    assert primary["source_sha256"] == EXPECTED[
        "run_rank8_terminal_delta03_finite_wrom_threaded_n27_root.py"
    ]

    coverage = primary["threaded_coverage"]
    ranges = coverage["worker_ranges"]
    assert coverage["threads"] == len(ranges) == 6
    assert coverage["exact_A000055_total"] == TREES
    assert ranges[0]["start"] == 0 and ranges[-1]["stop"] == TREES
    assert sum(row["processed"] for row in ranges) == TREES
    assert sum(row["roots"] for row in ranges) == ROOTS
    assert sum(row["active"] for row in ranges) == ROOTS
    for index, row in enumerate(ranges):
        assert row["worker"] == index
        assert row["seen_prefix"] == row["stop"]
        assert row["processed"] == row["stop"] - row["start"]
        assert row["roots"] == row["active"] == ORDER * row["processed"]
        if index:
            assert ranges[index - 1]["stop"] == row["start"]

    equivalence = json.loads(
        (ROOT / "rank8_terminal_delta03_finite_wrom_threaded_equivalence_root_20260823.json")
        .read_text(encoding="utf-8")
    )
    assert equivalence["status"] == "PASS_EXACT_RANK8_DELTA03_THREADED_WROM_SERIAL_EQUIVALENCE_N23"
    assert all(equivalence["comparisons"].values())

    report = {
        "schema": "rank8-terminal-delta03-finite-n27-wrom-threaded-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27",
        "scope": primary["scope"],
        "primary_report": PRIMARY.name,
        "primary_report_sha256": PRIMARY_EXPECTED_SHA256,
        "immutable_inputs": actual,
        "engine_equivalence": equivalence["status"],
        "small_WROM_generator_counts": small_generator_replay(),
        "threaded_no_gap_coverage": {
            "worker_ranges": ranges,
            "adjacent_no_gap_no_overlap": True,
            "trees": TREES,
            "roots": ROOTS,
        },
        "i128_safety": i128_audit(),
        "literal_witness_replay": witness_audit(primary),
        "audit_source_sha256": sha256(Path(__file__)),
        "limitations": [
            "the audit does not repeat the 751,065,460-tree census",
            "this is a finite order-27 theorem and proves no order at least 28",
        ],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("SOURCE", report["audit_source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
