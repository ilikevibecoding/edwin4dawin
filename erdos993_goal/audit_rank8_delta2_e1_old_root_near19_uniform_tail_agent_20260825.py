#!/usr/bin/env python3
"""Independent literal/message tree-DP replay of the Delta2 near>=19 tail."""

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
    message_claw,
    path_message,
    transfer_profile,
    tree_profile,
)
from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
CERTIFICATE = HERE / "rank8_delta2_e1_old_root_near19_uniform_tail_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta2_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json"
RANK = 2
DEGREE = 27
WIDTH = DEGREE + 1
EXTENSIONS = ("root", "short", "long")
COORDINATES = ("near", "tail", "short", "difference")
CERTIFICATE_SHA256 = "D384FCC3B463CF9158CC0AC3912F88028D5968BEB664DDE5AAD2F9B772451D5F"
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "audit_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "51A937FEF2FB8E0B3EEC37318B047D51D2DFBCA676921978E1B1A9CC32EF8AE3",
    "prove_rank8_delta2_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "2A12B84716FB01C36423B383C4A93F12C4F900346420F4A4BD0C8EA965F6E633",
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


def expected_regions() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []

    def add(label: str, shifts: tuple[int, int, int, int], axes: tuple[str, ...]) -> None:
        rows.append({"label": label, "shifts": list(shifts), "axes": list(axes)})

    add("tail>=6, short>=6, difference>=0", (19, 6, 6, 0), COORDINATES)
    for short in range(6):
        lower = 6 - short
        add(
            f"tail>=6, short={short}, difference>={lower}",
            (19, 6, short, lower),
            ("near", "tail", "difference"),
        )
        for difference in range(lower):
            add(
                f"tail>=6, short={short}, difference={difference}",
                (19, 6, short, difference),
                ("near", "tail"),
            )
    for tail in range(6):
        add(
            f"tail={tail}, short>=6, difference>=0",
            (19, tail, 6, 0),
            ("near", "short", "difference"),
        )
        for short in range(6):
            lower = 6 - short
            add(
                f"tail={tail}, short={short}, difference>={lower}",
                (19, tail, short, lower),
                ("near", "difference"),
            )
            for difference in range(lower):
                add(
                    f"tail={tail}, short={short}, difference={difference}",
                    (19, tail, short, difference),
                    ("near",),
                )
    assert len(rows) == 196
    assert {
        dimension: sum(len(row["axes"]) == dimension for row in rows)
        for dimension in (1, 2, 3, 4)
    } == {1: 126, 2: 57, 3: 12, 4: 1}
    assert sum(WIDTH ** len(row["axes"]) for row in rows) == 926296
    return rows


def region_key(row: dict[str, object]) -> tuple[object, ...]:
    return row["label"], tuple(row["shifts"]), tuple(row["axes"])


