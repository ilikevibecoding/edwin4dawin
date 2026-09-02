#!/usr/bin/env python3
"""Exact transfer/Newton reduction for path:outer_spine_internal."""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path

import sympy as sp

import certify_rank8_delta03_e5_five_cubic_path_inner_spine_internal_newton_reduction_agent as reduction


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_outer_spine_internal_"
    "newton_reduction_exact_agent_20260825.json"
)
EXPECTED = {
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_five_cubic_path_inner_spine_internal_newton_reduction_agent.py":
        "BE054D95258DBBB2B81F9848B70849887B4C0FFEFD33F77673C2DB6494DB2A76",
    "rank8_delta03_e5_five_cubic_path_inner_spine_internal_newton_reduction_exact_agent_20260825.json":
        "1F1466B78B327DC06255B21E09765DCBA7B8AF226342FDE2EC1EC3D69861810E",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    left_symbol, right_symbol = sp.symbols("LEFT RIGHT")
    transfer_rows = []
    literal_checks = 0
    for polynomial, initial_cap, maximum_selected in (
        ("core", 8, 6),
        ("root_deleted", 7, 5),
    ):
        for selected in range(maximum_selected + 1):
            cap = initial_cap - selected
            minimum = cap - 1
            for rank in range(cap + 1):
                assert sp.expand(
                    reduction.pair_count(left_symbol + 1, right_symbol, rank)
                    - reduction.pair_count(left_symbol, right_symbol + 1, rank)
                ) == 0
            for left_value in range(minimum, minimum + 9):
                for right_value in range(minimum, minimum + 9):
                    for rank in range(cap + 1):
                        assert reduction.literal_pair(
                            left_value + 1, right_value, rank
                        ) == reduction.literal_pair(
                            left_value, right_value + 1, rank
                        )
                        literal_checks += 1
            transfer_rows.append({
                "polynomial": polynomial,
                "selected_vertices": selected,
                "rank_cap": cap,
                "minimum_path_order": minimum,
            })

    guards = []
    for root, inner, center, outer, right_inner, right_outer in (
        itertools.product(range(2), repeat=6)
    ):
        selected = root + inner + center + outer + right_inner + right_outer
        cap = 8 - selected
        orders = {
            "selected_outer_spine_inner_gap": 7 - root - inner,
            "selected_outer_spine_outer_gap": 7 - root - outer,
            "center_pendant": 7 - center,
            "left_inner_pendant": 7 - inner,
            "left_center_inner_spine": 8 - inner - center,
            "left_outer_pendant0": 7 - outer,
            "left_outer_pendant1": 7 - outer,
            "right_center_inner_spine": 8 - center - right_inner,
            "right_inner_pendant": 7 - right_inner,
            "right_inner_outer_spine": 8 - right_inner - right_outer,
            "right_outer_pendant0": 7 - right_outer,
            "right_outer_pendant1": 7 - right_outer,
        }
        assert min(orders.values()) >= cap - 1
        guards.append({
            "polynomial": "core",
            "selected_state": [
                root, inner, center, outer, right_inner, right_outer
            ],
            "rank_cap": cap,
            "minimum_long_path_orders": orders,
        })
    for inner, center, outer, right_inner, right_outer in (
        itertools.product(range(2), repeat=5)
    ):
        selected = inner + center + outer + right_inner + right_outer
        cap = 7 - selected
        orders = {
            "inner_gap_after_root_deletion": 7 - inner,
            "outer_gap_after_root_deletion": 7 - outer,
            "center_pendant": 7 - center,
            "left_inner_pendant": 7 - inner,
            "left_center_inner_spine": 8 - inner - center,
            "left_outer_pendant0": 7 - outer,
            "left_outer_pendant1": 7 - outer,
            "right_center_inner_spine": 8 - center - right_inner,
            "right_inner_pendant": 7 - right_inner,
            "right_inner_outer_spine": 8 - right_inner - right_outer,
            "right_outer_pendant0": 7 - right_outer,
            "right_outer_pendant1": 7 - right_outer,
        }
        assert min(orders.values()) >= cap - 1
        guards.append({
            "polynomial": "root_deleted",
            "selected_state": [
                inner, center, outer, right_inner, right_outer
            ],
            "rank_cap": cap,
            "minimum_long_path_orders": orders,
        })

    pendant = [(value, value == 7) for value in range(1, 8)]
    spine = [(value, value == 8) for value in range(1, 9)]
    gap = [(value, value == 7) for value in range(0, 8)]
    pendant_pairs = list(itertools.combinations_with_replacement(pendant, 2))
    selected_side_rows = [
        (center_leaf, inner_leaf, center_inner, low, high)
        for center_leaf in pendant
        for inner_leaf in pendant
        for center_inner in spine
        for low, high in pendant_pairs
    ]
    opposite_rows = [
        (center_inner, inner_leaf, inner_outer, low, high)
        for center_inner in spine
        for inner_leaf in pendant
        for inner_outer in spine
        for low, high in pendant_pairs
    ]
    assert len(selected_side_rows) == 10_976
    assert len(opposite_rows) == 12_544
    patterns = reduction.convolve(
        reduction.distribution(selected_side_rows),
        reduction.distribution(opposite_rows),
        reduction.distribution([(value,) for value in gap]),
        reduction.distribution([(value,) for value in gap]),
    )

    counts: Counter[str] = Counter()
    orders: Counter[int] = Counter()
    for (stored, long_count), multiplicity in patterns.items():
        order = 3 + stored
        if long_count == 0:
            counts["all_short"] += multiplicity
            orders[order] += multiplicity
            counts["order27"] += multiplicity * (order == 27)
            counts["finite"] += multiplicity * (order >= 28)
        elif long_count == 12:
            counts["all_long"] += multiplicity
        else:
            counts["mixed"] += multiplicity
    counts["total"] = sum(patterns.values())
    counts["rays"] = counts["mixed"] + counts["all_long"]
    assert counts == Counter(
        total=8_811_708_416,
        all_short=1_600_967_592,
        finite=1_597_435_864,
        order27=1_513_615,
        mixed=7_210_740_823,
        all_long=1,
        rays=7_210_740_824,
    )

    partition = json.loads(
        (ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json")
        .read_text(encoding="utf-8")
    )
    orbit = next(
        row for row in partition["root_location_partitions"]
        if row["root_location_orbit"] == "five_cubic_path:outer_spine_internal"
    )
    assert orbit["stabilizer_order"] == 4
    assert orbit["coordinate_count"] == 12
    assert orbit["coordinate_type_counts"] == {
        "pendant": 7,
        "spine": 3,
        "spine_root_gap": 2,
    }
    assert orbit["coordinate_patterns"] == counts["total"]
    assert orbit["all_short_literal_patterns"] == counts["all_short"]
    assert orbit["all_short_patterns_order27"] == counts["order27"]
    assert orbit["all_short_patterns_n28_plus"] == counts["finite"]
    assert orbit["mixed_long_short_patterns"] == counts["mixed"]
    assert orbit["all_long_patterns"] == counts["all_long"] == 1
    assert {
        int(key): value
        for key, value in orbit["all_short_order_distribution"].items()
    } == dict(sorted(orders.items()))

    peer = json.loads(
        (ROOT / (
            "rank8_delta03_e5_five_cubic_path_inner_spine_internal_"
            "newton_reduction_exact_agent_20260825.json"
        )).read_text(encoding="utf-8")
    )
    assert peer["integer_newton_matrix_determinant"] == 1
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-outer-spine-internal-"
            "newton-reduction-agent-v1"
        ),
        "status": (
            "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
            "OUTER_SPINE_INTERNAL_TRANSFER_NEWTON_REDUCTION"
        ),
        "root_orbit": "five_cubic_path:outer_spine_internal",
        "quotient_formula": (
            "10,976 selected-side states times 12,544 opposite-half states "
            "times eight inner-gap states times eight outer-gap states"
        ),
        "coordinate_order": (
            "inner-side root gap; outer-side root gap; selected path-half "
            "coordinates; opposite path half"
        ),
        "order_formula": "n=3+sum(the twelve stored coordinates)",
        "quotient_counts": dict(counts),
        "all_short_order_distribution": {
            str(key): value for key, value in sorted(orders.items())
        },
        "graded_path_transfer": {
            "rows": transfer_rows,
            "literal_pair_checks": literal_checks,
            "endpoint_state_guards": guards,
            "state_guard": (
                "both selected-outer-spine gaps have long base 7, ordinary "
                "pendants base 7, and ordinary spines base 8; every "
                "endpoint-conditioned factor remains at least rank_cap-1"
            ),
            "deleted_component_identity": (
                "deleting the root separates the two selected-outer-spine "
                "gaps into inner-side and outer-side components"
            ),
            "conclusion": (
                "within each non-all-short key all twelve long offsets enter "
                "both full-core and root-deleted coefficients only through "
                "their total S"
            ),
        },
        "degree_bounds": peer["degree_bounds"],
        "newton_gate": peer["newton_gate"],
        "integer_newton_matrix_determinant": 1,
        "shared_order27_evidence": {
            "all_rooted_pairs": 20_278_767_420,
            "nonpositive_by_delta": [0, 0, 0, 0],
            "scope": "exact all-root order-27 census only",
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Reduction only; no n>=28 sign claim. Full primary and "
            "independent exhaustive audits remain mandatory."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
