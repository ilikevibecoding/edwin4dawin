#!/usr/bin/env python3
"""Derive the exact leaf base for the stable-B canonical-J recurrence.

This file proves only an algebraic coefficient inequality for the canonical
lower row on the face A=0,Y=1.  It does not prove the A/Y lifts, the G branch,
all d=1 terminal m=0, or Erdos Problem 993.
"""

from __future__ import annotations

import sympy as sp


def C(n, k: int):
    if isinstance(k, int):
        if k < 0:
            return sp.Integer(0)
        return sp.prod(n - i for i in range(k)) / sp.factorial(k)
    return sp.gamma(n + 1) / (sp.gamma(k + 1) * sp.gamma(n - k + 1))


def leaf_scalars(S, rank):
    """Return lead,BH on R=Y=1 for the pinned q3 canonical lower."""
    R = sp.Integer(1)
    Y = sp.Integer(1)
    T = S - 1
    a = S * (S - 1) / 2
    P = (3 * R**2 - 3 * R + S**3 + 5 * S) / 6
    c0 = -R**2 + 4 * R + 2 * S**2 - 5 * S
    R0 = (
        R**3
        - 2 * R**2 * S
        + 2 * R**2
        + 2 * R * S
        + 6 * R * Y
        - 9 * R
        + S**3
        - 4 * S**2
        + 9 * S
        - 6 * Y
    ) / 2
    A0 = sp.expand(P * c0 - a * R0)

    edges = T
    wedges = T - Y
    f3 = C(S, 3) - edges * (S - 2) + wedges
    matchings = C(edges, 2) - wedges
    connected4 = T - Y - 1
    z3 = (
        edges * C(S - 2, 2)
        - 2 * (wedges * (S - 3) + matchings)
        + 3 * connected4
    )
    qH = sp.together(z3 / (3 * f3))
    lead = sp.expand((rank + 1) * A0)
    BH = sp.together(
        2 * (rank + 1) * A0
        + (rank + 1) * P * (c0 + R0)
        - 6 * P * (P + a)
        - 3 * rank * P * (P + a) * qH
    )
    return lead, BH


def leaf_A0(S):
    lead, _ = leaf_scalars(S, sp.Integer(0))
    return sp.expand(lead)


def leaf_R_normalized(S, j):
    """Return RJ/[x^j]P_S on the supported region S>=2j-1.

    Every row ratio is written explicitly, avoiding generalized binomial
    continuation at the top of support.
    """
    L0, H0 = leaf_scalars(S, j)
    L1, H1 = leaf_scalars(S - 1, j)
    L2, H2 = leaf_scalars(S - 2, j - 1)

    # J(S,j)/p(S,j).
    previous0 = j * (S - j + 2) / ((S - 2 * j + 3) * (S - 2 * j + 2))
    next0 = (S - 2 * j + 1) * (S - 2 * j) / ((j + 1) * (S - j + 1))
    k0 = (S - 2 * j + 1) / (S - j + 1)
    J0 = L0 * (previous0 + next0 + k0) + H0

    # J(S-1,j)/p(S,j).
    previous1 = j / (S - 2 * j + 2)
    current1 = k0
    next1 = (
        (S - 2 * j + 1)
        * (S - 2 * j)
        * (S - 2 * j - 1)
        / ((j + 1) * (S - j + 1) * (S - j))
    )
    k1 = (S - 2 * j + 1) * (S - 2 * j) / ((S - j + 1) * (S - j))
    J1 = L1 * (previous1 + next1 + k1) + H1 * current1

    # J(S-2,j-1)/p(S,j), including the x-shift in the recurrence.
    previous2 = j * (j - 1) / ((S - 2 * j + 2) * (S - 2 * j + 3))
    next2 = k1
    k2 = j * (S - 2 * j + 1) / ((S - j + 1) * (S - j))
    current2 = j / (S - j + 1)
    J2 = L2 * (previous2 + next2 + k2) + H2 * current2
    return sp.together(J0 - J1 - J2)


