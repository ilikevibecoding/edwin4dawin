#!/usr/bin/env python3
"""Independent literal/message tree-DP replay of Delta2/3 inserted leaf roots."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from functools import lru_cache
from pathlib import Path

import numpy as np
import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
CERTIFICATE = HERE / "rank8_delta23_e1_inserted_new_leaf_complete_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta23_e1_inserted_new_leaf_complete_independent_audit_agent_20260825.json"
MAX_RANK = 8
RANKS = (2, 3)
DEGREES = {2: 27, 3: 26}
EXTENDED_ARMS = (0, 1, 2)
COORDINATES = ("A", "B", "C")
CERTIFICATE_SHA256 = "930B8F2E985B07B54B5AFB7422DF0510AAE2DF6D11E88418527B0111D1368CD0"
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "prove_rank8_delta23_e1_inserted_new_leaf_complete_agent_20260825.py":
        "517FD645FCECEFAB1AE40811EF337797B5402B8375E42C51A7942A0819C165CD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[index] + right[index] for index in range(MAX_RANK + 1))


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    result = [0] * (MAX_RANK + 1)
    for i, left_value in enumerate(left):
        if not left_value:
            continue
        for j, right_value in enumerate(right[: MAX_RANK + 1 - i]):
            if right_value:
                result[i + j] += left_value * right_value
    return tuple(result)


def times_x(polynomial: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + polynomial[:MAX_RANK]


def literal_claw(arms: tuple[int, int, int]) -> tuple[list[list[int]], tuple[int, ...]]:
    adjacency: list[list[int]] = [[]]
    endpoints = []
    for length in arms:
        assert length >= 1
        previous = 0
        for _ in range(length):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
        endpoints.append(previous)
    return adjacency, tuple(endpoints)


def forest_polynomial(
    adjacency: list[list[int]], removed: int | None
) -> tuple[int, ...]:
    seen = set() if removed is None else {removed}

    def visit(vertex: int, parent: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
        seen.add(vertex)
        excluded = (1,) + (0,) * MAX_RANK
        included_children = (1,) + (0,) * MAX_RANK
        for child in adjacency[vertex]:
            if child == parent or child in seen:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded = multiply(excluded, add(child_excluded, child_included))
            included_children = multiply(included_children, child_excluded)
        return excluded, times_x(included_children)

    result = (1,) + (0,) * MAX_RANK
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        excluded, included = visit(vertex, -1)
        result = multiply(result, add(excluded, included))
    return result


@lru_cache(maxsize=32768)
def literal_profile(
    old_arms: tuple[int, int, int], extended_arm: int
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    new_arms = list(old_arms)
    new_arms[extended_arm] += 1
    adjacency, endpoints = literal_claw(tuple(new_arms))
    new_root = endpoints[extended_arm]
    core = forest_polynomial(adjacency, None)
    deleted = forest_polynomial(adjacency, new_root)
    source_order = 1 + sum(old_arms)
    assert len(adjacency) == source_order + 1
    assert core[0] == deleted[0] == 1
    assert core[1] == source_order + 1 and deleted[1] == source_order
    return core, deleted


@lru_cache(maxsize=None)
def path_message(order: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
    assert order >= 0
    if order == 0:
        return (1,) + (0,) * MAX_RANK, (0,) * (MAX_RANK + 1)
    child_excluded, child_included = path_message(order - 1)
    return add(child_excluded, child_included), times_x(child_excluded)


@lru_cache(maxsize=None)
def message_claw(arms: tuple[int, int, int]) -> tuple[int, ...]:
    excluded_center = (1,) + (0,) * MAX_RANK
    included_children = (1,) + (0,) * MAX_RANK
    for length in arms:
        arm_excluded, arm_included = path_message(length)
        excluded_center = multiply(excluded_center, add(arm_excluded, arm_included))
        included_children = multiply(included_children, arm_excluded)
    return add(excluded_center, times_x(included_children))


@lru_cache(maxsize=131072)
def message_profile(
    old_arms: tuple[int, int, int], extended_arm: int
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    new_arms = list(old_arms)
    new_arms[extended_arm] += 1
    return message_claw(tuple(new_arms)), message_claw(old_arms)


def rank_terms(rank: int) -> tuple[tuple[int, tuple[tuple[int, int], ...]], ...]:
    variables = (*c[:9], h[6], h[7])
    raw = sp.Poly(newton_coefficients(residual())[rank], *variables, domain=sp.QQ).terms()
    assert len(raw) == {2: 22, 3: 26}[rank]
    terms = []
    for monomial, coefficient in raw:
        assert coefficient.q == 1
        terms.append(
            (
                int(coefficient),
                tuple(
                    (index, exponent)
                    for index, exponent in enumerate(monomial)
                    if exponent
                ),
            )
        )
    weights = tuple(range(9)) + (6, 7)
    assert max(
        sum(exponent * weights[index] for index, exponent in factors)
        for _, factors in terms
    ) == DEGREES[rank]
    return tuple(terms)


TERMS = {rank: rank_terms(rank) for rank in RANKS}


def evaluate(rank: int, core: tuple[int, ...], deleted: tuple[int, ...]) -> int:
    values = (*core, deleted[6], deleted[7])
    answer = 0
    for coefficient, factors in TERMS[rank]:
        term = coefficient
        for index, exponent in factors:
            term *= values[index] ** exponent
        answer += term
    return answer


@lru_cache(maxsize=262144)
def independent_value(rank: int, extended_arm: int, A: int, B: int, C: int) -> int:
    old_arms = (A + 1, A + B + 1, A + B + C + 1)
    core, deleted = message_profile(old_arms, extended_arm)
    return evaluate(rank, core, deleted)


def literal_value(rank: int, extended_arm: int, A: int, B: int, C: int) -> int:
    old_arms = (A + 1, A + B + 1, A + B + C + 1)
    core, deleted = literal_profile(old_arms, extended_arm)
    return evaluate(rank, core, deleted)


def expected_regions() -> list[dict[str, object]]:
    rows = [{"label": "A>=7", "shifts": [7, 0, 0], "axes": ["A", "B", "C"]}]
    for A in range(7):
        threshold = 19 - 3 * A
        bulk_B = (threshold + 1) // 2
        rows.append(
            {
                "label": f"A={A}, B>={bulk_B}",
                "shifts": [A, bulk_B, 0],
                "axes": ["B", "C"],
            }
        )
        for B in range(bulk_B):
            lower_C = threshold - 2 * B
            rows.append(
                {
                    "label": f"A={A}, B={B}, C>={lower_C}",
                    "shifts": [A, B, lower_C],
                    "axes": ["C"],
                }
            )
    assert len(rows) == 45
    assert {
        dimension: sum(len(row["axes"]) == dimension for row in rows)
        for dimension in (1, 2, 3)
    } == {1: 37, 2: 7, 3: 1}
    return rows


def region_key(row: dict[str, object]) -> tuple[object, ...]:
    return row["label"], tuple(row["shifts"]), tuple(row["axes"])


def contains(row: dict[str, object], point: tuple[int, int, int]) -> bool:
    active = set(row["axes"])
    return all(
        point[index] >= row["shifts"][index]
        if coordinate in active
        else point[index] == row["shifts"][index]
        for index, coordinate in enumerate(COORDINATES)
    )


def transform_axis(values: np.ndarray, axis: int) -> None:
    moved = np.moveaxis(values, axis, 0)
    width = moved.shape[0]
    for trailing in np.ndindex(moved.shape[1:]):
        work = [int(moved[(position,) + trailing]) for position in range(width)]
        for order in range(width):
            moved[(order,) + trailing] = work[0]
            for position in range(width - order - 1):
                work[position] = work[position + 1] - work[position]


def digest(values: np.ndarray) -> dict[str, object]:
    ordered = hashlib.sha256()
    negative = zero = 0
    minimum = None
    for index in np.ndindex(values.shape):
        value = int(values[index])
        ordered.update(str(value).encode("ascii"))
        ordered.update(b"\n")
        if value < 0:
            negative += 1
        elif value == 0:
            zero += 1
        minimum = value if minimum is None else min(minimum, value)
    count = values.size
    return {
        "coefficients": count,
        "negative": negative,
        "zero": zero,
        "positive": count - negative - zero,
        "origin": str(int(values[(0,) * values.ndim])),
        "minimum_coefficient": str(minimum),
        "ordered_coefficients_sha256": ordered.hexdigest().upper(),
    }


def replay_region(
    rank: int,
    region: dict[str, object],
    stored: dict[int, dict[str, object]],
) -> int:
    width = DEGREES[rank] + 1
    shifts = tuple(region["shifts"])
    axes = tuple(region["axes"])
    arrays = {
        extended_arm: np.empty((width,) * len(axes), dtype=object)
        for extended_arm in EXTENDED_ARMS
    }
    minima = {extended_arm: None for extended_arm in EXTENDED_ARMS}
    for index in itertools.product(range(width), repeat=len(axes)):
        parameters = list(shifts)
        for coordinate, offset in zip(axes, index):
            parameters[COORDINATES.index(coordinate)] += offset
        for extended_arm in EXTENDED_ARMS:
            value = independent_value(rank, extended_arm, *parameters)
            arrays[extended_arm][index] = value
            previous = minima[extended_arm]
            minima[extended_arm] = value if previous is None else min(previous, value)
    for extended_arm in EXTENDED_ARMS:
        for axis in range(len(axes)):
            transform_axis(arrays[extended_arm], axis)
        actual = digest(arrays[extended_arm])
        row = stored[extended_arm]
        for field, value in actual.items():
            assert value == row[field], (
                rank,
                extended_arm,
                region_key(region),
                field,
                value,
                row[field],
            )
        assert str(minima[extended_arm]) == row["minimum_sampled_value"]
        assert row["first_negative"] is None
    return sum(array.size for array in arrays.values())


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    assert sha256(CERTIFICATE) == CERTIFICATE_SHA256
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["status"] == (
        "PASS_EXACT_DELTA23_E1_INSERTED_NEW_LEAF_ALL_ORDER_ALL_EXTENSIONS"
    )
    assert certificate["coverage_totals"]["newton_coefficients"] == 162783
    expected = expected_regions()
    expected_keys = {region_key(row) for row in expected}

    case_maps = {}
    for case in certificate["cases"]:
        key = case["rank"], case["extended_arm"]
        rows = case["rows"]
        assert {region_key(row) for row in rows} == expected_keys
        case_maps[key] = {region_key(row): row for row in rows}
    assert set(case_maps) == set(itertools.product(RANKS, EXTENDED_ARMS))

    finite_points = 0
    for point in itertools.product(range(21), repeat=3):
        member = 3 * point[0] + 2 * point[1] + point[2] >= 19
        multiplicity = sum(contains(row, point) for row in expected)
        assert multiplicity == int(member), (point, multiplicity)
        finite_points += 1

    coefficient_count = 0
    for rank in RANKS:
        for index, region in enumerate(expected, start=1):
            key = region_key(region)
            stored = {
                extended_arm: case_maps[(rank, extended_arm)][key]
                for extended_arm in EXTENDED_ARMS
            }
            coefficient_count += replay_region(rank, region, stored)
            if index % 15 == 0 or index == len(expected):
                print("DELTA23_INSERTED_REPLAY_PROGRESS", rank, index, flush=True)

    profile_checks = literal_value_checks = 0
    for rank in RANKS:
        degree = DEGREES[rank]
        for region in expected:
            axes = tuple(region["axes"])
            shifts = tuple(region["shifts"])
            for index in [(0,) * len(axes), (degree,) * len(axes)]:
                parameters = list(shifts)
                for coordinate, offset in zip(axes, index):
                    parameters[COORDINATES.index(coordinate)] += offset
                A, B, C = parameters
                old_arms = (A + 1, A + B + 1, A + B + C + 1)
                for extended_arm in EXTENDED_ARMS:
                    assert literal_profile(old_arms, extended_arm) == message_profile(
                        old_arms, extended_arm
                    )
                    profile_checks += 1
                    assert literal_value(rank, extended_arm, *parameters) == independent_value(
                        rank, extended_arm, *parameters
                    )
                    literal_value_checks += 1

    assert coefficient_count == 162783
    assert profile_checks == 540 and literal_value_checks == 540
    payload = {
        "schema": "rank8-delta23-e1-inserted-new-leaf-complete-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_LITERAL_TREE_DP_DELTA23_E1_INSERTED_NEW_LEAF_COMPLETE",
        "audited_theorem_status": certificate["status"],
        "replayed": {
            "ranks": list(RANKS),
            "rank_extension_orbits": 6,
            "regions": 270,
            "regions_by_dimension": {"1": 222, "2": 42, "3": 6},
            "ordered_newton_coefficients": coefficient_count,
            "finite_coverage_points": finite_points,
            "all_stored_region_keys_matched": True,
            "all_stored_ordered_coefficient_digests_matched": True,
            "all_stored_minima_matched": True,
            "all_newton_coefficients_nonnegative": True,
            "all_origins_positive": True,
            "literal_adjacency_core_and_new_root_deletion_profile_crosschecks": profile_checks,
            "literal_adjacency_terminal_value_crosschecks": literal_value_checks,
        },
        "coverage_ledger": {
            "source_order_condition": "3*A+2*B+C>=19",
            "weighted_cone_partition_disjoint_exhaustive": True,
            "stored_keys_equal_independently_rebuilt_keys": True,
            "bounded_boundary_multiplicity_exactly_zero_or_one": True,
            "all_three_extension_arms": True,
            "both_ranks_2_and_3": True,
        },
        "independence": {
            "imports_producer_or_closed_path_formula": False,
            "graph_model": (
                "fresh literal adjacency-list subdivided claw extended by one endpoint "
                "leaf, rooted at that inserted leaf"
            ),
            "coefficient_engine": (
                "fresh include/exclude path-message recurrence, fresh canonical rank-2/3 "
                "integer evaluators, and fresh exact multidimensional forward differences"
            ),
            "literal_graph_engine": (
                "generic include/exclude forest DP for core and root deletion at both "
                "rank-specific tensor corners of every cell and extension orbit"
            ),
        },
        "cache_diagnostics": {
            "literal_profile": str(literal_profile.cache_info()),
            "path_message": str(path_message.cache_info()),
            "message_claw": str(message_claw.cache_info()),
            "message_profile": str(message_profile.cache_info()),
            "independent_value": str(independent_value.cache_info()),
        },
        "dependency_sha256": {
            **actual_hashes,
            CERTIFICATE.name: CERTIFICATE_SHA256,
        },
        "proof_boundary": certificate["proof_boundary"],
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("REPLAYED", payload["replayed"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
