#!/usr/bin/env python3
"""Test whether the ordinary-leaf g1 increments lie in a small rank-five span."""

from __future__ import annotations

import itertools

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import (
    add_leaf,
    substitute,
)
from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


def add_rows(*row_sets):
    return tuple(tuple(sp.expand(sum(row[rank] for row in rows)) for rank in range(7))
                 for rows in zip(*row_sets))


def sub5(expression, generic_c, generic_d, crows, drows):
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update({symbol: value for symbol, value in zip(generic, actual)})
    return sp.expand(expression.subs(rules))


def solve_span(target, candidates):
    variables = tuple(sorted(
        target.free_symbols | set().union(*(value.free_symbols for _, value in candidates)),
        key=str,
    ))
    target_terms = dict(sp.Poly(target, *variables).terms())
    candidate_terms = [dict(sp.Poly(value, *variables).terms()) for _, value in candidates]
    monomials = sorted(set(target_terms).union(*(set(row) for row in candidate_terms)))
    matrix = sp.Matrix([[row.get(monomial, 0) for row in candidate_terms] for monomial in monomials])
    rhs = sp.Matrix([target_terms.get(monomial, 0) for monomial in monomials])
    solution = sp.linsolve((matrix, rhs))
    return solution


def main():
    expression6 = reconstruct(1)
    arows = tuple(tuple(sp.symbols(f"a{family}0:8")) for family in "EUVW")
    hrows = tuple(tuple(sp.symbols(f"h{family}0:8")) for family in "EUVW")
    brows = tuple(tuple(sp.symbols(f"b{family}0:8")) for family in "EUVW")
    krows = tuple(tuple(sp.symbols(f"k{family}0:8")) for family in "EUVW")
    crows = add_leaf(arows, hrows)
    base = substitute(expression6, arows, brows)
    targets = {
        "deleted": sp.expand(substitute(expression6, crows, brows) - base),
        "retained_parent_deleted": sp.expand(
            substitute(expression6, crows, isolate_multiply(brows, 1)) - base
        ),
        "retained_parent_retained": sp.expand(
            substitute(expression6, crows, add_leaf(brows, krows)) - base
        ),
    }

    generic_c, generic_d, g1, g2 = raw_coefficients()
    zero = tuple(tuple(sp.Integer(0) for _ in range(7)) for _ in "EUVW")
    sources = {
        "A": arows,
        "H": hrows,
        "B": brows,
        "K": krows,
        "C": crows,
        "IB": isolate_multiply(brows, 1),
        "BK": add_leaf(brows, krows),
    }
    candidates = []
    for index, raw in ((1, g1), (2, g2)):
        for cname, dname in itertools.product(sources, ["0", *sources]):
            drows = zero if dname == "0" else sources[dname]
            candidates.append((f"g{index}({cname},{dname})", sub5(
                raw, generic_c, generic_d, sources[cname], drows
            )))
    for name, target in targets.items():
        relevant = candidates
        solution = solve_span(target, relevant)
        print("TARGET", name, "CANDIDATES", len(relevant), "SOLUTION", solution)
        print("LABELS", [label for label, _ in relevant])


if __name__ == "__main__":
    main()
