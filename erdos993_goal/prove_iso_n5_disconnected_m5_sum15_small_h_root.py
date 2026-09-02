#!/usr/bin/env python3
"""Exact finite component-state census for sum15 with |H|<=7."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n5_disconnected_m5_sum15_q2_coarse_root import generic_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import at


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum15_small_h_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_SMALL_H_ROOT"


def convolution(left, right, length):
    return tuple(sum(
        at(left, j) * at(right, rank - j) for j in range(rank + 1)
    ) for rank in range(length))


def component_types(max_cost=7):
    by_cost = {cost: set() for cost in range(1, max_cost + 1)}
    raw_counts = {cost: 0 for cost in by_cost}
    for cost in range(1, max_cost + 1):
        order = cost + 1
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            x = tuple(at(poly_forest(tree), rank) for rank in range(6))
            for root in tree:
                lower = tree.copy()
                degree = lower.degree(root)
                lower.remove_node(root)
                h = tuple(at(poly_forest(lower), rank) for rank in range(5))
                by_cost[cost].add((degree, x, h))
                raw_counts[cost] += 1
    return by_cost, raw_counts


def main():
    x_symbols, h_symbols, rows = generic_rows()
    evaluator = sp.lambdify((*x_symbols, *h_symbols), rows, modules="math")
    types, raw_counts = component_types()
    identity = (0, 0, (1, 0, 0, 0, 0, 0), (1, 0, 0, 0, 0))
    states = {0: {identity}}
    order_reports = {}
    global_minima = [None] * 6
    global_witnesses = [None] * 6
    for total in range(1, 8):
        current = set()
        for cost in range(1, total + 1):
            for degree, component_x, component_h in types[cost]:
                for q0, k0, x0, h0 in states[total - cost]:
                    current.add((
                        q0 + degree,
                        k0 + 1,
                        convolution(x0, component_x, 6),
                        convolution(h0, component_h, 5),
                    ))
        states[total] = current
        minima = [None] * 6
        qk_cells = set()
        checks = 0
        for q, k, x_values, h_values in sorted(current):
            arguments = (
                *(at(x_values, rank) for rank in range(8)),
                *(at(h_values, rank) for rank in range(7)),
            )
            values = [int(round(value)) for value in evaluator(*arguments)]
            assert all(value >= 0 for value in values), (
                total, q, k, x_values, h_values, values,
            )
            qk_cells.add((q, k))
            checks += 6
            for index, value in enumerate(values):
                minima[index] = value if minima[index] is None else min(minima[index], value)
                if global_minima[index] is None or value < global_minima[index]:
                    global_minima[index] = value
                    global_witnesses[index] = {
                        "H_order": total,
                        "q": q,
                        "k": k,
                        "X_coefficients_0_through_5": x_values,
                        "H_coefficients_0_through_4": h_values,
                    }
        order_reports[str(total)] = {
            "H_order": total,
            "distinct_coefficient_states": len(current),
            "q_k_cells": len(qk_cells),
            "newton_row_checks": checks,
            "minimum_R0_through_R5": minima,
        }
        print(total, len(current), checks, minima, flush=True)

    report = {
        "marker": MARKER,
        "theorem": (
            "Every active-root nonisolated component base with |H|<=7 has "
            "nonnegative sum15 Newton rows R0,...,R5."
        ),
        "component_generation": (
            "Each nontrivial P-component is an arbitrary tree C with its selected "
            "root; it contributes X=I(C), H=I(C-root), q=deg(root), k=1. "
            "Dynamic convolution over all rooted component types exhausts every "
            "component multiset, deduplicated only by the coefficient data used "
            "in the exact Newton rows."
        ),
        "rooted_component_types": {
            str(cost): {
                "raw_marked_trees": raw_counts[cost],
                "distinct_degree_X_H_types": len(types[cost]),
            }
            for cost in range(1, 8)
        },
        "orders": order_reports,
        "total_distinct_coefficient_states": sum(len(states[total]) for total in range(1, 8)),
        "total_newton_row_checks": sum(
            order_reports[str(total)]["newton_row_checks"] for total in range(1, 8)
        ),
        "global_minimum_R0_through_R5": global_minima,
        "global_minimizing_witnesses": global_witnesses,
        "coverage": (
            "Any isolated selected P-components factor as (1+x)^t. The exact "
            "Newton expansion has these six rows, so their nonnegativity proves "
            "sum15 for arbitrary isolate count t at every |H|<=7."
        ),
        "scope": (
            "Exact small-|H| active-root theorem for unique sum15 only. The "
            "large-order general-q cone is a separate dependency."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
