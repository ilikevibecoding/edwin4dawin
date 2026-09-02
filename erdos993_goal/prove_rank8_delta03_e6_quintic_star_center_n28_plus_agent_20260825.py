#!/usr/bin/env python3
"""Exact Delta0--3 certificate for center-rooted e=6 quintic stars, n>=28."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e6_quintic_star_center_n28_plus_exact_agent_20260825.json"
MAX_GRADE = 8
RANKS = (0, 1, 2, 3)
SOURCE_SYMBOLS = (*c[3:9], h[6], h[7])
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_delta03_e6_skeleton_root_partition_exact_20260825.json":
        "B8D2D160F679361AED1D337B9E814DA6B985ACCD19434DF629887DE0E7AE5307",
    "rank8_delta03_e6_skeleton_root_partition_independent_audit_20260825.json":
        "247DF3AC57F265839055CCF258BCC1E946A0470BAE83F2B79E61F1D8BD17E65F",
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
    if isinstance(order, (int, sp.Integer)):
        literal = int(order)
        assert literal >= 0
        top = literal - grade + 1
        return sp.Integer(sp.binomial(top, grade) if top >= grade else 0)
    return choose_polynomial(order - grade + 1, grade)


def path_vector(order: sp.Expr) -> list[sp.Expr]:
    return [path_count(order, grade) for grade in range(MAX_GRADE + 1)]


def two_long_paths(total_order: sp.Expr) -> list[sp.Expr]:
    return [
        sp.expand(
            sum(
                path_count(total_order - 4 * selected_pairs, grade - 2 * selected_pairs)
                for selected_pairs in range(grade // 2 + 1)
            )
        )
        for grade in range(MAX_GRADE + 1)
    ]


def vector_product(factors: list[list[sp.Expr]]) -> list[sp.Expr]:
    values = [sp.Integer(1)] + [sp.Integer(0)] * MAX_GRADE
    for factor in factors:
        values = [
            sp.expand(sum(values[index] * factor[grade - index] for index in range(grade + 1)))
            for grade in range(MAX_GRADE + 1)
        ]
    return values


def build_profile(
    long_count: int, shorts: tuple[int, ...], shift: int
) -> tuple[dict[sp.Symbol, sp.Expr], tuple[sp.Symbol, ...]]:
    assert long_count + len(shorts) == 5
    excluded_factors: list[list[sp.Expr]] = []
    reduced_factors: list[list[sp.Expr]] = []
    if long_count == 5:
        L, S1, S2 = sp.symbols("L S1 S2", nonnegative=True, integer=True)
        variables = (L, S1, S2)
        excluded_factors.extend(
            [path_vector(L + 7 + shift), two_long_paths(S1 + 14), two_long_paths(S2 + 14)]
        )
        reduced_factors.extend(
            [path_vector(L + 6 + shift), two_long_paths(S1 + 12), two_long_paths(S2 + 12)]
        )
    elif long_count == 4:
        S1, S2 = sp.symbols("S1 S2", nonnegative=True, integer=True)
        variables = (S1, S2)
        excluded_factors.extend(
            [two_long_paths(S1 + 14 + shift), two_long_paths(S2 + 14)]
        )
        reduced_factors.extend(
            [two_long_paths(S1 + 12 + shift), two_long_paths(S2 + 12)]
        )
    elif long_count == 3:
        L, S = sp.symbols("L S", nonnegative=True, integer=True)
        variables = (L, S)
        excluded_factors.extend([path_vector(L + 7 + shift), two_long_paths(S + 14)])
        reduced_factors.extend([path_vector(L + 6 + shift), two_long_paths(S + 12)])
    elif long_count == 2:
        S = sp.symbols("S", nonnegative=True, integer=True)
        variables = (S,)
        excluded_factors.append(two_long_paths(S + 14 + shift))
        reduced_factors.append(two_long_paths(S + 12 + shift))
    elif long_count == 1:
        L = sp.symbols("L", nonnegative=True, integer=True)
        variables = (L,)
        excluded_factors.append(path_vector(L + 7 + shift))
        reduced_factors.append(path_vector(L + 6 + shift))
    elif long_count == 0:
        variables = ()
    else:
        raise ValueError(long_count)

    for short in shorts:
        assert 1 <= short <= 6
        excluded_factors.append(path_vector(short))
        reduced_factors.append(path_vector(short - 1))
    excluded = vector_product(excluded_factors)
    reduced = vector_product(reduced_factors)
    core = [
        sp.expand(excluded[grade] + (reduced[grade - 1] if grade else 0))
        for grade in range(MAX_GRADE + 1)
    ]
    profile = {c[grade]: core[grade] for grade in range(3, 9)}
    profile.update({h[6]: excluded[6], h[7]: excluded[7]})
    return profile, variables


DELTA_TERMS = {
    rank: sp.Poly(sp.expand(newton_coefficients(residual())[rank]), *SOURCE_SYMBOLS).terms()
    for rank in RANKS
}


def evaluate_expression(
    rank: int, profile: dict[sp.Symbol, sp.Expr], variables: tuple[sp.Symbol, ...]
) -> sp.Expr | sp.Poly:
    if not variables:
        answer = sp.Integer(0)
        for powers, coefficient in DELTA_TERMS[rank]:
            term = sp.Integer(coefficient)
            for symbol, power in zip(SOURCE_SYMBOLS, powers, strict=True):
                if power:
                    term *= profile[symbol] ** power
            answer += term
        return sp.expand(answer)

    values = {symbol: sp.Poly(value, *variables) for symbol, value in profile.items()}
    result = sp.Poly(0, *variables)
    for powers, coefficient in DELTA_TERMS[rank]:
        term = sp.Poly(coefficient, *variables)
        for symbol, power in zip(SOURCE_SYMBOLS, powers, strict=True):
            if power:
                term *= values[symbol] ** power
        result += term
    return result


def digest_terms(polynomial: sp.Poly | sp.Expr, variables: tuple[sp.Symbol, ...]) -> str:
    digest = hashlib.sha256()
    if variables:
        rows = polynomial.terms()
    else:
        rows = [((), sp.Integer(polynomial))]
    for powers, coefficient in rows:
        digest.update((",".join(map(str, powers)) + "|" + str(coefficient) + "\n").encode("ascii"))
    return digest.hexdigest().upper()


def evaluate_cell(long_count: int, shorts: tuple[int, ...], shift: int) -> dict[str, object]:
    profile, variables = build_profile(long_count, shorts, shift)
    ranks = {}
    for rank in RANKS:
        result = evaluate_expression(rank, profile, variables)
        if variables:
            coefficients = result.coeffs()
            degrees = list(result.degree_list())
            term_count = len(result.terms())
            constant = result.coeff_monomial((0,) * len(variables))
        else:
            coefficients = [sp.Integer(result)]
            degrees = []
            term_count = 1
            constant = sp.Integer(result)
        negative = sum(bool(value < 0) for value in coefficients)
        zero = sum(bool(value == 0) for value in coefficients)
        assert negative == zero == 0 and min(coefficients) > 0 and constant > 0
        ranks[str(rank)] = {
            "degrees": degrees,
            "terms": term_count,
            "negative_coefficients": negative,
            "zero_coefficients": zero,
            "minimum_coefficient": str(min(coefficients)),
            "constant_coefficient": str(constant),
            "ordered_term_sha256": digest_terms(result, variables),
        }
    return {
        "long_arms": long_count,
        "short_arms": list(shorts),
        "shift": shift,
        "variables": [str(variable) for variable in variables],
        "ranks": ranks,
    }


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    structural = json.loads(
        (HERE / "rank8_delta03_e6_skeleton_root_partition_exact_20260825.json").read_text(encoding="utf-8")
    )
    skeleton = structural["skeletons"][0]
    assert skeleton["name"] == "e6_skeleton_01"
    assert skeleton["degree_sequence"] == [5, 1, 1, 1, 1, 1]
    assert skeleton["degree_surplus"] == 6
    assert skeleton["root_location_partition"]["counts"]["branch"] == 1

    cells = []
    for long_count in range(5, 0, -1):
        short_count = 5 - long_count
        for shorts in itertools.combinations_with_replacement(range(1, 7), short_count):
            baseline_order = 1 + 7 * long_count + sum(shorts)
            needed = max(0, 28 - baseline_order)
            shift = math.ceil(needed / long_count)
            cell = evaluate_cell(long_count, shorts, shift)
            cell.update(
                {
                    "baseline_order_before_shift": baseline_order,
                    "offset_total_needed": needed,
                    "coverage": f"by long-arm symmetry and pigeonhole, one of {long_count} long offsets is >= {shift}",
                }
            )
            cells.append(cell)
            print("E6_CENTER_PASS", long_count, shorts, shift, flush=True)
            clear_cache()

    zero_long = []
    for shorts in itertools.combinations_with_replacement(range(1, 7), 5):
        order = 1 + sum(shorts)
        if order < 28:
            continue
        cell = evaluate_cell(0, shorts, 0)
        cell.update(
            {
                "baseline_order_before_shift": order,
                "offset_total_needed": 0,
                "coverage": "literal fixed all-short center-root cell",
            }
        )
        cells.append(cell)
        zero_long.append(shorts)
        print("E6_CENTER_PASS", 0, shorts, 0, flush=True)
    assert zero_long == [
        (3, 6, 6, 6, 6),
        (4, 5, 6, 6, 6),
        (4, 6, 6, 6, 6),
        (5, 5, 5, 6, 6),
        (5, 5, 6, 6, 6),
        (5, 6, 6, 6, 6),
        (6, 6, 6, 6, 6),
    ]
    assert len(cells) == 217
    expected_by_long = {5: 1, 4: 6, 3: 21, 2: 56, 1: 126, 0: 7}
    assert {count: sum(cell["long_arms"] == count for cell in cells) for count in range(6)} == expected_by_long

    totals = {
        str(rank): {
            "cells": len(cells),
            "coefficients": sum(cell["ranks"][str(rank)]["terms"] for cell in cells),
            "negative_coefficients": 0,
            "zero_coefficients": 0,
            "minimum_coefficient": str(
                min(sp.Rational(cell["ranks"][str(rank)]["minimum_coefficient"]) for cell in cells)
            ),
        }
        for rank in RANKS
    }
    payload = {
        "schema": "rank8-delta03-e6-quintic-star-center-n28-plus-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E6_QUINTIC_STAR_CENTER_N28_PLUS",
        "exact_scope": {
            "skeleton": "e6_skeleton_01, the five-arm star with one degree-5 center",
            "subdivisions": "all five positive arm lengths",
            "root": "the unique degree-5 center",
            "orders": "every n>=28",
            "ranks": [0, 1, 2, 3],
            "claim": "strict positivity of all four rooted rank-eight terminal values",
        },
        "no_gap_partition": {
            "long_arm": "X+7 with X>=0",
            "short_arm": "fixed length 1..6",
            "cells_by_long_arm_count": {str(key): value for key, value in expected_by_long.items()},
            "total_cells": 217,
            "all_short_orders": [28, 31],
            "all_short_cells": [list(row) for row in zero_long],
            "pairwise_disjoint": True,
            "exhausts_n28_plus": True,
        },
        "rank_totals": totals,
        "cells": cells,
        "immutable_input_hashes": actual_hashes,
        "scope_boundary": "Only the center-root orbit of e6_skeleton_01. Leaf and pendant-interior roots, the other nine e=6 skeletons, increments, and Problem 993 remain open.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("cells", len(cells), flush=True)
    print("rank_totals", totals, flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
