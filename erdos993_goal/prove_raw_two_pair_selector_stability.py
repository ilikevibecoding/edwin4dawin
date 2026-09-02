#!/usr/bin/env python3
"""All-order proof certificate for the raw two-pair deletion selector.

Let O be M ordinary variables and let (a1,a2),(b1,b2) be two marked pairs.
For M>=4 define

  Q_M = 24 e4(O,a1,a2,b1,b2)
        -2 a1 a2 e2(O,b1,b2)
        -2 b1 b2 e2(O,a1,a2)
        +a1 a2 b1 b2.

Every coefficient is positive (24, 22, or 21 according to how many marked
pairs are completed).  This script certifies the symbolic discriminant
factorization proving Q_M real stable for every M>=4.

Separate symmetry and polarization reduce Q_M to the homogeneous ternary
quartic S_M(x,y,z).  For real y,z with s=y+z nonzero, put
r=yz/s^2 <= 1/4 and x=s*a.  The discriminant in a factors as a positive
prefactor times a polynomial whose coefficients are all positive after
M=n+4 and q=1-4r.  A local audit at r=0 fixes the four-real-root component.
Garding's hyperbolicity-cone theorem and polarization then prove stability.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "raw_two_pair_selector_stability_20260804.json"


def main() -> None:
    M, n, a, r, q, x, y, z = sp.symbols(
        "M n a r q x y z", real=True
    )
    A = M * (M - 1) * (M - 2) * (M - 3)
    B = 8 * M * (M - 1) * (M - 2)
    C = M * (M - 1)
    quartic = sp.expand(
        A * a**4
        + B * a**3
        + C * (11 + 26 * r) * a**2
        + 44 * M * r * a
        + 21 * r**2
    )
    discriminant = sp.factor(sp.discriminant(quartic, a))
    prefactor = 16 * M**3 * r**2 * (M - 2) * (M - 1) ** 2
    residual = sp.cancel(discriminant / prefactor)
    assert sp.expand(discriminant - prefactor * residual) == 0

    positive_form = sp.Poly(
        sp.expand(residual.subs(r, (1 - q) / 4).subs(M, n + 4)),
        n,
        q,
        domain=sp.QQ,
    )
    assert positive_form.degree(n) == 6
    assert positive_form.degree(q) == 4
    assert len(positive_form.terms()) == 35
    assert all(coefficient > 0 for coefficient in positive_form.coeffs())

    # At r=0 the quartic is a^2 times a quadratic.  The two nonzero roots
    # are distinct and real.  Scaling the two small roots by a=r*b leaves a
    # quadratic at r=0; it too has positive discriminant, so the double zero
    # splits into two real roots on both sides of r=0.
    nonzero_quadratic_discriminant = sp.factor(B**2 - 44 * A * C)
    small_root_discriminant = sp.factor((44 * M) ** 2 - 4 * 11 * C * 21)
    assert sp.factor(nonzero_quadratic_discriminant) == (
        4 * M**2 * (M - 2) * (M - 1) ** 2 * (5 * M + 1)
    )
    assert sp.factor(small_root_discriminant) == (
        44 * M * (23 * M + 21)
    )

    # If y+z=0, the specialization is a quadratic in X=x^2.  Both X-roots
    # are positive: sum and product are positive, and this discriminant is
    # positive for M>=4.
    opposite_discriminant = sp.factor(
        (26 * M * (M - 1)) ** 2 - 84 * A
    )
    opposite_shifted = sp.Poly(
        sp.expand(opposite_discriminant.subs(M, n + 4)), n
    )
    assert all(coefficient > 0 for coefficient in opposite_shifted.coeffs())

    diagonal_selector = sp.expand(
        A * x**4
        + B * x**3 * (y + z)
        + C * x**2 * (11 * (y + z) ** 2 + 26 * y * z)
        + 44 * M * x * y * z * (y + z)
        + 21 * y**2 * z**2
    )
    # Audit against the direct elementary-symmetric diagonalization.
    ordinary_e = [sp.binomial(M, k) * x**k for k in range(5)]
    special_e = [
        1,
        2 * (y + z),
        y**2 + z**2 + 4 * y * z,
        2 * y * z * (y + z),
        y**2 * z**2,
    ]
    direct = sum(24 * ordinary_e[k] * special_e[4 - k] for k in range(5))
    direct -= 2 * y**2 * (
        ordinary_e[2] + 2 * M * x * z + z**2
    )
    direct -= 2 * z**2 * (
        ordinary_e[2] + 2 * M * x * y + y**2
    )
    direct += y**2 * z**2
    assert sp.expand(sp.expand_func(direct) - diagonal_selector) == 0

    report = {
        "status": "PASS_ALL_ORDER_RAW_TWO_PAIR_SELECTOR_STABILITY",
        "range": "M>=4",
        "selector": (
            "24 e4(all)-2 a1a2 e2(omit a pair)-2 b1b2 e2(omit b pair)"
            "+a1a2b1b2"
        ),
        "diagonalization": str(diagonal_selector),
        "quartic_in_a": str(quartic),
        "discriminant_prefactor": str(prefactor),
        "positive_residual_after_M=n+4_q=1-4r": str(
            sp.factor(positive_form.as_expr())
        ),
        "positive_residual_terms": len(positive_form.terms()),
        "r0_nonzero_quadratic_discriminant": str(
            nonzero_quadratic_discriminant
        ),
        "r0_small_root_discriminant": str(small_root_discriminant),
        "opposite_yz_discriminant": str(opposite_discriminant),
        "proof_scope": (
            "The symbolic identities and positive coefficient expansion, "
            "together with the stated quartic root-continuation argument, "
            "prove hyperbolicity in the ordinary diagonal direction.  "
            "Coefficient positivity puts the positive orthant in that "
            "hyperbolicity cone; Garding plus block polarization proves real "
            "stability of the original multiaffine selector for every M>=4."
        ),
        "remaining_gap": (
            "The factorial/Laguerre normalized defect-one input has not yet "
            "been embedded into these raw coordinate slots."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(REPORT)


if __name__ == "__main__":
    main()
