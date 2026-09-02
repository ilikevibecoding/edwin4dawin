#!/usr/bin/env python3
"""Exact rank-eight Q8 and terminal-broom dependency replay.

This is an algebraic reduction, not an all-tree Q8 theorem.  It verifies
the rank-eight specialization of the general Q_k definition, the exact
terminal-broom split into Q8(A), Q7(A-q), and a residual, and its complete
Newton reconstruction in the number of sibling leaves.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


c = sp.symbols("c0:10", nonnegative=True)
h = sp.symbols("h0:9", nonnegative=True)
t = sp.symbols("t", integer=True, positive=True)


def choose_poly(variable: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(variable - j for j in range(rank)) / sp.factorial(rank)


def smoothed(rank: int) -> sp.Expr:
    return sum(choose_poly(t, j) * c[rank - j] for j in range(rank + 1))


def q8(p7: sp.Expr, p8: sp.Expr, p9: sp.Expr) -> sp.Expr:
    return 16 * p8**2 - p7 * p8 - 18 * p7 * p9


def q7(p6: sp.Expr, p7: sp.Expr, p8: sp.Expr) -> sp.Expr:
    return 14 * p7**2 - p6 * p7 - 16 * p6 * p8


def residual() -> sp.Expr:
    p7 = smoothed(7) + h[6]
    p8 = smoothed(8) + h[7]
    # c9 and h8 are paid by the two lower-core reserve terms.
    p9_open = sum(choose_poly(t, j) * c[9 - j] for j in range(1, 10))
    return sp.expand(
        8 * c[7] * h[6] * q8(p7, p8, p9_open)
        - 8 * h[6] * p7 * (16 * c[8] ** 2 - c[7] * c[8])
        - 9 * c[7] * p7 * (14 * h[7] ** 2 - h[6] * h[7])
    )


def newton_coefficients(expression: sp.Expr) -> list[sp.Expr]:
    degree = sp.Poly(expression, t).degree()
    values = [sp.expand(expression.subs(t, x)) for x in range(1, degree + 3)]
    out = [values[0]]
    for _ in range(1, degree + 1):
        values = [sp.expand(values[j + 1] - values[j]) for j in range(len(values) - 1)]
        out.append(values[0])
    values = [sp.expand(values[j + 1] - values[j]) for j in range(len(values) - 1)]
    assert values[0] == 0
    return out


def main() -> None:
    p7 = smoothed(7) + h[6]
    p8 = smoothed(8) + h[7]
    p9 = smoothed(9) + h[8]
    r = residual()
    identity = sp.expand(
        8 * c[7] * h[6] * q8(p7, p8, p9)
        - r
        - 8 * h[6] * p7 * q8(c[7], c[8], c[9])
        - 9 * c[7] * p7 * q7(h[6], h[7], h[8])
    )
    assert identity == 0

    coefficients = newton_coefficients(r)
    degree = sp.Poly(r, t).degree()
    assert degree == 15 and len(coefficients) == 16
    reconstructed = sum(choose_poly(t - 1, j) * value for j, value in enumerate(coefficients))
    assert sp.expand(r - reconstructed) == 0
    for sibling_count in (1, 2, 3, 8, 21):
        rhs = sum(
            math.comb(sibling_count - 1, j) * value
            for j, value in enumerate(coefficients)
            if j < sibling_count
        )
        assert sp.expand(r.subs(t, sibling_count) - rhs) == 0

    rows = []
    for rank, coefficient in enumerate(coefficients):
        polynomial = sp.Poly(coefficient, *c[:9], h[6], h[7])
        rows.append(
            {
                "rank": rank,
                "terms": len(polynomial.terms()),
                "negative_raw_coefficients": sum(1 for _, value in polynomial.terms() if value < 0),
                "factor_if_top_four": str(sp.factor(coefficient)) if rank >= 12 else None,
            }
        )

    # Tree cores satisfy c0=1, c1=n, c2=C(n-1,2).  In Delta^12--Delta^14
    # every occurrence of c3 and c4 that remains after this substitution has
    # a negative coefficient, so c3<=C(n,3), c4<=C(n,4) give rigorous lower
    # bounds.  Delta^15 is already a positive monomial.
    n = sp.symbols("n", integer=True, positive=True)
    tree_exact = {c[0]: 1, c[1]: n, c[2]: choose_poly(n - 1, 2)}
    top_lower_bounds: dict[str, str] = {}
    expected = {
        12: 132 * (33 * n**3 + 492 * n**2 + 3901 * n + 3078),
        13: 1716 * (11 * n**2 + 165 * n + 246),
        14: 3432 * (19 * n + 67),
        15: sp.Integer(51480),
    }
    for rank in range(12, 16):
        normalized = sp.expand(coefficients[rank] / (c[7] * h[6])).subs(tree_exact)
        lower = sp.factor(
            sp.combsimp(normalized.subs({c[3]: choose_poly(n, 3), c[4]: choose_poly(n, 4)}))
        )
        assert sp.expand(lower - expected[rank]) == 0
        assert all(value > 0 for value in sp.Poly(expected[rank], n).all_coeffs())
        top_lower_bounds[f"Delta^{rank}/(c7*h6)"] = str(lower)

    output = Path(__file__).with_name("rank8_q8_terminal_reduction_exact_20260816.json")
    payload = {
        "status": "PASS_EXACT_RANK8_Q8_TERMINAL_REDUCTION",
        "Q8": "16*i8^2-i7*i8-18*i7*i9",
        "standalone_Q8_candidate_range": "alpha>=14",
        "problem_993_rank8_prefix_range": "alpha(G)>=13; alpha(G)=13,14 require coupled boundary treatment",
        "terminal_identity": (
            "8*c7*h6*Q8(G_t)=R_t+8*h6*p7(t)*Q8(A)+"
            "9*c7*p7(t)*Q7(A-q)"
        ),
        "newton_degree": degree,
        "newton_coefficients": rows,
        "proved_all_order_subtheorem": {
            "statement": "Delta^j R_1>=0 for j=12,13,14,15 for every rooted tree core",
            "tree_coefficient_facts": "c0=1, c1=n, c2=C(n-1,2), c3<=C(n,3), c4<=C(n,4)",
            "normalized_lower_bounds": top_lower_bounds,
        },
        "warning": "The signs of Delta^0 through Delta^11 are not asserted.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
