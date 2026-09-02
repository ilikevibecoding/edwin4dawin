#!/usr/bin/env python3
"""Probe real-rooted sections and root motion of the symmetric kernel."""

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


X, Y = sp.symbols("x y")


for d in range(3, 13):
    q = d - 1
    basis = cleared_catalan_basis(q)
    variable = basis[0].gens[0]
    kernel = central_inverse_from_blocks(d).inv()
    reversal = reverse_identity(q)
    beta_x = sp.Matrix(1, q, [p.as_expr().subs(variable, X) for p in basis])
    beta_y = sp.Matrix(q, 1, [p.as_expr().subs(variable, Y) for p in basis])
    polynomial = sp.Poly((beta_x * kernel * reversal * beta_y)[0], X)

    nonreal_parameters = []
    for value in range(-30, 21):
        roots = sp.nroots(polynomial.as_expr().subs(Y, value), maxsteps=300)
        if any(abs(complex(root).imag) > 1e-8 for root in roots):
            nonreal_parameters.append(value)

    sampled_roots = []
    for value in (0, 1, 2, 5, 10, 20):
        roots = sorted(float(sp.re(root)) for root in sp.nroots(polynomial.as_expr().subs(Y, value)))
        sampled_roots.append((value, roots))
    monotone_by_index = all(
        all(sampled_roots[j][1][i] < sampled_roots[j + 1][1][i] for j in range(5))
        or all(sampled_roots[j][1][i] > sampled_roots[j + 1][1][i] for j in range(5))
        for i in range(d - 2)
    )
    print(
        f"d={d}: first_nonreal_y={nonreal_parameters[:5]}, "
        f"roots_monotone_on_nonnegative_sample={monotone_by_index}"
    )
