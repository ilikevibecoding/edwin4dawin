#!/usr/bin/env python3
"""Independent literal tree-DP replay of Delta2 arm distances 0,3..18."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from functools import lru_cache
from pathlib import Path

import numpy as np
import sympy as sp

from audit_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825 import (
    digest,
    message_claw,
    path_message,
    transfer_profile,
    tree_profile,
)
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
CERTIFICATE = HERE / "rank8_delta2_e1_old_root_remaining_finite_band_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta2_e1_old_root_remaining_finite_band_independent_audit_agent_20260825.json"
RANK = 2
DEGREE = 27
WIDTH = DEGREE + 1
NEARS = (0, *range(3, 19))
EXTENSIONS = ("root", "short", "long")
COORDINATES = ("tail", "short", "difference")
WEIGHTS = (1, 2, 1)
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "audit_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "51A937FEF2FB8E0B3EEC37318B047D51D2DFBCA676921978E1B1A9CC32EF8AE3",
    "prove_rank8_delta2_e1_old_root_remaining_finite_band_agent_20260825.py":
        "B7CF39C845A81F8B7BE07A5FC965D748F1FBC77570EDA2EF7FC87CB43D99A637",
    "rank8_delta2_e1_old_root_remaining_finite_band_exact_agent_20260825.json":
        "8C0261ECA0C07D6AA5F21C465FABA5C1D51AA38BF231EC8B758D65D17F5C38F5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def rank_terms() -> tuple[tuple[int, tuple[tuple[int, int], ...]], ...]:
    variables = (*c[:9], h[6], h[7])
    raw = sp.Poly(newton_coefficients(residual())[RANK], *variables, domain=sp.QQ).terms()
    assert len(raw) == 22
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
    ) == DEGREE
    return tuple(terms)


TERMS = rank_terms()


def evaluate(core: tuple[int, ...], deleted: tuple[int, ...]) -> int:
    values = (*core, deleted[6], deleted[7])
    answer = 0
    for coefficient, factors in TERMS:
        term = coefficient
        for index, exponent in factors:
            term *= values[index] ** exponent
        answer += term
    return answer


@lru_cache(maxsize=262144)
def independent_increment(
    extension: str,
    near: int,
    tail: int,
    short: int,
    difference: int,
) -> int:
    old_arms = (near + tail + 1, short + 1, short + difference + 1)
    new_arms = list(old_arms)
    new_arms[{"root": 0, "short": 1, "long": 2}[extension]] += 1
    old_core, old_deleted = transfer_profile(near, old_arms)
    new_core, new_deleted = transfer_profile(near, tuple(new_arms))
    return evaluate(new_core, new_deleted) - evaluate(old_core, old_deleted)


def literal_increment(
    extension: str,
    near: int,
    tail: int,
    short: int,
    difference: int,
) -> int:
    old_arms = (near + tail + 1, short + 1, short + difference + 1)
    new_arms = list(old_arms)
    new_arms[{"root": 0, "short": 1, "long": 2}[extension]] += 1
    old_core, old_deleted = tree_profile(near, old_arms)
    new_core, new_deleted = tree_profile(near, tuple(new_arms))
    return evaluate(new_core, new_deleted) - evaluate(old_core, old_deleted)


def transform_axis(values: np.ndarray, axis: int) -> None:
    """Exact forward differences using the tensor's own axis width."""
    moved = np.moveaxis(values, axis, 0)
    width = moved.shape[0]
    for trailing in np.ndindex(moved.shape[1:]):
        work = [int(moved[(position,) + trailing]) for position in range(width)]
        for order in range(width):
            moved[(order,) + trailing] = work[0]
            for position in range(width - order - 1):
                work[position] = work[position + 1] - work[position]


