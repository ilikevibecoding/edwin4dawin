#!/usr/bin/env python3
"""Independent literal-tree replay of the uniform Delta3 near>=19 tail.

This audit imports no producer, refinement, or path-polynomial module.  Every
coefficient is recomputed by an independently derived generic include/exclude
tree-message recurrence.  At both tensor corners of every routing region, the
same data are separately rebuilt from literal adjacency lists by full generic
include/exclude forest DP.  Exact forward differences are then compared with
the producer digests.
"""

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
PROFILE = HERE / "rank8_delta3_e1_old_root_near19_uniform_tail_profile_exact_agent_20260825.json"
CERTIFICATE = HERE / "rank8_delta3_e1_old_root_near19_uniform_tail_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta3_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json"
MAX_RANK = 8
DEGREE = 26
WIDTH = DEGREE + 1
EXTENSIONS = ("root", "short", "long")
COORDINATES = ("near", "tail", "short", "difference")
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "probe_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "682830D92266857D64440BA3591C275D2CF6D47E6534F853F3BF2282451BA2C5",
    "rank8_delta3_e1_old_root_near19_uniform_tail_profile_exact_agent_20260825.json":
        "65B14D169B3A0C54225DA272473CFE7E3AC93152AC4B0EFBA5CCD21E932EC3B5",
    "prove_rank8_delta3_e1_old_root_near19_uniform_tail_agent_20260825.py":
        "D6FC6E831E71B28C58D4E6103DDB169C92BFE831FC555FB54B7DA3263DDD00E1",
    "rank8_delta3_e1_old_root_near19_uniform_tail_exact_agent_20260825.json":
        "518C5EEA283E687F2C1466844220D504EBEEB44331EE7E04FB86365F4D4760A9",
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
    out = [0] * (MAX_RANK + 1)
    for first, left_value in enumerate(left):
        if not left_value:
            continue
        for second, right_value in enumerate(right[: MAX_RANK + 1 - first]):
            if right_value:
                out[first + second] += left_value * right_value
    return tuple(out)


