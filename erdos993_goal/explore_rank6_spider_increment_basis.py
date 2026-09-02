#!/usr/bin/env python3
"""Inspect exact arm-extension differences in an integer-valued basis.

This is exploratory: a nonnegative coefficient list gives a rigorous
orthant certificate, while a negative coefficient only says that this
particular basis/shift did not certify the inequality.
"""

from __future__ import annotations

from collections import defaultdict

import sympy as sp
from sympy.functions.combinatorial.numbers import stirling

from explore_rank6_spider_aggregate_certificate import (
    choose_poly,
    independent_4_5,
    root_transitions,
)


A0, A1, A2, R = sp.symbols("a0 a1 a2 r", integer=True)
VARIABLES = (A0, A1, A2, R)


def strong_polynomials():
    d, e = independent_4_5(A0, A1, A2, R, choose_poly)
    out = {}
    for label, state in root_transitions(A0, A1, A2, R).items():
        h, k = independent_4_5(*state, choose_poly)
        out[label] = sp.Poly(
            sp.expand(d * (2 * e + d) - 24 * (e * h - d * k)),
            *VARIABLES,
        )
    return out


def substitute(poly, delta):
    replacements = {
        variable: variable + amount
        for variable, amount in zip(VARIABLES, delta)
    }
    return sp.Poly(sp.expand(poly.as_expr().subs(replacements)), *VARIABLES)


def difference(poly, delta):
    return sp.Poly(
        sp.expand(substitute(poly, delta).as_expr() - poly.as_expr()),
        *VARIABLES,
    )


def binomial_basis_coefficients(poly, shift=(0, 0, 0, 0)):
    shifted = substitute(poly, shift)
    result = defaultdict(lambda: sp.Integer(0))
    for powers, coefficient in shifted.terms():
        partial = {(0, 0, 0, 0): coefficient}
        for axis, power in enumerate(powers):
            next_partial = defaultdict(lambda: sp.Integer(0))
            for multi_index, value in partial.items():
                for order in range(power + 1):
                    updated = list(multi_index)
                    updated[axis] = order
                    next_partial[tuple(updated)] += (
                        value * sp.factorial(order) * stirling(power, order)
                    )
            partial = next_partial
        for multi_index, value in partial.items():
            result[multi_index] += value
    return {
        multi_index: sp.factor(value)
        for multi_index, value in result.items()
        if value != 0
    }


def report(name, poly, shift):
    coefficients = binomial_basis_coefficients(poly, shift)
    negative = sorted(
        (
            (multi_index, coefficient)
            for multi_index, coefficient in coefficients.items()
            if coefficient < 0
        ),
        key=lambda item: (sum(item[0]), item[0]),
    )
    print(
        f"{name}: degree={poly.total_degree()} terms={len(poly.terms())} "
        f"shift={shift} binomial_terms={len(coefficients)} "
        f"negative={len(negative)}"
    )
    print("  first negatives:", negative[:10])


def main() -> int:
    values = strong_polynomials()
    root_minimum = {
        "L1": (1, 0, 0, 0),
        "L2": (0, 1, 0, 0),
        "L3": (0, 0, 1, 0),
        "L4+": (0, 0, 1, 1),
    }

    # Non-root changes that leave the root category fixed.
    changes = {
        "add-L1": (1, 0, 0, 0),
        "extend-1-to-2": (-1, 1, 0, 0),
        "extend-2-to-3": (0, -1, 1, 0),
        "extend-3+": (0, 0, 0, 1),
    }
    availability_extra = {
        "add-L1": (0, 0, 0, 0),
        "extend-1-to-2": (1, 0, 0, 0),
        "extend-2-to-3": (0, 1, 0, 0),
        "extend-3+": (0, 0, 1, 0),
    }

    for label, poly in values.items():
        report(f"S[{label}]", poly, root_minimum[label])
        for change_name, delta in changes.items():
            shift = tuple(
                left + right
                for left, right in zip(
                    root_minimum[label],
                    availability_extra[change_name],
                )
            )
            # If the available arm may be the root without changing the
            # category (L4+ extended again), the stronger shift is harmless.
            report(
                f"d-{change_name}[{label}]",
                difference(poly, delta),
                shift,
            )

    rooted_changes = {
        "root-1-to-2": (
            "L1",
            "L2",
            (-1, 1, 0, 0),
            (1, 0, 0, 0),
        ),
        "root-2-to-3": (
            "L2",
            "L3",
            (0, -1, 1, 0),
            (0, 1, 0, 0),
        ),
        "root-3-to-4": (
            "L3",
            "L4+",
            (0, 0, 0, 1),
            (0, 0, 1, 0),
        ),
        "root-4+-extend": (
            "L4+",
            "L4+",
            (0, 0, 0, 1),
            (0, 0, 1, 1),
        ),
    }
    for name, (before, after, delta, shift) in rooted_changes.items():
        changed_after = substitute(values[after], delta)
        poly = sp.Poly(
            sp.expand(changed_after.as_expr() - values[before].as_expr()),
            *VARIABLES,
        )
        report(name, poly, shift)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
