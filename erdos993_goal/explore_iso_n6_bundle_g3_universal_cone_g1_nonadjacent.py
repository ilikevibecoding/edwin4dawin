#!/usr/bin/env python3
"""Explore an exact universal containment/extension cone for rank-six g3.

Diagnostic until every displayed lower-bound step and residual cone is frozen.
"""

from __future__ import annotations

import itertools
import os

import sympy as sp

import explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent as structure
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    certify_bernstein,
    marked_geometry_branches,
    substitute_edge_geometry,
)


def inspect_bernstein(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    power = dict(polynomial.terms())
    values = {}
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for monomial, coefficient in power.items():
            if all(left <= right for left, right in zip(monomial, index)):
                multiplier = 1
                for exponent, location, degree in zip(monomial, index, degrees):
                    multiplier *= sp.binomial(location, exponent) / sp.binomial(degree, exponent)
                value += coefficient * multiplier
        values[index] = sp.factor(value)
    return degrees, values


def substitute_geometry_with_wedge_floor(expression, n, n_value, branch):
    label, variables, x, y, edges, z2, z3 = branch
    m = n_value - 2
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    wedge_parameter = variables[-1]
    lower_wedges = 2 * edges - m
    upper_wedges = edges**2 / 2
    wedges = lower_wedges + (upper_wedges - lower_wedges) * wedge_parameter
    formulas = {
        "A2": m - x,
        "B2": m - y,
        "W2": m * (m - 1) / 2 - edges,
        "W3": m * (m - 1) * (m - 2) / 6 - edges * (m - 2) + wedges,
        "Z2": z2,
        "Z3": z3,
    }
    replacements = {n: n_value}
    replacements.update(
        (names[name], formula) for name, formula in formulas.items() if name in names
    )
    value = sp.factor(expression.subs(replacements))
    used = tuple(variable for variable in variables if variable in value.free_symbols)
    return label, used, value


def reconstruct_partitioned():
    raw, _ = structure.reconstruct_g3()
    first, _ = structure.structural_substitution()
    cpart, _ = structure.partition_substitution("C", "c", 7)
    dpart, _ = structure.partition_substitution("D", "d", 6)
    return sp.expand(raw.subs(first).subs(cpart).subs(dpart))


def coarse_d_lower(partitioned):
    symbols = {str(value): value for value in partitioned.free_symbols}
    get = symbols.__getitem__
    n = get("n")
    dvars = tuple(value for value in partitioned.free_symbols if str(value).startswith("D"))
    base = sp.expand(partitioned.subs({value: 0 for value in dvars}))
    # Valid for n>=6.  Every D membership class injects into the matching C
    # class.  Positive summands of mixed derivatives are discarded.
    lower = sp.expand(
        base
        - (7*get("CB3") + get("CW2") + 7*get("CW3"))*get("CA3")
        - (7*get("CA3") + get("CW2") + 7*get("CW3"))*get("CB3")
        - 7*get("CA6") - 7*get("CB6")
        - (
            get("CA3") + 7*get("CA4") + get("CB3") + 7*get("CB4")
            + 2*get("CW3") + 7*get("CW4") + 7*get("CZ4")
        )*get("CW2")
        - 2*get("CW3")**2
        - 2*(n + 6)*get("CW5") - 7*get("CW6")
        - 7*get("CW2")*get("CZ4") - 7*get("CZ6")
    )
    return lower, symbols


def apply_high_caps(lower, symbols):
    get = symbols.__getitem__
    n = get("n")
    current = lower
    caps = [
        ("CA7", (n-7)*get("CA6")/6),
        ("CB7", (n-7)*get("CB6")/6),
        ("CW7", (n-8)*get("CW6")/7),
        ("CZ7", (n-6)*get("CZ6")/5),
        ("CA6", (n-6)*get("CA5")/5),
        ("CB6", (n-6)*get("CB5")/5),
        ("CW6", (n-7)*get("CW5")/6),
        ("CZ6", (n-5)*get("CZ5")/4),
        ("CA5", (n-5)*get("CA4")/4),
        ("CB5", (n-5)*get("CB4")/4),
        ("CW5", (n-6)*get("CW4")/5),
    ]
    rows = []
    for name, cap in caps:
        variable = get(name)
        derivative = sp.factor(sp.diff(current, variable))
        rows.append((name, derivative))
        current = sp.expand(current.subs(variable, cap))
    return current, rows


def main():
    partitioned = reconstruct_partitioned()
    lower, symbols = coarse_d_lower(partitioned)
    reduced, rows = apply_high_caps(lower, symbols)
    print("PARTITIONED_TERMS", len(sp.Poly(partitioned, *sorted(partitioned.free_symbols, key=str)).terms()))
    print("COARSE_TERMS", len(sp.Poly(lower, *sorted(lower.free_symbols, key=str)).terms()))
    for name, derivative in rows:
        print("CAP_DERIVATIVE", name, derivative)
    print("REDUCED_TERMS", len(sp.Poly(reduced, *sorted(reduced.free_symbols, key=str)).terms()))
    for name in (
        "CZ5", "CA4", "CB4", "CW4", "CZ4", "CA3", "CB3", "CW3",
        "CZ3", "CA2", "CB2", "CW2", "CZ2",
    ):
        print("REDUCED_DERIVATIVE", name, sp.factor(sp.diff(reduced, symbols[name])))
    get = symbols.__getitem__
    n = get("n")
    floor_i3 = lambda h: (h - 1) * (h - 2) * (h - 6) / 6
    strong = sp.expand(reduced.subs({
        get("CZ5"): 0,
        get("CZ4"): 0,
        get("CA4"): floor_i3(get("CA2")),
        get("CB4"): floor_i3(get("CB2")),
        get("CW4"): (n - 5) * get("CW3") / 4,
    }))
    print("STRONG_TERMS", len(sp.Poly(strong, *sorted(strong.free_symbols, key=str)).terms()))
    for name in ("CA3", "CB3", "CW3", "CZ3", "CA2", "CB2", "CW2", "CZ2"):
        print("STRONG_DERIVATIVE", name, sp.factor(sp.diff(strong, get(name))))
    print("STRONG", sp.factor(strong))

    # Simpler universal tail route: positive A4/B4/Z4/Z5 contributions are
    # discarded, while the negative W4 contribution takes its extension cap.
    mid = sp.expand(reduced.subs({
        get("CZ5"): 0,
        get("CZ4"): 0,
        get("CA4"): 0,
        get("CB4"): 0,
        get("CW4"): (n - 5) * get("CW3") / 4,
    }))
    base = sp.expand(mid.subs({get("CA3"): 0, get("CB3"): 0}))
    tail = sp.expand(base - (n - 57) * get("CW3") / 4 * (
        get("CA2") * (get("CA2") - 1) / 2
        + get("CB2") * (get("CB2") - 1) / 2
    ))
    print("MID_TERMS", len(sp.Poly(mid, *sorted(mid.free_symbols, key=str)).terms()))
    print("MID_DA3", sp.factor(sp.diff(mid, get("CA3"))))
    print("MID_DB3", sp.factor(sp.diff(mid, get("CB3"))))
    print("TAIL_TERMS", len(sp.Poly(tail, *sorted(tail.free_symbols, key=str)).terms()))

    geometry_symbols = {
        get(f"C{family}{rank}"): sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 8)
    }
    strong_base = sp.expand(strong.subs({get("CA3"): 0, get("CB3"): 0}))
    strong_tail = sp.expand(strong_base - (n - 57) * get("CW3") / 4 * (
        get("CA2") * (get("CA2") - 1) / 2
        + get("CB2") * (get("CB2") - 1) / 2
    ))
    base_geometry = sp.expand(strong_base.subs(geometry_symbols))
    tail_geometry = sp.expand(strong_tail.subs(geometry_symbols))

    # Separate fixed-order lower form for n=8,9, where the A4/B4 and Z5
    # coefficients have not yet reached their tail signs.
    c_a4 = sp.diff(reduced, get("CA4"))
    c_b4 = sp.diff(reduced, get("CB4"))
    c_w4 = sp.diff(reduced, get("CW4"))
    c_z4 = sp.diff(reduced, get("CZ4"))
    c_z5 = sp.diff(reduced, get("CZ5"))
    p_a4 = 103*n**3 - 594*n**2 - 439*n + 2610
    low_a4_coefficient = ((870 - 270*n)*get("CB2") - p_a4) / 120
    low_b4_coefficient = ((870 - 270*n)*get("CA2") - p_a4) / 120
    low_z5_coefficient = (-26*n**2 + 101*n - 45) / 10
    low89 = sp.expand(
        reduced
        - c_a4*get("CA4") - c_b4*get("CB4")
        - c_w4*get("CW4") - c_z4*get("CZ4") - c_z5*get("CZ5")
        + low_a4_coefficient*(n - 4)*get("CA3")/3
        + low_b4_coefficient*(n - 4)*get("CB3")/3
        + c_w4*(n - 5)*get("CW3")/4
        + (c_z4 + low_z5_coefficient*(n - 4)/3)*get("CZ4")
    )
    # The effective Z4 coefficient is positive at n=8,9 by the W2 forest
    # floor; discard it after recording the exact form.
    low89 = sp.expand(low89.subs(get("CZ4"), 0))
    for order in (8, 9):
        print("LOW89_DA3", order, sp.factor(sp.diff(low89, get("CA3")).subs(n, order)))
        print("LOW89_DB3", order, sp.factor(sp.diff(low89, get("CB3")).subs(n, order)))
    low89_base = sp.expand(low89.subs({get("CA3"): 0, get("CB3"): 0}))
    low89_geometry = sp.expand(low89_base.subs(geometry_symbols))

    a, b, c, d, t = sp.symbols("a b c d t", nonnegative=True)
    run_cones = os.environ.get("G3_SKIP_CONES") != "1"
    only_low89 = os.environ.get("G3_ONLY_LOW89") == "1"
    only_interval = os.environ.get("G3_ONLY_INTERVAL") == "1"
    fixed_failures = []
    fixed_count = 0
    low89_failures = []
    low89_count = 0
    for order in ((8, 9) if run_cones and not only_interval else ()):
        for branch in marked_geometry_branches(sp.Integer(order - 2), a, b, c, d):
            label, variables, value = substitute_geometry_with_wedge_floor(
                low89_geometry, n, sp.Integer(order), branch
            )
            degrees, coefficients = inspect_bernstein(value, variables)
            negatives = [
                (index, coefficient) for index, coefficient in coefficients.items()
                if coefficient.is_nonnegative is not True
            ]
            if negatives:
                low89_failures.append((order, label, degrees, negatives[:1], len(negatives)))
            else:
                low89_count += len(coefficients)
    for order in (
        range(10, 58)
        if run_cones and not only_low89 and not only_interval else ()
    ):
        for branch in marked_geometry_branches(sp.Integer(order - 2), a, b, c, d):
            label, variables, value = substitute_geometry_with_wedge_floor(
                base_geometry, n, sp.Integer(order), branch
            )
            degrees, coefficients = inspect_bernstein(value, variables)
            negatives = [
                (index, coefficient) for index, coefficient in coefficients.items()
                if coefficient.is_nonnegative is not True
            ]
            if negatives:
                fixed_failures.append((order, label, degrees, negatives[:1], len(negatives)))
            else:
                fixed_count += len(coefficients)
    print("FIXED_10_57_COEFFICIENTS", fixed_count, "FAILURES", len(fixed_failures))
    print("FIXED_FIRST_FAILURES", fixed_failures[:5])
    print("FIXED_8_9_COEFFICIENTS", low89_count, "FAILURES", len(low89_failures))
    print("FIXED_8_9_FAILURES", low89_failures)

    high_failures = []
    high_count = 0
    high_n = t + 58
    for branch in (
        marked_geometry_branches(high_n - 2, a, b, c, d)
        if run_cones and not only_low89 and not only_interval else ()
    ):
        label, variables, value = substitute_geometry_with_wedge_floor(
            tail_geometry, n, high_n, branch
        )
        degrees, coefficients = inspect_bernstein(value, variables)
        negatives = []
        for index, coefficient in coefficients.items():
            powers = sp.Poly(sp.expand(coefficient), t).all_coeffs()
            if any(item < 0 for item in powers):
                negatives.append((index, coefficient, powers))
        if negatives:
            high_failures.append((label, degrees, negatives[:1], len(negatives)))
        else:
            high_count += len(coefficients)
    print("TAIL_58_COEFFICIENTS", high_count, "FAILURES", len(high_failures))
    print("TAIL_FAILURES", high_failures)

    interval_failures = []
    interval_count = 0
    interval_r = sp.Symbol("interval_r", nonnegative=True)
    interval_n = 10 + 47 * interval_r
    for branch in (
        marked_geometry_branches(interval_n - 2, a, b, c, d)
        if run_cones and not only_low89 else ()
    ):
        label, variables, value = substitute_geometry_with_wedge_floor(
            base_geometry, n, interval_n, branch
        )
        variables = (interval_r, *variables)
        degrees, coefficients = inspect_bernstein(value, variables)
        negatives = [
            (index, coefficient) for index, coefficient in coefficients.items()
            if coefficient.is_nonnegative is not True
        ]
        if negatives:
            interval_failures.append((label, degrees, negatives[:1], len(negatives)))
        else:
            interval_count += len(coefficients)
    print("INTERVAL_10_57_COEFFICIENTS", interval_count, "FAILURES", len(interval_failures))
    print("INTERVAL_10_57_FAILURES", interval_failures)

    # Exact path-plus-two-isolated-marks boundary behind the first remaining
    # Bernstein corner.  This separates losses caused by D containment from
    # losses caused by high-rank and marked-category reductions.
    for order in (12, 13, 20, 58):
        m = order - 2
        path = {
            rank: sp.binomial(m - rank + 1, rank)
            for rank in range(0, 8)
        }
        values = {n: order}
        for rank in range(2, 8):
            values[get(f"CW{rank}")] = path[rank]
            values[get(f"CA{rank}")] = path[rank - 1]
            values[get(f"CB{rank}")] = path[rank - 1]
            values[get(f"CZ{rank}")] = path[rank - 2]
        # Exact independent containment-box minimum for D categories.
        exact_base = partitioned.subs({
            symbol: 0 for symbol in partitioned.free_symbols
            if str(symbol).startswith("D")
        })
        exact_box = exact_base
        selected = {}
        for dvar in sorted(
            (symbol for symbol in partitioned.free_symbols if str(symbol).startswith("D")),
            key=str,
        ):
            coefficient = sp.expand(sp.diff(partitioned, dvar).subs(values))
            cap = get("C" + str(dvar)[1:])
            choice = values[cap] if coefficient < 0 else 0
            selected[str(dvar)] = int(choice)
            exact_box += sp.diff(partitioned, dvar) * choice
        path_row = {
            "order": order,
            "exact_containment_box": int(sp.expand(exact_box.subs(values))),
            "coarse_D_lower": int(lower.subs(values)),
            "after_high_caps": int(reduced.subs(values)),
            "A4_B4_floor_strong": int(strong.subs(values)),
            "mid_before_A3_B3": int(mid.subs(values)),
            "base_A3_B3_dropped": int(base.subs(values)),
            "tail_bound": int(tail.subs(values)),
            "selected_D_corner": selected,
        }
        print("PATH_FACE", path_row)
    print("REDUCED", sp.factor(reduced))


if __name__ == "__main__":
    main()