def branch_cells() -> list[tuple[tuple[int, int, int], tuple[str, ...]]]:
    tail_cells = [((6, 0, 0), True)] + [
        ((value, 0, 0), False) for value in range(6)
    ]
    other_cells = [((0, 6, 0), (True, True))]
    for short in range(6):
        lower = 6 - short
        other_cells.append(((0, short, lower), (False, True)))
        other_cells.extend(
            ((0, short, difference), (False, False))
            for difference in range(lower)
        )
    cells = []
    for tail_shift, tail_active in tail_cells:
        for other_shift, (short_active, difference_active) in other_cells:
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
        minimum = sum(weight * value for weight, value in zip(WEIGHTS, shifts))
        route(shifts, axes, threshold - minimum)
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
    return all(
        point[index] >= row["shifts"][index]
        if coordinate in active
        else point[index] == row["shifts"][index]
        for index, coordinate in enumerate(COORDINATES)
    )


def replay_region(
    near: int,
    region: dict[str, object],
    stored: dict[str, dict[str, object]],
) -> tuple[int, int, int]:
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

    increment_checks = profile_checks = 0
    for index in {(0,) * len(axes), (DEGREE,) * len(axes)}:
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
            assert literal_increment(extension, near, *parameters) == independent_increment(
                extension, near, *parameters
            )
            increment_checks += 1
    return sum(array.size for array in arrays.values()), increment_checks, profile_checks


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["status"] == (
        "PASS_EXACT_DELTA2_E1_OLD_ROOT_REMAINING_FINITE_NEAR0_3_18"
    )
    assert certificate["near_values"] == list(NEARS)
    assert certificate["excluded_already_sealed_near_values"] == [1, 2]
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
            expected_labels = {key(item): item["label"] for item in expected}
            assert all(row["label"] == expected_labels[key(row)] for row in rows)
            stored_maps[extension] = {key(row): row for row in rows}

        threshold = 19 - near
        for point in itertools.product(range(21), repeat=3):
            member = point[0] + 2 * point[1] + point[2] >= threshold
            multiplicity = sum(contains(row, point) for row in expected)
            assert multiplicity == int(member), (near, point, multiplicity)
            finite_points += 1

        for index, region in enumerate(expected, start=1):
            stored = {
                extension: stored_maps[extension][key(region)]
                for extension in EXTENSIONS
            }
            coefficients, increments, profiles = replay_region(near, region, stored)
            coefficient_count += coefficients
            increment_checks += increments
            profile_checks += profiles
            region_count += len(EXTENSIONS)
            dimension_counts[str(len(region["axes"]))] += len(EXTENSIONS)
            if index % 50 == 0 or index == len(expected):
                print("DELTA2_FINITE_LITERAL_AUDIT_PROGRESS", near, index, flush=True)

    assert coefficient_count == certificate["coverage_totals"]["newton_coefficients"]
    assert region_count == certificate["coverage_totals"]["regions"]
    assert finite_points == certificate["coverage_totals"]["finite_coverage_points_checked"]
    payload = {
        "schema": "rank8-delta2-e1-old-root-remaining-finite-band-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_TREE_DP_DELTA2_E1_OLD_ROOT_REMAINING_FINITE",
        "audited_theorem_status": certificate["status"],
        "replayed": {
            "near_values": len(NEARS),
            "exact_near_set": list(NEARS),
            "explicitly_excluded_already_sealed_near_set": [1, 2],
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
            "source_order_threshold": "tail+2*short+difference>=19-near",
            "branch_partition_disjoint_exhaustive": True,
            "weighted_cone_recursion_disjoint_exhaustive": True,
            "stored_keys_equal_independently_rebuilt_keys": True,
            "bounded_boundary_multiplicity_exactly_zero_or_one": True,
        },
        "independence": {
            "imports_producer_refinement_or_path_formula": False,
            "rank_two_residual_evaluator": (
                "fresh extraction of all 22 exact integer monomials from the canonical residual"
            ),
            "coefficient_engine": (
                "hash-pinned independent include/exclude path-message tree DP and fresh exact forward differences"
            ),
            "literal_graph_engine": (
                "full adjacency-list include/exclude forest DP at every unique tensor corner of every region"
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
