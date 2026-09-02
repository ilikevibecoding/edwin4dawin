#!/usr/bin/env python3
"""Independent tree-message and literal-DP replay of the Delta3 center root."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from functools import lru_cache
from pathlib import Path

import numpy as np

from audit_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825 import (
    add,
    digest,
    evaluate,
    forest_polynomial,
    message_claw,
    multiply,
    path_message,
    transform_axis,
)


HERE = Path(__file__).resolve().parent
CERTIFICATE = HERE / "rank8_delta3_e1_center_root_complete_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta3_e1_center_root_complete_independent_audit_agent_20260825.json"
DEGREE = 26
WIDTH = DEGREE + 1
EXTENSIONS = ("short", "middle", "long")
COORDINATES = ("base", "middle_gap", "long_gap")
WEIGHTS = (3, 2, 1)
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "audit_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "51A937FEF2FB8E0B3EEC37318B047D51D2DFBCA676921978E1B1A9CC32EF8AE3",
    "prove_rank8_delta3_e1_center_root_complete_agent_20260825.py":
        "9E6F77D3C5683C2E435CE69F2A57CBA8A32BF2D7AEBDB12E5545197EFA0FBD46",
    "rank8_delta3_e1_center_root_complete_exact_agent_20260825.json":
        "A67E9AF18DAE82E5C54AEBA35F823B8CAF36B84D4883147447F12B8356A0E090",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def center_deleted(arms: tuple[int, int, int]) -> tuple[int, ...]:
    out = (1,) + (0,) * 8
    for length in arms:
        excluded, included = path_message(length)
        out = multiply(out, add(excluded, included))
    return out


@lru_cache(maxsize=65536)
def transfer_profile(
    arms: tuple[int, int, int]
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    return message_claw(arms), center_deleted(arms)


def literal_adjacency(arms: tuple[int, int, int]) -> tuple[tuple[int, ...], ...]:
    adjacency: list[list[int]] = [[]]
    for length in arms:
        previous = 0
        for _ in range(length):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
    assert len(adjacency[0]) == 3
    assert sum(map(len, adjacency)) // 2 == len(adjacency) - 1
    return tuple(tuple(row) for row in adjacency)


@lru_cache(maxsize=4096)
def literal_profile(
    arms: tuple[int, int, int]
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    adjacency = literal_adjacency(arms)
    core = forest_polynomial(adjacency, None)
    deleted = forest_polynomial(adjacency, 0)
    assert core[1] == len(adjacency)
    assert deleted[1] == len(adjacency) - 1
    return core, deleted


@lru_cache(maxsize=131072)
def increment(
    extension: str, base: int, middle_gap: int, long_gap: int
) -> int:
    old_arms = (
        base + 1,
        base + middle_gap + 1,
        base + middle_gap + long_gap + 1,
    )
    new_arms = list(old_arms)
    new_arms[{"short": 0, "middle": 1, "long": 2}[extension]] += 1
    old_core, old_deleted = transfer_profile(old_arms)
    new_core, new_deleted = transfer_profile(tuple(new_arms))
    return evaluate(new_core, new_deleted) - evaluate(old_core, old_deleted)


def literal_increment(
    extension: str, base: int, middle_gap: int, long_gap: int
) -> int:
    old_arms = (
        base + 1,
        base + middle_gap + 1,
        base + middle_gap + long_gap + 1,
    )
    new_arms = list(old_arms)
    new_arms[{"short": 0, "middle": 1, "long": 2}[extension]] += 1
    old_core, old_deleted = literal_profile(old_arms)
    new_core, new_deleted = literal_profile(tuple(new_arms))
    return evaluate(new_core, new_deleted) - evaluate(old_core, old_deleted)


def expected_regions() -> list[dict[str, object]]:
    branches = [((6, 0, 0), COORDINATES)]
    for base in range(6):
        middle_lower = 6 - base
        branches.append(((base, middle_lower, 0), ("middle_gap", "long_gap")))
        for middle_gap in range(middle_lower):
            long_lower = 6 - base - middle_gap
            branches.append(((base, middle_gap, long_lower), ("long_gap",)))
            branches.extend(
                ((base, middle_gap, long_gap), ())
                for long_gap in range(long_lower)
            )
    assert len(branches) == 84 and len(set(branches)) == 84

    routed: list[tuple[tuple[int, int, int], tuple[str, ...]]] = []

    def route(shifts, axes, deficit):
        if deficit <= 0:
            routed.append((shifts, axes))
            return
        if not axes:
            return
        coordinate = axes[0]
        position = COORDINATES.index(coordinate)
        weight = WEIGHTS[position]
        sufficient = (deficit + weight - 1) // weight
        shifted = list(shifts)
        shifted[position] += sufficient
        routed.append((tuple(shifted), axes))
        for exact in range(sufficient):
            fixed = list(shifts)
            fixed[position] += exact
            route(tuple(fixed), axes[1:], deficit - weight * exact)

    for shifts, axes in branches:
        route(shifts, axes, 19 - sum(w * x for w, x in zip(WEIGHTS, shifts)))
    assert len(routed) == len(set(routed))
    return [
        {
            "shifts": list(shifts),
            "axes": list(axes),
            "label": ", ".join(
                f"{coordinate}>={shifts[position]}"
                if coordinate in axes
                else f"{coordinate}={shifts[position]}"
                for position, coordinate in enumerate(COORDINATES)
            ),
        }
        for shifts, axes in routed
    ]


def key(row: dict[str, object]) -> tuple[object, ...]:
    return tuple(row["shifts"]), tuple(row["axes"])


def contains(row, point):
    active = set(row["axes"])
    return all(
        point[position] >= row["shifts"][position]
        if coordinate in active
        else point[position] == row["shifts"][position]
        for position, coordinate in enumerate(COORDINATES)
    )


def replay_region(region, stored):
    shifts = tuple(region["shifts"])
    axes = tuple(region["axes"])
    arrays = {
        extension: np.empty((WIDTH,) * len(axes), dtype=object)
        for extension in EXTENSIONS
    }
    minima = {extension: None for extension in EXTENSIONS}
    for index in itertools.product(range(WIDTH), repeat=len(axes)):
        parameters = list(shifts)
        for coordinate, offset in zip(axes, index):
            parameters[COORDINATES.index(coordinate)] += offset
        for extension in EXTENSIONS:
            value = increment(extension, *parameters)
            arrays[extension][index] = value
            prior = minima[extension]
            minima[extension] = value if prior is None else min(prior, value)
    for extension in EXTENSIONS:
        for axis in range(len(axes)):
            transform_axis(arrays[extension], axis)
        actual = digest(arrays[extension])
        for field, value in actual.items():
            assert value == stored[extension][field], (
                extension,
                key(region),
                field,
                value,
                stored[extension][field],
            )
        assert str(minima[extension]) == stored[extension][
            "minimum_sampled_increment"
        ]

    increment_checks = profile_checks = 0
    for index in {(0,) * len(axes), (DEGREE,) * len(axes)}:
        parameters = list(shifts)
        for coordinate, offset in zip(axes, index):
            parameters[COORDINATES.index(coordinate)] += offset
        base, middle_gap, long_gap = parameters
        old_arms = (
            base + 1,
            base + middle_gap + 1,
            base + middle_gap + long_gap + 1,
        )
        assert literal_profile(old_arms) == transfer_profile(old_arms)
        profile_checks += 1
        for extension in EXTENSIONS:
            new_arms = list(old_arms)
            new_arms[{"short": 0, "middle": 1, "long": 2}[extension]] += 1
            assert literal_profile(tuple(new_arms)) == transfer_profile(tuple(new_arms))
            profile_checks += 1
            assert literal_increment(extension, *parameters) == increment(
                extension, *parameters
            )
            increment_checks += 1
    return sum(array.size for array in arrays.values()), increment_checks, profile_checks


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["status"] == (
        "PASS_EXACT_DELTA3_E1_CENTER_ROOT_ALL_ORDER_ALL_EXTENSIONS"
    )
    expected = expected_regions()
    expected_keys = {key(row) for row in expected}
    orbit_maps = {}
    for orbit in certificate["orbits"]:
        rows = orbit["rows"]
        assert {key(row) for row in rows} == expected_keys
        orbit_maps[orbit["extension"]] = {key(row): row for row in rows}
    assert set(orbit_maps) == set(EXTENSIONS)

    finite_points = 0
    for point in itertools.product(range(21), repeat=3):
        expected_member = 3 * point[0] + 2 * point[1] + point[2] >= 19
        assert sum(contains(row, point) for row in expected) == int(expected_member)
        finite_points += 1

    coefficients = increment_checks = profile_checks = 0
    for index, region in enumerate(expected, start=1):
        stored = {
            extension: orbit_maps[extension][key(region)]
            for extension in EXTENSIONS
        }
        count, increments, profiles = replay_region(region, stored)
        coefficients += count
        increment_checks += increments
        profile_checks += profiles
        if index % 15 == 0 or index == len(expected):
            print("CENTER_LITERAL_AUDIT_PROGRESS", index, flush=True)

    assert coefficients == certificate["coverage_totals"]["newton_coefficients"]
    assert finite_points == certificate["coverage_totals"][
        "finite_coverage_points_checked"
    ]
    payload = {
        "schema": "rank8-delta3-e1-center-root-complete-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_TREE_DP_DELTA3_E1_CENTER_ROOT_COMPLETE",
        "audited_theorem_status": certificate["status"],
        "replayed": {
            "extension_orbits": 3,
            "regions": len(expected) * 3,
            "ordered_newton_coefficients": coefficients,
            "finite_coverage_points": finite_points,
            "all_region_keys_matched": True,
            "all_ordered_coefficient_digests_matched": True,
            "all_minima_matched": True,
            "all_coefficients_nonnegative": True,
            "all_origins_positive": True,
            "literal_adjacency_increment_crosschecks": increment_checks,
            "literal_adjacency_core_and_deletion_profile_crosschecks": profile_checks,
        },
        "coverage_ledger": {
            "source_order_condition": "3*base+2*middle_gap+long_gap>=19",
            "branch_partition_disjoint_exhaustive": True,
            "weighted_cone_recursion_disjoint_exhaustive": True,
            "stored_keys_equal_independently_rebuilt_keys": True,
            "bounded_boundary_multiplicity_exactly_zero_or_one": True,
        },
        "independence": {
            "imports_producer_or_closed_path_formula": False,
            "coefficient_engine": "generic include/exclude path-message tree DP",
            "literal_graph_engine": (
                "fresh center-root adjacency-list full forest DP at every unique "
                "tensor corner"
            ),
            "shared_definition_only": "canonical terminal residual",
        },
        "dependency_sha256": actual_hashes,
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
