#!/usr/bin/env python3
"""Independent original-coordinate and literal-DP audit of e=2 leaf roots."""

from __future__ import annotations

import hashlib
import json
import math
import os
from functools import lru_cache
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
CERTIFICATE = HERE / "rank8_delta23_e2_all_long_leaf_root_value_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta23_e2_all_long_leaf_root_value_independent_audit_agent_20260825.json"
CERTIFICATE_SHA256 = "3E35AE742BBFEEE39D17DA7AAE2E3DA53B611220CCDC5FE9D950A129687EA5F5"
MAX_GRADE = 8
RANKS = (2, 3)
DEGREE_BOUNDS = {2: 27, 3: 26}
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "prove_rank8_delta23_e2_all_long_leaf_root_value_agent_20260825.py":
        "61C407C7C94B2CB5CAE7E7E0F886B9C16FC82AF6F6701596AC4799D97424712F",
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
    path = []
    previous = start
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        path.append(vertex)
        previous = vertex
    return path


def literal_double_claw(
    left_a: int,
    left_b: int,
    bridge: int,
    right_a: int,
    right_b: int,
) -> tuple[list[list[int]], dict[str, list[int] | int]]:
    adjacency: list[list[int]] = [[]]
    left_root = 0
    left_a_path = append_path(adjacency, left_root, left_a)
    left_b_path = append_path(adjacency, left_root, left_b)
    bridge_path = append_path(adjacency, left_root, bridge)
    right_root = bridge_path[-1]
    right_a_path = append_path(adjacency, right_root, right_a)
    right_b_path = append_path(adjacency, right_root, right_b)
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


@lru_cache(maxsize=8192)
def literal_profile(
    parameters: tuple[int, int, int, int, int], selected_orbit: int
) -> tuple[tuple[int, ...], tuple[int, ...]]:
    assert len(parameters) == 5 and selected_orbit in range(4)
    A, B, C, D, G = parameters
    adjacency, paths = literal_double_claw(A + 7, B + 7, G + 8, C + 7, D + 7)
    path_name = ("left_a", "left_b", "right_a", "right_b")[selected_orbit]
    root = paths[path_name][-1]
    assert isinstance(root, int) and len(adjacency[root]) == 1
    core = forest_polynomial(adjacency, None)
    deletion = forest_polynomial(adjacency, root)
    order = 37 + sum(parameters)
    assert len(adjacency) == order
    assert core[0] == deletion[0] == 1
    assert core[1] == order and deletion[1] == order - 1
    assert core[2] == math.comb(order - 1, 2)
    assert core[3] == math.comb(order - 2, 3) + 2
    return core, deletion


def choose_polynomial(top: sp.Expr, grade: int) -> sp.Expr:
    if grade < 0:
        return sp.Integer(0)
    return sp.prod(top - shift for shift in range(grade)) / sp.factorial(grade)


def path_count(order: sp.Expr, grade: int) -> sp.Expr:
    if grade < 0:
        return sp.Integer(0)
    return choose_polynomial(order - grade + 1, grade)


def path_vector(order: sp.Expr) -> tuple[sp.Expr, ...]:
    return tuple(path_count(order, grade) for grade in range(MAX_GRADE + 1))


def symbolic_add(*polynomials: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    return tuple(
        sp.expand(sum(polynomial[index] for polynomial in polynomials))
        for index in range(MAX_GRADE + 1)
    )


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
    first: sp.Expr, second: sp.Expr
) -> tuple[tuple[sp.Expr, ...], tuple[sp.Expr, ...]]:
    return (
        symbolic_product(path_vector(first), path_vector(second)),
        symbolic_shift(symbolic_product(path_vector(first - 1), path_vector(second - 1))),
    )


def symbolic_double_core(
    left0: tuple[sp.Expr, ...],
    left1: tuple[sp.Expr, ...],
    right0: tuple[sp.Expr, ...],
    right1: tuple[sp.Expr, ...],
    bridge: sp.Expr,
) -> tuple[sp.Expr, ...]:
    return symbolic_add(
        symbolic_product(left0, right0, path_vector(bridge - 1)),
        symbolic_product(left1, right0, path_vector(bridge - 2)),
        symbolic_product(left0, right1, path_vector(bridge - 2)),
        symbolic_product(left1, right1, path_vector(bridge - 3)),
    )


def audit_symbolic_translation() -> dict[str, object]:
    A, B, C, D, G = sp.symbols("audit_A audit_B audit_C audit_D audit_G", nonnegative=True, integer=True)
    variables = (A, B, C, D, G)
    left0, left1 = direct_pair_states(A + 7, B + 7)
    right0, right1 = direct_pair_states(C + 7, D + 7)
    core = symbolic_double_core(left0, left1, right0, right1, G + 8)
    deleted0, deleted1 = direct_pair_states(A + 6, B + 7)
    deletion = symbolic_double_core(deleted0, deleted1, right0, right1, G + 8)
    T = sp.symbols("audit_T", nonnegative=True, integer=True)
    substitution = {A: T, B: 0, C: 0, D: 0, G: 0}
    reference_core = tuple(sp.expand(value.subs(substitution)) for value in core)
    reference_deletion = tuple(sp.expand(value.subs(substitution)) for value in deletion)
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
        assert difference.is_zero, (label, difference.terms()[:3])
        checked.append(label)
    return {
        "original_variables": [str(variable) for variable in variables],
        "total_offset": str(total),
        "zero_profile_differences": checked,
    }


