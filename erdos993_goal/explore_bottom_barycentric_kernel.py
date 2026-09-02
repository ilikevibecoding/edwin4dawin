#!/usr/bin/env python3
"""Inspect the kernel in barycentric coordinates on nodes -3,...,-d-2."""

import sympy as sp

from verify_bottom_schur_two_sided_reverse_tp import cleared_catalan_basis
from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


for d in range(3, 8):
    q = d - 1
    basis = cleared_catalan_basis(q)
    kernel = central_inverse_from_blocks(d).inv() * reverse_identity(q)
    nodes = list(range(3, d + 3))
    evaluation = sp.Matrix(
        d,
        q,
        lambda row, column: basis[column].eval(-nodes[row]),
    )
    nodal_kernel = sp.simplify(evaluation * kernel * evaluation.T)
    derivatives = sp.diag(
        *[
            (-1) ** (index - 3)
            * sp.factorial(index - 3)
            * sp.factorial(d + 2 - index)
            for index in nodes
        ]
    )
    barycentric = sp.simplify(derivatives.inv() * nodal_kernel * derivatives.inv())
    checker = sp.diag(*[(-1) ** index for index in range(d)])
    checked = sp.simplify(checker * barycentric * checker)
    print(f"d={d}, rank={barycentric.rank()}, null={barycentric.nullspace()}")
    print("barycentric=")
    print(barycentric)
    print("checker-signed inverse principal restriction=")
    print(sp.simplify(checked[:q, :q].inv()))
    difference = sp.zeros(q, d)
    for index in range(q):
        difference[index, index] = -1
        difference[index, index + 1] = 1
    cumulative = sp.Matrix(
        q,
        q,
        lambda row, column: sum(
            barycentric[i, j]
            for i in range(row + 1)
            for j in range(column + 1)
        ),
    )
    assert sp.simplify(difference.T * cumulative * difference - barycentric) == sp.zeros(d)
    weighted_evaluation = derivatives.inv() * evaluation
    transform = sp.Matrix(
        q,
        q,
        lambda row, column: -sum(
            weighted_evaluation[index, column] for index in range(row + 1)
        ),
    )
    assert sp.simplify(difference.T * transform - weighted_evaluation) == sp.zeros(d, q)
    assert sp.simplify(transform * kernel * transform.T - cumulative) == sp.zeros(q)
    print("residue-to-difference transform T=")
    print(transform)
    print("difference-compressed H=")
    print(cumulative)
    print("upper inverse H^(-1)J=")
    print(sp.simplify(cumulative.inv() * reverse_identity(q)))