def leaf_J_literal(S: int, rank: int):
    """Literal supported-row formula, with off-support coefficients zero."""
    from math import comb

    def pc(vertices: int, r: int) -> int:
        top = vertices + 1 - r
        return comb(top, r) if 0 <= r <= top else 0

    lead, BH = leaf_scalars(sp.Integer(S), sp.Integer(rank))
    return sp.together(
        lead * (pc(S, rank - 1) + pc(S, rank + 1) + pc(S - 1, rank))
        + BH * pc(S, rank)
    )


def leaf_R_literal(S: int, rank: int):
    return sp.together(
        leaf_J_literal(S, rank)
        - leaf_J_literal(S - 1, rank)
        - leaf_J_literal(S - 2, rank - 1)
    )


def coefficient_status(expression, variables):
    numerator, denominator = sp.fraction(sp.cancel(expression))
    numerator = sp.Poly(sp.expand(numerator), *variables)
    denominator = sp.Poly(sp.expand(denominator), *variables)
    bad_num = [(m, c) for m, c in numerator.terms() if c < 0]
    bad_den = [(m, c) for m, c in denominator.terms() if c < 0]
    return {
        "numerator_terms": len(numerator.terms()),
        "denominator_terms": len(denominator.terms()),
        "minimum_numerator_coefficient": min(c for _, c in numerator.terms()),
        "minimum_denominator_coefficient": min(c for _, c in denominator.terms()),
        "negative_numerator": bad_num,
        "negative_denominator": bad_den,
        "denominator_at_origin": denominator.eval({v: 0 for v in variables}),
        "numerator": numerator.as_expr(),
        "denominator": denominator.as_expr(),
    }


def derive_cases():
    j, w, u = sp.symbols("j w u", nonnegative=True, integer=True)
    expression = leaf_R_normalized(2 * j + w, j)
    cases = {}
    for name, j0, w0, variables in (
        ("central_j_ge_7_w_ge_0", 7, 0, (j, w)),
        ("central_j_6_w_ge_2", 6, 2, (w,)),
        ("central_j_5_w_ge_4", 5, 4, (w,)),
        ("central_j_4_w_ge_6", 4, 6, (w,)),
    ):
        shifted = expression.subs(j, j0 + u if j0 == 7 else j0).subs(w, w0 + w)
        active = (u, w) if j0 == 7 else variables
        cases[name] = coefficient_status(shifted, active)

    # The top three faces must use literal support, not generalized binomials.
    # Their exact closed forms are obtained independently below.
    top_minus_1 = sp.factor(expression.subs(w, -1))
    cases["top_w_minus_1_j_ge_8"] = coefficient_status(
        top_minus_1.subs(j, 8 + u), (u,)
    )

    # At w=-2 and -3, only the literally supported previous-rank terms remain.
    L0 = leaf_A0(2 * j - 2)
    L1 = leaf_A0(2 * j - 3)
    L2 = leaf_A0(2 * j - 4)
    top_minus_2 = sp.factor(
        j * (j + 1) * L0 - (j + 1) * L1 - j * (j - 1) * L2
    )
    cases["top_w_minus_2_j_ge_8"] = coefficient_status(
        top_minus_2.subs(j, 8 + u), (u,)
    )

    M0 = leaf_A0(2 * j - 3)
    M2 = leaf_A0(2 * j - 5)
    top_minus_3 = sp.factor((j + 1) * M0 - j * M2)
    cases["top_w_minus_3_j_ge_9"] = coefficient_status(
        top_minus_3.subs(j, 9 + u), (u,)
    )
    return cases, {
        "top_w_minus_1": top_minus_1,
        "top_w_minus_2": top_minus_2,
        "top_w_minus_3": top_minus_3,
    }


def main() -> None:
    cases, top = derive_cases()
    for name, status in cases.items():
        print(
            name,
            "num_terms", status["numerator_terms"],
            "den_terms", status["denominator_terms"],
            "num_min", status["minimum_numerator_coefficient"],
            "den_min", status["minimum_denominator_coefficient"],
            "bad_num", status["negative_numerator"][:5],
            "bad_den", status["negative_denominator"][:5],
            "den0", status["denominator_at_origin"],
        )
    for name, expression in top.items():
        print(name, sp.factor(expression))


if __name__ == "__main__":
    main()
