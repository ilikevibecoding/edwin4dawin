#!/usr/bin/env python3
"""Search isolate-shift reserve cones for the H(A) block of rank-five g1.

Discovery helper only.  It asks whether H is an exact nonnegative linear
combination of fixed-rank Q/S margins on (1+x)^t A plus manifestly positive
coefficient monomials.  Any returned identity still needs theorem-scope
checks for every margin used.
"""

from __future__ import annotations

import numpy as np
import sympy as sp
from scipy.optimize import linprog


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def shifted(a, isolates, maximum=6):
    return tuple(
        sp.expand(sum(sp.binomial(isolates, j) * at(a, rank - j) for j in range(rank + 1)))
        for rank in range(maximum + 1)
    )


def q(row, rank):
    return sp.expand(
        rank * at(row, rank) ** 2
        + at(row, rank - 1) ** 2
        - (rank + 1) * at(row, rank - 1) * at(row, rank + 1)
    )


def strong(row, rank):
    return sp.expand(2 * q(row, rank) - at(row, rank - 1) * at(row, rank))


def main():
    a = sp.symbols("a0:7")
    target = sp.expand(
        2 * a[1] * a[4] - 5 * a[1] * a[5] - 6 * a[1] * a[6]
        + 6 * a[2] * a[3] - 8 * a[2] * a[5]
        + 5 * a[3] ** 2 + 6 * a[3] * a[4]
    )
    candidates = []
    for isolates in range(13):
        row = shifted(a, isolates)
        for rank in range(2, 6):
            candidates.append((f"Q{rank}:t{isolates}", q(row, rank)))
            candidates.append((f"S{rank}:t{isolates}", strong(row, rank)))
    # Manifestly nonnegative products may absorb unused positive resources.
    for i in range(1, 7):
        for j in range(i, 7):
            candidates.append((f"P:a{i}a{j}", a[i] * a[j]))

    polynomials = [sp.Poly(target, *a)] + [sp.Poly(expr, *a) for _, expr in candidates]
    dictionaries = [dict(poly.terms()) for poly in polynomials]
    monomials = sorted(set().union(*(row for row in dictionaries)))
    matrix = np.zeros((len(monomials), len(candidates)))
    rhs = np.zeros(len(monomials))
    for r, monomial in enumerate(monomials):
        rhs[r] = float(dictionaries[0].get(monomial, 0))
        for c, dictionary in enumerate(dictionaries[1:]):
            matrix[r, c] = float(dictionary.get(monomial, 0))
    result = linprog(
        np.ones(len(candidates)), A_eq=matrix, b_eq=rhs,
        bounds=(0, None), method="highs",
    )
    print("CANDIDATES", len(candidates), "MONOMIALS", len(monomials))
    print("FEASIBLE", result.success, result.message)
    if not result.success:
        return
    residual = target
    for value, (name, expression) in zip(result.x, candidates):
        if value <= 1e-8:
            continue
        rational = sp.Rational(str(float(value))).limit_denominator(100000)
        print(name, rational)
        residual = sp.expand(residual - rational * expression)
    print("EXACT_RESIDUAL_ZERO", residual == 0)
    if residual != 0:
        print("RESIDUAL", residual)


if __name__ == "__main__":
    main()
