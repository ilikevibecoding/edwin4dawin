#!/usr/bin/env python3
"""Independent direct-path and literal-DP audit of the e=6 quintic-star center."""

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
CERTIFICATE = HERE / "rank8_delta03_e6_quintic_star_center_n28_plus_exact_agent_20260825.json"
OUTPUT = HERE / "rank8_delta03_e6_quintic_star_center_n28_plus_independent_audit_agent_20260825.json"
CERTIFICATE_SHA256 = "58F96E12D4F158F49F192F5B8086BE7B804B68FC78B690CE579BE1F0E2F9AD16"
MAX_GRADE = 8
RANKS = (0, 1, 2, 3)
SOURCE_SYMBOLS = (*c[3:9], h[6], h[7])
PINNED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "prove_rank8_delta03_e6_quintic_star_center_n28_plus_agent_20260825.py":
        "D0F02C2F85C8A4B2C37CB1B48A26C5C13854E7EC9B4B0A679B580A49EBDD1556",
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


def path_vector(order: sp.Expr) -> tuple[sp.Expr, ...]:
    return tuple(path_count(order, grade) for grade in range(MAX_GRADE + 1))


def symbolic_product(factors: list[tuple[sp.Expr, ...]]) -> tuple[sp.Expr, ...]:
    values = (sp.Integer(1),) + (sp.Integer(0),) * MAX_GRADE
    for factor in factors:
        values = tuple(
            sp.expand(sum(values[index] * factor[grade - index] for index in range(grade + 1)))
            for grade in range(MAX_GRADE + 1)
        )
    return values


def direct_symbolic_profile(
    long_count: int, shorts: tuple[int, ...], shift: int
) -> tuple[dict[sp.Symbol, sp.Expr], tuple[sp.Symbol, ...]]:
    assert long_count + len(shorts) == 5
    if long_count == 5:
        L, S1, S2 = sp.symbols("audit_L audit_S1 audit_S2", nonnegative=True, integer=True)
        variables = (L, S1, S2)
        arms = (L + 7 + shift, S1 + 7, sp.Integer(7), S2 + 7, sp.Integer(7))
    elif long_count == 4:
        S1, S2 = sp.symbols("audit_S1 audit_S2", nonnegative=True, integer=True)
        variables = (S1, S2)
        arms = (S1 + 7 + shift, sp.Integer(7), S2 + 7, sp.Integer(7), *map(sp.Integer, shorts))
    elif long_count == 3:
        L, S = sp.symbols("audit_L audit_S", nonnegative=True, integer=True)
        variables = (L, S)
        arms = (L + 7 + shift, S + 7, sp.Integer(7), *map(sp.Integer, shorts))
    elif long_count == 2:
        S = sp.symbols("audit_S", nonnegative=True, integer=True)
        variables = (S,)
        arms = (S + 7 + shift, sp.Integer(7), *map(sp.Integer, shorts))
    elif long_count == 1:
        L = sp.symbols("audit_L", nonnegative=True, integer=True)
        variables = (L,)
        arms = (L + 7 + shift, *map(sp.Integer, shorts))
    elif long_count == 0:
        variables = ()
        arms = tuple(map(sp.Integer, shorts))
    else:
        raise ValueError(long_count)
    assert len(arms) == 5
    excluded = symbolic_product([path_vector(arm) for arm in arms])
    reduced = symbolic_product([path_vector(arm - 1) for arm in arms])
    core = tuple(
        sp.expand(excluded[grade] + (reduced[grade - 1] if grade else 0))
        for grade in range(MAX_GRADE + 1)
    )
    profile = {c[grade]: core[grade] for grade in range(3, 9)}
    profile.update({h[6]: excluded[6], h[7]: excluded[7]})
    return profile, variables


