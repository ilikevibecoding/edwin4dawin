#!/usr/bin/env python3
"""Finite exact counterexample to the unrestricted transfer lemma (33.2).

This does not assert a counterexample to the Erdos forest conjecture.  It
shows that the broad normalized-Pochhammer comparison used as a sufficient
intermediate lemma is false.  In fact, the corresponding actual window
polynomial is also constructed here and is certified to have twelve strictly
negative real roots.  Thus the failed residual-disk condition is genuinely
stronger than the desired window hyperbolicity.  All root counts and product
inequalities are certified with exact rational Sturm isolating intervals.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_transfer_lemma_counterexample_exact_20260809.json"
X = sp.symbols("x")
Z = sp.symbols("z")


def falling(j: int) -> sp.Expr:
    return sp.prod((X - k for k in range(j)), start=sp.Integer(1))


def shift(poly: sp.Poly, amount: int) -> sp.Poly:
    return sp.Poly(sp.expand(poly.as_expr().subs(X, X + amount)), X)


def primitive_digest(poly: sp.Poly) -> str:
    primitive = sp.primitive(poly.as_expr(), X)[1]
    return hashlib.sha256(str(primitive).encode("utf-8")).hexdigest()


def rational_digest(value: sp.Rational) -> str:
    return hashlib.sha256(str(value).encode("utf-8")).hexdigest()


def intervals(poly: sp.Poly, digits: int = 40) -> list[tuple[sp.Rational, sp.Rational]]:
    result: list[tuple[sp.Rational, sp.Rational]] = []
    for interval, multiplicity in poly.intervals(eps=sp.Rational(1, 10**digits)):
        assert multiplicity == 1
        result.append((sp.Rational(interval[0]), sp.Rational(interval[1])))
    return result


def lower_product(items: list[tuple[sp.Rational, sp.Rational]]) -> sp.Rational:
    return sp.prod((left for left, _ in items), start=sp.Integer(1))


def upper_product(items: list[tuple[sp.Rational, sp.Rational]]) -> sp.Rational:
    return sp.prod((right for _, right in items), start=sp.Integer(1))


def scientific_interval(item: tuple[sp.Rational, sp.Rational]) -> list[str]:
    return [str(sp.N(item[0], 18)), str(sp.N(item[1], 18))]


def main() -> None:
    rank = 5
    B = 19
    C = B + 2
    u = v = sp.Rational(1, 20)
    c = sp.Rational(1, 1000)

    source = sp.Poly((4 * Z - c) ** rank, Z)
    q = list(reversed(source.all_coeffs()))
    H = sp.Poly(
        sp.expand(sum(q[j] * falling(j) / sp.rf(C, j) for j in range(rank + 1))),
        X,
    )
    J = sp.Poly(
        sp.expand(u * (X + B + 1) * H.as_expr() + (4 - u) * X * shift(H, -1).as_expr()),
        X,
    )
    T = sp.Poly(
        sp.expand(v * (X + B) * J.as_expr() + (4 - v) * X * shift(J, -1).as_expr()),
        X,
    )

    h_intervals = intervals(H)
    j_intervals = intervals(J)
    t_intervals = intervals(T)
    h_positive = [item for item in h_intervals if item[0] > 0]
    j_negative = [item for item in j_intervals if item[1] < 0]
    j_positive = [item for item in j_intervals if item[0] > 0]
    t_positive = [item for item in t_intervals if item[0] > 0]

    assert H.degree() == rank and len(h_positive) == rank
    assert J.degree() == rank + 1 and len(j_negative) == 1 and len(j_positive) == rank
    assert T.degree() == rank + 2 and len(t_intervals) == rank
    assert len(t_positive) == rank
    # Degree seven with exactly five real roots leaves one nonreal conjugate pair.

    ratio_lower = sp.cancel(lower_product(t_positive) / upper_product(h_positive))
    ratio_upper = sp.cancel(upper_product(t_positive) / lower_product(h_positive))
    target = u * v
    assert ratio_upper < target

    total_product = sp.cancel(((-1) ** T.degree()) * T.eval(0) / T.LC())
    residual_lower = sp.cancel(total_product / upper_product(t_positive))
    residual_upper = sp.cancel(total_product / lower_product(t_positive))
    target_disk = sp.Rational(B * (B + 1), 16)
    assert residual_lower > target_disk

    # Independent exact Vieta identity relating the two failed formulations.
    source_product = sp.cancel(((-1) ** H.degree()) * H.eval(0) / H.LC())
    assert sp.cancel(total_product - target * target_disk * source_product) == 0
    assert sp.cancel(residual_lower - total_product / upper_product(t_positive)) == 0

    # Reconstruct the actual sharp-reserve window input.  Here m=rank+2=7,
    # N=B+m-1=25, and p-alpha=4m-3=25, so (p,alpha)=(25,0).
    p_window = 25
    alpha = 0
    t = sp.symbols("t")
    gamma_poly = sp.Poly(
        sp.expand((1 - u * t) * (1 - v * t) * (t + c) ** rank), t
    )
    gamma_coefficients = [gamma_poly.nth(h) for h in range(gamma_poly.degree() + 1)]
    window = sp.Integer(0)
    reduced_window = sp.Integer(0)
    for k in range(p_window // 2 + 1):
        inner = sum(
            gamma_coefficients[h]
            * sp.factorial(p_window - 2 * h)
            / (
                sp.factorial(p_window + alpha - h)
                * sp.factorial(k - h)
            )
            for h in range(min(k, gamma_poly.degree()) + 1)
        )
        reduced_coefficient = inner / sp.factorial(p_window - 2 * k)
        window_coefficient = (
            sp.factorial(p_window + 2 * alpha)
            / sp.factorial(alpha)
            * reduced_coefficient
            / sp.rf(alpha + 1, k)
        )
        reduced_window += reduced_coefficient * X**k
        window += window_coefficient * X**k
    reduced_window_poly = sp.Poly(sp.factor(reduced_window), X)
    window_poly = sp.Poly(sp.factor(window), X)
    reduced_intervals = intervals(reduced_window_poly)
    window_intervals = intervals(window_poly)
    assert reduced_window_poly.degree() == 12
    assert window_poly.degree() == 12
    assert len(reduced_intervals) == 12 and all(item[1] < 0 for item in reduced_intervals)
    assert len(window_intervals) == 12 and all(item[1] < 0 for item in window_intervals)

    payload = {
        "kind": "window_transfer_lemma_counterexample_exact",
        "date": "2026-08-09",
        "status": "EXACT_TRANSFER_COUNTEREXAMPLE_WHILE_ACTUAL_WINDOW_REMAINS_HYPERBOLIC",
        "scope_warning": (
            "This refutes the broad intermediate normalized-Pochhammer transfer lemma, "
            "not the Erdos forest independence-sequence conjecture."
        ),
        "parameters": {
            "rank": rank,
            "B": B,
            "C": C,
            "u": str(u),
            "v": str(v),
            "positive_source_polynomial": "(4z-1/1000)^5",
        },
        "root_counts": {
            "H_positive_real": len(h_positive),
            "J_negative_real": len(j_negative),
            "J_positive_real": len(j_positive),
            "T_positive_real": len(t_positive),
            "T_nonreal": T.degree() - len(t_intervals),
        },
        "certified_product_failure": {
            "required": "prod(alpha_i)/prod(xi_i) >= uv = 1/400",
            "ratio_interval_decimal": [str(sp.N(ratio_lower, 22)), str(sp.N(ratio_upper, 22))],
            "exact_upper_minus_target_sign": int(sp.sign(ratio_upper - target)),
            "ratio_lower_sha256": rational_digest(ratio_lower),
            "ratio_upper_sha256": rational_digest(ratio_upper),
            "ratio_bound_bit_lengths": {
                "lower_numerator": int(ratio_lower.p.bit_length()),
                "lower_denominator": int(ratio_lower.q.bit_length()),
                "upper_numerator": int(ratio_upper.p.bit_length()),
                "upper_denominator": int(ratio_upper.q.bit_length()),
            },
        },
        "equivalent_disk_failure": {
            "required": "D <= B(B+1)/16 = 95/4",
            "D_interval_decimal": [str(sp.N(residual_lower, 22)), str(sp.N(residual_upper, 22))],
            "exact_lower_minus_target_sign": int(sp.sign(residual_lower - target_disk)),
            "D_lower_sha256": rational_digest(residual_lower),
            "D_upper_sha256": rational_digest(residual_upper),
        },
        "actual_window_check": {
            "p": p_window,
            "alpha": alpha,
            "gamma": "(1-t/20)^2(t+1/1000)^5",
            "reserve": "p-alpha=25=4*deg(gamma)-3",
            "reduced_window_degree": reduced_window_poly.degree(),
            "reduced_window_negative_roots": len(reduced_intervals),
            "window_degree": window_poly.degree(),
            "window_negative_roots": len(window_intervals),
            "window_nonreal_roots": window_poly.degree() - len(window_intervals),
            "window_root_extremes_decimal": {
                "most_negative": scientific_interval(window_intervals[0]),
                "least_negative": scientific_interval(window_intervals[-1]),
            },
            "primitive_polynomial_sha256": {
                "reduced_window": primitive_digest(reduced_window_poly),
                "window": primitive_digest(window_poly),
            },
            "conclusion": (
                "The residual-disk transfer condition is sufficient but not necessary "
                "for actual window hyperbolicity."
            ),
        },
        "isolating_intervals_decimal": {
            "H_positive": [scientific_interval(item) for item in h_positive],
            "T_positive": [scientific_interval(item) for item in t_positive],
        },
        "primitive_polynomial_sha256": {
            "H": primitive_digest(H),
            "J": primitive_digest(J),
            "T": primitive_digest(T),
        },
        "next_obligation": (
            "Replace the false residual-disk transfer condition in the small-parameter "
            "corner by a direct Jacobi/window hyperbolicity argument; Sections 40-41 "
            "remain valid on their proved regions."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**payload, "output": str(REPORT)}, indent=2))


if __name__ == "__main__":
    main()
