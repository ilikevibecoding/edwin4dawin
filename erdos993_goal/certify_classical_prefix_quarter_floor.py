"""Exact certificate for the shared classical-prefix spectral floor.

For odd reserve r>=2 and even reserve r>=1 the shared shifted-Jacobi
prefix has least eigenvalue greater than 1/4.  Reserves below those ranges
are separately certified above 1/20, matching the stronger small-reserve
tail bound.

The finite part uses exact rational LDL pivots.  The infinite tail uses
Krasikov's explicit upper bound for the largest Jacobi zero (Theorem 2,
equation (4), arXiv:math/0306286) after swapping the Jacobi parameters and
reflecting x -> -x.  Only elementary polynomial inequalities remain.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent


def prefix_data_exact(parity: str, r: int):
    if parity == "odd":
        alpha = Fraction(2 * r + 1)
        beta = Fraction(1, 2)
        size = r + 3
    else:
        alpha = Fraction(2 * r + 2)
        beta = Fraction(-1, 2)
        size = r + 4

    def top(k: int):
        diagonal = -Fraction(k) * (k + alpha) / (2 * k + alpha + beta)
        second = (
            Fraction(k * (k - 1), 2)
            * (k + alpha - 1)
            * (k + alpha)
            / ((2 * k + alpha + beta - 1) * (2 * k + alpha + beta))
        )
        return diagonal, second

    diagonal = []
    squared_offdiagonal = [Fraction(0)]
    for k in range(size):
        c0, e0 = top(k)
        c1, e1 = top(k + 1)
        a = c0 - c1
        diagonal.append(a)
        if k:
            squared_offdiagonal.append(e0 - e1 - a * c0)
    return diagonal, squared_offdiagonal


def ldl_record(parity: str, r: int, threshold: Fraction):
    diagonal, squared_offdiagonal = prefix_data_exact(parity, r)
    pivots = []
    for index, value in enumerate(diagonal):
        pivot = value - threshold
        if index:
            pivot -= squared_offdiagonal[index] / pivots[-1]
        assert pivot > 0
        pivots.append(pivot)
    payload = ";".join(f"{value.numerator}/{value.denominator}" for value in pivots)
    return {
        "r": r,
        "size": len(pivots),
        "threshold": f"{threshold.numerator}/{threshold.denominator}",
        "all_ldl_pivots_strictly_positive": True,
        "pivot_digest": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
        "minimum_pivot_decimal": min(float(value) for value in pivots),
        "maximum_numerator_bits": max(value.numerator.bit_length() for value in pivots),
        "maximum_denominator_bits": max(value.denominator.bit_length() for value in pivots),
    }


def coefficient_record(polynomial: sp.Expr, variable: sp.Symbol, shift: int = 0):
    shifted = sp.Poly(sp.expand(polynomial.subs(variable, variable + shift)), variable, domain=sp.QQ)
    coefficients = shifted.all_coeffs()
    assert all(value >= 0 for value in coefficients)
    assert shifted.eval(0) > 0
    payload = ";".join(map(str, coefficients))
    return {
        "shift": shift,
        "degree": shifted.degree(),
        "all_power_coefficients_nonnegative": True,
        "constant_strictly_positive": True,
        "coefficient_digest": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
        "coefficients_descending": list(map(str, coefficients)),
    }


def asymptotic_record(parity: str):
    r = sp.symbols("r", nonnegative=True)
    if parity == "odd":
        jacobi_alpha = 2 * r + 1
        jacobi_beta = sp.Rational(1, 2)
        degree = r + 3
    else:
        jacobi_alpha = 2 * r + 2
        jacobi_beta = -sp.Rational(1, 2)
        degree = r + 4
    s = sp.expand(jacobi_alpha + jacobi_beta + 1)
    q = sp.expand(jacobi_alpha - jacobi_beta)
    rho = sp.expand(2 * degree + jacobi_alpha + jacobi_beta + 1)
    denominator = sp.expand(rho**2 + 2 * s + 1)
    radical_squared = sp.expand(
        (rho**2 - q**2 + 2 * s + 1) * (rho**2 - s**2)
    )
    qterm = sp.expand(q * (s + 1))
    comparison = sp.expand(qterm + denominator / 2)
    radical_gap_square = sp.factor(radical_squared - comparison**2)
    checks = {
        "R_greater_than_Q_plus_D_over_2": coefficient_record(radical_gap_square, r),
        # R>=comparison lets us rationalize B-1/2 and use R+comparison>=2comparison.
        "B_minus_half_at_most_3_over_2r": coefficient_record(
            sp.expand(3 * denominator * comparison - r * radical_gap_square), r
        ),
        "correction_E_at_most_1_over_2r": coefficient_record(
            sp.expand(denominator**3 - 64 * r**2 * qterm**2), r
        ),
        "B_at_most_three_quarters": coefficient_record(
            sp.expand((qterm + 3 * denominator / 4) ** 2 - radical_squared), r, shift=100
        ),
        "B_nonnegative": coefficient_record(
            sp.expand(radical_squared - qterm**2), r
        ),
        "R_at_most_16r_squared_for_r_ge_100": coefficient_record(
            sp.expand(256 * r**4 - radical_squared), r, shift=100
        ),
    }
    return {
        "parity": parity,
        "jacobi_degree": str(degree),
        "jacobi_alpha_after_reflection": str(jacobi_alpha),
        "jacobi_beta_after_reflection": str(jacobi_beta),
        "s": str(s),
        "q": str(q),
        "rho": str(rho),
        "D": str(sp.factor(denominator)),
        "R_squared": str(sp.factor(radical_squared)),
        "Q": str(sp.factor(qterm)),
        "checks": checks,
        "deduction": (
            "For r>=100, B-1/2<=3/(2r), E<=1/(2r), hence B+E-1/2<=2/r. "
            "Also 0<=B<=3/4 and R<=16r^2. Thus Krasikov's negative correction "
            "A is at least 1/(2r^(2/3)); this exceeds 2/r because r>64. Therefore "
            "the reflected largest zero is below 1/2, so the shifted prefix minimum "
            "is above 1/4."
        ),
    }


def main():
    finite_quarter = {
        "odd": [ldl_record("odd", r, Fraction(1, 4)) for r in range(2, 100)],
        "even": [ldl_record("even", r, Fraction(1, 4)) for r in range(1, 100)],
    }
    small_threshold = {
        "odd": [ldl_record("odd", r, Fraction(1, 20)) for r in (0, 1)],
        "even": [ldl_record("even", 0, Fraction(1, 20))],
    }
    report = {
        "status": "EXACT_SHARED_PREFIX_SPECTRAL_FLOOR",
        "primary_source": {
            "title": "On extreme zeros of classical orthogonal polynomials",
            "author": "Ilia Krasikov",
            "theorem": "Theorem 2, equation (4)",
            "url": "https://arxiv.org/pdf/math/0306286",
        },
        "finite_quarter_ldl": finite_quarter,
        "small_reserve_one_twentieth_ldl": small_threshold,
        "asymptotic_krasikov_reductions": [
            asymptotic_record("odd"),
            asymptotic_record("even"),
        ],
        "conclusion": (
            "The shared prefix minimum is >1/4 for odd r>=2 and even r>=1. "
            "For odd r=0,1 and even r=0 it is >1/20."
        ),
    }
    output = HERE / "shared_classical_prefix_spectral_floor_exact_20260806.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
