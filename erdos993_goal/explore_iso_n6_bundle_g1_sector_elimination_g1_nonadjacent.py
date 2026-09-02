#!/usr/bin/env python3
"""Diagnose uniform-sign extension elimination across the 256 rank-six g1 sectors."""

from __future__ import annotations

from collections import Counter

import sympy as sp

from explore_iso_n6_bundle_g1_marked_cone_g1_nonadjacent import doubly_partitioned_g1


def coefficient_sign(expression, t):
    variables = tuple(sorted(expression.free_symbols - {t}, key=str))
    polynomial = sp.Poly(sp.expand(expression), t, *variables)
    coefficients = polynomial.coeffs()
    if all(value >= 0 for value in coefficients):
        return 1
    if all(value <= 0 for value in coefficients):
        return -1
    return 0


def sectors():
    _, expression, _, _ = doubly_partitioned_g1()
    names = {str(x): x for x in expression.free_symbols}
    for family in "WABZ":
        for rank in range(2, 8):
            names.setdefault(f"C{family}{rank}", sp.Symbol(f"C{family}{rank}", nonnegative=True))
    dvars = tuple(sorted((x for x in expression.free_symbols if str(x).startswith("D")), key=str))
    base = sp.expand(expression.subs({x: 0 for x in dvars}))
    fixed_negative = {"DA6", "DB6", "DW5", "DW6", "DZ6"}
    fixed_positive = {"DA4", "DB4", "DZ5"}
    mixed = tuple(sorted(set(map(str, dvars)) - fixed_negative - fixed_positive))
    for mask in range(1 << len(mixed)):
        selected = fixed_negative | {name for bit, name in enumerate(mixed) if mask & (1 << bit)}
        current = base
        for dvar in dvars:
            if str(dvar) in selected:
                current += sp.diff(expression, dvar) * names["C" + str(dvar)[1:]]
        yield mask, sp.expand(current), names


def main():
    n, t = sp.symbols("n t", integer=True, nonnegative=True)
    order_floor = 58
    results = Counter()
    first = {}
    survivors = []
    for mask, current, names in sectors():
        actions = []
        for rank in range(7, 3, -1):
            for family in "ABWZ":
                name = f"C{family}{rank}"
                variable = names[name]
                derivative = sp.diff(current, variable)
                sign = coefficient_sign(derivative.subs(n, t + order_floor), t)
                if sign > 0:
                    current = sp.expand(current.subs(variable, 0))
                    action = "floor0"
                elif sign < 0:
                    denominator = rank - 1 if family in "AB" else rank if family == "W" else rank - 2
                    numerator = n - rank if family in "AB" else n - rank - 1 if family == "W" else n - rank + 1
                    cap = numerator * names[f"C{family}{rank-1}"] / denominator
                    current = sp.expand(current.subs(variable, cap))
                    action = "cap"
                else:
                    action = "mixed"
                    if mask == 0:
                        print("MASK0_MIXED_DERIVATIVE", name, sp.factor(derivative))
                actions.append((name, action))
                results[(name, action)] += 1
                first.setdefault((name, action), mask)
        mixed_actions = [name for name, action in actions if action == "mixed"]
        if not mixed_actions:
            survivors.append((mask, current))
    print("ORDER_FLOOR", order_floor)
    print("FULLY_ELIMINATED", len(survivors), "OF", 256)
    for key in sorted(results):
        print("ACTION", key, results[key], "FIRST", first[key])


if __name__ == "__main__":
    main()
