#!/usr/bin/env python3
"""Agent-local exact analysis of the lower binomial bundle coefficients.

This is a discovery/certificate generator for the rank-four whole-sibling
bundle polynomial.  It does not modify the root producer.  The final report
keeps symbolic identities, finite forest census, and relaxation obstructions
in separate sections.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from collections import defaultdict
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_leaf_bundle_telescope_agent import bundle_components
from derive_iso_n4_bundle_polynomial_root import (
    add_xd,
    at,
    binomial_basis,
    isolate_multiply,
    nested_rank,
)
from probe_iso_leaf_cross_remainder_root import graph6


def differences(values: list[int]) -> list[int]:
    out: list[int] = []
    while values:
        out.append(values[0])
        values = [values[i + 1] - values[i] for i in range(len(values) - 1)]
    return out


def cell_coefficients(
    graph: nx.Graph, marks: tuple[int, int], support: int
) -> tuple[list[int], list[int]]:
    values = [0]
    for number in range(1, 7):
        values.append(sum(bundle_components(graph, marks, support, number, 4)))
    return differences(values), values


def symbolic_coefficients() -> tuple[list[sp.Expr], dict[sp.Symbol, sp.Expr]]:
    m, t = sp.symbols("M t", integer=True, nonnegative=True)
    names = "EUVW"
    crows = tuple(tuple(sp.symbols(f"c{name}0:6")) for name in names)
    drows = tuple(tuple(sp.symbols(f"d{name}0:6")) for name in names)
    tm = add_xd(isolate_multiply(crows, m, 5), drows)
    t0 = add_xd(crows, drows)
    ct = isolate_multiply(crows, t, 4)
    lower = nested_rank(ct, 3)
    lower_poly = sp.Poly(lower, t)
    lower_sum = sp.expand(
        sum(
            coefficient
            * (sp.bernoulli(power + 1, m) - sp.bernoulli(power + 1, 0))
            / (power + 1)
            for (power,), coefficient in lower_poly.terms()
        )
    )
    gamma = sp.expand(nested_rank(tm, 4) - nested_rank(t0, 4) - lower_sum)
    coefficients = binomial_basis(gamma, m)

    n, q, eu, ev = sp.symbols("n q epsilon_u epsilon_v")
    structural: dict[sp.Symbol, sp.Expr] = {}
    for name in names:
        structural[sp.symbols(f"c{name}0")] = 1
        structural[sp.symbols(f"d{name}0")] = 1
    structural.update(
        {
            sp.symbols("cE1"): n,
            sp.symbols("cU1"): n - 1,
            sp.symbols("cV1"): n - 1,
            sp.symbols("cW1"): n - 2,
            sp.symbols("dE1"): q,
            sp.symbols("dU1"): q - eu,
            sp.symbols("dV1"): q - ev,
            sp.symbols("dW1"): q - eu - ev,
        }
    )
    return coefficients, structural


def census(max_order: int) -> dict:
    minima_by_order: dict[int, dict[int, dict]] = defaultdict(dict)
    global_minima: dict[int, dict | None] = {1: None, 2: None}
    negatives = {1: 0, 2: 0}
    cells = 0
    for order in range(3, max_order + 1):
        for graph0 in nx.nonisomorphic_trees(order):
            graph = nx.convert_node_labels_to_integers(graph0)
            for marks in itertools.combinations(tuple(graph), 2):
                for support in graph:
                    if support in marks:
                        continue
                    coeffs, values = cell_coefficients(graph, marks, support)
                    for rank in (1, 2):
                        record = {
                            "value": coeffs[rank],
                            "base_order": order,
                            "C_order_n": order - 1,
                            "graph6": graph6(graph),
                            "marks": list(marks),
                            "support": support,
                            "support_degree": graph.degree(support),
                            "mark_survival": [
                                int(not graph.has_edge(support, marks[0])),
                                int(not graph.has_edge(support, marks[1])),
                            ],
                            "gamma_0_to_6": values,
                        }
                        old = global_minima[rank]
                        if old is None or record["value"] < old["value"]:
                            global_minima[rank] = record
                        old_order = minima_by_order[order].get(rank)
                        if old_order is None or record["value"] < old_order["value"]:
                            minima_by_order[order][rank] = record
                        negatives[rank] += int(coeffs[rank] < 0)
                    cells += 1
    return {
        "scope": "finite exact census of connected nonisomorphic trees only",
        "tree_orders": [3, max_order],
        "marked_support_cells": cells,
        "negative_counts": negatives,
        "global_minima": global_minima,
        "minima_by_tree_order": {
            str(order): {str(rank): row for rank, row in data.items()}
            for order, data in minima_by_order.items()
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-tree-order", type=int, default=9)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("bundle_g12_analysis_agent_20260829.json"),
    )
    args = parser.parse_args()
    coefficients, structural = symbolic_coefficients()
    g1 = sp.expand(coefficients[1].subs(structural))
    g2 = sp.expand(coefficients[2].subs(structural))
    report = {
        "marker": "ANALYZE_EXACT_BUNDLE_G12_AGENT_20260829",
        "symbolic": {
            "status": "exact identities only; sign not asserted here",
            "g1": str(sp.factor(g1)),
            "g2": str(sp.factor(g2)),
        },
        "finite_census": census(args.max_tree_order),
        "scope": (
            "Agent-local lower-coefficient analysis. Symbolic reconstruction is "
            "exact; census is finite evidence, not an all-forest proof."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    args.output.write_text(raw, encoding="utf-8")
    print(json.dumps(report["finite_census"], indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