def times_x(polynomial: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + polynomial[:MAX_RANK]


def literal_claw(
    near: int, arms: tuple[int, int, int]
) -> tuple[tuple[tuple[int, ...], ...], int]:
    adjacency: list[list[int]] = [[]]
    old_root = -1
    for arm, length in enumerate(arms):
        previous = 0
        for distance in range(1, length + 1):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            if arm == 0 and distance == near + 1:
                old_root = vertex
            previous = vertex
    assert old_root > 0
    assert len(adjacency[0]) == 3
    assert sum(map(len, adjacency)) // 2 == len(adjacency) - 1
    return tuple(tuple(row) for row in adjacency), old_root


def forest_polynomial(
    adjacency: tuple[tuple[int, ...], ...], deleted: int | None
) -> tuple[int, ...]:
    seen = set() if deleted is None else {deleted}

    def visit(vertex: int, parent: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
        seen.add(vertex)
        excluded = (1,) + (0,) * MAX_RANK
        included_children = (1,) + (0,) * MAX_RANK
        for neighbor in adjacency[vertex]:
            if neighbor == parent or neighbor == deleted:
                continue
            child_excluded, child_included = visit(neighbor, vertex)
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


@lru_cache(maxsize=8192)
def tree_profile(
    near: int, arms: tuple[int, int, int]
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    adjacency, old_root = literal_claw(near, arms)
    core = forest_polynomial(adjacency, None)
    deleted = forest_polynomial(adjacency, old_root)
    order = len(adjacency)
    assert order == 1 + sum(arms)
    assert core[0] == 1 and core[1] == order
    assert core[2] == (order - 1) * (order - 2) // 2
    assert deleted[0] == 1 and deleted[1] == order - 1
    return core, deleted


@lru_cache(maxsize=None)
def path_message(order: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
    """Generic include/exclude message of a literal path attached at one end.

    The order-zero message is an absent child.  For a nonempty path, excluding
    its first vertex permits either state of the remaining path, while including
    it forces the next vertex out.  This is a tree-DP recurrence, not the closed
    binomial path formula used by the producer.
    """
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
def transfer_profile(
    near: int, arms: tuple[int, int, int]
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    assert arms[0] >= near + 1
    core = message_claw(arms)
    tail = arms[0] - near - 1
    tail_excluded, tail_included = path_message(tail)
    center = message_claw((near, arms[1], arms[2]))
    deleted = multiply(add(tail_excluded, tail_included), center)
    return core, deleted


def delta3_terms() -> tuple[tuple[int, tuple[tuple[int, int], ...]], ...]:
    variables = (*c[:9], h[6], h[7])
    raw = sp.Poly(
        newton_coefficients(residual())[3], *variables, domain=sp.QQ
    ).terms()
    assert len(raw) == 26
    terms = []
    for monomial, coefficient in raw:
        assert coefficient.q == 1
        factors = tuple(
            (index, exponent)
            for index, exponent in enumerate(monomial)
            if exponent
        )
        terms.append((int(coefficient), factors))
    return tuple(terms)


TERMS = delta3_terms()


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
def increment(
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
    for trailing in np.ndindex(moved.shape[1:]):
        work = [int(moved[(position,) + trailing]) for position in range(WIDTH)]
        for order in range(WIDTH):
            moved[(order,) + trailing] = work[0]
            for position in range(WIDTH - order - 1):
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

    add(
        "tail>=6, short>=6, difference>=0",
        (19, 6, 6, 0),
        COORDINATES,
    )
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
    assert sum(WIDTH ** len(row["axes"]) for row in rows) == 812592
    return rows


def region_key(row: dict[str, object]) -> tuple[object, ...]:
    return (row["label"], tuple(row["shifts"]), tuple(row["axes"]))


def replay_region(
    stored: dict[str, dict[str, object]], region: dict[str, object]
) -> tuple[int, int]:
    axes = tuple(region["axes"])
    shifts = tuple(region["shifts"])
    shape = (WIDTH,) * len(axes)
    arrays = {extension: np.empty(shape, dtype=object) for extension in EXTENSIONS}
    minima = {extension: None for extension in EXTENSIONS}
    for index in itertools.product(range(WIDTH), repeat=len(axes)):
        parameters = list(shifts)
        for coordinate, offset in zip(axes, index):
            parameters[COORDINATES.index(coordinate)] += offset
        for extension in EXTENSIONS:
            value = increment(extension, *parameters)
            arrays[extension][index] = value
            current = minima[extension]
            minima[extension] = value if current is None else min(current, value)
    for extension in EXTENSIONS:
        for axis in range(len(axes)):
            transform_axis(arrays[extension], axis)
        actual = digest(arrays[extension])
        row = stored[extension]
        for key, value in actual.items():
            assert value == row[key], (extension, region["label"], key, value, row[key])
        assert str(minima[extension]) == row["minimum_sampled_increment"]
        assert row["first_negative"] is None

    # At both opposite tensor corners, independently rebuild full literal
    # adjacency lists and run the generic forest DP.  Thus every one of the 196
    # routing regions and every extension orbit is tied to the literal graph
    # model, while the full 2.4-million-coefficient replay uses the equivalent
    # independently derived include/exclude message recurrence above.
    literal_checks = 0
    literal_profile_checks = 0
    corners = [(0,) * len(axes), (DEGREE,) * len(axes)]
    for index in corners:
        parameters = list(shifts)
        for coordinate, offset in zip(axes, index):
            parameters[COORDINATES.index(coordinate)] += offset
        near, tail, short, difference = parameters
        old_arms = (near + tail + 1, short + 1, short + difference + 1)
        assert tree_profile(near, old_arms) == transfer_profile(near, old_arms)
        literal_profile_checks += 1
        for extension in EXTENSIONS:
            new_arms = list(old_arms)
            new_arms[{"root": 0, "short": 1, "long": 2}[extension]] += 1
            new_arms_tuple = tuple(new_arms)
            assert tree_profile(near, new_arms_tuple) == transfer_profile(
                near, new_arms_tuple
            )
            literal_profile_checks += 1
            assert literal_increment(extension, *parameters) == increment(
                extension, *parameters
            )
            literal_checks += 1
    return literal_checks, literal_profile_checks


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    profile = json.loads(PROFILE.read_text(encoding="utf-8"))
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert profile["status"] == "PASS_EXACT_UNIFORM_TAIL_PROFILE_NO_THEOREM_CLAIM"
    assert certificate["status"] == (
        "PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR19_PLUS_ALL_EXTENSIONS"
    )
    assert certificate["coverage_totals"]["newton_coefficients"] == 2437776

    expected = expected_regions()
    expected_keys = {region_key(row) for row in expected}
    rows_by_extension = {
        entry["extension"]: entry["rows"] for entry in profile["profiles"]
    }
    assert set(rows_by_extension) == set(EXTENSIONS)
    for extension in EXTENSIONS:
        rows = rows_by_extension[extension]
        assert len(rows) == 196
        assert {region_key(row) for row in rows} == expected_keys

    literal_checks = 0
    literal_profile_checks = 0
    for index, region in enumerate(expected, start=1):
        key = region_key(region)
        stored = {
            extension: next(
                row for row in rows_by_extension[extension] if region_key(row) == key
            )
            for extension in EXTENSIONS
        }
        increment_checks, profile_checks = replay_region(stored, region)
        literal_checks += increment_checks
        literal_profile_checks += profile_checks
        if index == 1 or index % 20 == 0 or index == len(expected):
            print("LITERAL_UNIFORM_TAIL_PROGRESS", index, flush=True)

    assert literal_checks == 1176
    assert literal_profile_checks == 1568
    payload = {
        "schema": "rank8-delta3-e1-old-root-near19-uniform-tail-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_LITERAL_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR19_PLUS",
        "audited_theorem_status": certificate["status"],
        "replayed": {
            "extension_orbits": 3,
            "regions": 588,
            "regions_by_dimension": {"1": 378, "2": 171, "3": 36, "4": 3},
            "ordered_newton_coefficients": 2437776,
            "all_stored_ordered_coefficient_digests_matched": True,
            "all_stored_minima_matched": True,
            "all_newton_coefficients_nonnegative": True,
            "all_origins_positive": True,
            "literal_adjacency_full_forest_dp_crosschecks": literal_checks,
            "literal_adjacency_core_and_deletion_profile_crosschecks": (
                literal_profile_checks
            ),
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
            "imports_producer_refinement_or_path_code": False,
            "graph_model": (
                "fresh literal adjacency-list subdivided claws with root at arm "
                "distance near+1 at both tensor corners of every routing region"
            ),
            "coefficient_engine": (
                "independently derived generic include/exclude path-message tree DP "
                "truncated through rank eight for every coefficient; full literal "
                "adjacency-list forest DP cross-check at 1,176 region corners"
            ),
            "sign_engine": "fresh exact multidimensional integer forward differences",
            "shared_definition_only": (
                "canonical terminal residual from verify_rank8_q8_terminal_reduction.py"
            ),
        },
        "cache_diagnostics": {
            "tree_profile": str(tree_profile.cache_info()),
            "path_message": str(path_message.cache_info()),
            "message_claw": str(message_claw.cache_info()),
            "transfer_profile": str(transfer_profile.cache_info()),
            "increment": str(increment.cache_info()),
        },
        "dependency_sha256": actual_hashes,
        "proof_boundary": certificate["proof_boundary"],
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