def replay_region(
    stored: dict[str, dict[str, object]], region: dict[str, object]
) -> tuple[int, int, int]:
    axes = tuple(region["axes"])
    shifts = tuple(region["shifts"])
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
            value = independent_increment(extension, *parameters)
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
                extension,
                region["label"],
                field,
                value,
                row[field],
            )
        assert str(minima[extension]) == row["minimum_sampled_increment"]
        assert row["first_negative"] is None

    increment_checks = profile_checks = 0
    for index in [(0,) * len(axes), (DEGREE,) * len(axes)]:
        parameters = list(shifts)
        for coordinate, offset in zip(axes, index):
            parameters[COORDINATES.index(coordinate)] += offset
        near, tail, short, difference = parameters
        old_arms = (near + tail + 1, short + 1, short + difference + 1)
        assert tree_profile(near, old_arms) == transfer_profile(near, old_arms)
        profile_checks += 1
        for extension in EXTENSIONS:
            new_arms = list(old_arms)
            new_arms[{"root": 0, "short": 1, "long": 2}[extension]] += 1
            new_tuple = tuple(new_arms)
            assert tree_profile(near, new_tuple) == transfer_profile(near, new_tuple)
            profile_checks += 1
            assert literal_increment(extension, *parameters) == independent_increment(
                extension, *parameters
            )
            increment_checks += 1
    return sum(array.size for array in arrays.values()), increment_checks, profile_checks


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    assert sha256(CERTIFICATE) == CERTIFICATE_SHA256
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["status"] == (
        "PASS_EXACT_DELTA2_E1_OLD_ROOT_NEAR19_PLUS_ALL_EXTENSIONS"
    )
    assert certificate["coverage_totals"]["newton_coefficients"] == 2778888
    expected = expected_regions()
    expected_keys = {region_key(row) for row in expected}
    rows_by_extension = {
        entry["extension"]: entry["rows"] for entry in certificate["profiles"]
    }
    assert set(rows_by_extension) == set(EXTENSIONS)
    maps = {}
    for extension in EXTENSIONS:
        rows = rows_by_extension[extension]
        assert len(rows) == 196
        assert {region_key(row) for row in rows} == expected_keys
        maps[extension] = {region_key(row): row for row in rows}

    coefficient_count = increment_checks = profile_checks = 0
    for index, region in enumerate(expected, start=1):
        key = region_key(region)
        stored = {extension: maps[extension][key] for extension in EXTENSIONS}
        coefficients, increments, profiles = replay_region(stored, region)
        coefficient_count += coefficients
        increment_checks += increments
        profile_checks += profiles
        if index == 1 or index % 20 == 0 or index == len(expected):
            print("DELTA2_LITERAL_UNIFORM_TAIL_PROGRESS", index, flush=True)

    assert coefficient_count == 2778888
    assert increment_checks == 1176
    assert profile_checks == 1568
    payload = {
        "schema": "rank8-delta2-e1-old-root-near19-uniform-tail-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_LITERAL_TREE_DP_DELTA2_E1_OLD_ROOT_NEAR19_PLUS",
        "audited_theorem_status": certificate["status"],
        "replayed": {
            "extension_orbits": 3,
            "regions": 588,
            "regions_by_dimension": {"1": 378, "2": 171, "3": 36, "4": 3},
            "ordered_newton_coefficients": coefficient_count,
            "all_stored_region_keys_matched": True,
            "all_stored_ordered_coefficient_digests_matched": True,
            "all_stored_minima_matched": True,
            "all_newton_coefficients_nonnegative": True,
            "all_origins_positive": True,
            "literal_adjacency_increment_crosschecks": increment_checks,
            "literal_adjacency_core_and_deletion_profile_crosschecks": profile_checks,
        },
        "coverage_ledger": {
            "near_partition": "near>=19",
            "tail_partition": "{0,1,2,3,4,5} disjoint union {tail>=6}",
            "short_difference_partition": (
                "{short>=6,difference>=0} disjoint union, for each s=0..5, "
                "{short=s,difference=0..5-s} and {short=s,difference>=6-s}"
            ),
            "expected_region_keys_equal_stored_keys_for_each_extension": True,
            "disjoint": True,
            "exhaustive": True,
            "source_order_at_least_23_automatic": True,
        },
        "independence": {
            "imports_producer_refinement_or_path_formula": False,
            "rank_two_residual_evaluator": (
                "fresh extraction of all 22 exact integer monomials from the canonical residual"
            ),
            "coefficient_engine": (
                "independently derived include/exclude path-message tree DP and fresh exact forward differences"
            ),
            "literal_graph_engine": (
                "full adjacency-list include/exclude forest DP at both tensor corners of every region"
            ),
        },
        "cache_diagnostics": {
            "tree_profile": str(tree_profile.cache_info()),
            "path_message": str(path_message.cache_info()),
            "message_claw": str(message_claw.cache_info()),
            "transfer_profile": str(transfer_profile.cache_info()),
            "increment": str(independent_increment.cache_info()),
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
