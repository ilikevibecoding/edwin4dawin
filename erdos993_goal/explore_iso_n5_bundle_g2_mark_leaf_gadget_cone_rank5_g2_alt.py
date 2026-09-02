#!/usr/bin/env python3
"""Search low-rank proved gadget cones for the compact g2 reserve pieces.

Discovery only: attach bounded leaf bundles to the two marks of an arbitrary
marked forest C, optionally add isolates, and test whether the P*N piece, the
J*R curvature, or their sum is a nonnegative constant combination of known
low-rank Q/N/cross-orientation forms on those gadgets.
"""

from __future__ import annotations

import itertools

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt import (
    at,
    defect_r,
    nested,
    nested2,
    weighted_r,
)


def add(left, right):
    return tuple(sp.expand(at(left, k) + at(right, k)) for k in range(7))


def multiply(left, right):
    return tuple(
        sp.expand(sum(at(left, j) * at(right, k - j) for j in range(k + 1)))
        for k in range(7)
    )


def power_isolate(number):
    return tuple(sp.binomial(number, k) if k <= number else 0 for k in range(7))


def subtract(left, right):
    return tuple(sp.expand(at(left, k) - at(right, k)) for k in range(7))


def shift(row):
    return (sp.Integer(0), *row[:-1])


def q(row, rank):
    return sp.expand(
        rank * at(row, rank) ** 2
        + at(row, rank - 1) ** 2
        - (rank + 1) * at(row, rank - 1) * at(row, rank + 1)
    )


def leaf_d(left, right, rank):
    return sp.expand(
        at(right, rank - 1) ** 2
        + 2 * rank * at(left, rank) * at(right, rank - 1)
        + 2 * at(left, rank - 1) * at(right, rank - 2)
        - (rank + 1) * at(left, rank - 1) * at(right, rank)
        - (rank + 1) * at(right, rank - 2) * at(left, rank + 1)
        - at(right, rank - 2) * at(right, rank)
    )


def cross(rows, rank):
    _e, u, v, w = rows
    p = add(u, shift(w))
    return sp.expand(q(p, rank) + leaf_d(v, w, rank))


def reserve(row, rank):
    return sp.expand(
        2 * rank * at(row, rank) ** 2
        - at(row, rank - 1) * at(row, rank)
        - 2 * (rank + 1) * at(row, rank - 1) * at(row, rank + 1)
    )


def main():
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    e, u, v, w = crows

    j_kernel = {(0, 0): 2, (0, 1): 2, (1, 0): 2, (1, 1): 1}
    pn = sp.expand(nested2(crows, 4, 4) + nested2(crows, 4, 3))
    curvature = sp.expand(weighted_r(crows, j_kernel, 4, 4) - weighted_r(crows, j_kernel, 3, 5))
    targets = {"PN": pn, "curvature": curvature, "sum": sp.expand(pn + curvature)}

    def graph_row(ru, rv, isolates, deleted):
        left_u = ru - sum(name.startswith("lu") for name in deleted)
        left_v = rv - sum(name.startswith("lv") for name in deleted)
        left_i = isolates - sum(name.startswith("i") for name in deleted)
        delete_u = "u" in deleted
        delete_v = "v" in deleted
        fu = power_isolate(left_u)
        fv = power_isolate(left_v)
        fi = power_isolate(left_i)
        au = subtract(fu, power_isolate(0))
        av = subtract(fv, power_isolate(0))
        if not delete_u and not delete_v:
            row = add(add(e, multiply(au, u)), add(multiply(av, v), multiply(multiply(au, av), w)))
        elif delete_u and not delete_v:
            row = multiply(fu, add(u, multiply(av, w)))
        elif not delete_u and delete_v:
            row = multiply(fv, add(v, multiply(au, w)))
        else:
            row = multiply(multiply(fu, fv), w)
        return multiply(fi, row)

    candidates = []
    seen = set()
    for ru in range(3):
        for rv in range(3):
            for isolates in range(3):
                vertices = ["u", "v", *(f"lu{i}" for i in range(ru)), *(f"lv{i}" for i in range(rv)), *(f"i{i}" for i in range(isolates))]
                if len(vertices) < 2:
                    continue
                for first, second in itertools.combinations(vertices, 2):
                    rows = tuple(
                        graph_row(ru, rv, isolates, deleted)
                        for deleted in (set(), {first}, {second}, {first, second})
                    )
                    forms = []
                    for rank in (3, 4, 5):
                        forms.extend(((f"Q{rank}", q(rows[0], rank)), (f"S{rank}", reserve(rows[0], rank))))
                    for rank in (3, 4):
                        forms.append((f"N{rank}", nested(rows, rank)))
                    for rank in (4, 5):
                        forms.append((f"C{rank}", cross(rows, rank)))
                    for kind, expression in forms:
                        key = sp.srepr(expression)
                        if not expression or key in seen:
                            continue
                        seen.add(key)
                        candidates.append((f"{kind}:r{ru},{rv},i{isolates}:{first},{second}", expression))

    variables = tuple(symbol for row in crows for symbol in row)
    candidate_polynomials = [sp.Poly(expression, *variables) for _name, expression in candidates]
    candidate_dicts = [dict(polynomial.terms()) for polynomial in candidate_polynomials]
    print("CANDIDATES", len(candidates))
    for target_name, target in targets.items():
        target_dict = dict(sp.Poly(target, *variables).terms())
        monomials = sorted(set(target_dict).union(*(dictionary for dictionary in candidate_dicts)))
        matrix = np.zeros((len(monomials), len(candidates)))
        rhs = np.zeros(len(monomials))
        for row_index, monomial in enumerate(monomials):
            rhs[row_index] = float(target_dict.get(monomial, 0))
            for column_index, dictionary in enumerate(candidate_dicts):
                matrix[row_index, column_index] = float(dictionary.get(monomial, 0))
        result = linprog(np.ones(len(candidates)), A_eq=matrix, b_eq=rhs, bounds=(0, None), method="highs")
        print(target_name, "FEASIBLE", result.success, result.message)
        if result.success:
            for value, (name, _expression) in zip(result.x, candidates):
                if value > 1e-8:
                    print(" ", name, value)


if __name__ == "__main__":
    main()
