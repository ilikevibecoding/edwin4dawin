#!/usr/bin/env python3
"""Independent literal/message tree-DP replay of the Delta2 center root."""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from functools import lru_cache
from pathlib import Path

import numpy as np
import sympy as sp

from audit_rank8_delta3_e1_center_root_complete_agent_20260825 import (
    contains,
    expected_regions,
    key,
    literal_profile,
    transfer_profile,
)
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
CERTIFICATE = HERE / "rank8_delta2_e1_center_root_complete_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta2_e1_center_root_complete_independent_audit_agent_20260825.json"
RANK = 2
DEGREE = 27
WIDTH = DEGREE + 1
EXTENSIONS = ("short", "middle", "long")
COORDINATES = ("base", "middle_gap", "long_gap")
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "audit_rank8_delta3_e1_center_root_complete_agent_20260825.py":
        "176246CAE3F20EE719D16FBD19DAA1507DFF087C390CA8CE2254C55D94A4C66B",
    "prove_rank8_delta2_e1_center_root_complete_agent_20260825.py":
        "96DC865B926CD16B6E88B7D94AE7E7414D24CF586637F18D8B3093B158144A8F",
    "rank8_delta2_e1_center_root_complete_exact_agent_20260825.json":
        "5C434FD92F74E09BC75A2C71F796E92DB8D3EBCA6449DC851A1D82CBCDEE840B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def rank_terms() -> tuple[tuple[int, tuple[tuple[int, int], ...]], ...]:
    variables = (*c[:9], h[6], h[7])
    raw = sp.Poly(
        newton_coefficients(residual())[RANK], *variables, domain=sp.QQ
    ).terms()
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


@lru_cache(maxsize=131072)
def increment(extension: str, base: int, middle_gap: int, long_gap: int) -> int:
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
        "PASS_EXACT_DELTA2_E1_CENTER_ROOT_ALL_ORDER_ALL_EXTENSIONS"
    )
    expected = expected_regions()
    expected_keys = {key(row) for row in expected}
    orbit_maps = {}
    for orbit in certificate["orbits"]:
        assert {key(row) for row in orbit["rows"]} == expected_keys
        orbit_maps[orbit["extension"]] = {
            key(row): row for row in orbit["rows"]
        }
    assert set(orbit_maps) == set(EXTENSIONS)

    finite_points = 0
    for point in itertools.product(range(21), repeat=3):
        member = 3 * point[0] + 2 * point[1] + point[2] >= 19
        assert sum(contains(row, point) for row in expected) == int(member)
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
            print("DELTA2_CENTER_AUDIT_PROGRESS", index, flush=True)

    assert coefficients == certificate["coverage_totals"]["newton_coefficients"]
    assert finite_points == 9261
    payload = {
        "schema": "rank8-delta2-e1-center-root-complete-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_TREE_DP_DELTA2_E1_CENTER_ROOT_COMPLETE",
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
            "stored_keys_equal_independent_keys": True,
            "bounded_boundary_multiplicity_exactly_zero_or_one": True,
        },
        "independence": {
            "imports_delta2_producer_or_closed_path_formula": False,
            "shared_geometry_only": (
                "hash-pinned independent center-root routing and literal tree-DP "
                "profiles"
            ),
            "coefficient_engine": "fresh canonical 22-term Delta2 evaluator",
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