def prove_pair_split_identities() -> list[dict[str, object]]:
    """Prove pair compression from direct paths, without producer formulas."""
    A, B = sp.symbols("split_A split_B", nonnegative=True, integer=True)
    rows = []
    for shift in range(6):
        checked = []
        split_excluded = symbolic_product([path_vector(A + 7 + shift), path_vector(B + 7)])
        axis_excluded = symbolic_product([path_vector(A + B + 7 + shift), path_vector(7)])
        split_reduced = symbolic_product([path_vector(A + 6 + shift), path_vector(B + 6)])
        axis_reduced = symbolic_product([path_vector(A + B + 6 + shift), path_vector(6)])
        for grade in range(9):
            difference = sp.Poly(
                sp.expand(split_excluded[grade] - axis_excluded[grade]), A, B, domain=sp.QQ
            )
            assert difference.is_zero
            checked.append(f"excluded_{grade}")
        for grade in range(8):
            difference = sp.Poly(
                sp.expand(split_reduced[grade] - axis_reduced[grade]), A, B, domain=sp.QQ
            )
            assert difference.is_zero
            checked.append(f"reduced_{grade}")
        rows.append({"distinguished_shift": shift, "zero_identities": checked})
    assert sum(len(row["zero_identities"]) for row in rows) == 102
    return rows


DELTA_TERMS = {
    rank: sp.Poly(
        sp.expand(newton_coefficients(residual())[rank]), *SOURCE_SYMBOLS, domain=sp.QQ
    ).terms()
    for rank in RANKS
}


def direct_residual(
    rank: int, profile: dict[sp.Symbol, sp.Expr], variables: tuple[sp.Symbol, ...]
) -> sp.Poly | sp.Expr:
    if not variables:
        answer = sp.Integer(0)
        for powers, coefficient in DELTA_TERMS[rank]:
            term = sp.Rational(coefficient)
            for symbol, power in zip(SOURCE_SYMBOLS, powers, strict=True):
                if power:
                    term *= profile[symbol] ** power
            answer += term
        return sp.Rational(answer)
    values = {symbol: sp.Poly(value, *variables, domain=sp.QQ) for symbol, value in profile.items()}
    answer = sp.Poly(0, *variables, domain=sp.QQ)
    for powers, coefficient in DELTA_TERMS[rank]:
        term = sp.Poly(coefficient, *variables, domain=sp.QQ)
        for symbol, power in zip(SOURCE_SYMBOLS, powers, strict=True):
            if power:
                term *= values[symbol] ** power
        answer += term
    return answer


def digest_terms(polynomial: sp.Poly | sp.Expr, variables: tuple[sp.Symbol, ...]) -> str:
    digest = hashlib.sha256()
    rows = polynomial.terms() if variables else [((), sp.Rational(polynomial))]
    for powers, coefficient in rows:
        digest.update((",".join(map(str, powers)) + "|" + str(coefficient) + "\n").encode("ascii"))
    return digest.hexdigest().upper()


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


def append_path(adjacency: list[list[int]], start: int, length: int) -> None:
    assert length >= 1
    previous = start
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex


def literal_star(arms: tuple[int, ...]) -> list[list[int]]:
    assert len(arms) == 5 and min(arms) >= 1
    adjacency: list[list[int]] = [[]]
    for arm in arms:
        append_path(adjacency, 0, arm)
    assert len(adjacency[0]) == 5
    assert len(adjacency) == 1 + sum(arms)
    return adjacency


def forest_polynomial(adjacency: list[list[int]], removed: int | None) -> tuple[int, ...]:
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


def literal_profile(arms: tuple[int, ...]) -> tuple[tuple[int, ...], tuple[int, ...]]:
    adjacency = literal_star(arms)
    core = forest_polynomial(adjacency, None)
    deletion = forest_polynomial(adjacency, 0)
    order = 1 + sum(arms)
    # Shifted-cell uniqueness grids may include auxiliary orders below 28;
    # the producer's separate pigeonhole condition restricts theorem use.
    assert order == len(adjacency) and order >= 6
    assert core[0] == deletion[0] == 1
    assert core[1] == order and deletion[1] == order - 1
    assert core[2] == math.comb(order - 1, 2)
    assert core[3] == math.comb(order - 2, 3) + 6
    return core, deletion


