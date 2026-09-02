#!/usr/bin/env python3
"""Search a small exact rank-five span for isolated-vertex increments of rank-six g1."""

from __future__ import annotations

import itertools

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import raw_coefficients
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


def sub5(expression, generic_c, generic_d, crows, drows):
    rules = {}
    for generic, actual in zip(generic_c + generic_d, crows + drows):
        rules.update({symbol: value for symbol, value in zip(generic, actual)})
    return sp.expand(expression.subs(rules))


def solve_span(target, candidates):
    variables = tuple(sorted(target.free_symbols | set().union(*(x.free_symbols for _, x in candidates)), key=str))
    target_terms = dict(sp.Poly(target, *variables).terms())
    candidate_terms = [dict(sp.Poly(value, *variables).terms()) for _, value in candidates]
    monomials = sorted(set(target_terms).union(*(set(row) for row in candidate_terms)))
    matrix = sp.Matrix([[row.get(monomial, 0) for row in candidate_terms] for monomial in monomials])
    rhs = sp.Matrix([target_terms.get(monomial, 0) for monomial in monomials])
    return sp.linsolve((matrix, rhs))


def main():
    raw6 = reconstruct(1)
    arows = tuple(tuple(sp.symbols(f"a{family}0:8")) for family in "EUVW")
    brows = tuple(tuple(sp.symbols(f"b{family}0:8")) for family in "EUVW")
    iarows = isolate_multiply(arows, 1)
    ibrows = isolate_multiply(brows, 1)
    base = substitute(raw6, arows, brows)
    targets = {
        "isolated_deleted": sp.expand(substitute(raw6, iarows, brows) - base),
        "isolated_retained": sp.expand(substitute(raw6, iarows, ibrows) - base),
    }
    generic_c, generic_d, g1, g2 = raw_coefficients()
    zero = tuple(tuple(sp.Integer(0) for _ in range(7)) for _ in "EUVW")
    sources = {"A": arows, "IA": iarows, "B": brows, "IB": ibrows}
    candidates = []
    for index, raw in ((1, g1), (2, g2)):
        for cname, dname in itertools.product(sources, ["0", *sources]):
            drows = zero if dname == "0" else sources[dname]
            candidates.append((f"g{index}({cname},{dname})", sub5(
                raw, generic_c, generic_d, sources[cname], drows
            )))
    for name, target in targets.items():
        normalized = sp.expand(target.subs({
            row[0]: 1 for row_set in (arows, brows) for row in row_set
        }))
        normalized_poly = sp.Poly(normalized, *sorted(normalized.free_symbols, key=str))
        print(
            "FREE_CONE", name,
            "TERMS", len(normalized_poly.terms()),
            "NEGATIVE", len([value for value in normalized_poly.coeffs() if value < 0]),
            "MIN", min(normalized_poly.coeffs()),
        )
        solution = solve_span(target, candidates)
        print("TARGET", name, "TERMS", len(sp.Poly(target, *sorted(target.free_symbols, key=str)).terms()))
        print("SOLUTION", solution)
        print("LABELS", [label for label, _ in candidates])


if __name__ == "__main__":
    main()
