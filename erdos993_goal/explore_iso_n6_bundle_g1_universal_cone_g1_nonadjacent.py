#!/usr/bin/env python3
"""Explore a smooth exact containment/extension lower cone for rank-six g1."""

from __future__ import annotations

import sympy as sp

from explore_iso_n6_bundle_g1_marked_cone_g1_nonadjacent import doubly_partitioned_g1


def negative_part(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    answer = 0
    for powers, coefficient in sp.Poly(sp.expand(expression), *variables).terms():
        if coefficient < 0:
            term = coefficient
            for variable, power in zip(variables, powers):
                term *= variable**power
            answer += term
    return sp.expand(answer)


def coarse_containment_lower(partitioned):
    names = {str(x): x for x in partitioned.free_symbols}
    dvars = tuple(sorted((x for x in partitioned.free_symbols if str(x).startswith("D")), key=str))
    lower = sp.expand(partitioned.subs({x: 0 for x in dvars}))
    rows = []
    for dvar in dvars:
        derivative = sp.expand(sp.diff(partitioned, dvar))
        negative = negative_part(derivative)
        cap = names["C" + str(dvar)[1:]]
        lower += negative * cap
        rows.append((str(dvar), sp.factor(derivative), sp.factor(negative), str(cap)))
    return sp.expand(lower), names, rows


def apply_high_caps(expression, names):
    current = expression
    # A/B classes live on n-1 vertices, W on n-2, Z on n vertices but every
    # Z set contains both marks. These are the exact consecutive-set caps.
    n = sp.Symbol("n", integer=True, nonnegative=True)
    for family in "WABZ":
        for rank in range(2, 8):
            names.setdefault(f"C{family}{rank}", sp.Symbol(f"C{family}{rank}", nonnegative=True))
    caps = []
    for rank in range(7, 3, -1):
        caps.extend([
            (f"CA{rank}", (n-rank)*names[f"CA{rank-1}"]/(rank-1)),
            (f"CB{rank}", (n-rank)*names[f"CB{rank-1}"]/(rank-1)),
            (f"CW{rank}", (n-rank-1)*names[f"CW{rank-1}"]/rank),
            (f"CZ{rank}", (n-rank+1)*names[f"CZ{rank-1}"]/(rank-2)),
        ])
    rows = []
    for name, cap in caps:
        variable = names[name]
        derivative = sp.factor(sp.diff(current, variable))
        rows.append((name, derivative))
        # This exploratory substitution is valid only if derivative <= 0.
        current = sp.expand(current.subs(variable, cap))
    return current, rows, n


def main():
    _, partitioned, _, _ = doubly_partitioned_g1()
    lower, names, drows = coarse_containment_lower(partitioned)
    print("PARTITIONED_TERMS", len(sp.Poly(partitioned, *sorted(partitioned.free_symbols, key=str)).terms()))
    print("COARSE_TERMS", len(sp.Poly(lower, *sorted(lower.free_symbols, key=str)).terms()))
    for row in drows:
        print("D_LOWER", *row)
    reduced, caps, n = apply_high_caps(lower, names)
    for name, derivative in caps:
        print("CAP_DERIVATIVE", name, derivative)
    print("REDUCED_TERMS", len(sp.Poly(reduced, *sorted(reduced.free_symbols, key=str)).terms()))
    print("REDUCED", sp.factor(reduced))


if __name__ == "__main__":
    main()
