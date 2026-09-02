#!/usr/bin/env python3
"""Independent literal-DP audit of the all-long deep degree-2 e=2 cell.

The producer uses compressed two-path formulas.  This audit independently:

* derives the bridge and pendant profile-translation identities in the six
  original length offsets using direct products of two literal path formulas;
* builds actual double-claw adjacency lists for both root topologies and all
  five path orbits;
* runs recursive include/exclude forest DP; and
* replays every ordered univariate sample, Newton coefficient, and power
  coefficient recorded by the producer.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from functools import lru_cache
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
CERTIFICATE = HERE / "rank8_delta23_e2_all_long_deep_degree2_root_value_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta23_e2_all_long_deep_degree2_root_value_independent_audit_agent_20260825.json"
CERTIFICATE_SHA256 = "04C1CF61D334CBA6FD4999CE75FF9B5D54DD90C3EB6CEBEA8C78577C16E29D26"
MAX_GRADE = 8
RANKS = (2, 3)
DEGREE_BOUNDS = {2: 27, 3: 26}
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "prove_rank8_delta23_e2_all_long_deep_degree2_root_value_agent_20260825.py":
        "6F28332C5B3B358BCBADAEF6E6772C5F8D51574B71157988139FCC462843D75F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


ZERO = (0,) * (MAX_GRADE + 1)
ONE = (1,) + (0,) * MAX_GRADE


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[index] + right[index] for index in range(MAX_GRADE + 1))


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    answer = [0] * (MAX_GRADE + 1)
    for left_grade, left_value in enumerate(left):
        if not left_value:
            continue
        for right_grade, right_value in enumerate(right[: MAX_GRADE + 1 - left_grade]):
            if right_value:
                answer[left_grade + right_grade] += left_value * right_value
    return tuple(answer)


def times_x(polynomial: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + polynomial[:MAX_GRADE]


def append_path(adjacency: list[list[int]], start: int, length: int) -> list[int]:
    assert length >= 1
    vertices = []
    previous = start
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        vertices.append(vertex)
        previous = vertex
    return vertices


def literal_double_claw(
    left_a: int,
    left_b: int,
    bridge: int,
    right_a: int,
    right_b: int,
) -> tuple[list[list[int]], dict[str, object]]:
    adjacency: list[list[int]] = [[]]
    left_root = 0
    left_a_path = append_path(adjacency, left_root, left_a)
    left_b_path = append_path(adjacency, left_root, left_b)
    bridge_path = append_path(adjacency, left_root, bridge)
    right_root = bridge_path[-1]
    right_a_path = append_path(adjacency, right_root, right_a)
    right_b_path = append_path(adjacency, right_root, right_b)
    assert len(adjacency[left_root]) == len(adjacency[right_root]) == 3
    assert len(adjacency) == 1 + left_a + left_b + bridge + right_a + right_b
    return adjacency, {
        "left_root": left_root,
        "right_root": right_root,
        "left_a": left_a_path,
        "left_b": left_b_path,
        "bridge": bridge_path,
        "right_a": right_a_path,
        "right_b": right_b_path,
    }


def forest_polynomial(
    adjacency: list[list[int]], removed: int | None
) -> tuple[int, ...]:
    seen = set() if removed is None else {removed}

    def visit(vertex: int, parent: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
        seen.add(vertex)
        excluded = ONE
        included_children = ONE
        for child in adjacency[vertex]:
            if child == parent or child in seen:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded = multiply(excluded, add(child_excluded, child_included))
            included_children = multiply(included_children, child_excluded)
        return excluded, times_x(included_children)

    answer = ONE
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        excluded, included = visit(vertex, -1)
        answer = multiply(answer, add(excluded, included))
    return answer


def checked_profile(
    adjacency: list[list[int]], root: int, expected_order: int
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    assert len(adjacency) == expected_order
    assert len(adjacency[root]) == 2
    core = forest_polynomial(adjacency, None)
    deletion = forest_polynomial(adjacency, root)
    assert core[0] == deletion[0] == 1
    assert core[1] == expected_order and deletion[1] == expected_order - 1
    assert core[2] == math.comb(expected_order - 1, 2)
    assert core[3] == math.comb(expected_order - 2, 3) + 2
    return core, deletion


@lru_cache(maxsize=4096)
def literal_bridge_profile(
    A: int, B: int, C: int, D: int, N: int, M: int
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    offsets = (A, B, C, D, N, M)
    assert all(value >= 0 for value in offsets)
    adjacency, paths = literal_double_claw(
        A + 7, B + 7, N + M + 16, C + 7, D + 7
    )
    root = paths["bridge"][N + 7]
    assert len(adjacency[root]) == 2
    order = 45 + sum(offsets)
    return checked_profile(adjacency, root, order)


@lru_cache(maxsize=16384)
def literal_pendant_profile(
    N: int,
    U: int,
    B: int,
    C: int,
    D: int,
    G: int,
    selected_orbit: int,
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    offsets = (N, U, B, C, D, G)
    assert all(value >= 0 for value in offsets)
    assert selected_orbit in range(4)
    selected_length = N + U + 15
    paired_length = B + 7
    far_a = C + 7
    far_b = D + 7
    bridge = G + 8
    if selected_orbit == 0:
        lengths = (selected_length, paired_length, bridge, far_a, far_b)
        path_name = "left_a"
    elif selected_orbit == 1:
        lengths = (paired_length, selected_length, bridge, far_a, far_b)
        path_name = "left_b"
    elif selected_orbit == 2:
        lengths = (far_a, far_b, bridge, selected_length, paired_length)
        path_name = "right_a"
    else:
        lengths = (far_a, far_b, bridge, paired_length, selected_length)
        path_name = "right_b"
    adjacency, paths = literal_double_claw(*lengths)
    root = paths[path_name][N + 7]
    assert len(adjacency[root]) == 2
    order = 45 + sum(offsets)
    return checked_profile(adjacency, root, order)


def choose_polynomial(top: sp.Expr, grade: int) -> sp.Expr:
    if grade < 0:
        return sp.Integer(0)
    return sp.prod(top - shift for shift in range(grade)) / sp.factorial(grade)


def path_polynomial(order: sp.Expr, grade: int) -> sp.Expr:
    return choose_polynomial(order - grade + 1, grade)


def symbolic_path_vector(order: sp.Expr) -> tuple[sp.Expr, ...]:
    return tuple(path_polynomial(order, grade) for grade in range(MAX_GRADE + 1))


def symbolic_add(
    left: tuple[sp.Expr, ...], right: tuple[sp.Expr, ...]
) -> tuple[sp.Expr, ...]:
    return tuple(sp.expand(left[index] + right[index]) for index in range(MAX_GRADE + 1))


def symbolic_multiply(
    left: tuple[sp.Expr, ...], right: tuple[sp.Expr, ...]
) -> tuple[sp.Expr, ...]:
    return tuple(
        sp.expand(sum(left[index] * right[grade - index] for index in range(grade + 1)))
        for grade in range(MAX_GRADE + 1)
    )


def symbolic_product(*factors: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    answer = (sp.Integer(1),) + (sp.Integer(0),) * MAX_GRADE
    for factor in factors:
        answer = symbolic_multiply(answer, factor)
    return answer


def symbolic_shift(polynomial: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    return (sp.Integer(0),) + polynomial[:MAX_GRADE]


def direct_pair_states(
    first_length: sp.Expr, second_length: sp.Expr
) -> tuple[tuple[sp.Expr, ...], tuple[sp.Expr, ...]]:
    excluded = symbolic_product(
        symbolic_path_vector(first_length), symbolic_path_vector(second_length)
    )
    included = symbolic_shift(
        symbolic_product(
            symbolic_path_vector(first_length - 1),
            symbolic_path_vector(second_length - 1),
        )
    )
    return excluded, included


def symbolic_double_core(
    left0: tuple[sp.Expr, ...],
    left1: tuple[sp.Expr, ...],
    right0: tuple[sp.Expr, ...],
    right1: tuple[sp.Expr, ...],
    bridge: sp.Expr,
) -> tuple[sp.Expr, ...]:
    first = symbolic_product(left0, right0, symbolic_path_vector(bridge - 1))
    second = symbolic_product(left1, right0, symbolic_path_vector(bridge - 2))
    third = symbolic_product(left0, right1, symbolic_path_vector(bridge - 2))
    fourth = symbolic_product(left1, right1, symbolic_path_vector(bridge - 3))
    return tuple(
        sp.expand(first[index] + second[index] + third[index] + fourth[index])
        for index in range(MAX_GRADE + 1)
    )


def symbolic_claw(
    pair0: tuple[sp.Expr, ...],
    pair1: tuple[sp.Expr, ...],
    third_arm: sp.Expr,
) -> tuple[sp.Expr, ...]:
    return symbolic_add(
        symbolic_product(pair0, symbolic_path_vector(third_arm)),
        symbolic_product(pair1, symbolic_path_vector(third_arm - 1)),
    )


def direct_bridge_symbolic() -> tuple[
    tuple[sp.Symbol, ...], tuple[sp.Expr, ...], tuple[sp.Expr, ...]
]:
    A, B, C, D, N, M = sp.symbols("aA aB aC aD aN aM", nonnegative=True, integer=True)
    left0, left1 = direct_pair_states(A + 7, B + 7)
    right0, right1 = direct_pair_states(C + 7, D + 7)
    bridge = N + M + 16
    core = symbolic_double_core(left0, left1, right0, right1, bridge)
    deletion = symbolic_product(
        symbolic_claw(left0, left1, N + 7),
        symbolic_claw(right0, right1, M + 7),
    )
    return (A, B, C, D, N, M), core, deletion


def direct_pendant_symbolic() -> tuple[
    tuple[sp.Symbol, ...], tuple[sp.Expr, ...], tuple[sp.Expr, ...]
]:
    N, U, B, C, D, G = sp.symbols("pN pU pB pC pD pG", nonnegative=True, integer=True)
    left0, left1 = direct_pair_states(N + U + 15, B + 7)
    right0, right1 = direct_pair_states(C + 7, D + 7)
    bridge = G + 8
    core = symbolic_double_core(left0, left1, right0, right1, bridge)

    central_left0, central_left1 = direct_pair_states(N + 7, B + 7)
    central = symbolic_double_core(
        central_left0, central_left1, right0, right1, bridge
    )
    deletion = symbolic_product(symbolic_path_vector(U + 7), central)
    return (N, U, B, C, D, G), core, deletion


def profile_digest(
    T: sp.Symbol, core: tuple[sp.Expr, ...], deletion: tuple[sp.Expr, ...]
) -> str:
    digest = hashlib.sha256()
    for label, expression in [
        *[(f"c{grade}", core[grade]) for grade in range(MAX_GRADE + 1)],
        ("h6", deletion[6]),
        ("h7", deletion[7]),
    ]:
        polynomial = sp.Poly(expression, T, domain=sp.QQ)
        for degree in range(MAX_GRADE + 1):
            digest.update(f"{label}|{degree}|{polynomial.nth(degree)}\n".encode("ascii"))
    return digest.hexdigest().upper()


def independent_symbolic_translation(expected_digest: str) -> dict[str, object]:
    bridge_variables, bridge_core, bridge_deletion = direct_bridge_symbolic()
    pendant_variables, pendant_core, pendant_deletion = direct_pendant_symbolic()
    T = sp.symbols("audit_T", nonnegative=True, integer=True)
    A, B, C, D, N, M = bridge_variables
    reference_substitution = {A: T, B: 0, C: 0, D: 0, N: 0, M: 0}
    reference_core = tuple(sp.expand(value.subs(reference_substitution)) for value in bridge_core)
    reference_deletion = tuple(
        sp.expand(value.subs(reference_substitution)) for value in bridge_deletion
    )
    digest = profile_digest(T, reference_core, reference_deletion)
    assert digest == expected_digest

    rows = []
    for family, variables, core, deletion in (
        ("deep_bridge_original_six_offsets", bridge_variables, bridge_core, bridge_deletion),
        ("deep_pendant_original_six_offsets", pendant_variables, pendant_core, pendant_deletion),
    ):
        total = sum(variables)
        checked = []
        for label, actual, expected in [
            *[(f"c{grade}", core[grade], reference_core[grade]) for grade in range(MAX_GRADE + 1)],
            ("h6", deletion[6], reference_deletion[6]),
            ("h7", deletion[7], reference_deletion[7]),
        ]:
            difference = sp.Poly(
                sp.expand(actual - expected.subs(T, total)), *variables, domain=sp.QQ
            )
            assert difference.is_zero
            checked.append(label)
        rows.append(
            {
                "family": family,
                "variables": [str(variable) for variable in variables],
                "total": str(total),
                "zero_profile_differences": checked,
            }
        )
    return {
        "engine": "direct original-arm path products; no compressed pair-state import",
        "families": rows,
        "exact_zero_identities": 22,
        "reference_profile_power_sha256": digest,
    }


def rank_terms(rank: int) -> tuple[tuple[int, tuple[tuple[int, int], ...]], ...]:
    variables = (*c[:9], h[6], h[7])
    raw = sp.Poly(newton_coefficients(residual())[rank], *variables, domain=sp.QQ).terms()
    assert len(raw) == {2: 22, 3: 26}[rank]
    rows = []
    for monomial, coefficient in raw:
        assert coefficient.q == 1
        rows.append(
            (
                int(coefficient),
                tuple(
                    (index, exponent)
                    for index, exponent in enumerate(monomial)
                    if exponent
                ),
            )
        )
    return tuple(rows)


TERMS = {rank: rank_terms(rank) for rank in RANKS}


def evaluate(rank: int, profile: tuple[tuple[int, ...], tuple[int, ...]]) -> int:
    core, deletion = profile
    values = (*core, deletion[6], deletion[7])
    answer = 0
    for coefficient, factors in TERMS[rank]:
        term = coefficient
        for index, exponent in factors:
            term *= values[index] ** exponent
        answer += term
    return answer


def digest_lines(values: list[object]) -> str:
    digest = hashlib.sha256()
    for value in values:
        digest.update(str(value).encode("ascii"))
        digest.update(b"\n")
    return digest.hexdigest().upper()


def forward_differences(values: list[int]) -> list[int]:
    work = list(values)
    coefficients = []
    while work:
        coefficients.append(work[0])
        work = [work[index + 1] - work[index] for index in range(len(work) - 1)]
    return coefficients


def power_from_newton(newton: list[int]) -> list[sp.Rational]:
    T = sp.symbols("literal_T")
    expression = sp.Integer(0)
    for order, coefficient in enumerate(newton):
        expression += coefficient * choose_polynomial(T, order)
    polynomial = sp.Poly(sp.expand(expression), T, domain=sp.QQ)
    return [sp.Rational(polynomial.nth(degree)) for degree in range(len(newton))]


def six_axis_and_balanced(total: int) -> list[tuple[int, ...]]:
    rows = []
    for axis in range(6):
        row = [0] * 6
        row[axis] = total
        rows.append(tuple(row))
    balanced = [total // 6] * 6
    for index in range(total % 6):
        balanced[index] += 1
    rows.append(tuple(balanced))
    return rows


def literal_translation_checks() -> dict[str, object]:
    rows = []
    comparisons = 0
    forest_dp_runs = 0
    for total in range(28):
        reference = literal_bridge_profile(total, 0, 0, 0, 0, 0)
        for parameters in six_axis_and_balanced(total):
            assert literal_bridge_profile(*parameters) == reference
            comparisons += 1
            forest_dp_runs += 2
        for parameters in six_axis_and_balanced(total):
            for selected_orbit in range(4):
                assert literal_pendant_profile(*parameters, selected_orbit) == reference
                comparisons += 1
                forest_dp_runs += 2
        rows.append(
            {
                "T": total,
                "bridge_representatives": 7,
                "pendant_representatives_per_orbit": 7,
                "pendant_orbits": 4,
                "all_profiles_equal": True,
            }
        )
    assert comparisons == 28 * (7 + 7 * 4)
    return {
        "T_values": 28,
        "profile_comparisons": comparisons,
        "forest_dp_runs_in_comparisons": forest_dp_runs,
        "bridge_paths_covered": 1,
        "pendant_arm_orbits_covered": 4,
        "rows": rows,
    }


def replay_rank(rank: int, stored: dict[str, object]) -> dict[str, object]:
    width = DEGREE_BOUNDS[rank] + 1
    assert stored["rank"] == rank and stored["entries"] == width
    samples = [
        evaluate(rank, literal_bridge_profile(total, 0, 0, 0, 0, 0))
        for total in range(width)
    ]
    newton = forward_differences(samples)
    power = power_from_newton(newton)
    sample_record = {
        "negative": sum(value < 0 for value in samples),
        "zero": sum(value == 0 for value in samples),
        "positive": sum(value > 0 for value in samples),
        "minimum": str(min(samples)),
        "origin": str(samples[0]),
        "ordered_sha256": digest_lines(samples),
    }
    newton_record = {
        "negative": sum(value < 0 for value in newton),
        "zero": sum(value == 0 for value in newton),
        "positive": sum(value > 0 for value in newton),
        "minimum": str(min(newton)),
        "origin": str(newton[0]),
        "ordered_sha256": digest_lines(newton),
        "order": "increasing Newton order, including the terminal zero guard",
    }
    power_record = {
        "negative": sum(bool(value < 0) for value in power),
        "zero": sum(bool(value == 0) for value in power),
        "positive": sum(bool(value > 0) for value in power),
        "minimum": str(min(power)),
        "origin": str(power[0]),
        "ordered_sha256": digest_lines(power),
        "order": "increasing power degree, including the terminal zero guard",
    }
    assert sample_record == stored["sample_values"]
    assert newton_record == stored["newton_coefficients"]
    assert power_record == stored["power_coefficients"]
    assert newton_record["negative"] == power_record["negative"] == 0
    assert int(newton_record["origin"]) > 0
    return {
        "rank": rank,
        "literal_samples": sample_record,
        "literal_newton": newton_record,
        "literal_power": power_record,
        "all_ordered_digests_match": True,
    }


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    assert sha256(CERTIFICATE) == CERTIFICATE_SHA256
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["status"] == "PASS_EXACT_DELTA23_E2_ALL_LONG_DEEP_DEGREE2_ROOT_VALUE"
    assert certificate["coverage_totals"]["exact_profile_translation_identities"] == 22
    assert certificate["coverage_totals"]["ordered_newton_coefficients"] == 55
    stored = {case["rank"]: case for case in certificate["cases"]}
    assert set(stored) == set(RANKS)

    symbolic = independent_symbolic_translation(
        certificate["translation_identity"]["reference_profile_power_sha256"]
    )
    literal_translation = literal_translation_checks()
    replay = [replay_rank(rank, stored[rank]) for rank in RANKS]
    assert sum(row["literal_newton"]["positive"] + row["literal_newton"]["zero"] for row in replay) == 55

    payload = {
        "schema": "rank8-delta23-e2-all-long-deep-degree2-root-value-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DP_AUDIT_DELTA23_E2_ALL_LONG_DEEP_DEGREE2_ROOT_VALUE",
        "certificate": CERTIFICATE.name,
        "certificate_sha256": CERTIFICATE_SHA256,
        "immutable_input_hashes": actual_hashes,
        "independence_boundary": {
            "producer": "compressed pair-sum symbolic engine and univariate residual",
            "audit": "direct original six-offset path products plus literal adjacency-list include/exclude DP",
            "shared_only": "canonical residual definition and stored ordered digests",
        },
        "independent_symbolic_profile_translation": symbolic,
        "literal_translation_and_orbit_checks": literal_translation,
        "ordered_literal_replay": replay,
        "coverage_totals": {
            "rank_cells": 4,
            "root_families": 2,
            "literal_path_orbits": 5,
            "exact_symbolic_profile_identities": 22,
            "literal_profile_comparisons": literal_translation["profile_comparisons"],
            "literal_forest_dp_runs_in_comparisons": literal_translation["forest_dp_runs_in_comparisons"],
            "ordered_samples_replayed": 55,
            "ordered_newton_coefficients_replayed": 55,
            "ordered_power_coefficients_replayed": 55,
            "digest_mismatches": 0,
            "negative_coefficients": 0,
        },
        "scope_guard": "Only Delta2/3 rooted residual values at deep degree-2 bridge or pendant roots in the stated all-long e=2 buffers, n>=45. No shallow/root-boundary cell, leaf root, increment, complete e=2, or Problem 993 claim.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("symbolic_identities", payload["coverage_totals"]["exact_symbolic_profile_identities"], flush=True)
    print("literal_profile_comparisons", payload["coverage_totals"]["literal_profile_comparisons"], flush=True)
    for row in replay:
        print("DELTA", row["rank"], row["literal_newton"]["ordered_sha256"], flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
