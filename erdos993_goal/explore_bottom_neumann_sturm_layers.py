#!/usr/bin/env python3
"""Check signs of individual Neumann path-length layers in the Sturm difference."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import difference_matrix, super_ballot
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


Y = sp.symbols("y", nonnegative=True)


def numerator_coeff_sign(expression: sp.Expr) -> str:
    numerator, denominator = sp.fraction(sp.cancel(expression))
    poly = sp.Poly(numerator, Y)
    signs = {sp.sign(c) for c in poly.all_coeffs() if c != 0}
    if denominator.could_extract_minus_sign():
        signs = {-s for s in signs}
    if signs == {1}:
        return "+"
    if signs == {-1}:
        return "-"
    if not signs:
        return "0"
    return "x"


for d in range(3, 14):
    q = d - 1
    Tau = super_ballot(q)
    Z = central_inverse_from_blocks(d)
    D = sp.diag(*Z.diagonal())
    N = sp.simplify(D.inv() * (D - Z))
    v = sp.Matrix(
        [4**p * sp.rf(Y + sp.Rational(7, 2), p) / sp.rf(Y + 3, p + 2) for p in range(q)]
    )
    rhs = reverse_identity(q) * v
    delta = difference_matrix(q) * Tau
    peak = (d + 1) // 3 - 1
    current = D.inv() * rhs
    layer_signs = []
    for length in range(q):
        values = delta * current
        layer_signs.append("".join(numerator_coeff_sign(values[a]) for a in range(q - 1)))
        current = N * current
    expected = "".join("+" if a <= peak else "-" for a in range(1, q))
    print(f"d={d}, expected={expected}, layers={layer_signs}")
