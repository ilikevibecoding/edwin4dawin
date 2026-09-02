#!/usr/bin/env python3
"""Exact Delta2/3 value certificate for all all-long e=2 leaf roots.

The selected leaf is deleted independently of the degree-two-root packages.
The resulting asymmetric 6/7-buffered path pair is first proved to depend
only on its total offset through grade seven, the only deletion grades used
by the canonical rank-eight residual.  The full rooted profile then collapses
to a single total-order ray, on which exact Newton coefficients certify
strict positivity.

This is a rooted VALUE result, not a leaf-extension increment.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta23_e2_all_long_leaf_root_value_exact_agent_20260825.json"
MAX_GRADE = 8
RANKS = (2, 3)
DEGREE_BOUNDS = {2: 27, 3: 26}
ACTUAL_DEGREES = {2: 26, 3: 25}
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


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


def two_long_paths(total_order: sp.Expr, grade: int) -> sp.Expr:
    if grade < 0:
        return sp.Integer(0)
    return sp.expand(
        sum(
            path_count(total_order - 4 * selected_pairs, grade - 2 * selected_pairs)
            for selected_pairs in range(grade // 2 + 1)
        )
    )


def direct_two_path_product(
    first_order: sp.Expr, second_order: sp.Expr, grade: int
) -> sp.Expr:
    if grade < 0:
        return sp.Integer(0)
    return sp.expand(
        sum(
            path_count(first_order, first_grade)
            * path_count(second_order, grade - first_grade)
            for first_grade in range(grade + 1)
        )
    )


def prove_pair_compressions() -> dict[str, object]:
    """Prove both the ordinary 7/7 pair and deleted-leaf 6/7 pair."""
    A, B = sp.symbols("pair_A pair_B", nonnegative=True, integer=True)
    ordinary = []
    for grade in range(MAX_GRADE + 1):
        excluded = sp.Poly(
            sp.expand(
                direct_two_path_product(A + 7, B + 7, grade)
                - two_long_paths(A + B + 14, grade)
            ),
            A,
            B,
            domain=sp.QQ,
        )
        included = sp.Poly(
            sp.expand(
                direct_two_path_product(A + 6, B + 6, grade - 1)
                - two_long_paths(A + B + 12, grade - 1)
            ),
            A,
            B,
            domain=sp.QQ,
        )
        assert excluded.is_zero and included.is_zero
        ordinary.extend((f"ordinary_excluded_{grade}", f"ordinary_included_{grade}"))

    deleted = []
    for grade in range(8):
        excluded = sp.Poly(
            sp.expand(
                direct_two_path_product(A + 6, B + 7, grade)
                - two_long_paths(A + B + 13, grade)
            ),
            A,
            B,
            domain=sp.QQ,
        )
        included = sp.Poly(
            sp.expand(
                direct_two_path_product(A + 5, B + 6, grade - 1)
                - two_long_paths(A + B + 11, grade - 1)
            ),
            A,
            B,
            domain=sp.QQ,
        )
        assert excluded.is_zero and included.is_zero
        deleted.extend((f"leaf_deleted_excluded_{grade}", f"leaf_deleted_included_{grade}"))

    return {
        "ordinary_pair_zero_identities": ordinary,
        "ordinary_pair_identity_count": len(ordinary),
        "leaf_deleted_pair_zero_identities": deleted,
        "leaf_deleted_pair_identity_count": len(deleted),
        "leaf_deleted_pair_grade_boundary": "grades 0..7 exactly; grade 8 is neither used nor claimed",
    }


def pair_states(offset_sum: sp.Expr) -> tuple[tuple[sp.Expr, ...], tuple[sp.Expr, ...]]:
    excluded = tuple(
        two_long_paths(offset_sum + 14, grade)
        for grade in range(MAX_GRADE + 1)
    )
    included = (sp.Integer(0),) + tuple(
        two_long_paths(offset_sum + 12, grade - 1)
        for grade in range(1, MAX_GRADE + 1)
    )
    return excluded, included


def leaf_deleted_pair_states(
    offset_sum: sp.Expr,
) -> tuple[tuple[sp.Expr, ...], tuple[sp.Expr, ...]]:
    # Only coordinates through grade seven are consumed from this pair.
    excluded = tuple(
        two_long_paths(offset_sum + 13, grade)
        for grade in range(MAX_GRADE + 1)
    )
    included = (sp.Integer(0),) + tuple(
        two_long_paths(offset_sum + 11, grade - 1)
        for grade in range(1, MAX_GRADE + 1)
    )
    return excluded, included


def add(*polynomials: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    return tuple(
        sp.expand(sum(polynomial[index] for polynomial in polynomials))
        for index in range(MAX_GRADE + 1)
    )


def multiply(
    left: tuple[sp.Expr, ...], right: tuple[sp.Expr, ...]
) -> tuple[sp.Expr, ...]:
    return tuple(
        sp.expand(sum(left[index] * right[grade - index] for index in range(grade + 1)))
        for grade in range(MAX_GRADE + 1)
    )


def product(*polynomials: tuple[sp.Expr, ...]) -> tuple[sp.Expr, ...]:
    answer = (sp.Integer(1),) + (sp.Integer(0),) * MAX_GRADE
    for polynomial in polynomials:
        answer = multiply(answer, polynomial)
    return answer


def double_core(
    left0: tuple[sp.Expr, ...],
    left1: tuple[sp.Expr, ...],
    right0: tuple[sp.Expr, ...],
    right1: tuple[sp.Expr, ...],
    bridge: sp.Expr,
) -> tuple[sp.Expr, ...]:
    return add(
        product(left0, right0, path_vector(bridge - 1)),
        product(left1, right0, path_vector(bridge - 2)),
        product(left0, right1, path_vector(bridge - 2)),
        product(left1, right1, path_vector(bridge - 3)),
    )


def leaf_profile() -> tuple[
    tuple[sp.Symbol, ...], tuple[sp.Expr, ...], tuple[sp.Expr, ...]
]:
    selected_pair, far_pair, bridge_offset = sp.symbols(
        "selected_pair far_pair bridge_offset", nonnegative=True, integer=True
    )
    left0, left1 = pair_states(selected_pair)
    right0, right1 = pair_states(far_pair)
    bridge = bridge_offset + 8
    core = double_core(left0, left1, right0, right1, bridge)
    deleted0, deleted1 = leaf_deleted_pair_states(selected_pair)
    deletion = double_core(deleted0, deleted1, right0, right1, bridge)
    return (selected_pair, far_pair, bridge_offset), core, deletion


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


def prove_translation() -> tuple[
    sp.Symbol,
    tuple[sp.Expr, ...],
    tuple[sp.Expr, ...],
    dict[str, object],
]:
    variables, core, deletion = leaf_profile()
    selected_pair, far_pair, bridge_offset = variables
    T = sp.symbols("T", nonnegative=True, integer=True)
    substitution = {selected_pair: T, far_pair: 0, bridge_offset: 0}
    reference_core = tuple(sp.expand(value.subs(substitution)) for value in core)
    reference_deletion = tuple(sp.expand(value.subs(substitution)) for value in deletion)
    total = sum(variables)
    checks = []
    for label, actual, expected in [
        *[(f"c{grade}", core[grade], reference_core[grade]) for grade in range(MAX_GRADE + 1)],
        ("h6", deletion[6], reference_deletion[6]),
        ("h7", deletion[7], reference_deletion[7]),
    ]:
        difference = sp.Poly(
            sp.expand(actual - expected.subs(T, total)), *variables, domain=sp.QQ
        )
        assert difference.is_zero, (label, difference.terms()[:3])
        checks.append({"coordinate": label, "difference_is_zero": True})

    order = 37 + T
    assert sp.expand(reference_core[0] - 1) == 0
    assert sp.expand(reference_core[1] - order) == 0
    assert sp.expand(reference_deletion[1] - (order - 1)) == 0
    assert sp.expand(reference_core[2] - choose_polynomial(order - 1, 2)) == 0
    assert sp.expand(reference_core[3] - (choose_polynomial(order - 2, 3) + 2)) == 0
    return T, reference_core, reference_deletion, {
        "compressed_variables": [str(variable) for variable in variables],
        "total_offset": str(total),
        "checks": checks,
        "profile_coordinates_checked": 11,
        "reference_profile_power_sha256": profile_digest(T, reference_core, reference_deletion),
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
    weights = tuple(range(9)) + (6, 7)
    assert max(
        sum(weights[index] * exponent for index, exponent in factors)
        for _coefficient, factors in rows
    ) == DEGREE_BOUNDS[rank]
    return tuple(rows)


TERMS = {rank: rank_terms(rank) for rank in RANKS}


def residual_polynomial(
    rank: int,
    T: sp.Symbol,
    core: tuple[sp.Expr, ...],
    deletion: tuple[sp.Expr, ...],
) -> sp.Poly:
    values = (*core, deletion[6], deletion[7])
    expression = sp.Integer(0)
    for coefficient, factors in TERMS[rank]:
        term = sp.Integer(coefficient)
        for index, exponent in factors:
            term *= values[index] ** exponent
        expression += term
    result = sp.Poly(sp.expand(expression), T, domain=sp.QQ)
    assert result.degree() == ACTUAL_DEGREES[rank]
    return result


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


def certify_rank(
    rank: int,
    T: sp.Symbol,
    core: tuple[sp.Expr, ...],
    deletion: tuple[sp.Expr, ...],
) -> dict[str, object]:
    polynomial = residual_polynomial(rank, T, core, deletion)
    degree_bound = DEGREE_BOUNDS[rank]
    samples = [int(polynomial.eval(offset)) for offset in range(degree_bound + 1)]
    newton = forward_differences(samples)
    power = [sp.Rational(polynomial.nth(degree)) for degree in range(degree_bound + 1)]
    assert all(value >= 0 for value in newton)
    assert newton[0] > 0
    assert all(value >= 0 for value in power)
    assert power[0] > 0
    assert newton[-1] == 0 and power[-1] == 0
    return {
        "rank": rank,
        "coordinate": "T=n-37",
        "degree_bound": degree_bound,
        "actual_degree": polynomial.degree(),
        "entries": degree_bound + 1,
        "sample_values": {
            "negative": sum(value < 0 for value in samples),
            "zero": sum(value == 0 for value in samples),
            "positive": sum(value > 0 for value in samples),
            "minimum": str(min(samples)),
            "origin": str(samples[0]),
            "ordered_sha256": digest_lines(samples),
        },
        "newton_coefficients": {
            "negative": sum(value < 0 for value in newton),
            "zero": sum(value == 0 for value in newton),
            "positive": sum(value > 0 for value in newton),
            "minimum": str(min(newton)),
            "origin": str(newton[0]),
            "ordered_sha256": digest_lines(newton),
            "order": "increasing Newton order, including the terminal zero guard",
        },
        "power_coefficients": {
            "negative": sum(bool(value < 0) for value in power),
            "zero": sum(bool(value == 0) for value in power),
            "positive": sum(bool(value > 0) for value in power),
            "minimum": str(min(power)),
            "origin": str(power[0]),
            "ordered_sha256": digest_lines(power),
            "order": "increasing power degree, including the terminal zero guard",
        },
    }


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    pair_compressions = prove_pair_compressions()
    T, core, deletion, translation = prove_translation()
    cases = [certify_rank(rank, T, core, deletion) for rank in RANKS]
    assert sum(case["entries"] for case in cases) == 55
    assert all(case["newton_coefficients"]["negative"] == 0 for case in cases)
    assert all(int(case["newton_coefficients"]["origin"]) > 0 for case in cases)

    payload = {
        "schema": "rank8-delta23-e2-all-long-leaf-root-value-v1",
        "status": "PASS_EXACT_DELTA23_E2_ALL_LONG_LEAF_ROOT_VALUE",
        "exact_scope": {
            "tree": "e=2 double claw with all four pendant arms >=7 and branch bridge >=8",
            "root": "any one of the four degree-1 pendant leaves",
            "orbit_multiplicity": "all four leaves, including arm swaps and branch reversal",
            "ranks": [2, 3],
            "orders": "n=37+T for every integer T>=0",
            "claim": "strict positivity of the rooted rank-eight residual VALUE",
        },
        "immutable_input_hashes": actual_hashes,
        "pair_compression_lemmas": pair_compressions,
        "translation_identity": translation,
        "univariate_basis": {
            "coordinate": "T=n-37",
            "newton_monomial": "binom(T,k)",
            "strict_positivity": "all Newton coefficients nonnegative and the origin strictly positive",
            "degree_guards": DEGREE_BOUNDS,
        },
        "cases": cases,
        "coverage_totals": {
            "root_families": 1,
            "literal_leaf_orbits": 4,
            "rank_cells": 2,
            "pair_compression_identities": 34,
            "profile_translation_identities": 11,
            "ordered_sample_values": 55,
            "ordered_newton_coefficients": 55,
            "ordered_power_coefficients": 55,
            "negative_newton_coefficients": 0,
            "all_origins_strictly_positive": True,
        },
        "not_claimed": [
            "no leaf-extension increment or inserted-new-leaf value",
            "no short pendant arm or branch bridge outside the all-long source class",
            "no complete e=2 layer or Problem 993 theorem",
        ],
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("profile_digest", translation["reference_profile_power_sha256"], flush=True)
    for case in cases:
        print(
            "DELTA",
            case["rank"],
            "newton",
            case["newton_coefficients"],
            "power",
            case["power_coefficients"],
            flush=True,
        )
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
