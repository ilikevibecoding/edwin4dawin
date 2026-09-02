#!/usr/bin/env python3
"""Test the deepest-ordinary g1 residual against rank-4 component surplus.

This is a finite exact diagnostic.  It evaluates the parent-rooted residual
after the proved high-motif payment on every marked-parent cell of
nonisomorphic trees, and compares any debt with the proved tree margin

  CS4(T)=4 m2(T) i4(T)-C(n-2,2) s4(T) >= 0.

The probe distinguishes an implication, a scaled empirical payment, and an
obstruction; it never upgrades the finite comparison to an all-order proof.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent import (
    at,
    independent_poly_bruteforce,
)
from prove_iso_n4_bundle_g1_high_motif_payment_agent import motif_counts


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_g1_parent_residual_exact_agent_20260829.json"
MOTIF_CACHE = {}


def cached_motif_counts(graph):
    key = (
        tuple(sorted(graph.nodes())),
        tuple(sorted(tuple(sorted(edge)) for edge in graph.edges())),
    )
    if key not in MOTIF_CACHE:
        MOTIF_CACHE[key] = motif_counts(graph)
    return MOTIF_CACHE[key]


def exact_rational_evaluator(expression):
    """Compile a rational-coefficient polynomial to exact integer arithmetic."""
    symbols = tuple(sorted(expression.free_symbols, key=str))
    names = tuple(map(str, symbols))
    polynomial = sp.Poly(sp.expand(expression), *symbols)
    denominator = 1
    for coefficient in polynomial.coeffs():
        denominator = sp.ilcm(denominator, int(coefficient.q))
    terms = [
        (monomial, int(coefficient * denominator))
        for monomial, coefficient in polynomial.terms()
    ]

    def evaluate(values):
        vector = tuple(values[name] for name in names)
        numerator = 0
        for monomial, coefficient in terms:
            term = coefficient
            for base, exponent in zip(vector, monomial):
                if exponent:
                    term *= base**exponent
            numerator += term
        assert numerator % denominator == 0
        return numerator // denominator

    return evaluate


def neighbor_excess(graph, vertex):
    return sum(graph.degree(neighbor) - 1 for neighbor in graph.neighbors(vertex))


def s4_one_edge(graph):
    count = 0
    for chosen in itertools.combinations(tuple(graph), 5):
        induced = graph.subgraph(chosen)
        count += int(induced.number_of_edges() == 1)
    return count


def component_surplus_margin(graph):
    n = len(graph)
    edges = graph.number_of_edges()
    wedge = sum(comb(degree, 2) for _, degree in graph.degree())
    matching2 = comb(edges, 2) - wedge
    i4 = at(independent_poly_bruteforce(graph), 4)
    s4 = s4_one_edge(graph)
    width = comb(n - 2, 2) if n >= 4 else 0
    margin = 4 * matching2 * i4 - width * s4
    assert margin >= 0
    return {
        "CS4": margin,
        "i4": i4,
        "m2": matching2,
        "s4": s4,
        "width": width,
    }


def high_motif(graph, u, v, parent):
    n = len(graph)
    gu = graph.copy(); gu.remove_node(u)
    gv = graph.copy(); gv.remove_node(v)
    gp = graph.copy(); gp.remove_node(parent)
    g = cached_motif_counts(graph)
    return (
        2 * (n - 4) * g["R3"]
        + 5 * g["Q35"]
        - 5 * g["R4"]
        + (5 * n - 4)
        * (cached_motif_counts(gu)["R3"] + cached_motif_counts(gv)["R3"])
        + 5 * cached_motif_counts(gp)["R3"]
    )


def parent_data(graph, u, v, parent):
    return {
        "n": len(graph),
        "C_common_neighbor": len(set(graph.neighbors(u)) & set(graph.neighbors(v))),
        "C_neighbor_excess_u": neighbor_excess(graph, u),
        "C_neighbor_excess_v": neighbor_excess(graph, v),
        "C_wedges_E": sum(comb(degree, 2) for _, degree in graph.degree()),
        "adjacent": int(graph.has_edge(u, v)),
        "degree_u": graph.degree(u),
        "degree_v": graph.degree(v),
        "edge_count": graph.number_of_edges(),
        "parent_adjacent_u": int(graph.has_edge(parent, u)),
        "parent_adjacent_v": int(graph.has_edge(parent, v)),
        "parent_common_neighbor_u": len(
            set(graph.neighbors(parent)) & set(graph.neighbors(u))
        ),
        "parent_common_neighbor_v": len(
            set(graph.neighbors(parent)) & set(graph.neighbors(v))
        ),
        "parent_degree": graph.degree(parent),
        "parent_neighbor_excess": neighbor_excess(graph, parent),
    }


def update_minimum(old, value, record):
    if old is None or value < old["value"]:
        return {"value": value, **record}
    return old


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-tree-order", type=int, default=12)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("iso_n4_bundle_g1_residual_component_surplus_probe_agent_20260829.json"),
    )
    args = parser.parse_args()
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL_REDUCTION_AGENT"
    expression = sp.sympify(dependency["parent_rooted_form"])
    evaluate = exact_rational_evaluator(expression)

    cells = 0
    negative_residual = 0
    negative_after_one_cs = 0
    zero_cs_negative = []
    minimum_residual = None
    minimum_after_one_cs = None
    worst_ratio = None
    by_order = {}
    direct_g1_minimum = None

    for order in range(3, args.max_tree_order + 1):
        local = 0
        for graph0 in nx.nonisomorphic_trees(order):
            graph = nx.convert_node_labels_to_integers(graph0)
            code = nx.to_graph6_bytes(graph, header=False).decode().strip()
            cs = component_surplus_margin(graph)
            for u, v in itertools.combinations(graph, 2):
                for parent in graph:
                    if parent in (u, v):
                        continue
                    residual = evaluate(parent_data(graph, u, v, parent))
                    high = high_motif(graph, u, v, parent)
                    g1 = residual + high
                    assert g1 >= 0
                    paid = residual + cs["CS4"]
                    record = {
                        "order": order,
                        "graph6": code,
                        "marks": [u, v],
                        "parent": parent,
                        "residual": residual,
                        "high_motif": high,
                        "g1": g1,
                        **cs,
                    }
                    minimum_residual = update_minimum(
                        minimum_residual, residual, record
                    )
                    minimum_after_one_cs = update_minimum(
                        minimum_after_one_cs, paid, record
                    )
                    direct_g1_minimum = update_minimum(
                        direct_g1_minimum, g1, record
                    )
                    if residual < 0:
                        negative_residual += 1
                        if cs["CS4"] == 0:
                            if len(zero_cs_negative) < 20:
                                zero_cs_negative.append(record)
                        else:
                            ratio = Fraction(-residual, cs["CS4"])
                            if worst_ratio is None or ratio > worst_ratio[0]:
                                worst_ratio = (ratio, record)
                    negative_after_one_cs += int(paid < 0)
                    cells += 1
                    local += 1
        by_order[str(order)] = local

    report = {
        "marker": "PROBE_EXACT_ISO_N4_BUNDLE_G1_RESIDUAL_VS_COMPONENT_SURPLUS_AGENT",
        "tree_orders": [3, args.max_tree_order],
        "marked_parent_cells": cells,
        "by_order": by_order,
        "negative_residual_cells": negative_residual,
        "negative_after_adding_one_CS4": negative_after_one_cs,
        "negative_residual_with_zero_CS4": zero_cs_negative,
        "minimum_residual": minimum_residual,
        "minimum_residual_plus_CS4": minimum_after_one_cs,
        "minimum_g1": direct_g1_minimum,
        "largest_debt_over_CS4": (
            None
            if worst_ratio is None
            else {"ratio": str(worst_ratio[0]), **worst_ratio[1]}
        ),
        "interpretation": (
            "Finite exact test only. If a negative residual has CS4=0, the "
            "rank-four component-surplus margin cannot pay that residual by "
            "any nonnegative scalar multiple. Otherwise the observed ratio is "
            "not an all-order coefficient."
        ),
        "scope": (
            "Connected nonisomorphic trees and singleton deepest ordinary cells "
            "only; no all-order residual or g1 theorem is asserted."
        ),
        "dependency": {
            "report": DEPENDENCY.name,
            "report_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    args.output.write_text(encoded, encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "by_order"}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
