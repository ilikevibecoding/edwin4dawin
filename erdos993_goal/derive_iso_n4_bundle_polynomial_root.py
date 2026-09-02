#!/usr/bin/env python3
"""Derive the exact rank-four whole-sibling-bundle payment polynomial.

Let C be the four-minor tuple after deleting an unmarked support s, and D
the tuple after deleting N[s].  After attaching M sibling leaves to s, the
four rows are

    T_M=(1+x)^M C + x D.

The aggregate rank-four payment is

    Gamma_M=N_4(T_M)-N_4(T_0)-sum_{t=0}^{M-1} N_3((1+x)^t C).

This script expands Gamma_M exactly in the binomial basis binom(M,j).  It is
an algebraic reduction only; generic coefficient signs are not asserted.
"""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import sympy as sp


def at(row: tuple[sp.Expr, ...], rank: int) -> sp.Expr:
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def nested_rank(rows: tuple[tuple[sp.Expr, ...], ...], rank: int) -> sp.Expr:
    e, u, v, w = rows
    r = rank
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def choose_polynomial(variable: sp.Symbol, rank: int) -> sp.Expr:
    if rank < 0:
        return sp.Integer(0)
    numerator = sp.sympify(sp.prod(variable - offset for offset in range(rank)))
    return numerator / sp.Integer(factorial(rank))


