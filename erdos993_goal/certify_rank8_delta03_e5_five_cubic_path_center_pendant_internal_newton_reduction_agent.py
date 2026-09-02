#!/usr/bin/env python3
"""Exact transfer/Newton reduction for path:center_pendant_internal."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from collections import Counter
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_five_cubic_path_center_pendant_internal_"
    "newton_reduction_exact_agent_20260825.json"
)
EXPECTED = {
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_five_cubic_t_middle_pendant_internal_newton_reduction_exact_agent_20260824.json":
        "8888141D833C738F7805A1A80618A817345CC11437A68C25B16B66C604D4B665",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - index for index in range(rank)) / sp.factorial(rank)


def path_count(order: sp.Expr, rank: int) -> sp.Expr:
    return choose_poly(order - rank + 1, rank)


def pair_count(left: sp.Expr, right: sp.Expr, rank: int) -> sp.Expr:
    return sp.expand(
        sum(path_count(left, i) * path_count(right, rank - i)
            for i in range(rank + 1))
    )


def literal_path(order: int, rank: int) -> int:
    top = order - rank + 1
    return math.comb(top, rank) if top >= rank >= 0 else 0


def literal_pair(left: int, right: int, rank: int) -> int:
    return sum(
        literal_path(left, i) * literal_path(right, rank - i)
        for i in range(rank + 1)
    )


def convolve(*factors: Counter[tuple[int, int]]) -> Counter[tuple[int, int]]:
    total = Counter({(0, 0): 1})
    for factor in factors:
        result: Counter[tuple[int, int]] = Counter()
        for (stored_a, long_a), count_a in total.items():
            for (stored_b, long_b), count_b in factor.items():
                result[stored_a + stored_b, long_a + long_b] += count_a * count_b
        total = result
    return total


def distribution(rows: list[tuple[tuple[int, bool], ...]]) -> Counter[tuple[int, int]]:
    return Counter(
        (sum(value for value, _ in row), sum(is_long for _, is_long in row))
        for row in rows
    )


def unordered_pair_distribution(
    states: Counter[tuple[int, int]],
) -> Counter[tuple[int, int]]:
    result: Counter[tuple[int, int]] = Counter()
    keys = sorted(states)
    for index, left in enumerate(keys):
        for right in keys[index:]:
            if left == right:
                multiplicity = states[left] * (states[left] + 1) // 2
            else:
                multiplicity = states[left] * states[right]
            result[left[0] + right[0], left[1] + right[1]] += multiplicity
    return result


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    left, right = sp.symbols("LEFT RIGHT")
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
                    pair_count(left + 1, right, rank)
                    - pair_count(left, right + 1, rank)
                ) == 0
            for left_value in range(minimum, minimum + 9):
                for right_value in range(minimum, minimum + 9):
                    for rank in range(cap + 1):
                        assert literal_pair(left_value + 1, right_value, rank) == (
                            literal_pair(left_value, right_value + 1, rank)
                        )
                        literal_checks += 1
            transfer_rows.append({
                "polynomial": polynomial,
                "selected_vertices": selected,
                "rank_cap": cap,
                "minimum_path_order": minimum,
            })

    guards = []
    for root, center, left_inner, left_outer, right_inner, right_outer in (
        itertools.product(range(2), repeat=6)
    ):
        selected = root + center + left_inner + left_outer + right_inner + right_outer
        cap = 8 - selected
        orders = {
            "root_center_near_gap": 7 - root - center,
            "root_tail": 7 - root,
            "left_center_inner_spine": 8 - center - left_inner,
            "left_inner_pendant": 7 - left_inner,
            "left_inner_outer_spine": 8 - left_inner - left_outer,
            "left_outer_pendant0": 7 - left_outer,
            "left_outer_pendant1": 7 - left_outer,
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
                root, center, left_inner, left_outer, right_inner, right_outer
            ],
            "rank_cap": cap,
            "minimum_long_path_orders": orders,
        })
    for center, left_inner, left_outer, right_inner, right_outer in (
        itertools.product(range(2), repeat=5)
    ):
        selected = center + left_inner + left_outer + right_inner + right_outer
        cap = 7 - selected
        orders = {
            "near_gap_after_root_deletion": 7 - center,
            "detached_tail_component": 7,
            "left_center_inner_spine": 8 - center - left_inner,
            "left_inner_pendant": 7 - left_inner,
            "left_inner_outer_spine": 8 - left_inner - left_outer,
            "left_outer_pendant0": 7 - left_outer,
            "left_outer_pendant1": 7 - left_outer,
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
                center, left_inner, left_outer, right_inner, right_outer
            ],
            "rank_cap": cap,
            "minimum_long_path_orders": orders,
        })

    pendant = [(value, value == 7) for value in range(1, 8)]
    spine = [(value, value == 8) for value in range(1, 9)]
    near = [(value, value == 7) for value in range(0, 8)]
    pendant_pairs = list(itertools.combinations_with_replacement(pendant, 2))
    half_rows = [
        (center_inner, inner_pendant, inner_outer, low, high)
        for center_inner in spine
        for inner_pendant in pendant
        for inner_outer in spine
        for low, high in pendant_pairs
    ]
    assert len(half_rows) == 12_544
    half_distribution = distribution(half_rows)
    assert sum(half_distribution.values()) == 12_544
    half_pairs = unordered_pair_distribution(half_distribution)
    assert sum(half_pairs.values()) == 12_544 * 12_545 // 2
    patterns = convolve(
        half_pairs,
        distribution([(value,) for value in near]),
        distribution([(value,) for value in pendant]),
    )

    counts: Counter[str] = Counter()
    orders: Counter[int] = Counter()
    for (stored, long_count), multiplicity in patterns.items():
        order = 2 + stored
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
        total=4_406_205_440,
        all_short=800_613_450,
        finite=798_845_124,
        order27=757_491,
        mixed=3_605_591_989,
        all_long=1,
        rays=3_605_591_990,
    )

    partition = json.loads(
        (ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json")
        .read_text(encoding="utf-8")
    )
    orbit = next(
        row for row in partition["root_location_partitions"]
        if row["root_location_orbit"]
        == "five_cubic_path:center_pendant_internal"
    )
    assert orbit["stabilizer_order"] == 8
    assert orbit["coordinate_count"] == 12
    assert orbit["coordinate_type_counts"] == {
        "spine": 4,
        "pendant": 6,
        "pendant_near_gap": 1,
        "pendant_tail_component": 1,
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
            "rank8_delta03_e5_five_cubic_t_middle_pendant_internal_"
            "newton_reduction_exact_agent_20260824.json"
        )).read_text(encoding="utf-8")
    )
    assert peer["integer_newton_matrix_determinant"] == 1
    payload = {
        "schema": (
            "rank8-delta03-e5-five-cubic-path-center-pendant-internal-"
            "newton-reduction-agent-v1"
        ),
        "status": (
            "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_PATH_"
            "CENTER_PENDANT_INTERNAL_TRANSFER_NEWTON_REDUCTION"
        ),
        "root_orbit": "five_cubic_path:center_pendant_internal",
        "quotient_formula": (
            "unordered pair of 12,544 path-half states times eight near-gap "
            "states times seven detached-tail states"
        ),
        "coordinate_order": (
            "left path half; right path half; selected center-pendant near "
            "gap; selected-edge detached tail"
        ),
        "order_formula": "n=2+sum(the twelve stored coordinates)",
        "quotient_counts": dict(counts),
        "all_short_order_distribution": {
            str(key): value for key, value in sorted(orders.items())
        },
        "graded_path_transfer": {
            "rows": transfer_rows,
            "literal_pair_checks": literal_checks,
            "endpoint_state_guards": guards,
            "state_guard": (
                "the selected-edge near gap and tail have long base 7, "
                "ordinary pendants base 7, and ordinary spines base 8; "
                "every endpoint-conditioned factor remains at least rank_cap-1"
            ),
            "deleted_component_identity": (
                "deleting the root yields a detached tail path and the "
                "remaining five-cubic-path component with the near gap as a "
                "center pendant; the path-pair identity transfers all offsets"
            ),
            "conclusion": (
                "within each non-all-short key all twelve long offsets enter "
                "both full-core and root-deleted coefficients only through total S"
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
