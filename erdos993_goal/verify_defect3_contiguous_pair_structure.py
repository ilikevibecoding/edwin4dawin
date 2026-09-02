#!/usr/bin/env python3
"""Exact certificate for the rigid structure of the defect-three pair.

This records the coefficient/contiguous relation that distinguishes the
actual endpoint from arbitrary proper-position pairs, together with an exact
counterexample to the tempting overbroad high-derivative theorem.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import (
    X,
    hypergeometric_form,
)


Y, q = sp.symbols("Y q")
OUT = Path("defect3_contiguous_pair_structure_certificate_20260802.json")


def derivative_square(poly: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(order, a) * sp.diff(poly, X, a)
        * sp.diff(poly.subs(X, Y), Y, order-a)
        for a in range(order+1)
    ))


def primitive_line(poly: sp.Expr, xline: sp.Expr, yline: sp.Expr) -> tuple[sp.Poly, list[int]]:
    raw = sp.Poly(sp.expand(poly.subs({X: xline, Y: yline})), q)
    vals = [sp.Rational(raw.nth(i)) for i in range(raw.degree()+1)]
    denominator = sp.ilcm(*[value.q for value in vals])
    integers = [int(value*denominator) for value in vals]
    divisor = abs(math.gcd(*integers))
    coeffs = [value//divisor for value in integers]
    return sp.Poly(sum(value*q**i for i,value in enumerate(coeffs)), q), coeffs


def main() -> None:
    coefficient_checks = 0
    relation_checks = []
    for N in range(4, 61):
        g = hypergeometric_form(N, 3)
        h = hypergeometric_form(N-1, 3)
        k = hypergeometric_form(N, 4)
        for j in range(2, N+1):
            expected = sp.Rational(
                sp.factorial(N+j-3),
                sp.factorial(N-j)*sp.factorial(2*j-3)*sp.factorial(j),
            )
            assert sp.Poly(g, X).nth(j) == expected
            expected_h = expected * sp.Rational(N-j, N+j-3)
            assert sp.Poly(h, X).nth(j) == expected_h
            coefficient_checks += 2
        assert sp.expand(g-h-k) == 0
        assert sp.expand((N-3)*h + X*sp.diff(h, X) - N*g + X*sp.diff(g, X)) == 0
        # The derivative-level version is what can telescope inside the
        # binomial endpoint sum.
        for a in range(N+1):
            relation = sp.expand(
                X*(sp.diff(h, X, a+1)+sp.diff(g, X, a+1))
                -(N-a)*sp.diff(g, X, a)
                +(N+a-3)*sp.diff(h, X, a)
            )
            assert relation == 0
        relation_checks.append(N)

    # Exact counterexample to the statement with only h << g' and matching
    # leading coefficients.  All hypotheses are transparent from the
    # positive-residue formula below.
    broad_g = X**4/sp.Integer(4) - X**2/sp.Integer(2) + sp.Rational(1, 8)
    broad_p = sp.diff(broad_g, X)
    broad_h = X**3 + 111*X**2 - 100*X - 10
    residue_form = sp.expand(
        broad_p
        + 100*sp.cancel(broad_p/(X+1))
        + 10*sp.cancel(broad_p/X)
        + sp.cancel(broad_p/(X-1))
    )
    assert sp.expand(residue_form-broad_h) == 0
    assert int(sp.Poly(broad_g, X).count_roots(-sp.oo, sp.oo)) == 4
    assert int(sp.Poly(broad_h, X).count_roots(-sp.oo, sp.oo)) == 3
    broad_target = sp.expand(
        derivative_square(broad_g, 3)-derivative_square(broad_h, 1)
    )
    xline = 167+31*q
    yline = -79+35*q
    line, coefficients = primitive_line(broad_target, xline, yline)
    assert line.degree() == 5
    assert sp.gcd(line, line.diff()).degree() == 0
    real = int(line.count_roots(-sp.oo, sp.oo))
    assert real == 3

    report = {
        "kind": "defect3_contiguous_pair_structure",
        "date": "2026-08-02",
        "status": "PASS_RIGID_PAIR_IDENTITIES_AND_EXACT_BROAD_COUNTEREXAMPLE",
        "coefficient_checks": coefficient_checks,
        "N_range": [relation_checks[0], relation_checks[-1]],
        "coefficient_formula": (
            "[X^j]g_N=(N+j-3)!/((N-j)!(2j-3)!j!) for 2<=j<=N"
        ),
        "pair_multiplier": "[X^j]g_(N-1)=((N-j)/(N+j-3))[X^j]g_N",
        "contiguous_relation": "(N-3)h+Xh'=Ng-Xg'",
        "derivative_relation": (
            "X(h^(a+1)+g^(a+1))=(N-a)g^a-(N+a-3)h^a"
        ),
        "discrete_difference": "g_N(defect3)-g_(N-1)(defect3)=g_N(defect4)",
        "second_proper_position_relation": {
            "identities": [
                "g_N=(N-1)X^2 T_3(J_(N-2))/2",
                "g_(N-1)=(N-2)X^2 T_3(J_(N-3))/2",
            ],
            "proof": (
                "Consecutive Jacobi polynomials J_(N-2),J_(N-3) interlace; "
                "the Polya-Schur multiplier T_3 preserves their proper "
                "position, and the common X^2 factor is harmless.  Hence "
                "g_(N-1) is also in proper position with g_N."
            ),
        },
        "stable_deletion_contraction_lift": {
            "L": "2N-3",
            "ambient_seed": "a_N=g_N+g_(N-1)",
            "polarized_polynomial": (
                "K_N(X;z_1,...,z_L)=sum_j [X^j]a_N * X^j * "
                "e_(N-j)(z_1,...,z_L)/binom(L,N-j)"
            ),
            "stability": (
                "a_N is negative-rooted by proper position; homogenization "
                "and polarization preserve real stability, so K_N is stable."
            ),
            "deletion": (
                "K_N|_(z_L=0,z_1=...=z_(L-1)=1)=g_N, because "
                "binom(L-1,k)/binom(L,k)=(L-k)/L."
            ),
            "contraction": (
                "partial_(z_L)K_N|_(z_1=...=z_(L-1)=1)=g_(N-1), "
                "because binom(L-1,k-1)/binom(L,k)=k/L and "
                "k/(L-k)=(N-j)/(N+j-3)."
            ),
            "significance": (
                "The actual g,h pair is an exact deletion/contraction pair "
                "of one stable multiaffine polynomial, a structure absent "
                "from the broad counterexample."
            ),
        },
        "overbroad_theorem_counterexample": {
            "claimed_but_false_statement": (
                "For every hyperbolic degree-N g and every h in proper "
                "position with g' having leading(h)=leading(g'), the target "
                "at d=floor((N+3)/2) is stable."
            ),
            "N": 4,
            "d": 3,
            "g": str(broad_g),
            "g_prime": str(broad_p),
            "h": str(broad_h),
            "proper_position_certificate": (
                "h/g'=1+100/(X+1)+10/X+1/(X-1); positive residues put "
                "h/g' in one open half-plane on the upper half-plane."
            ),
            "line": {"X": "167+31q", "Y": "-79+35q"},
            "primitive_integer_coefficients_ascending": coefficients,
            "degree": line.degree(),
            "exact_real_roots": real,
            "nonreal_roots": line.degree()-real,
        },
        "conclusion": (
            "Proper position with g' alone is insufficient.  The actual pair "
            "also has a common double boundary root, proper position with g, "
            "and the displayed rigid contiguous/discrete-difference identities."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"], "coefficient_checks": coefficient_checks,
        "N_range": report["N_range"], "broad_counterexample_nonreal_roots": 2,
        "output": str(OUT.resolve()),
    }, indent=2))


if __name__ == "__main__":
    main()
