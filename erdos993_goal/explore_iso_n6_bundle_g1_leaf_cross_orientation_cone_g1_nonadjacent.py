#!/usr/bin/env python3
"""Exploratory exact cone search for the rank-six g1 ordinary-leaf residual.

The proved cross-orientation payment C_r(B;a,b)=Q_r(U+xW)+D_r(V,W)
is instantiated on the parent-added forest A=H+xK, on A-u/A-v, and in
both mark orientations.  Numerical cone candidates are always replayed by
exact SymPy expansion.  This file is exploratory and asserts no theorem.
"""

from __future__ import annotations

from fractions import Fraction

import numpy as np
import sympy as sp
from scipy.optimize import linprog
from scipy.sparse import csc_matrix

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    symbolic_rows,
)


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def add_leaf(left, deleted):
    return tuple(sp.expand(at(left, rank) + at(deleted, rank - 1)) for rank in range(8))


def iso(row, rank):
    return sp.expand(rank * at(row, rank) ** 2 - (rank + 1) * at(row, rank - 1) * at(row, rank + 1))


def leaf_d(left, right, rank):
    r = rank
    return sp.expand(
        at(right, r - 1) ** 2
        + 2 * r * at(left, r) * at(right, r - 1)
        + 2 * at(left, r - 1) * at(right, r - 2)
        - (r + 1) * at(left, r - 1) * at(right, r)
        - (r + 1) * at(right, r - 2) * at(left, r + 1)
        - at(right, r - 2) * at(right, r)
    )


def cross(urow, vrow, wrow, rank):
    """C_r for rows U=B-a, V=B-b, W=B-{a,b}."""
    return sp.expand(iso(add_leaf(urow, wrow), rank) + leaf_d(vrow, wrow, rank))


def exact_cone(target, candidates):
    variables = tuple(sorted(
        target.free_symbols | set().union(*(value.free_symbols for _, value in candidates)),
        key=str,
    ))
    target_terms = dict(sp.Poly(target, *variables).terms())
    candidate_terms = [dict(sp.Poly(value, *variables).terms()) for _, value in candidates]
    monomials = sorted(set(target_terms).union(*(set(row) for row in candidate_terms)))
    index = {monomial: position for position, monomial in enumerate(monomials)}
    rr, cc, vv = [], [], []
    for column, terms in enumerate(candidate_terms):
        for monomial, coefficient in terms.items():
            rr.append(index[monomial])
            cc.append(column)
            vv.append(float(coefficient))
    matrix = csc_matrix((vv, (rr, cc)), shape=(len(monomials), len(candidates)))
    rhs = np.array([float(target_terms.get(monomial, 0)) for monomial in monomials])
    result = linprog(np.ones(len(candidates)), A_eq=matrix, b_eq=rhs, bounds=(0, None), method="highs")
    print("LP", matrix.shape, result.status, result.message)
    if not result.success:
        dense = matrix.toarray()
        least, *_ = np.linalg.lstsq(dense, rhs, rcond=None)
        print("UNCONSTRAINED_RESIDUAL", np.max(np.abs(dense @ least - rhs)))
        return
    weights = [sp.Rational(Fraction(float(value)).limit_denominator(10000)) for value in result.x]
    recovered = sp.expand(sum(weight * candidate for weight, (_, candidate) in zip(weights, candidates)))
    print("EXACT", recovered == target)
    print("CHOSEN", [(label, weight) for weight, (label, _) in zip(weights, candidates) if weight])


def main():
    expressions = build_expressions()
    h, k, j, ell = (symbolic_rows(prefix) for prefix in "HKJL")
    he, hu, hv, hw = h
    ke, ku, kv, kw = k

    # On A=H+xK with parent p, the pair (u,p) has
    # U=A-u=HU+xKU, V=A-p=HE, W=A-{u,p}=HU; similarly for v.
    candidates = []
    for rank in (4, 5, 6):
        candidates.extend((
            (f"C{rank}(A;u,p)", cross(add_leaf(hu, ku), he, hu, rank)),
            (f"C{rank}(A;p,u)", cross(he, add_leaf(hu, ku), hu, rank)),
            (f"C{rank}(A;v,p)", cross(add_leaf(hv, kv), he, hv, rank)),
            (f"C{rank}(A;p,v)", cross(he, add_leaf(hv, kv), hv, rank)),
            (f"C{rank}(A-v;u,p)", cross(add_leaf(hw, kw), hv, hw, rank)),
            (f"C{rank}(A-v;p,u)", cross(hv, add_leaf(hw, kw), hw, rank)),
            (f"C{rank}(A-u;v,p)", cross(add_leaf(hw, kw), hu, hw, rank)),
            (f"C{rank}(A-u;p,v)", cross(hu, add_leaf(hw, kw), hw, rank)),
        ))

    print("F")
    exact_cone(expressions["F"], candidates)
    for case, target in {
        "00": expressions["g2"] + expressions["F"],
        "01": expressions["g2"] + expressions["F"] + expressions["QHJ"] + expressions["QKJ"] + expressions["T"],
        "10": expressions["g2"] + expressions["F"] + expressions["QHL"],
        "11": expressions["g2"] + expressions["F"] + expressions["QHL"] + expressions["QHJ"] + expressions["QKJ"] + expressions["T"],
    }.items():
        print("CASE", case)
        exact_cone(sp.expand(target), candidates)


if __name__ == "__main__":
    main()
