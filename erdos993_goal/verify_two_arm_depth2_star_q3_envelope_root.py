#!/usr/bin/env python3
"""All-rank q3 envelope for arbitrary two-arm depth-two stars.

The tree has a centre adjacent to two arm vertices; the arms carry a and b
pendant leaves.  For every supported rank r>=3 this verifier proves that
q_(r+1)<=q_r, hence q_r<=q_3.  This family includes the asymptotically
tight once-subdivided stars (one of a,b is zero).
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "two_arm_depth2_star_q3_envelope_exact_root_20260828.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def counts(a: int, b: int, rank: int) -> tuple[int, int]:
    """Return i_r and s_r for r>=3 from the closed forms."""
    assert rank >= 3
    total = a + b
    independent = (
        choose(total + 1, rank)
        + choose(a, rank - 1)
        + choose(b, rank - 1)
    )
    one_edge = (
        (b + 1) * choose(a, rank - 1)
        + (a + 1) * choose(b, rank - 1)
    )
    return independent, one_edge


def symbolic_adjacent_certificate() -> dict[str, object]:
    a, b, k, U, V, Z = sp.symbols(
        "a b k U V Z", integer=True, nonnegative=True
    )
    numerator = (b + 1) * U + (a + 1) * V
    denominator = (k + 1) * (Z + U + V)

    next_u = U * (a - k) / (k + 1)
    next_v = V * (b - k) / (k + 1)
    next_z = Z * (a + b - k) / (k + 2)
    next_numerator = (b + 1) * next_u + (a + 1) * next_v
    next_denominator = (k + 2) * (next_z + next_u + next_v)
    cross = sp.factor(numerator * next_denominator - next_numerator * denominator)

    polynomial = sp.factor(
        a**2 * k
        + 2 * a**2
        - 2 * a * b * k
        - 2 * a * b
        - a * k
        + a
        + b**2 * k
        + 2 * b**2
        - b * k
        + b
        - 2 * k
    )
    expected_cleared = sp.expand(
        (k + 1) * Z * (b * (b + 1) * U + a * (a + 1) * V)
        + (b + 1) * U**2 * (a - k)
        + (a + 1) * V**2 * (b - k)
        + U * V * polynomial
    )
    assert sp.expand((k + 1) * cross - expected_cleared) == 0

    A, B = sp.symbols("A B", integer=True, nonnegative=True)
    active_form = sp.factor(polynomial.subs({a: k + A, b: k + B}))
    manifest_active = (
        k * (A - B) ** 2
        + 2 * (A**2 - A * B + B**2)
        + (k + 1) * (A + B)
    )
    assert sp.expand(active_form - manifest_active) == 0

    return {
        "rank_parameter": "k=r-1>=2",
        "coefficient_symbols": {
            "U": "binomial(a,k)",
            "V": "binomial(b,k)",
            "Z": "binomial(a+b+1,k+1)",
        },
        "q_numerator": str(numerator),
        "q_denominator": str(denominator),
        "cleared_adjacent_cross_decomposition": (
            "(k+1)Z[b(b+1)U+a(a+1)V]+(b+1)U^2(a-k)"
            "+(a+1)V^2(b-k)+UV*P(a,b,k)"
        ),
        "mixed_coefficient": str(polynomial),
        "mixed_coefficient_when_both_active": (
            "k(A-B)^2+2(A^2-A*B+B^2)+(k+1)(A+B), "
            "where A=a-k and B=b-k"
        ),
        "positivity_cases": [
            (
                "If U,V>0, then A=a-k and B=b-k are nonnegative; the "
                "displayed sum of squares and nonnegative terms proves the "
                "mixed coefficient is nonnegative."
            ),
            (
                "If U=0 or V=0, the mixed term and the corresponding inactive "
                "square vanish; every remaining term is nonnegative."
            ),
        ],
    }


def literal_tree(a: int, b: int) -> tuple[int, tuple[frozenset[int], ...]]:
    edges: list[frozenset[int]] = []
    first_arm, second_arm = 1, 2
    edges.extend((frozenset((0, first_arm)), frozenset((0, second_arm))))
    next_vertex = 3
    for arm, leaves in ((first_arm, a), (second_arm, b)):
        for _ in range(leaves):
            edges.append(frozenset((arm, next_vertex)))
            next_vertex += 1
    return next_vertex, tuple(edges)


def literal_audit() -> dict[str, object]:
    cases = 0
    rank_checks = 0
    subset_checks = 0
    minimum_cross = None
    minimum_positive_cross = None
    for a in range(0, 7):
        for b in range(0, a + 1):
            n, edges = literal_tree(a, b)

            def induced_edges(chosen: tuple[int, ...]) -> int:
                selected = frozenset(chosen)
                return sum(edge <= selected for edge in edges)

            previous = None
            for rank in range(3, n + 1):
                independent_literal = 0
                for chosen in itertools.combinations(range(n), rank):
                    independent_literal += induced_edges(chosen) == 0
                one_edge_literal = 0
                if rank + 1 <= n:
                    for chosen in itertools.combinations(range(n), rank + 1):
                        one_edge_literal += induced_edges(chosen) == 1
                subset_checks += choose(n, rank) + choose(n, rank + 1)

                independent_formula, one_edge_formula = counts(a, b, rank)
                assert (independent_literal, one_edge_literal) == (
                    independent_formula,
                    one_edge_formula,
                )
                if not independent_literal:
                    continue
                current = (one_edge_literal, rank * independent_literal)
                if previous is not None:
                    cross = previous[0] * current[1] - current[0] * previous[1]
                    assert cross >= 0
                    minimum_cross = (
                        cross if minimum_cross is None else min(minimum_cross, cross)
                    )
                    if cross > 0:
                        minimum_positive_cross = (
                            cross
                            if minimum_positive_cross is None
                            else min(minimum_positive_cross, cross)
                        )
                    rank_checks += 1
                previous = current
            cases += 1

    # A much larger closed-form replay exercises inactive-binomial boundaries
    # without literal subset enumeration.
    closed_form_cases = 0
    closed_form_rank_checks = 0
    for a in range(0, 201):
        for b in range(0, a + 1):
            previous = None
            for rank in range(3, a + b + 3):
                independent, one_edge = counts(a, b, rank)
                if not independent:
                    continue
                current = (one_edge, rank * independent)
                if previous is not None:
                    assert previous[0] * current[1] >= current[0] * previous[1]
                    closed_form_rank_checks += 1
                previous = current
            closed_form_cases += 1

    return {
        "literal_parameter_range": "0<=b<=a<=6",
        "literal_cases": cases,
        "literal_rank_checks": rank_checks,
        "literal_subset_checks": subset_checks,
        "minimum_adjacent_cross": minimum_cross,
        "minimum_positive_adjacent_cross": minimum_positive_cross,
        "closed_form_parameter_range": "0<=b<=a<=200",
        "closed_form_cases": closed_form_cases,
        "closed_form_rank_checks": closed_form_rank_checks,
    }


def sharp_family() -> dict[str, object]:
    m, r = sp.symbols("m r", integer=True, nonnegative=True)
    # b=0 gives i_r=C(m,r)+2C(m,r-1), s_r=C(m,r-1).
    ratio = sp.factor(1 / (m + r + 1))
    q3 = ratio.subs(r, 3)
    return {
        "family": "b=0, the once-subdivided star on m+3 vertices",
        "q_r": str(ratio),
        "q_3": str(q3),
        "q_r_over_q3": str(sp.factor(ratio / q3)),
        "sharpness": "For fixed r and m tending to infinity, q_r/q3 tends to 1.",
    }


def main() -> None:
    symbolic = symbolic_adjacent_certificate()
    audit = literal_audit()
    payload = {
        "schema": "two-arm-depth2-star-q3-envelope-root-v1",
        "status": "PASS_EXACT_ALL_RANK_TWO_ARM_DEPTH2_STAR_Q3_ENVELOPE_THEOREM",
        "theorem": (
            "For every depth-two star with two arms carrying arbitrary "
            "nonnegative leaf multiplicities a,b, the sequence q_r is "
            "nonincreasing on its supported ranks r>=3. Hence q_r<=q3."
        ),
        "closed_forms_for_r_at_least_3": {
            "i_r": "C(a+b+1,r)+C(a,r-1)+C(b,r-1)",
            "s_r": "(b+1)C(a,r-1)+(a+1)C(b,r-1)",
            "q_r": "s_r/(r*i_r)",
        },
        "symbolic_certificate": symbolic,
        "audit": audit,
        "asymptotically_sharp_subfamily": sharp_family(),
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves the all-rank q3 envelope only for depth-two stars with "
            "exactly two arms. More-arm trees can fail adjacent monotonicity, and "
            "arbitrary trees and Erdos Problem 993 remain separate."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("LITERAL_CASES", audit["literal_cases"])
    print("LITERAL_SUBSET_CHECKS", audit["literal_subset_checks"])
    print("CLOSED_FORM_RANK_CHECKS", audit["closed_form_rank_checks"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
