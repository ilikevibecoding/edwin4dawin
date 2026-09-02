#!/usr/bin/env python3
"""Exact low-row motif inclusion-exclusion cone after endpoint forcing."""

from __future__ import annotations

import argparse
import hashlib
import itertools

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import isolate_multiply
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_path_edgeless_box_cutoff_g1_nonadjacent import (
    affine_derivative_bounds,
    domain_sign,
    endpoints,
)
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_g1_nonadjacent import (
    choose,
    replace_rows,
    structural,
)


MOTIF_CLASSES = ((1, 2), (2, 3), (2, 4), (3, 4), (3, 5), (4, 5))


def build_mode(mode, n, t):
    components = build_expressions()
    complete = sp.expand(sum(components[label] for label in (
        "g2", "F", "QHL", "QHJ", "QKJ", "T"
    )))
    rrows, srows, xrows, yrows = (symbolic_rows(prefix) for prefix in "RSXY")
    if mode == "collision":
        expression = replace_rows(
            complete,
            H=isolate_multiply(rrows, t, 7), K=srows,
            J=isolate_multiply(srows, t, 7), L=srows,
        )
        expression = sp.expand(expression.subs(
            structural(rrows, n) | structural(srows, n - 1)
        ))
    else:
        expression = replace_rows(
            complete,
            H=isolate_multiply(rrows, t, 7), K=srows,
            J=isolate_multiply(xrows, t, 7), L=yrows,
        )
        expression = sp.expand(expression.subs(
            structural(rrows, n) | structural(srows, n - 1)
            | structural(xrows, n - 1) | structural(yrows, n - 2)
        ))
    return expression


def force_endpoints(expression, n, t, minimum):
    row_variables = tuple(sorted(
        (variable for variable in expression.free_symbols if variable not in (n, t)),
        key=str,
    ))
    endpoint_map = {variable: endpoints(variable, n) for variable in row_variables}
    forced = []
    remaining = list(row_variables)
    while True:
        progress = False
        for variable in tuple(remaining):
            derivative = sp.expand(sp.diff(expression, variable))
            others = tuple(item for item in remaining if item != variable)
            bounds = affine_derivative_bounds(
                derivative, others, endpoint_map, n, t, minimum
            )
            if bounds is None:
                continue
            lower, upper = bounds
            lower_sign, lower_margin = domain_sign(lower, n, t, minimum)
            upper_sign, upper_margin = domain_sign(upper, n, t, minimum)
            if lower_sign in (0, 1):
                endpoint = "path"
                value = endpoint_map[variable][0]
                margin = lower_margin
            elif upper_sign in (0, -1):
                endpoint = "edgeless"
                value = endpoint_map[variable][1]
                margin = -upper_margin
            else:
                continue
            expression = sp.expand(expression.subs(variable, value))
            remaining.remove(variable)
            forced.append((str(variable), endpoint, str(margin)))
            progress = True
            break
        if not progress:
            break
    return expression, tuple(remaining), tuple(forced)


def motif_variables(mode):
    marks = tuple("puv") if mode == "collision" else tuple("pquv")
    variables = {}
    for edges, vertices in MOTIF_CLASSES:
        for size in range(min(len(marks), vertices) + 1):
            for subset in itertools.combinations(marks, size):
                if (edges, vertices) == (1, 2) and set(subset) == {"u", "v"}:
                    continue
                label = "0" if not subset else "".join(subset)
                variables[(edges, vertices, frozenset(subset))] = sp.Symbol(
                    f"M{edges}{vertices}_{label}", integer=True, nonnegative=True
                )
    return marks, variables


def deleted_set(variable, mode):
    name = str(variable)
    predeleted = {
        "R": set(),
        "S": {"p"} if mode == "collision" else {"q"},
        "X": {"p"},
        "Y": {"p", "q"},
    }[name[0]]
    marked = {"E": set(), "U": {"u"}, "V": {"v"}, "W": {"u", "v"}}[name[1]]
    return predeleted | marked


