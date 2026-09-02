#!/usr/bin/env python3
"""Exact replay for the all-order mixed normalized-ratio proof.

Write, in the mean coordinate y=3r+s,

    F_h(y,s)=[u^h] exp(y*phi(u)+s*psi(u)),

where

    n*[u^n]phi=(2-c_n)/3,
    n*[u^n]psi=(1-2*c_n)/3,
    c_n=binom(2n,n)/4^n.

The normalized polynomial P_h differs from F_h by a positive scalar that
depends only on h.  The proof of the mixed ratio has three all-order parts.

1.  At every forest parameter, (F_h)_h is log-concave.  This was proved in
    the column replay from the Bender--Canfield lemma and convolution.
    Put mu_h=y*d(log F_h)/dy and delta_h=h-mu_h.  Logarithmic
    differentiation in u gives

      delta_h = sum_(j>=1) theta_j F_(h-j)/F_h,
      theta_j=y(j-1)phi_j+s*j*psi_j >=0.

    Log-concavity makes every quotient F_(h-j)/F_h nondecreasing in h.
    Hence delta_(h+1)>=delta_h, or mu_(h+1)-mu_h<=1.  Equivalently,
    F_(h+1)(y)/(y F_h(y)) is nonincreasing for y>0.

2.  If p has nonnegative coefficients and degree at most h, then, for x>3,

      p(x)^2/(p(x-3)p(x+3)) <= (x^2/(x^2-9))^h.

    Expand by coefficient pairs and symmetrize.  AM--GM leaves the factor
    (x^2/(x^2-9))^(h-(k+l)/2)>=1 for every k,l<=h.

3.  The resulting scalar upper bound is

      (Y-3)/(Y-6) * ((Y-3)^2/(Y(Y-6)))^h,
      Y=3r+s.

    Elementary upper/lower logarithm bounds reduce comparison with

      ((2r+s-1)(2r+s-2))/((2r+s-3)(2r+s-4))

    to a rational function.  After r=s+5+q its numerator has only positive
    coefficients (replayed below).

Together these prove the mixed minor (68.12) in every admissible parameter.
The finite symbolic checks below guard the transcription; they are not a
finite substitute for the three arguments above.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_selector_normalized_ratio_reduction import polynomial_p


HERE = Path(__file__).resolve().parent
REPORT = HERE / "selector_mixed_ratio_exact_20260809.json"

u = sp.symbols("u")
y, s, r, q = sp.symbols("y s r q", nonnegative=True)


def central_ratio(index: int) -> sp.Rational:
    return sp.Rational(sp.binomial(2 * index, index), 4**index)


def mean_coordinate_coefficients(max_layer: int) -> tuple[list[sp.Expr], list[sp.Expr], list[sp.Expr]]:
    """Return phi coefficients, psi coefficients, and F_h(y,s)."""
    phi = [sp.Integer(0)] * (max_layer + 2)
    psi = [sp.Integer(0)] * (max_layer + 2)
    for j in range(1, max_layer + 2):
        c = central_ratio(j)
        phi[j] = sp.factor((2 - c) / (3 * j))
        psi[j] = sp.factor((1 - 2 * c) / (3 * j))

    F = [sp.Integer(0)] * (max_layer + 2)
    F[0] = sp.Integer(1)
    for n in range(1, max_layer + 2):
        recurrence = sum(
            j * (y * phi[j] + s * psi[j]) * F[n - j]
            for j in range(1, n + 1)
        )
        F[n] = sp.Poly(sp.expand(recurrence / n), y, s).as_expr()
    return phi, psi, F


def substitute_by_name(expr: sp.Expr, **values: int) -> sp.Expr:
    replacements = {symbol: values[str(symbol)] for symbol in expr.free_symbols}
    return sp.factor(expr.subs(replacements))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-layer", type=int, default=10)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    if args.max_layer < 3:
        raise ValueError("--max-layer must be at least 3")

    phi, psi, F = mean_coordinate_coefficients(args.max_layer + 1)

    # Replay the exact mean-coordinate representation against P_h.
    representation_checks = 0
    source_r = next(symbol for symbol in polynomial_p(1).free_symbols if str(symbol) == "r")
    source_s = next(symbol for symbol in polynomial_p(1).free_symbols if str(symbol) == "s")
    for h in range(args.max_layer + 2):
        P = polynomial_p(h)
        normalization = 2 ** (h + h // 2) * sp.factorial(h)
        transformed = sp.expand(P.subs({source_r: (y - s) / 3, source_s: s}) / normalization)
        assert sp.expand(transformed - F[h]) == 0
        representation_checks += 1

    # Replay delta_h=h-y*d(log F_h)/dy as a positive convolution ratio.
    deficit_identity_checks = 0
    effective_degree_polynomial_checks = 0
    minimum_effective_coefficient: sp.Expr | None = None
    for h in range(args.max_layer + 1):
        theta_convolution = sum(
            (y * (j - 1) * phi[j] + s * j * psi[j]) * F[h - j]
            for j in range(1, h + 1)
        )
        assert sp.expand(h * F[h] - y * sp.diff(F[h], y) - theta_convolution) == 0
        deficit_identity_checks += 1

        # E_h>=0 is the polynomial form of mu_(h+1)-mu_h<=1.
        effective = sp.Poly(
            sp.expand(
                F[h] * F[h + 1]
                + y
                * (
                    F[h + 1] * sp.diff(F[h], y)
                    - sp.diff(F[h + 1], y) * F[h]
                )
            ),
            y,
            s,
        )
        assert all(coefficient >= 0 for coefficient in effective.coeffs())
        local_minimum = min(effective.coeffs())
        minimum_effective_coefficient = (
            local_minimum
            if minimum_effective_coefficient is None
            else min(minimum_effective_coefficient, local_minimum)
        )
        effective_degree_polynomial_checks += 1

    # Exact finite checks of the log-concavity premise and deficit monotonicity
    # at a spread of forest parameters.
    log_concavity_checks = 0
    deficit_monotonicity_checks = 0
    for s_value in (4, 6, 10, 22, 50):
        for excess in (5, 6, 17, 73):
            r_value = s_value + excess
            y_value = 3 * r_value + s_value
            values = [sp.factor(item.subs({y: y_value, s: s_value})) for item in F]
            for h in range(1, args.max_layer + 1):
                assert values[h] ** 2 >= values[h - 1] * values[h + 1]
                log_concavity_checks += 1
                deficit_h = sp.factor(
                    h - y_value * sp.diff(F[h], y).subs({y: y_value, s: s_value}) / values[h]
                )
                deficit_next = sp.factor(
                    h
                    + 1
                    - y_value
                    * sp.diff(F[h + 1], y).subs({y: y_value, s: s_value})
                    / values[h + 1]
                )
                assert deficit_next >= deficit_h
                deficit_monotonicity_checks += 1

    # The universal positive-polynomial defect only needs k,l<=h and x>3.
    # Replay its reduced exponent inequality for a wide finite index set.
    universal_defect_pair_checks = 0
    for h in range(args.max_layer + 1):
        for k in range(h + 1):
            for ell in range(h + 1):
                assert 2 * h - k - ell >= 0
                universal_defect_pair_checks += 1

    # Exact scalar comparison after the forest substitution r=s+5+q.
    X = 2 * r + s
    Y = 3 * r + s
    logarithmic_lower_minus_upper = sp.together(
        2 / (X - 1)
        + 2 / (X - 2)
        - 3 / (Y - 6)
        - sp.Rational(9, 2) * s / (Y * (Y - 6))
    )
    shifted = sp.together(logarithmic_lower_minus_upper.subs(r, s + 5 + q))
    scalar_numerator, scalar_denominator = map(sp.factor, shifted.as_numer_denom())
    expected_numerator = (
        72 * q**3
        + 252 * q**2 * s
        + 792 * q**2
        + 274 * q * s**2
        + 1776 * q * s
        + 2700 * q
        + 87 * s**3
        + 899 * s**2
        + 2802 * s
        + 2700
    )
    expected_denominator = (
        2
        * (2 * q + 3 * s + 8)
        * (2 * q + 3 * s + 9)
        * (3 * q + 4 * s + 9)
        * (3 * q + 4 * s + 15)
    )
    assert sp.expand(scalar_numerator - expected_numerator) == 0
    assert sp.expand(scalar_denominator - expected_denominator) == 0
    assert all(coefficient > 0 for coefficient in sp.Poly(scalar_numerator, q, s).coeffs())

    # Replay the final mixed minor directly in normalized P_h.
    mixed_minor_checks = 0
    strict_mixed_minor_checks = 0
    for h in range(args.max_layer + 1):
        P_h = polynomial_p(h)
        P_next = polynomial_p(h + 1)
        for s_value in sorted({max(2 * h, 2), max(2 * h, 4), 2 * h + 1, 3 * h + 7}):
            for excess in (5, 6, 17, 73):
                r_value = s_value + excess
                ph_r = substitute_by_name(P_h, r=r_value, s=s_value)
                ph_rm1 = substitute_by_name(P_h, r=r_value - 1, s=s_value)
                pn_rm1 = substitute_by_name(P_next, r=r_value - 1, s=s_value)
                pn_rm2 = substitute_by_name(P_next, r=r_value - 2, s=s_value)
                minor = sp.factor(
                    (2 * r_value + s_value - 1)
                    * (2 * r_value + s_value - 2)
                    * ph_r
                    * pn_rm2
                    - (2 * r_value + s_value - 3)
                    * (2 * r_value + s_value - 4)
                    * ph_rm1
                    * pn_rm1
                )
                assert minor >= 0
                mixed_minor_checks += 1
                if h >= 0:
                    assert minor > 0
                    strict_mixed_minor_checks += 1

    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_SELECTOR_MIXED_RATIO_REPLAY",
        "scope": {
            "all_order_components": [
                "positive convolution formula for the effective-degree deficit",
                "log-concavity implies delta_(h+1)>=delta_h",
                "F_(h+1)(y)/(y F_h(y)) is nonincreasing",
                "universal positive-coefficient polynomial shift bound",
                "strict scalar forest-cone comparison",
                "mixed normalized minor (68.12)",
            ],
            "finite_replay_max_layer": args.max_layer,
            "representation_checks": representation_checks,
            "deficit_identity_checks": deficit_identity_checks,
            "effective_degree_polynomial_checks": effective_degree_polynomial_checks,
            "log_concavity_checks": log_concavity_checks,
            "deficit_monotonicity_checks": deficit_monotonicity_checks,
            "universal_defect_pair_checks": universal_defect_pair_checks,
            "mixed_minor_checks": mixed_minor_checks,
            "strict_mixed_minor_checks": strict_mixed_minor_checks,
        },
        "scalar_comparison": {
            "shifted_numerator": str(scalar_numerator),
            "shifted_denominator": str(scalar_denominator),
        },
        "minimum_effective_polynomial_coefficient": str(minimum_effective_coefficient),
        "source_sha256": source_hash,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print("PASS_EXACT_SELECTOR_MIXED_RATIO_REPLAY")
    print(f"source_sha256={source_hash}")
    print(f"report_sha256={report_hash}")


if __name__ == "__main__":
    main()
