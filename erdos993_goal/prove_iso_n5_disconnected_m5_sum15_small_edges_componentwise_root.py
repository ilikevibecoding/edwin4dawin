#!/usr/bin/env python3
"""Exact componentwise-deletion sum15 theorem for at most seven edges.

Nontrivial P-components are either selected rooted trees C, contributing
(I(C),I(C-root)), or unselected trees C, contributing (I(C),I(C)).  Their
edge costs are |C|-1.  Dynamic convolution through total edge cost seven is
therefore exhaustive.  Arbitrarily many unselected isolated components
multiply both rows by (1+x)^r; the exact binomial-in-r coefficients of every
selected-isolate Newton row are checked nonnegative.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n5_disconnected_m5_sum15_q2_coarse_root import generic_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import at


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum15_small_edges_componentwise_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_SMALL_EDGES_COMPONENTWISE_ROOT"
MAX_EDGES = 7
COMMON_ISOLATE_DEGREE_BOUND = 6


def convolution(left, right, length):
    return tuple(sum(
        at(left, j) * at(right, rank - j) for j in range(rank + 1)
    ) for rank in range(length))


def component_types():
    by_cost = {cost: set() for cost in range(1, MAX_EDGES + 1)}
    raw = {}
    for cost in by_cost:
        selected_raw = unselected_raw = 0
        for tree0 in nx.nonisomorphic_trees(cost + 1):
            tree = nx.convert_node_labels_to_integers(tree0)
            polynomial = tuple(at(poly_forest(tree), rank) for rank in range(8))
            # An unselected component is present in both rows.
            by_cost[cost].add((polynomial, polynomial[:7], "unselected"))
            unselected_raw += 1
            # Every possible selected root is retained.  Equal coefficient
            # data may be deduplicated because the Newton rows use only it.
            for root in tree:
                lower = tree.copy()
                lower.remove_node(root)
                h = tuple(at(poly_forest(lower), rank) for rank in range(7))
                by_cost[cost].add((polynomial, h, "selected"))
                selected_raw += 1
        raw[str(cost)] = {
            "selected_rooted_raw": selected_raw,
            "unselected_unrooted_raw": unselected_raw,
            "distinct_typed_coefficient_rows": len(by_cost[cost]),
        }
    return by_cost, raw


def multiply_common_isolates(row, amount, length):
    return tuple(sum(
        comb(amount, j) * at(row, rank - j)
        for j in range(min(amount, rank) + 1)
    ) for rank in range(length))


def binomial_coefficients(values):
    levels = [list(values)]
    while len(levels[-1]) > 1:
        prior = levels[-1]
        levels.append([prior[index + 1] - prior[index] for index in range(len(prior) - 1)])
    return [level[0] for level in levels]


def main():
    x_symbols, h_symbols, rows = generic_rows()
    variables = (*x_symbols, *h_symbols)
    weights = {
        **{symbol: rank for rank, symbol in enumerate(x_symbols)},
        **{symbol: rank for rank, symbol in enumerate(h_symbols)},
    }
    weighted_degrees = [max(
        sum(power * weights[symbol] for power, symbol in zip(monomial, variables))
        for monomial, _coefficient in sp.Poly(row, *variables).terms()
    ) for row in rows]
    assert weighted_degrees == [6, 5, 4, 3, 2, 0]
    evaluator = sp.lambdify((*x_symbols, *h_symbols), rows, modules="math")
    types, raw_types = component_types()

    identity = ((1, 0, 0, 0, 0, 0, 0, 0), (1, 0, 0, 0, 0, 0, 0))
    states = {0: {identity}}
    reports = {}
    global_minimum_basis = [None] * 6
    global_minimum_values = [None] * 6
    total_checks = 0
    for total in range(MAX_EDGES + 1):
        if total:
            current = set()
            for cost in range(1, total + 1):
                for component_x, component_h, _kind in types[cost]:
                    for base_x, base_h in states[total - cost]:
                        current.add((
                            convolution(base_x, component_x, 8),
                            convolution(base_h, component_h, 7),
                        ))
            states[total] = current

        local_basis_minimum = [None] * 6
        local_value_minimum = [None] * 6
        for base_x, base_h in states[total]:
            value_table = [[] for _ in rows]
            # Weighted degree in the common-isolate variable is at most six;
            # the extra value at seven checks the next difference is zero.
            for common_isolates in range(COMMON_ISOLATE_DEGREE_BOUND + 2):
                x_values = multiply_common_isolates(base_x, common_isolates, 8)
                h_values = multiply_common_isolates(base_h, common_isolates, 7)
                values = [int(value) for value in evaluator(*x_values, *h_values)]
                for index, value in enumerate(values):
                    value_table[index].append(value)
                    local_value_minimum[index] = (
                        value if local_value_minimum[index] is None
                        else min(local_value_minimum[index], value)
                    )
                    global_minimum_values[index] = (
                        value if global_minimum_values[index] is None
                        else min(global_minimum_values[index], value)
                    )
                total_checks += len(rows)

            for index, values in enumerate(value_table):
                basis = binomial_coefficients(values)
                assert basis[-1] == 0, (total, index, base_x, base_h, basis)
                basis = basis[:-1]
                assert all(value >= 0 for value in basis), (
                    total, index, base_x, base_h, basis,
                )
                minimum = min(basis)
                local_basis_minimum[index] = (
                    minimum if local_basis_minimum[index] is None
                    else min(local_basis_minimum[index], minimum)
                )
                global_minimum_basis[index] = (
                    minimum if global_minimum_basis[index] is None
                    else min(global_minimum_basis[index], minimum)
                )

        reports[str(total)] = {
            "edge_cost": total,
            "distinct_base_coefficient_states": len(states[total]),
            "minimum_literal_values_R0_through_R5_for_common_isolates_0_through_7": local_value_minimum,
            "minimum_common_isolate_binomial_coefficients_R0_through_R5": local_basis_minimum,
        }
        print(total, len(states[total]), local_value_minimum, local_basis_minimum, flush=True)

    report = {
        "marker": MARKER,
        "theorem": (
            "Every componentwise-deletion pair with e(P)<=7 has nonnegative "
            "unique-sum15 selected-isolate Newton rows, with arbitrarily many "
            "unselected common isolates."
        ),
        "component_types": raw_types,
        "orders": reports,
        "total_distinct_base_coefficient_states": sum(len(states[cost]) for cost in states),
        "total_literal_row_checks": total_checks,
        "global_minimum_literal_values_R0_through_R5": global_minimum_values,
        "global_minimum_common_isolate_binomial_coefficients_R0_through_R5": global_minimum_basis,
        "common_isolate_argument": (
            "Each R_j after multiplying both X and H by (1+x)^r has degree at "
            "most six in r; the symbolic weighted degrees are 6,5,4,3,2,0. "
            "The first seven forward differences are its exact "
            "binomial-basis coefficients; the checked seventh difference is zero."
        ),
        "component_bijection": (
            "Every nontrivial component is uniquely either selected, with one "
            "distinguished root deleted in H, or unselected and common to both "
            "rows.  Removing one component gives the dynamic-convolution inverse."
        ),
        "coverage": (
            "Selected isolated components are the outer Newton variable t. "
            "Unselected isolated components are the independently proved common "
            "isolate variable r.  All remaining components consume at least one "
            "edge, so the finite convolution is exhaustive at e(P)<=7."
        ),
        "scope": (
            "Exact unique sum15 componentwise-deletion theorem for e(P)<=7 only. "
            "The e(P)>=8 ratio cone and other interval sums are separate dependencies."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
