#!/usr/bin/env python3
"""Exact Durán-coefficient escape for the false Section 42 transfer lemma.

The unrestricted normalized-Pochhammer transfer polynomial has a conjugate
pair, but it is not the coefficient polynomial attached to the actual
Laguerre window.  For the same genuine PF input, the latter polynomial has
seven simple negative roots, so Durán's monic-Laguerre theorem applies
directly.  This is a certificate of the theorem's hypotheses, not a new proof
of Durán's theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_window_hermite_laguerre_factorization import laguerre_core


HERE = Path(__file__).resolve().parent
REPORT = HERE / "transfer_counterexample_actual_duran_escape_exact_20260809.json"
T, X, Z = sp.symbols("t x z")


def intervals(
    poly: sp.Poly, digits: int = 40, *, require_complete: bool = True
) -> list[tuple[sp.Rational, sp.Rational]]:
    result: list[tuple[sp.Rational, sp.Rational]] = []
    for interval, multiplicity in poly.intervals(eps=sp.Rational(1, 10**digits)):
        assert multiplicity == 1
        result.append((sp.Rational(interval[0]), sp.Rational(interval[1])))
    if require_complete:
        assert len(result) == poly.degree()
    return result


def primitive_digest(poly: sp.Poly) -> str:
    primitive = sp.primitive(poly.as_expr(), poly.gens[0])[1]
    return hashlib.sha256(str(primitive).encode("utf-8")).hexdigest()


def falling_x(order: int) -> sp.Expr:
    return sp.prod((X - j for j in range(order)), start=sp.Integer(1))


def main() -> None:
    p = 25
    alpha = 0
    n = p // 2
    epsilon = p - 2 * n
    beta = sp.Rational(2 * epsilon - 1, 2)
    N = p + alpha
    u = v = sp.Rational(1, 20)
    c = sp.Rational(1, 1000)
    rank = 5

    gamma_poly = sp.Poly(
        sp.expand((1 - u * T) * (1 - v * T) * (T + c) ** rank), T
    )
    m = gamma_poly.degree()
    gamma = [gamma_poly.nth(h) for h in range(m + 1)]

    # Durán's coefficient polynomial for the monic-Laguerre combination
    # sum_h e_h (N)_h/4^h Lhat_(n-h)^beta, where e_h=(-1)^h gamma_h.
    q_duran = sp.Poly(
        sp.expand(
            sum(
                gamma[h] * sp.ff(N, h) / 4**h * sp.rf(Z, m - h)
                for h in range(m + 1)
            )
        ),
        Z,
    )
    q_intervals = intervals(q_duran)
    assert m == 7
    assert len(q_intervals) == 7
    assert all(right < 0 for _, right in q_intervals)
    assert n >= m
    assert all(right < beta + 1 for _, right in q_intervals)

    core = laguerre_core(p, alpha, gamma)
    core_intervals = intervals(core)
    assert core.degree() == n
    assert all(left > 0 for left, _ in core_intervals)

    # Reconstruct the broad transfer polynomial from Section 42 only to
    # certify that it is a genuinely different object with a different root
    # count, despite having the same degree seven.
    B = 19
    C = B + 2
    source = sp.Poly((4 * Z - c) ** rank, Z)
    source_coefficients = list(reversed(source.all_coeffs()))
    H = sp.Poly(
        sp.expand(
            sum(
                source_coefficients[j] * falling_x(j) / sp.rf(C, j)
                for j in range(rank + 1)
            )
        ),
        X,
    )
    shifted_H = sp.Poly(sp.expand(H.as_expr().subs(X, X - 1)), X)
    J = sp.Poly(
        sp.expand(u * (X + B + 1) * H.as_expr() + (4 - u) * X * shifted_H.as_expr()),
        X,
    )
    shifted_J = sp.Poly(sp.expand(J.as_expr().subs(X, X - 1)), X)
    broad_transfer = sp.Poly(
        sp.expand(v * (X + B) * J.as_expr() + (4 - v) * X * shifted_J.as_expr()),
        X,
    )
    broad_intervals = intervals(broad_transfer, require_complete=False)
    assert broad_transfer.degree() == 7
    assert len(broad_intervals) == 5

    payload = {
        "kind": "transfer_counterexample_actual_duran_escape_exact",
        "date": "2026-08-09",
        "status": "PASS_EXACT_ACTUAL_DURAN_ESCAPE_FROM_FALSE_TRANSFER_LEMMA",
        "scope": (
            "Exact verification of Durán-theorem hypotheses for the Section 42 PF input; "
            "not an arbitrary-length proof."
        ),
        "parameters": {
            "p": p,
            "alpha": alpha,
            "n": n,
            "beta": str(beta),
            "N": N,
            "Gamma": "(1-t/20)^2*(t+1/1000)^5",
            "Gamma_degree": m,
        },
        "duran_coefficient_polynomial": {
            "formula": "sum_h gamma_h*(N)^fall_h/4^h*(z)_(m-h)^rise",
            "degree": q_duran.degree(),
            "strictly_negative_simple_roots": len(q_intervals),
            "roots_below_beta_plus_one": True,
            "n_at_least_m": True,
            "primitive_sha256": primitive_digest(q_duran),
            "root_extremes_decimal": {
                "leftmost": str(sp.N(q_intervals[0][0], 22)),
                "rightmost": str(sp.N(q_intervals[-1][1], 22)),
            },
        },
        "laguerre_core": {
            "degree": core.degree(),
            "strictly_positive_simple_roots": len(core_intervals),
            "primitive_sha256": primitive_digest(core),
        },
        "broad_transfer_comparison": {
            "degree": broad_transfer.degree(),
            "real_roots": len(broad_intervals),
            "nonreal_roots": broad_transfer.degree() - len(broad_intervals),
            "primitive_sha256": primitive_digest(broad_transfer),
            "same_as_actual_duran_polynomial": False,
        },
        "conclusion": (
            "The Section 42 counterexample refutes only the reordered unrestricted transfer. "
            "For the same actual PF input, the monic-Laguerre coefficient polynomial is fully "
            "negative-rooted, so no exceptional residual quadratic is present."
        ),
        "remaining_theorem": (
            "Control the at-most-two exceptional Durán roots directly for every actual PF input, "
            "without replacing the actual coefficient polynomial by the false broad transfer."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**payload, "output": str(REPORT)}, indent=2))


if __name__ == "__main__":
    main()
