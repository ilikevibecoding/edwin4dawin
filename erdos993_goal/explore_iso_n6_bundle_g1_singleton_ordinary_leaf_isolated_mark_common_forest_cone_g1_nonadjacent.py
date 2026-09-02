#!/usr/bin/env python3
"""Exact arbitrary-common-forest cone for the isolated-mark G1 leaf slice."""

from __future__ import annotations

import hashlib

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import isolate_multiply
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)


def substitute_rows(expression, prefix, actual):
    generic = symbolic_rows(prefix)
    rules = {
        variable: value
        for generic_row, actual_row in zip(generic, actual)
        for variable, value in zip(generic_row, actual_row)
    }
    return expression.xreplace(rules)


def marked_rows(base, isolates):
    def shifted(count):
        return isolate_multiply((base,), count, 7)[0]
    return (
        shifted(isolates),
        shifted(isolates - 1),
        shifted(isolates - 1),
        shifted(isolates - 2),
    )


def coefficient_sign(value, variables):
    polynomial = sp.Poly(sp.expand(value), *variables)
    coefficients = polynomial.coeffs()
    if all(item >= 0 for item in coefficients):
        return 1
    if all(item <= 0 for item in coefficients):
        return -1
    return None


def main():
    n = sp.Symbol("n", integer=True, positive=True)
    N = sp.Symbol("N", integer=True, nonnegative=True)
    h = sp.Symbol("h", integer=True, nonnegative=True)
    t = sp.Symbol("t", integer=True, nonnegative=True)
    k = (sp.Integer(1), N, *sp.symbols(
        "k2:8", integer=True, nonnegative=True
    ))
    kvars = tuple(k[2:])

    for mode in ("collision", "distinct"):
        mark_count = 3 if mode == "collision" else 4
        expression = build_mode(mode, n, t)
        expression = substitute_rows(
            expression, "R", marked_rows(k, h + mark_count)
        )
        expression = substitute_rows(
            expression, "S", marked_rows(k, h + mark_count - 1)
        )
        if mode == "distinct":
            expression = substitute_rows(
                expression, "X", marked_rows(k, h + mark_count - 1)
            )
            expression = substitute_rows(
                expression, "Y", marked_rows(k, h + mark_count - 2)
            )
        expression = sp.expand(sp.expand_func(
            expression.subs(n, N + h + mark_count)
        ))
        polynomial = sp.Poly(expression, *kvars)
        signs = {1: 0, -1: 0, None: 0}
        bad = []
        for powers, coefficient in polynomial.terms():
            sign = coefficient_sign(coefficient, (N, h, t))
            signs[sign] += 1
            if sign != 1:
                bad.append((powers, sp.factor(coefficient), sign))
        active = [str(value) for value in kvars if value in expression.free_symbols]
        print(
            "MODE", mode,
            "ACTIVE", active,
            "K_DEGREE", polynomial.total_degree(),
            "K_TERMS", len(polynomial.terms()),
            "COEFFICIENT_SIGNS", signs,
            "BAD_FIRST", bad[:25],
            "SHA256", hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
        )
        for variable in kvars[::-1]:
            if variable not in expression.free_symbols:
                continue
            derivative = sp.expand(sp.diff(expression, variable))
            print(
                "DERIVATIVE", mode, variable,
                "DEGREE", sp.Poly(expression, variable).degree(),
                "SIGN", coefficient_sign(
                    derivative, (N, h, t, *tuple(x for x in kvars if x != variable))
                ),
                "SHA256", hashlib.sha256(sp.srepr(derivative).encode()).hexdigest().upper(),
            )
    print("EXPLORATORY_ONLY_NO_ARBITRARY_COMMON_FOREST_CLAIM")


if __name__ == "__main__":
    main()
