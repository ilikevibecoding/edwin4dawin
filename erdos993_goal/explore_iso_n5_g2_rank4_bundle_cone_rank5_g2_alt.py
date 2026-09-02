#!/usr/bin/env python3
"""Discovery cone from proved rank-four bundle coefficients to rank-five g2.

All searches are symbolic but the LP feasibility decision is floating point;
no sign theorem is asserted by this helper.
"""

from __future__ import annotations

import itertools

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt import (
    add_isolates,
    add_xd,
    nested,
    raw_g2,
)
from prove_iso_n5_g2_a2_all_forest_rank5_g2_alt import a2_value
from prove_iso_n5_g1_h_all_forest_root import h_value


def forward(values):
    values = list(values)
    answer = []
    while values:
        answer.append(sp.expand(values[0]))
        values = [sp.expand(values[j + 1] - values[j]) for j in range(len(values) - 1)]
    return answer


def rank4_coefficients(crows, drows):
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(4):
        total = add_xd(add_isolates(crows, amount, 6), drows)
        lower = sum(nested(add_isolates(crows, t, 5), 3) for t in range(amount))
        gamma.append(sp.expand(nested(total, 4) - nested(base, 4) - lower))
    return forward(gamma)[1:4]


def coefficient_dictionary(expression, variables):
    return dict(sp.Poly(sp.expand(expression), *variables).terms())


def search(target, generators):
    variables = tuple(sorted(target.free_symbols | set().union(*(expr.free_symbols for _, expr in generators)), key=str))
    dictionaries = [coefficient_dictionary(target, variables)]
    dictionaries.extend(coefficient_dictionary(expr, variables) for _, expr in generators)
    monomials = sorted(set().union(*(set(row) for row in dictionaries)))
    matrix = np.asarray([
        [float(row.get(monomial, 0)) for row in dictionaries[1:]]
        for monomial in monomials
    ])
    rhs = np.asarray([float(dictionaries[0].get(monomial, 0)) for monomial in monomials])
    result = linprog(np.ones(len(generators)), A_eq=matrix, b_eq=rhs, bounds=(0, None), method="highs")
    print({
        "generators": len(generators), "monomials": len(monomials),
        "success": result.success, "status": result.status, "message": result.message,
    })
    if result.success:
        print("active", [(name, value) for value, (name, _) in zip(result.x, generators) if value > 1e-8])
        print("residual", np.max(np.abs(matrix @ result.x - rhs)))


def main():
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    zero_rules = {row[0]: sp.Integer(1) for row in crows}
    crows = tuple(tuple(value.subs(zero_rules) for value in row) for row in crows)
    target = sp.expand(raw_g2(crows, crows).subs(zero_rules))
    generators = []
    for isolates in range(9):
        shifted = add_isolates(crows, isolates, 6)
        for rank, expression in enumerate(rank4_coefficients(shifted, shifted), 1):
            generators.append((f"rank4_g{rank}:I{isolates}", expression))
        for name, row in zip("EUVW", shifted):
            generators.append((f"A2({name}):I{isolates}", a2_value(row)))
            generators.append((f"H({name}):I{isolates}", h_value(row)))
    search(target, generators)


if __name__ == "__main__":
    main()
