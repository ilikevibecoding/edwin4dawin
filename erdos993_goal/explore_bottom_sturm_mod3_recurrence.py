#!/usr/bin/env python3
"""Probe coefficientwise d->d+3, a->a+1 recurrences for Sturm numerators."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


Y = sp.symbols("y")


def compressed(d: int) -> sp.Matrix:
    q = d - 1
    Tau = super_ballot(q)
    return sp.simplify(
        Tau * (central_inverse_from_blocks(d).inv() * reverse_identity(q)) * Tau.T
    )


def signed_numerator(d: int, a: int, H: sp.Matrix) -> sp.Poly:
    q = d - 1
    difference = sum(
        (H[a, b] - H[a - 1, b]) / ((Y + b + 3) * (Y + b + 4))
        for b in range(q)
    )
    sign = 1 if 3 * a <= d - 2 else -1
    r = d - a
    return sp.Poly(sp.cancel(sign * difference * sp.rf(Y + 3, r + 1)), Y)


matrices = {d: compressed(d) for d in range(3, 19)}
for d in range(3, 16):
    for a in range(1, d - 1):
        if d == 4 and a == 1:
            continue
        old = signed_numerator(d, a, matrices[d])
        new = signed_numerator(d + 3, a + 1, matrices[d + 3])
        factor = sp.Poly((Y + (d - a) + 4) * (Y + (d - a) + 5), Y)
        lead_scale = sp.factor(new.LC() / old.LC())
        lead_remainder = sp.Poly(new.as_expr() - lead_scale * factor.as_expr() * old.as_expr(), Y)
        const_scale = sp.factor(new.nth(0) / (factor.nth(0) * old.nth(0)))
        const_remainder = sp.Poly(new.as_expr() - const_scale * factor.as_expr() * old.as_expr(), Y)
        lead_signs = {sp.sign(c) for c in lead_remainder.all_coeffs() if c != 0}
        const_signs = {sp.sign(c) for c in const_remainder.all_coeffs() if c != 0}
        print(
            f"({d},{a})->({d+3},{a+1}) "
            f"lead_rem={lead_signs}, const_rem={const_signs}, "
            f"lead_scale={lead_scale}, const_scale={const_scale}"
        )
