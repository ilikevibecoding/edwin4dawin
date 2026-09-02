#!/usr/bin/env python3
"""Test two-boundary Schur nesting of the symmetric central form R_d=K_d J."""

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


def form(d: int) -> sp.Matrix:
    q = d - 1
    return sp.simplify(central_inverse_from_blocks(d).inv() * reverse_identity(q))


def congruence_residual(old: sp.Matrix, candidate: sp.Matrix) -> sp.Matrix:
    q = old.rows
    s0 = sp.sqrt(sp.factor(candidate[0, 0] / old[0, 0]))
    scales = [s0]
    for j in range(1, q):
        scales.append(sp.factor(candidate[0, j] / (s0 * old[0, j])))
    return sp.simplify(candidate - sp.diag(*scales) * old * sp.diag(*scales))


for d in range(3, 11):
    old = form(d)
    large = form(d + 2)
    last = large.rows - 1
    boundary = [0, last]
    interior = list(range(1, last))
    bb = large.extract(boundary, boundary)
    ib = large.extract(interior, boundary)
    direct = large.extract(interior, interior)
    schur = sp.simplify(direct - ib * bb.inv() * ib.T)
    direct_residual = congruence_residual(old, direct)
    schur_residual = congruence_residual(old, schur)
    print(
        f"d={d}: direct rank={direct_residual.rank()}, nnz={sum(x != 0 for x in direct_residual)}; "
        f"schur rank={schur_residual.rank()}, nnz={sum(x != 0 for x in schur_residual)}"
    )
