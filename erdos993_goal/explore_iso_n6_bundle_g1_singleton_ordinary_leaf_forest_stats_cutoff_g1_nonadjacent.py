#!/usr/bin/env python3
"""Exact forest-statistic cone after large-order endpoint forcing."""

from __future__ import annotations

import argparse
import hashlib
import itertools

import sympy as sp

from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_motif_ie_cutoff_g1_nonadjacent import (
    build_mode,
    force_endpoints,
)
from explore_iso_n6_bundle_g1_singleton_ordinary_leaf_path_edgeless_box_cutoff_g1_nonadjacent import (
    domain_sign,
)
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_one_edge_core_g1_nonadjacent import (
    choose,
)


STAT_VERTICES = {"E": 2, "S": 3, "P": 4, "H": 4, "W": 5}


def statistic_variables(mode):
    marks = tuple("puv") if mode == "collision" else tuple("pquv")
    variables = {}
    for statistic, vertices in STAT_VERTICES.items():
        for size in range(min(len(marks), vertices) + 1):
            for subset in itertools.combinations(marks, size):
                if statistic == "E" and set(subset) == {"u", "v"}:
                    continue
                label = "0" if not subset else "".join(subset)
                variables[(statistic, frozenset(subset))] = sp.Symbol(
                    f"{statistic}_{label}", integer=True, nonnegative=True
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


def surviving(statistic, deleted, variables):
    return sp.expand(sum(
        value for (actual, contained), value in variables.items()
        if actual == statistic and not (set(contained) & deleted)
    ))


def forest_row(variable, mode, n, variables):
    name = str(variable)
    rank = int(name[2:])
    deleted = deleted_set(variable, mode)
    order = n - len(deleted)
    e = surviving("E", deleted, variables)
    s = surviving("S", deleted, variables)
    p = surviving("P", deleted, variables)
    h = surviving("H", deleted, variables)
    r = p + h
    w = surviving("W", deleted, variables)
    if rank == 2:
        return sp.expand(choose(order, 2) - e)
    if rank == 3:
        return sp.expand(choose(order, 3) - e * (order - 2) + s)
    if rank == 4:
        return sp.expand(
            choose(order, 4)
            - e * choose(order - 2, 2)
            + s * (order - 4)
            + choose(e, 2)
            - r
        )
    if rank == 5:
        q = sp.expand(s * (e - 2) - 2 * r - h)
        return sp.expand(
            choose(order, 5)
            - e * choose(order - 2, 3)
            + s * choose(order - 3, 2)
            + (choose(e, 2) - s) * (order - 4)
            - r * (order - 4)
            - q
            + w
        )
    raise AssertionError((variable, rank))


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
    _marks, variables = statistic_variables(args.mode)
    substitution = {
        variable: forest_row(variable, args.mode, n, variables)
        for variable in remaining
    }
    statistic_expression = sp.expand(reduced.xreplace(substitution))
    active = tuple(sorted(
        (variable for variable in variables.values() if variable in statistic_expression.free_symbols),
        key=str,
    ))
    polynomial = sp.Poly(statistic_expression, *active)
    signs = {"positive": 0, "zero": 0, "negative": 0, "mixed": 0}
    bad = []
    for powers, coefficient in polynomial.terms():
        sign, margin = domain_sign(coefficient, n, t, args.minimum)
        label = {1: "positive", 0: "zero", -1: "negative", None: "mixed"}[sign]
        signs[label] += 1
        if sign not in (0, 1):
            monomial = tuple(
                str(variable)
                for variable, exponent in zip(active, powers)
                for _ in range(exponent)
            )
            bad.append((monomial, sp.factor(coefficient), margin, label))
    print("MODE", args.mode, "MINIMUM", args.minimum)
    print("FORCED", len(forced), "REMAINING", list(map(str, remaining)))
    print("STATISTIC_IDENTITY", {
        "E": "edge subsets",
        "S": "adjacent edge pairs",
        "P": "three-edge paths",
        "H": "three-edge stars",
        "W": "connected four-edge subsets",
        "Q": "S(E-2)-2P-3H",
    })
    print("ACTIVE_VARIABLES", len(active), list(map(str, active)))
    print("CONE_TERMS", len(polynomial.terms()), "SIGNS", signs)
    print("BAD_TERMS", bad[:40])
    print("FORCED_SHA256", hashlib.sha256(repr(forced).encode()).hexdigest().upper())
    print("STATISTIC_EXPRESSION_SHA256", hashlib.sha256(
        sp.srepr(statistic_expression).encode()
    ).hexdigest().upper())
    print("EXPLORATORY_ONLY_NO_STATISTIC_CONE_THEOREM")


if __name__ == "__main__":
    main()