def isolate_multiply(
    rows: tuple[tuple[sp.Expr, ...], ...], variable: sp.Symbol, maximum: int
) -> tuple[tuple[sp.Expr, ...], ...]:
    return tuple(
        tuple(
            sp.expand(
                sum(choose_polynomial(variable, i) * at(row, k - i) for i in range(k + 1))
            )
            for k in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(
    rows: tuple[tuple[sp.Expr, ...], ...],
    drows: tuple[tuple[sp.Expr, ...], ...],
) -> tuple[tuple[sp.Expr, ...], ...]:
    return tuple(
        tuple(sp.expand(at(row, k) + at(drow, k - 1)) for k in range(len(row)))
        for row, drow in zip(rows, drows)
    )


def binomial_basis(expression: sp.Expr, variable: sp.Symbol) -> list[sp.Expr]:
    polynomial = sp.Poly(sp.expand(expression), variable)
    values = [sp.expand(expression.subs(variable, integer)) for integer in range(polynomial.degree() + 1)]
    coefficients = []
    while values:
        coefficients.append(sp.expand(values[0]))
        values = [sp.expand(values[i + 1] - values[i]) for i in range(len(values) - 1)]
    reconstructed = sp.expand(
        sum(coefficient * choose_polynomial(variable, rank) for rank, coefficient in enumerate(coefficients))
    )
    residual = sp.simplify(reconstructed - expression)
    if residual != 0:
        substitutions = {symbol: 1 for symbol in residual.free_symbols if symbol != variable}
        raise AssertionError(
            f"binomial reconstruction failed: degree={polynomial.degree()}, "
            f"numeric_residual={sp.factor(residual.subs(substitutions))}"
        )
    return coefficients


def main() -> None:
    m, t = sp.symbols("M t", integer=True, nonnegative=True)
    names = "EUVW"
    crows = tuple(tuple(sp.symbols(f"c{name}0:6") for _ in [0])[0] for name in names)
    drows = tuple(tuple(sp.symbols(f"d{name}0:6") for _ in [0])[0] for name in names)

    tm = add_xd(isolate_multiply(crows, m, 5), drows)
    t0 = add_xd(crows, drows)
    ct = isolate_multiply(crows, t, 4)
    lower = nested_rank(ct, 3)
    lower_polynomial = sp.Poly(lower, t)
    lower_sum = sp.expand(
        sum(
            coefficient
            * (sp.bernoulli(power + 1, m) - sp.bernoulli(power + 1, 0))
            / (power + 1)
            for (power,), coefficient in lower_polynomial.terms()
        )
    )
    gamma = sp.expand(nested_rank(tm, 4) - nested_rank(t0, 4) - lower_sum)
    assert sp.expand(gamma.subs(m, 0)) == 0
    coefficients = binomial_basis(gamma, m)

    n, q, epsilon_u, epsilon_v = sp.symbols(
        "n q epsilon_u epsilon_v", integer=True, nonnegative=True
    )
    structural = {}
    for name in names:
        structural[sp.symbols(f"c{name}0")] = 1
        structural[sp.symbols(f"d{name}0")] = 1
    structural.update(
        {
            sp.symbols("cE1"): n,
            sp.symbols("cU1"): n - 1,
            sp.symbols("cV1"): n - 1,
            sp.symbols("cW1"): n - 2,
            sp.symbols("dE1"): q,
            sp.symbols("dU1"): q - epsilon_u,
            sp.symbols("dV1"): q - epsilon_v,
            sp.symbols("dW1"): q - epsilon_u - epsilon_v,
        }
    )

    edge_count, degree_u, degree_v, adjacent = sp.symbols(
        "edge_count degree_u degree_v adjacent", integer=True, nonnegative=True
    )
    second_face_counts = {
        sp.symbols("cE2"): n * (n - 1) / 2 - edge_count,
        sp.symbols("cU2"): (n - 1) * (n - 2) / 2 - (edge_count - degree_u),
        sp.symbols("cV2"): (n - 1) * (n - 2) / 2 - (edge_count - degree_v),
        sp.symbols("cW2"): (
            (n - 2) * (n - 3) / 2
            - (edge_count - degree_u - degree_v + adjacent)
        ),
    }
    coefficient4 = sp.factor(coefficients[4].subs(structural).subs(second_face_counts))
    expected4 = (
        10 * edge_count
        + 50 * n
        - 15 * (degree_u + degree_v)
        + 12 * adjacent
        - 3 * (epsilon_u + epsilon_v)
        - 2 * q
        + 18
    )
    assert sp.expand(coefficient4 - expected4) == 0
    lower_bound4 = 33 * n + 12
    nonnegative_remainder4 = (
        10 * edge_count
        + 15 * (n - degree_u - degree_v)
        + 12 * adjacent
        + 2 * (n - q)
        + 3 * (2 - epsilon_u - epsilon_v)
    )
    assert sp.expand(coefficient4 - lower_bound4 - nonnegative_remainder4) == 0
    assert sp.expand(coefficients[5].subs(structural) - 50) == 0
    assert sp.expand(coefficients[6].subs(structural)) == 0

    summaries = []
    for rank, coefficient in enumerate(coefficients):
        polynomial = sp.Poly(coefficient, *sorted(coefficient.free_symbols, key=str)) if coefficient else None
        raw_coefficients = polynomial.coeffs() if polynomial is not None else []
        summaries.append(
            {
                "binomial_rank": rank,
                "monomials": len(raw_coefficients),
                "negative_scalar_coefficients": sum(
                    1 for value in raw_coefficients if value.is_negative is True
                ),
                "factor": str(sp.factor(coefficient)),
                "structural_factor": str(sp.factor(coefficient.subs(structural))),
            }
        )

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_TOP_BINOMIAL_COEFFICIENTS",
        "identity": (
            "Gamma_M=N4((1+x)^M C+xD)-N4(C+xD)-"
            "sum_(t=0)^(M-1)N3((1+x)^t C)"
        ),
        "degree_in_M": sp.Poly(gamma, m).degree(),
        "proved_top_coefficients": {
            "binom_M_6": "0",
            "binom_M_5": "50",
            "binom_M_4": str(coefficient4),
            "binom_M_4_lower_bound": "33*n+12",
            "binom_M_4_nonnegative_remainder": str(nonnegative_remainder4),
            "forest_facts_used": (
                "edge_count>=0; degree_u+degree_v<=n in a forest; "
                "q<=n; epsilon_u+epsilon_v<=2; adjacent>=0"
            ),
        },
        "structural_substitution": (
            "All four constant coefficients are 1; C has order n with both "
            "marks present, so cE1=n,cU1=cV1=n-1,cW1=n-2. D has order q "
            "and mark-survival indicators epsilon_u,epsilon_v."
        ),
        "binomial_coefficients": summaries,
        "scope": (
            "Exact full polynomial and a universal forest proof of its top "
            "three binomial coefficients. Coefficients 1,2,3 remain open."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    Path("iso_n4_whole_bundle_binomial_symbolic_root_20260829.json").write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
