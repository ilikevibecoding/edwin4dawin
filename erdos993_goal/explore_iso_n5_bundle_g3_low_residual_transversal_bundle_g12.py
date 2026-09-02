#!/usr/bin/env python3
"""Discovery reduction of the low rank-five g3 residual under D=G-S.

S is an independent component transversal of size k<=2.  This file records
the exact substitution into the residual after the proved high-motif layer.
No sign conclusion is asserted.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent


def boolean_reduce(expression, variables):
    expression = sp.expand(expression)
    for variable in variables:
        expression = sp.rem(
            sp.Poly(expression, variable), sp.Poly(variable**2 - variable, variable)
        ).as_expr()
    return sp.expand(expression)


def main():
    report = json.loads((HERE / "iso_n5_bundle_g3_five_mode_configuration_bundle_g12_20260829.json").read_text())
    residual = sp.sympify(report["generic_forest_invariant"]["residual_without_high_motifs"])
    n = sp.Symbol("n")
    e = sp.Symbol("C_edges")
    du, dv, a = sp.symbols("C_degree_u C_degree_v C_adjacent")
    wedges, xu, xv, common = sp.symbols(
        "C_wedges C_neighbor_excess_u C_neighbor_excess_v C_common_neighbor"
    )
    k, removed_edges = sp.symbols("deleted_count removed_degree_sum", nonnegative=True)
    removed_center_wedges, removed_neighbor_excess = sp.symbols(
        "removed_center_wedges removed_neighbor_excess", nonnegative=True
    )
    eu, ev = sp.symbols("epsilon_u epsilon_v")
    hitu, hitv = sp.symbols("hit_u hit_v", nonnegative=True)
    lossu, lossv = sp.symbols("neighbor_excess_loss_u neighbor_excess_loss_v", nonnegative=True)
    removed_common = sp.Symbol("removed_common_neighbor", nonnegative=True)
    rules = {
        sp.Symbol("q"): n - k,
        sp.Symbol("D_edges"): e - removed_edges,
        sp.Symbol("D_degree_u"): eu * (du - hitu),
        sp.Symbol("D_degree_v"): ev * (dv - hitv),
        sp.Symbol("D_adjacent"): a * eu * ev,
        sp.Symbol("D_wedges"): wedges - removed_center_wedges - removed_neighbor_excess,
        sp.Symbol("D_neighbor_excess_u"): eu * (xu - lossu),
        sp.Symbol("D_neighbor_excess_v"): ev * (xv - lossv),
        sp.Symbol("D_common_neighbor"): eu * ev * (common - removed_common),
    }
    reduced = boolean_reduce(residual.subs(rules), (eu, ev, a))
    variables = tuple(sorted(reduced.free_symbols, key=str))
    poly = sp.Poly(reduced, *variables)
    print("terms", len(poly.terms()), "negative", sum(c.is_negative is True for c in poly.coeffs()))
    for symbol in (
        removed_edges, removed_center_wedges, removed_neighbor_excess,
        hitu, hitv, lossu, lossv, removed_common,
    ):
        print(symbol, sp.factor(sp.diff(reduced, symbol)))
    for values in ((0, 1, 1), (1, 1, 1), (1, 0, 1), (2, 1, 1), (2, 0, 1), (2, 0, 0)):
        branch = sp.factor(reduced.subs({k: values[0], eu: values[1], ev: values[2]}))
        p = sp.Poly(sp.expand(branch), *sorted(branch.free_symbols, key=str))
        print("branch", values, "terms", len(p.terms()), "negative", sum(c.is_negative is True for c in p.coeffs()))


if __name__ == "__main__":
    main()
