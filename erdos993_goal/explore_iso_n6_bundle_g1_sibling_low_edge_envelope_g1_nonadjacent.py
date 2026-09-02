#!/usr/bin/env python3
"""Exploratory edge-sensitive envelopes for low sibling coefficients.

Diagnostic only.  Rank-two rows are replaced exactly by C(m,2)-e and higher
rows use the edge union lower bound C(m,r)-e*C(m-2,r-2).  The edge counts are
initially kept independent so failures identify which correlations are needed.
"""

from __future__ import annotations

import hashlib

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions, symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import binomial_basis, isolate_multiply
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_sibling_isolates_g1_nonadjacent import (
    replace_rows, structural,
)


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    return sp.expand(sp.prod(value - j for j in range(rank)) / sp.factorial(rank))


def row_order(symbol, n):
    name = str(symbol)
    base = {"R": n, "S": n - 1, "X": n - 1, "Y": n - 2}[name[0]]
    removed = {"E": 0, "U": 1, "V": 1, "W": 2}[name[1]]
    return base - removed, int(name[2:])


def shifted_sign(value, n, minimum):
    h = sp.Symbol("h", nonnegative=True)
    coeffs = sp.Poly(sp.expand(value.subs(n, minimum + h)), h).all_coeffs()
    if all(item >= 0 for item in coeffs):
        return 1
    if all(item <= 0 for item in coeffs):
        return -1
    raise AssertionError((value, minimum))


def edge_envelope(expression, n, minimum):
    rowvars = tuple(sorted((s for s in expression.free_symbols if s != n), key=str))
    poly = sp.Poly(expression, *rowvars)
    edges = {}
    pieces = []
    for exponents, coefficient in poly.terms():
        direction = shifted_sign(coefficient, n, minimum)
        term = coefficient
        for variable, exponent in zip(rowvars, exponents):
            if exponent == 0:
                continue
            order, rank = row_order(variable, n)
            edge = edges.setdefault(
                str(variable)[:2],
                sp.Symbol(f"e{str(variable)[:2]}", nonnegative=True),
            )
            upper = choose(order, rank)
            lower = sp.expand(upper - edge * choose(order - 2, rank - 2))
            if rank == 2:
                # Exact for every simple graph.
                upper = lower
            term *= (lower if direction > 0 else upper) ** exponent
        pieces.append(term)
    return sp.expand(sum(pieces)), tuple(sorted(edges.values(), key=str))


def summary(expression, variables):
    poly = sp.Poly(expression, *variables)
    coeffs = poly.coeffs()
    return {
        "terms": len(poly.terms()),
        "negative": sum(1 for item in coeffs if item < 0),
        "minimum": str(min(coeffs)),
        "degrees": {str(v): poly.degree(v) for v in variables},
        "sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def main():
    t = sp.Symbol("t", nonnegative=True, integer=True)
    n = sp.Symbol("n", positive=True, integer=True)
    components = build_expressions()
    complete = sp.expand(sum(components.values()))
    rrows, srows, xrows, yrows = (symbolic_rows(p) for p in "RSXY")
    collision = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(srows, t, 7), L=srows,
    ).subs(structural(rrows, n) | structural(srows, n - 1))
    distinct = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7), K=srows,
        J=isolate_multiply(xrows, t, 7), L=yrows,
    ).subs(
        structural(rrows, n) | structural(srows, n - 1)
        | structural(xrows, n - 1) | structural(yrows, n - 2)
    )
    blocks = {
        "collision": (binomial_basis(sp.expand(collision), t), 84),
        "distinct": (binomial_basis(sp.expand(distinct), t), 84),
    }
    h = sp.Symbol("h", nonnegative=True)
    for mode, (coefficients, minimum) in blocks.items():
        for index in range(4):
            envelope, edges = edge_envelope(coefficients[index], n, minimum)
            prefixes = tuple(sorted({str(edge)[1] for edge in edges}))
            fractions = tuple(
                sp.Symbol(f"z{prefix}{kind}", nonnegative=True)
                for prefix in prefixes for kind in "auv"
            )
            simple_rules = {}
            edge_by_name = {str(edge): edge for edge in edges}
            for prefix in prefixes:
                order = {"R": n, "S": n - 1, "X": n - 1, "Y": n - 2}[prefix]
                scale = order - 1
                a, du, dv = (
                    sp.Symbol(f"z{prefix}{kind}", nonnegative=True) * scale
                    for kind in "auv"
                )
                simple_rules.update({
                    edge_by_name[f"e{prefix}E"]: a + du + dv,
                    edge_by_name[f"e{prefix}U"]: a + dv,
                    edge_by_name[f"e{prefix}V"]: a + du,
                    edge_by_name[f"e{prefix}W"]: a,
                })
            normalized = sp.expand(envelope.subs(simple_rules).subs(n, minimum + h))
            variables = (h,) + fractions
            print(mode, index, "edges", list(map(str, edges)))
            print("SUMMARY", summary(normalized, variables))
            if len(sp.Poly(normalized, *variables).terms()) <= 120:
                print("FACTOR", sp.factor(normalized))
    print("EXPLORATORY_ONLY_NO_SIGN_CLAIM")


if __name__ == "__main__":
    main()