def ie_row(variable, mode, n, motif_map):
    name = str(variable)
    rank = int(name[2:])
    deleted = deleted_set(variable, mode)
    order = n - len(deleted)
    value = choose(order, rank)
    for (edges, vertices) in MOTIF_CLASSES:
        if vertices > rank:
            continue
        surviving = sum(
            variable_value
            for (actual_edges, actual_vertices, contained), variable_value in motif_map.items()
            if (actual_edges, actual_vertices) == (edges, vertices)
            and not (set(contained) & deleted)
        )
        value += (-1) ** edges * surviving * choose(
            order - vertices, rank - vertices
        )
    return sp.expand(value)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("collision", "distinct"), required=True)
    parser.add_argument("--minimum", type=int, required=True)
    args = parser.parse_args()

    n = sp.Symbol("n", integer=True, positive=True)
    t = sp.Symbol("t", integer=True, nonnegative=True)
    expression = build_mode(args.mode, n, t)
    reduced, remaining, forced = force_endpoints(
        expression, n, t, args.minimum
    )
    marks, motif_map = motif_variables(args.mode)
    substitution = {
        variable: ie_row(variable, args.mode, n, motif_map)
        for variable in remaining
    }
    motif_expression = sp.expand(reduced.xreplace(substitution))
    active_motifs = tuple(sorted(
        (variable for variable in motif_map.values() if variable in motif_expression.free_symbols),
        key=str,
    ))
    polynomial = sp.Poly(motif_expression, *active_motifs)
    bad = []
    zero = 0
    positive = 0
    minimum_margin = None
    for powers, coefficient in polynomial.terms():
        sign, margin = domain_sign(coefficient, n, t, args.minimum)
        if sign in (0, 1):
            positive += sign == 1
            zero += sign == 0
            minimum_margin = margin if minimum_margin is None or margin < minimum_margin else minimum_margin
        else:
            monomial = tuple(
                str(variable)
                for variable, exponent in zip(active_motifs, powers)
                for _ in range(exponent)
            )
            bad.append((monomial, sp.factor(coefficient), margin))
    print("MODE", args.mode, "MINIMUM", args.minimum)
    print("FORCED_COUNT", len(forced), "REMAINING_LOW_ROWS", len(remaining))
    print("REMAINING", list(map(str, remaining)))
    print("MOTIF_CLASSES", MOTIF_CLASSES)
    print("MOTIF_VARIABLES", len(motif_map), "ACTIVE", len(active_motifs))
    print("ACTIVE_MOTIFS", list(map(str, active_motifs)))
    print("CONE_TERMS", len(polynomial.terms()), "POSITIVE", positive, "ZERO", zero, "BAD", len(bad))
    print("MINIMUM_CERTIFIED_BERNSTEIN_MARGIN", minimum_margin)
    print("BAD_TERMS", bad[:30])
    z = sp.Symbol("z", nonnegative=True)
    zero_motifs = {variable: 0 for variable in active_motifs}
    constant_coefficient = sp.expand(motif_expression.subs(zero_motifs))
    constant_scaled = sp.Poly(
        sp.expand(constant_coefficient.subs(t, z * n)), n
    )
    constant_leading = sp.factor(constant_scaled.LC())
    edge_leading = {}
    for variable in active_motifs:
        if str(variable).startswith("M12_"):
            coefficient = sp.expand(sp.diff(motif_expression, variable).subs(zero_motifs))
            scaled = sp.Poly(sp.expand(coefficient.subs(t, z * n)), n)
            edge_leading[str(variable)] = sp.factor(scaled.LC())
    print("ASYMPTOTIC_CONSTANT_N7", constant_leading)
    print("ASYMPTOTIC_EDGE_N6", edge_leading)
    print("ASYMPTOTIC_RHO1_SUMS", {
        label: sp.factor(constant_leading + value)
        for label, value in edge_leading.items()
    })
    print("FORCED_SHA256", hashlib.sha256(repr(forced).encode()).hexdigest().upper())
    print("MOTIF_EXPRESSION_SHA256", hashlib.sha256(
        sp.srepr(motif_expression).encode()
    ).hexdigest().upper())
    print("EXPLORATORY_ONLY_NO_MOTIF_CONE_THEOREM")


if __name__ == "__main__":
    main()