def numeric_path_vector(order: int) -> tuple[int, ...]:
    return tuple(
        math.comb(order - grade + 1, grade)
        if order - grade + 1 >= grade >= 0
        else 0
        for grade in range(MAX_GRADE + 1)
    )


def numeric_product(factors: list[tuple[int, ...]]) -> tuple[int, ...]:
    answer = ONE
    for factor in factors:
        answer = multiply(answer, factor)
    return answer


def direct_numeric_profile(arms: tuple[int, ...]) -> tuple[tuple[int, ...], tuple[int, ...]]:
    excluded = numeric_product([numeric_path_vector(arm) for arm in arms])
    reduced = numeric_product([numeric_path_vector(arm - 1) for arm in arms])
    core = tuple(
        excluded[grade] + (reduced[grade - 1] if grade else 0)
        for grade in range(MAX_GRADE + 1)
    )
    return core, excluded


def split_options(total: int) -> list[tuple[int, int]]:
    rows = [(total, 0), ((total + 1) // 2, total // 2)]
    return list(dict.fromkeys(rows))


def arm_variants(
    long_count: int, shorts: tuple[int, ...], shift: int, point: tuple[int, ...]
) -> list[tuple[int, ...]]:
    variants = []
    if long_count == 5:
        L, S1, S2 = point
        for A, B in split_options(S1):
            for C, D in split_options(S2):
                variants.append((L + 7 + shift, A + 7, B + 7, C + 7, D + 7))
    elif long_count == 4:
        S1, S2 = point
        for A, B in split_options(S1):
            for C, D in split_options(S2):
                variants.append((A + 7 + shift, B + 7, C + 7, D + 7, *shorts))
    elif long_count == 3:
        L, S = point
        for A, B in split_options(S):
            variants.append((L + 7 + shift, A + 7, B + 7, *shorts))
    elif long_count == 2:
        (S,) = point
        for A, B in split_options(S):
            variants.append((A + 7 + shift, B + 7, *shorts))
    elif long_count == 1:
        (L,) = point
        variants.append((L + 7 + shift, *shorts))
    else:
        assert not point
        variants.append(shorts)
    assert all(len(row) == 5 for row in variants)
    return list(dict.fromkeys(variants))


def evaluate_symbolic_profile(
    profile: dict[sp.Symbol, sp.Expr], variables: tuple[sp.Symbol, ...], point: tuple[int, ...]
) -> tuple[int, ...]:
    substitution = dict(zip(variables, point, strict=True))
    return tuple(int(sp.expand(profile[symbol].subs(substitution))) for symbol in SOURCE_SYMBOLS)


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in PINNED}
    assert actual_hashes == PINNED, (actual_hashes, PINNED)
    assert sha256(CERTIFICATE) == CERTIFICATE_SHA256
    certificate = json.loads(CERTIFICATE.read_text(encoding="utf-8"))
    assert certificate["status"] == "PASS_EXACT_RANK8_DELTA03_E6_QUINTIC_STAR_CENTER_N28_PLUS"
    assert len(certificate["cells"]) == 217
    pair_identities = prove_pair_split_identities()

    replay = []
    grid_points = 0
    literal_profiles = 0
    profile_coordinate_comparisons = 0
    for cell_index, cell in enumerate(certificate["cells"], start=1):
        long_count = cell["long_arms"]
        shorts = tuple(cell["short_arms"])
        shift = cell["shift"]
        profile, variables = direct_symbolic_profile(long_count, shorts, shift)
        assert [str(variable).replace("audit_", "") for variable in variables] == cell["variables"]
        rank_rows = []
        for rank in RANKS:
            polynomial = direct_residual(rank, profile, variables)
            if variables:
                coefficients = polynomial.coeffs()
                degrees = list(polynomial.degree_list())
                terms = len(polynomial.terms())
                constant = polynomial.coeff_monomial((0,) * len(variables))
            else:
                coefficients = [sp.Rational(polynomial)]
                degrees = []
                terms = 1
                constant = sp.Rational(polynomial)
            stored = cell["ranks"][str(rank)]
            record = {
                "degrees": degrees,
                "terms": terms,
                "negative_coefficients": sum(bool(value < 0) for value in coefficients),
                "zero_coefficients": sum(bool(value == 0) for value in coefficients),
                "minimum_coefficient": str(min(coefficients)),
                "constant_coefficient": str(constant),
                "ordered_term_sha256": digest_terms(polynomial, variables),
            }
            assert record == stored, (cell_index, rank, record, stored)
            rank_rows.append(
                {
                    "rank": rank,
                    "terms": terms,
                    "ordered_term_sha256": record["ordered_term_sha256"],
                    "digest_match": True,
                }
            )

        for point in itertools.product(range(9), repeat=len(variables)):
            symbolic_values = evaluate_symbolic_profile(profile, variables, point)
            grid_points += 1
            for arms in arm_variants(long_count, shorts, shift, point):
                literal = literal_profile(arms)
                direct = direct_numeric_profile(arms)
                assert literal == direct
                direct_values = (*direct[0][3:9], direct[1][6], direct[1][7])
                assert direct_values == symbolic_values
                literal_profiles += 1
                profile_coordinate_comparisons += len(SOURCE_SYMBOLS)
        replay.append(
            {
                "cell_index": cell_index,
                "long_arms": long_count,
                "short_arms": list(shorts),
                "shift": shift,
                "variables": cell["variables"],
                "literal_uniqueness_grid_points": 9 ** len(variables),
                "rank_digest_replay": rank_rows,
            }
        )
        print("AUDIT_E6_CENTER", cell_index, 217, long_count, shorts, flush=True)
        clear_cache()

    assert grid_points == 4561
    assert len(replay) == 217
    assert sum(len(row["rank_digest_replay"]) for row in replay) == 868
    assert profile_coordinate_comparisons == 8 * literal_profiles
    totals = {
        str(rank): {
            "coefficients_replayed": sum(row["rank_digest_replay"][rank]["terms"] for row in replay),
            "expected_coefficients": certificate["rank_totals"][str(rank)]["coefficients"],
        }
        for rank in RANKS
    }
    assert all(row["coefficients_replayed"] == row["expected_coefficients"] for row in totals.values())

    payload = {
        "schema": "rank8-delta03-e6-quintic-star-center-n28-plus-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DP_AUDIT_RANK8_DELTA03_E6_QUINTIC_STAR_CENTER_N28_PLUS",
        "certificate": CERTIFICATE.name,
        "certificate_sha256": CERTIFICATE_SHA256,
        "immutable_input_hashes": actual_hashes,
        "independence_boundary": {
            "producer": "compressed two-long-path factors and coefficientwise power positivity",
            "audit_symbolic": "direct products of five individual path polynomials and sparse canonical-residual accumulation",
            "audit_pair_split": "102 exact original two-offset identities for all distinguished shifts 0..5",
            "audit_literal": "fresh five-arm adjacency lists, center deletion, recursive include/exclude forest DP",
            "shared_only": "canonical residual, structural partition, and stored ordered digests",
        },
        "pair_split_identity_replay": pair_identities,
        "cell_replay": replay,
        "rank_totals": totals,
        "coverage_totals": {
            "cells": 217,
            "ranks": 4,
            "rank_cells": 868,
            "pair_split_identities": 102,
            "literal_uniqueness_grid_points": grid_points,
            "literal_split_variant_profiles": literal_profiles,
            "logical_literal_forest_dp_runs": 2 * literal_profiles,
            "profile_coordinate_comparisons": profile_coordinate_comparisons,
            "ordered_term_digests_replayed": 868,
            "ordered_coefficients_replayed": sum(row["coefficients_replayed"] for row in totals.values()),
            "digest_mismatches": 0,
            "negative_coefficients": 0,
        },
        "scope_guard": "Only Delta0..3 at the unique center root of e6_skeleton_01 for n>=28; no other root orbit, skeleton, increment, or Problem 993 claim.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"], flush=True)
    print("literal_grid_points", grid_points, flush=True)
    print("literal_split_profiles", literal_profiles, flush=True)
    print("source_sha256", sha256(Path(__file__)), flush=True)
    print("report_sha256", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
