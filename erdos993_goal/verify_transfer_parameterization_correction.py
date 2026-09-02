#!/usr/bin/env python3
"""Exact correction of the Section 42/46 transfer parameterization.

The normalized negative lambda factor is (1+d*t), which is proportional to
(t+1/d), not (t+d).  Thus the c=1/1000 transfer polynomial from Section 42 is
the reflected actual Duran coefficient polynomial for (1+c*t)^5 (equivalently
(t+1000)^5 up to scale).  Section 46 compared it to the different input
(t+1/1000)^5.  The transfer example remains a valid counterexample to the
shrinking B(B+1)/16 ceiling, but it is not a counterexample to the fixed
N(N-1)/16 ceiling or to the first Duran margin.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from verify_window_hermite_laguerre_factorization import laguerre_core


HERE = Path(__file__).resolve().parent
REPORT = HERE / "transfer_parameterization_correction_exact_20260809.json"
T, X, Z = sp.symbols("t x z")


def intervals(
    poly: sp.Poly, digits: int = 42, *, require_complete: bool = True
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


def duran_from_gamma(N: int, gamma_poly: sp.Poly) -> sp.Poly:
    m = gamma_poly.degree()
    return sp.Poly(
        sp.expand(
            sum(
                gamma_poly.nth(h)
                * sp.ff(N, h)
                / 4**h
                * sp.rf(Z, m - h)
                for h in range(m + 1)
            )
        ),
        Z,
    )


def broad_transfer(
    rank: int, B: int, u: sp.Rational, v: sp.Rational, d: sp.Rational
) -> sp.Poly:
    C = B + 2
    source = sp.Poly((4 * Z - d) ** rank, Z)
    coefficients = list(reversed(source.all_coeffs()))
    H = sp.Poly(
        sp.expand(
            sum(
                coefficients[j] * falling_x(j) / sp.rf(C, j)
                for j in range(rank + 1)
            )
        ),
        X,
    )
    J = sp.Poly(
        sp.expand(
            u * (X + B + 1) * H.as_expr()
            + (4 - u) * X * H.as_expr().subs(X, X - 1)
        ),
        X,
    )
    return sp.Poly(
        sp.expand(
            v * (X + B) * J.as_expr()
            + (4 - v) * X * J.as_expr().subs(X, X - 1)
        ),
        X,
    )


def interval_product(
    values: list[tuple[sp.Rational, sp.Rational]],
) -> tuple[sp.Rational, sp.Rational]:
    lower = upper = sp.Integer(1)
    for left, right in values:
        candidates = (lower * left, lower * right, upper * left, upper * right)
        lower, upper = min(candidates), max(candidates)
    return sp.Rational(lower), sp.Rational(upper)


def main() -> None:
    p = N = 25
    alpha = 0
    n = 12
    epsilon = 1
    beta = sp.Rational(1, 2)
    rank = 5
    m = rank + 2
    B = N - m + 1
    u = v = sp.Rational(1, 20)
    d = sp.Rational(1, 1000)

    transfer = broad_transfer(rank, B, u, v, d)
    gamma_small_lambda = sp.Poly(
        sp.expand((1 - u * T) * (1 - v * T) * (1 + d * T) ** rank), T
    )
    q_small_lambda = duran_from_gamma(N, gamma_small_lambda)
    reflected_transfer = sp.Poly(sp.expand(transfer.as_expr().subs(X, -Z)), Z)
    scalar = sp.factor(q_small_lambda.LC() / reflected_transfer.LC())
    expected_scalar = sp.factor(
        (-1) ** m * sp.ff(N, m) / (4**m * B * (B + 1))
    )
    assert scalar == expected_scalar
    assert sp.Poly(
        sp.expand(q_small_lambda.as_expr() - scalar * reflected_transfer.as_expr()),
        Z,
    ).is_zero

    q_intervals = intervals(q_small_lambda, require_complete=False)
    q_negative = [item for item in q_intervals if item[1] < 0]
    assert len(q_intervals) == 5 and len(q_negative) == 5
    benign_product = interval_product(q_negative)
    total_product = sp.cancel(((-1) ** m) * q_small_lambda.nth(0))
    g2_candidates = (
        sp.cancel(total_product / benign_product[0]),
        sp.cancel(total_product / benign_product[1]),
    )
    g2 = (min(g2_candidates), max(g2_candidates))
    shrinking_ceiling = sp.Rational(B * (B + 1), 16)
    fixed_ceiling = sp.Rational(N * (N - 1), 16)
    s = n - m + 2
    first_target = (s - 1) * (s + beta - 1)
    assert g2[0] > shrinking_ceiling
    assert g2[1] < fixed_ceiling < first_target

    # The Section 46 polynomial used (t+d)^5, whose normalized negative
    # parameter is 1/d=1000.  It is a distinct admissible input.
    gamma_small_factor = sp.Poly(
        sp.expand((1 - u * T) * (1 - v * T) * (T + d) ** rank), T
    )
    q_small_factor = duran_from_gamma(N, gamma_small_factor)
    q_small_factor_intervals = intervals(q_small_factor)
    assert all(right < 0 for _, right in q_small_factor_intervals)
    assert primitive_digest(q_small_factor) != primitive_digest(q_small_lambda)

    core_lambda = laguerre_core(
        p,
        alpha,
        [gamma_small_lambda.nth(h) for h in range(m + 1)],
    )
    core_factor = laguerre_core(
        p,
        alpha,
        [gamma_small_factor.nth(h) for h in range(m + 1)],
    )
    core_lambda_intervals = intervals(core_lambda)
    core_factor_intervals = intervals(core_factor)
    assert all(left > 0 for left, _ in core_lambda_intervals)
    assert all(left > 0 for left, _ in core_factor_intervals)

    # Generic coefficient replays of the reflection identity.  Here d is a
    # normalized lambda magnitude, so (1+d*t) is proportional to (t+1/d).
    generic_checks: list[dict[str, object]] = []
    ug, vg, dg = sp.symbols("u v d")
    for generic_rank in range(5):
        generic_m = generic_rank + 2
        generic_N = 4 * generic_m + 3
        generic_B = generic_N - generic_m + 1
        generic_gamma = sp.Poly(
            sp.expand((1 - ug * T) * (1 - vg * T) * (1 + dg * T) ** generic_rank),
            T,
        )
        generic_q = duran_from_gamma(generic_N, generic_gamma)
        generic_transfer = broad_transfer(
            generic_rank, generic_B, ug, vg, dg
        )
        generic_reflection = sp.Poly(
            sp.expand(generic_transfer.as_expr().subs(X, -Z)), Z
        )
        generic_scalar = sp.factor(
            (-1) ** generic_m
            * sp.ff(generic_N, generic_m)
            / (4**generic_m * generic_B * (generic_B + 1))
        )
        assert sp.Poly(
            sp.expand(
                generic_q.as_expr()
                - generic_scalar * generic_reflection.as_expr()
            ),
            Z,
        ).is_zero
        generic_checks.append(
            {
                "rank": generic_rank,
                "N": generic_N,
                "B": generic_B,
                "scalar": str(generic_scalar),
            }
        )

    payload = {
        "kind": "transfer_parameterization_correction_exact",
        "date": "2026-08-09",
        "status": "PASS_EXACT_TRANSFER_PARAMETERIZATION_CORRECTION",
        "correction": (
            "The c=1/1000 transfer is the actual normalized-Pochhammer object for "
            "Gamma=(1-t/20)^2*(1+t/1000)^5, proportional to "
            "(1-t/20)^2*(t+1000)^5.  It is not the coefficient polynomial for "
            "(1-t/20)^2*(t+1/1000)^5."
        ),
        "exact_reflection_identity": {
            "formula": "Q_D(z)=scalar*T(-z)",
            "scalar": str(scalar),
            "expected_scalar": "(-1)^m*(N)^fall_m/(4^m*B*(B+1))",
            "Q_D_primitive_sha256": primitive_digest(q_small_lambda),
            "T_primitive_sha256": primitive_digest(transfer),
            "generic_rank_checks": generic_checks,
        },
        "correct_small_lambda_case": {
            "Gamma": "(1-t/20)^2*(1+t/1000)^5",
            "Q_D_real_roots": len(q_intervals),
            "Q_D_negative_real_roots": len(q_negative),
            "Q_D_nonreal_roots": m - len(q_intervals),
            "G2_interval_decimal": [str(sp.N(value, 22)) for value in g2],
            "shrinking_ceiling_decimal": str(sp.N(shrinking_ceiling, 22)),
            "fixed_ceiling_decimal": str(sp.N(fixed_ceiling, 22)),
            "first_target_decimal": str(sp.N(first_target, 22)),
            "Laguerre_core_positive_roots": len(core_lambda_intervals),
            "Laguerre_core_primitive_sha256": primitive_digest(core_lambda),
        },
        "distinct_small_factor_case": {
            "Gamma": "(1-t/20)^2*(t+1/1000)^5",
            "normalized_negative_lambda_magnitude": "1000",
            "Q_D_negative_real_roots": len(q_small_factor_intervals),
            "Q_D_primitive_sha256": primitive_digest(q_small_factor),
            "Laguerre_core_positive_roots": len(core_factor_intervals),
            "Laguerre_core_primitive_sha256": primitive_digest(core_factor),
        },
        "conclusion": (
            "The old example validly refutes only the shrinking B(B+1)/16 bound. "
            "For its correctly matched actual PF input, G2 is below N(N-1)/16 "
            "and below the true first-margin target; the Laguerre core is exactly "
            "positive-rooted."
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**payload, "output": str(REPORT)}, indent=2))


if __name__ == "__main__":
    main()
