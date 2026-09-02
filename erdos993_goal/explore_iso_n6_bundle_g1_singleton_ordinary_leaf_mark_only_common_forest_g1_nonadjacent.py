#!/usr/bin/env python3
"""Explore mark-only components over an arbitrary common forest in N6 G1.

The frozen isolated-mark slice has a common unmarked forest K, h additional
isolates, and three (collision) or four (distinct) isolated distinguished
vertices.  Here the distinguished vertices may instead span any labelled
forest, still disjoint from K and with the protected marks u,v nonadjacent.

For every labelled mark forest, this source constructs the exact full
singleton-ordinary leaf delta and compares every one-edge addition with its
immediate subforest.  A coefficientwise-positive difference would extend the
isolated-mark theorem without another large ratio cone.  This is deliberately
an exploratory diagnostic: no sign or theorem is asserted in advance.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools

import networkx as nx
import sympy as sp

from derive_iso_n4_bundle_polynomial_root import isolate_multiply
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_isolated_mark_common_forest_cone_g1_nonadjacent import (
    coefficient_sign,
    substitute_rows,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
)
from probe_iso_leaf_cross_remainder_root import poly_forest


def truncated_convolution(left, right, maximum=7):
    return tuple(
        sp.expand(sum(
            left[index] * right[rank - index]
            for index in range(rank + 1)
            if index < len(left) and rank - index < len(right)
        ))
        for rank in range(maximum + 1)
    )


def mark_forests(mode):
    marks = ("p", "u", "v") if mode == "collision" else ("p", "q", "u", "v")
    allowed = tuple(
        edge for edge in itertools.combinations(marks, 2)
        if set(edge) != {"u", "v"}
    )
    for mask in range(1 << len(allowed)):
        edges = tuple(allowed[index] for index in range(len(allowed)) if mask & (1 << index))
        graph = nx.Graph()
        graph.add_nodes_from(marks)
        graph.add_edges_from(edges)
        if nx.is_forest(graph):
            yield marks, edges


def motif_row(marks, edges, deleted, base, isolates):
    graph = nx.Graph()
    graph.add_nodes_from(marks)
    graph.add_edges_from(edges)
    graph.remove_nodes_from(deleted)
    motif = tuple(poly_forest(graph))
    combined = truncated_convolution(base, motif)
    return isolate_multiply((combined,), isolates, 7)[0]


def rowset(mode, marks, edges, prefix, base, isolates):
    predeleted = {
        "R": set(),
        "S": {"p"} if mode == "collision" else {"q"},
        "X": {"p"},
        "Y": {"p", "q"},
    }[prefix]
    marked_deletions = {
        "E": set(), "U": {"u"}, "V": {"v"}, "W": {"u", "v"},
    }
    return tuple(
        motif_row(marks, edges, predeleted | marked_deletions[family], base, isolates)
        for family in "EUVW"
    )


def exact_expression(mode, raw, marks, edges, n, N, h, t, base):
    prefixes = ("R", "S") if mode == "collision" else ("R", "S", "X", "Y")
    expression = raw
    for prefix in prefixes:
        expression = substitute_rows(
            expression,
            prefix,
            rowset(mode, marks, edges, prefix, base, h),
        )
    return sp.expand(sp.expand_func(expression.subs(n, N + h + len(marks))))


def coefficient_profile(expression, polynomial_variables, coefficient_variables):
    polynomial = sp.Poly(expression, *polynomial_variables)
    signs = {1: 0, -1: 0, None: 0}
    first_bad = None
    for powers, coefficient in polynomial.terms():
        sign = coefficient_sign(coefficient, coefficient_variables)
        signs[sign] += 1
        if sign != 1 and first_bad is None:
            first_bad = (powers, str(sp.factor(coefficient)), sign)
    return {
        "terms": len(polynomial.terms()),
        "signs": signs,
        "first_bad": first_bad,
        "sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("collision", "distinct"), action="append")
    parser.add_argument("--classes-only", action="store_true")
    args = parser.parse_args()
    n = sp.Symbol("n", integer=True, positive=True)
    N, h, t = sp.symbols("N h t", integer=True, nonnegative=True)
    base = (sp.Integer(1), N, *sp.symbols("k2:8", integer=True, nonnegative=True))
    kvar = tuple(base[2:])
    coefficient_variables = (N, h, t)

    for mode in (args.mode or ("collision", "distinct")):
        raw = build_mode(mode, n, t)
        expressions = {}
        marks_for_mode = None
        for marks, edges in mark_forests(mode):
            marks_for_mode = marks
            expressions[frozenset(map(frozenset, edges))] = exact_expression(
                mode, raw, marks, edges, n, N, h, t, base
            )
        assert marks_for_mode is not None
        edgeless = expressions[frozenset()]
        derivative_signs = {
            edge_set: coefficient_sign(
                sp.expand(sp.diff(expression, base[7])),
                (N, h, t, *base[2:7]),
            )
            for edge_set, expression in expressions.items()
        }
        expression_classes = {}
        for edge_set, expression in expressions.items():
            digest = hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper()
            expression_classes.setdefault(digest, []).append(
                sorted(tuple(sorted(item)) for item in edge_set)
            )
        if args.classes_only:
            print(
                "MODE", mode,
                "LABELLED_MARK_FORESTS", len(expressions),
                "K7_DERIVATIVE_NEGATIVE", sum(sign == -1 for sign in derivative_signs.values()),
                "K7_DERIVATIVE_OTHER", [
                    (sorted(tuple(sorted(item)) for item in edge_set), sign)
                    for edge_set, sign in derivative_signs.items() if sign != -1
                ],
                "EXACT_EXPRESSION_CLASSES", len(expression_classes),
                flush=True,
            )
            print("EXPRESSION_CLASSES", expression_classes, flush=True)
            continue
        additions = []
        failures = []
        for edge_set, expression in expressions.items():
            for edge in edge_set:
                parent = edge_set - {edge}
                difference = sp.expand(expression - expressions[parent])
                profile = coefficient_profile(
                    difference, kvar, coefficient_variables
                )
                record = {
                    "from": sorted(tuple(sorted(item)) for item in parent),
                    "edge": tuple(sorted(edge)),
                    "to": sorted(tuple(sorted(item)) for item in edge_set),
                    **profile,
                }
                additions.append(record)
                if profile["signs"][-1] or profile["signs"][None]:
                    failures.append(record)
        direct = []
        for edge_set, expression in expressions.items():
            difference = sp.expand(expression - edgeless)
            profile = coefficient_profile(
                difference, kvar, coefficient_variables
            )
            if edge_set:
                direct.append({
                    "edges": sorted(tuple(sorted(item)) for item in edge_set),
                    **profile,
                })
        print(
            "MODE", mode,
            "MARKS", marks_for_mode,
            "LABELLED_MARK_FORESTS", len(expressions),
            "ONE_EDGE_ADDITIONS", len(additions),
            "COEFFICIENTWISE_POSITIVE_ADDITIONS", len(additions) - len(failures),
            "FAILED_ADDITIONS", len(failures),
            "K7_DERIVATIVE_NEGATIVE", sum(sign == -1 for sign in derivative_signs.values()),
            "K7_DERIVATIVE_OTHER", [
                (sorted(tuple(sorted(item)) for item in edge_set), sign)
                for edge_set, sign in derivative_signs.items() if sign != -1
            ],
            "EXACT_EXPRESSION_CLASSES", len(expression_classes),
            flush=True,
        )
        print("EXPRESSION_CLASSES", expression_classes, flush=True)
        print("FIRST_FAILED_ADDITIONS", failures[:20], flush=True)
        direct_failures = [
            row for row in direct if row["signs"][-1] or row["signs"][None]
        ]
        print(
            "DIRECT_FROM_EDGELESS", len(direct),
            "DIRECT_FAILURES", len(direct_failures),
            "FIRST_DIRECT_FAILURES", direct_failures[:20],
            flush=True,
        )
    print("EXPLORATORY_ONLY_NO_MARK_ONLY_COMMON_FOREST_THEOREM")


if __name__ == "__main__":
    main()
