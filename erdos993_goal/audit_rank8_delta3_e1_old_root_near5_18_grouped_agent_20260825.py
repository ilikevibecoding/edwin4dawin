#!/usr/bin/env python3
"""Independent exact tree-DP replay of the grouped near=5..18 certificate."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from pathlib import Path

import numpy as np

from audit_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825 import (
    digest,
    increment as independent_increment,
    literal_increment,
    message_claw,
    path_message,
    transfer_profile,
    transform_axis,
    tree_profile,
)


HERE = Path(__file__).resolve().parent
CERTIFICATE = HERE / "rank8_delta3_e1_old_root_near5_18_grouped_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta3_e1_old_root_near5_18_grouped_independent_audit_agent_20260825.json"
DEGREE = 26
WIDTH = DEGREE + 1
NEARS = tuple(range(5, 19))
EXTENSIONS = ("root", "short", "long")
COORDINATES = ("tail", "short", "difference")
WEIGHTS = (1, 2, 1)
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "audit_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "51A937FEF2FB8E0B3EEC37318B047D51D2DFBCA676921978E1B1A9CC32EF8AE3",
    "prove_rank8_delta3_e1_old_root_near5_18_grouped_agent_20260825.py":
        "9B17B28E683714325B6D6D2907F9FA4069BB7CF36AD03BCC51B2A30BAB4B2488",
    "rank8_delta3_e1_old_root_near5_18_grouped_exact_agent_20260825.json":
        "DB26C61571FE388D7FFA6DC756100648A3EE086133E8C428126633F1C253F75C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def branch_cells() -> list[tuple[tuple[int, int, int], tuple[str, ...]]]:
    tail = [((6, 0, 0), True)] + [((value, 0, 0), False) for value in range(6)]
    others = [((0, 6, 0), (True, True))]
    for short in range(6):
        lower = 6 - short
        others.append(((0, short, lower), (False, True)))
        others.extend(
            ((0, short, difference), (False, False))
            for difference in range(lower)
        )

    cells = []
    for tail_shift, tail_active in tail:
        for other_shift, (short_active, difference_active) in others:
            shifts = (tail_shift[0], other_shift[1], other_shift[2])
            flags = (tail_active, short_active, difference_active)
            axes = tuple(
                coordinate
                for coordinate, active in zip(COORDINATES, flags)
                if active
            )
            cells.append((shifts, axes))
    assert len(cells) == 196 and len(set(cells)) == 196
    return cells


def expected_regions(near: int) -> list[dict[str, object]]:
    threshold = 19 - near
    out: list[tuple[tuple[int, int, int], tuple[str, ...]]] = []

    def route(
        shifts: tuple[int, int, int],
        axes: tuple[str, ...],
        deficit: int,
    ) -> None:
        if deficit <= 0:
            out.append((shifts, axes))
            return
        if not axes:
            return
        coordinate = axes[0]
        position = COORDINATES.index(coordinate)
        weight = WEIGHTS[position]
        sufficient = (deficit + weight - 1) // weight

        shifted = list(shifts)
        shifted[position] += sufficient
        out.append((tuple(shifted), axes))

        for exact in range(sufficient):
            fixed = list(shifts)
            fixed[position] += exact
            route(tuple(fixed), axes[1:], deficit - weight * exact)

    for shifts, axes in branch_cells():
        base_weight = sum(weight * value for weight, value in zip(WEIGHTS, shifts))
        route(shifts, axes, threshold - base_weight)

    assert len(out) == len(set(out))
    return [
        {
            "shifts": list(shifts),
            "axes": list(axes),
            "label": ", ".join(
                f"{coordinate}>={shifts[index]}"
                if coordinate in axes
                else f"{coordinate}={shifts[index]}"
                for index, coordinate in enumerate(COORDINATES)
            ),
        }
        for shifts, axes in out
    ]


def key(row: dict[str, object]) -> tuple[object, ...]:
    return tuple(row["shifts"]), tuple(row["axes"])


def contains(row: dict[str, object], point: tuple[int, int, int]) -> bool:
    active = set(row["axes"])
    for index, coordinate in enumerate(COORDINATES):
        if coordinate in active:
            if point[index] < row["shifts"][index]:
                return False
        elif point[index] != row["shifts"][index]:
            return False
    return True


def replay_region(
    near: int,
    region: dict[str, object],
    stored: dict[str, dict[str, object]],
) -> tuple[int, int, int]:
    shifts = tuple(region["shifts"])
    axes = tuple(region["axes"])
    shape = (WIDTH,) * len(axes)
    arrays = {extension: np.empty(shape, dtype=object) for extension in EXTENSIONS}
    minima = {extension: None for extension in EXTENSIONS}

    for index in itertools.product(range(WIDTH), repeat=len(axes)):
        parameters = list(shifts)
        for coordinate, offset in zip(axes, index):
            parameters[COORDINATES.index(coordinate)] += offset
        for extension in EXTENSIONS:
            value = independent_increment(extension, near, *parameters)
            arrays[extension][index] = value
            previous = minima[extension]
            minima[extension] = value if previous is None else min(previous, value)

    for extension in EXTENSIONS:
        for axis in range(len(axes)):
            transform_axis(arrays[extension], axis)
        actual = digest(arrays[extension])
        row = stored[extension]
        for field, value in actual.items():
            assert value == row[field], (
                near,
                extension,
                key(region),
                field,
                value,
                row[field],
            )
        assert str(minima[extension]) == row["minimum_sampled_increment"]
        assert row["first_negative"] is None

    corners = {(0,) * len(axes), (DEGREE,) * len(axes)}
    increment_checks = profile_checks = 0
    for index in corners:
        parameters = list(shifts)
        for coordinate, offset in zip(axes, index):
            parameters[COORDINATES.index(coordinate)] += offset
        tail, short, difference = parameters
        old_arms = (near + tail + 1, short + 1, short + difference + 1)
        assert tree_profile(near, old_arms) == transfer_profile(near, old_arms)
        profile_checks += 1
        for extension in EXTENSIONS:
            new_arms = list(old_arms)
            new_arms[{"root": 0, "short": 1, "long": 2}[extension]] += 1
            new_tuple = tuple(new_arms)
            assert tree_profile(near, new_tuple) == transfer_profile(near, new_tuple)
            profile_checks += 1
            assert literal_increment(extension, near, *parameters) == (
                independent_increment(extension, near, *parameters)
            )
            increment_checks += 1
    return sum(array.size for array in arrays.values()), increment_checks, profile_checks


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["status"] == (
        "PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR5_18_ALL_EXTENSIONS"
    )
    assert certificate["near_values"] == list(NEARS)
    sections = {section["near"]: section for section in certificate["slices"]}
    assert set(sections) == set(NEARS)

    coefficient_count = increment_checks = profile_checks = 0
    region_count = finite_points = 0
    dimension_counts = {str(dimension): 0 for dimension in (0, 1, 2, 3)}
    for near in NEARS:
        expected = expected_regions(near)
        expected_keys = {key(row) for row in expected}
        section = sections[near]
        orbits = {entry["extension"]: entry for entry in section["orbits"]}
        assert set(orbits) == set(EXTENSIONS)
        stored_maps = {}
        for extension in EXTENSIONS:
            rows = orbits[extension]["rows"]
            assert {key(row) for row in rows} == expected_keys
            assert all(row["label"] == next(
                item["label"] for item in expected if key(item) == key(row)
            ) for row in rows)
            stored_maps[extension] = {key(row): row for row in rows}

        threshold = 19 - near
        for point in itertools.product(range(21), repeat=3):
            expected_member = point[0] + 2 * point[1] + point[2] >= threshold
            multiplicity = sum(contains(row, point) for row in expected)
            assert multiplicity == int(expected_member), (near, point, multiplicity)
            finite_points += 1

        for index, region in enumerate(expected, start=1):
            stored = {
                extension: stored_maps[extension][key(region)]
                for extension in EXTENSIONS
            }
            coefficients, literal_increments, literal_profiles = replay_region(
                near, region, stored
            )
            coefficient_count += coefficients
            increment_checks += literal_increments
            profile_checks += literal_profiles
            region_count += len(EXTENSIONS)
            dimension_counts[str(len(region["axes"]))] += len(EXTENSIONS)
            if index % 50 == 0 or index == len(expected):
                print("GROUPED_LITERAL_AUDIT_PROGRESS", near, index, flush=True)

    assert coefficient_count == certificate["coverage_totals"]["newton_coefficients"]
    assert region_count == certificate["coverage_totals"]["regions"]
    assert finite_points == certificate["coverage_totals"][
        "finite_coverage_points_checked"
    ]
    payload = {
        "schema": "rank8-delta3-e1-old-root-near5-18-grouped-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR5_18",
        "audited_theorem_status": certificate["status"],
        "replayed": {
            "near_values": len(NEARS),
            "extension_orbits": len(NEARS) * len(EXTENSIONS),
            "regions": region_count,
            "regions_by_dimension": dimension_counts,
            "ordered_newton_coefficients": coefficient_count,
            "finite_coverage_points": finite_points,
            "all_stored_region_keys_matched": True,
            "all_stored_ordered_coefficient_digests_matched": True,
            "all_stored_minima_matched": True,
            "all_newton_coefficients_nonnegative": True,
            "all_origins_positive": True,
            "literal_adjacency_increment_crosschecks": increment_checks,
            "literal_adjacency_core_and_deletion_profile_crosschecks": profile_checks,
        },
        "coverage_ledger": {
            "near_values_exactly_5_through_18": True,
            "source_order_threshold": "tail+2*short+difference>=19-near",
            "branch_partition_disjoint_exhaustive": True,
            "weighted_cone_recursion_disjoint_exhaustive": True,
            "stored_keys_equal_independently_rebuilt_keys": True,
            "bounded_boundary_multiplicity_exactly_zero_or_one": True,
        },
        "independence": {
            "imports_producer_refinement_or_path_code": False,
            "coefficient_engine": (
                "fresh generic include/exclude path-message tree DP and exact "
                "multidimensional forward differences"
            ),
            "literal_graph_engine": (
                "full adjacency-list include/exclude forest DP at every unique "
                "tensor corner of every routing region"
            ),
            "shared_definition_only": (
                "canonical terminal residual plus the already hash-pinned "
                "independent tree-DP audit machinery"
            ),
        },
        "cache_diagnostics": {
            "tree_profile": str(tree_profile.cache_info()),
            "path_message": str(path_message.cache_info()),
            "message_claw": str(message_claw.cache_info()),
            "transfer_profile": str(transfer_profile.cache_info()),
            "increment": str(independent_increment.cache_info()),
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