def rank_terms(rank: int) -> tuple[tuple[int, tuple[tuple[int, int], ...]], ...]:
    variables = (*c[:9], h[6], h[7])
    raw = sp.Poly(newton_coefficients(residual())[rank], *variables, domain=sp.QQ).terms()
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


def evaluate(
    rank: int, profile: tuple[tuple[int, ...], tuple[int, ...]]
) -> int:
    core, deletion = profile
    values = (*core, deletion[6], deletion[7])
    answer = 0
    for coefficient, factors in TERMS[rank]:
        term = coefficient
        for index, exponent in factors:
            term *= values[index] ** exponent
        answer += term
    return answer


def axis_and_balanced(total: int) -> list[tuple[int, int, int, int, int]]:
    rows = []
    for axis in range(5):
        row = [0] * 5
        row[axis] = total
        rows.append(tuple(row))
    balanced = [total // 5] * 5
    for index in range(total % 5):
        balanced[index] += 1
    rows.append(tuple(balanced))
    return rows


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
    expression = sum(
        coefficient * choose_polynomial(T, order)
        for order, coefficient in enumerate(newton)
    )
    polynomial = sp.Poly(sp.expand(expression), T, domain=sp.QQ)
    return [sp.Rational(polynomial.nth(degree)) for degree in range(len(newton))]


def summary(values: list[object]) -> dict[str, object]:
    return {
        "negative": sum(bool(value < 0) for value in values),
        "zero": sum(bool(value == 0) for value in values),
        "positive": sum(bool(value > 0) for value in values),
        "minimum": str(min(values)),
        "origin": str(values[0]),
        "ordered_sha256": digest_lines(values),
    }


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    assert sha256(CERTIFICATE) == CERTIFICATE_SHA256
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["status"] == "PASS_EXACT_DELTA23_E2_ALL_LONG_LEAF_ROOT_VALUE"
    symbolic = audit_symbolic_translation()
    assert len(symbolic["zero_profile_differences"]) == 11

    comparisons = 0
    for total in range(28):
        reference = literal_profile((total, 0, 0, 0, 0), 0)
        for parameters in axis_and_balanced(total):
            for orbit in range(4):
                assert literal_profile(parameters, orbit) == reference
                comparisons += 1
        print("AUDIT_LEAF_TOTAL", total, 27, flush=True)
    assert comparisons == 672

    replay = []
    for rank in RANKS:
        case = next(row for row in certificate["cases"] if row["rank"] == rank)
        samples = [
            evaluate(rank, literal_profile((total, 0, 0, 0, 0), 0))
            for total in range(DEGREE_BOUNDS[rank] + 1)
        ]
        newton = forward_differences(samples)
        power = power_from_newton(newton)
        records = {
            "sample_values": summary(samples),
            "newton_coefficients": summary(newton),
            "power_coefficients": summary(power),
        }
        for name, record in records.items():
            stored = {key: value for key, value in case[name].items() if key not in ("order",)}
            assert record == stored, (rank, name, record, stored)
        replay.append(
            {
                "rank": rank,
                "sample_values": records["sample_values"],
                "newton_coefficients": records["newton_coefficients"],
                "power_coefficients": records["power_coefficients"],
                "digest_match": True,
            }
        )

    payload = {
        "schema": "rank8-delta23-e2-all-long-leaf-root-value-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DP_AUDIT_DELTA23_E2_ALL_LONG_LEAF_ROOT_VALUE",
        "certificate": CERTIFICATE.name,
        "certificate_sha256": CERTIFICATE_SHA256,
        "immutable_input_hashes": actual_hashes,
        "independence_boundary": {
            "producer": "compressed long-pair formulas and a three-variable total-offset ray",
            "audit_symbolic": "direct original A,B,C,D,G path products, including the asymmetric deleted selected arm",
            "audit_literal": "fresh adjacency lists, actual endpoint roots in all four leaf orbits, recursive include/exclude forest DP",
            "shared_only": "canonical residual and stored ordered digests",
        },
        "symbolic_translation_replay": symbolic,
        "ordered_literal_replay": replay,
        "coverage_totals": {
            "literal_leaf_orbits": 4,
            "rank_cells": 2,
            "exact_symbolic_profile_identities": 11,
            "literal_profile_comparisons": comparisons,
            "ordered_samples_replayed": 55,
            "ordered_newton_coefficients_replayed": 55,
            "ordered_power_coefficients_replayed": 55,
            "digest_mismatches": 0,
            "negative_coefficients": 0,
        },
        "scope_guard": "Only Delta2/3 rooted VALUE for leaf roots in all-long e=2 double claws; no increments, short sources, full e=2 layer, or Problem 993 claim.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("profile_identities", payload["coverage_totals"]["exact_symbolic_profile_identities"], flush=True)
    print("literal_comparisons", comparisons, flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
