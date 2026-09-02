#!/usr/bin/env python3
"""Exact common-neighbor and cross-edge constraints for nonadjacent marks."""

from __future__ import annotations

from collections import Counter
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_rank8_forest_root_deletion_attachment_floor_root import (
    nonisomorphic_forests,
    tree_catalog,
)
from search_iso_n6_bundle_g1_random_g1_nonadjacent import categories, rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_mark_cross_edge_constraints_exact_root_20260901.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_MARK_CROSS_EDGE_CONSTRAINTS_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def mark_cross_edge_constraints(
    names: dict[str, sp.Symbol],
    s: sp.Symbol,
) -> tuple[list[tuple[str, sp.Expr]], list[tuple[str, sp.Expr]], list[tuple[str, sp.Expr]]]:
    """Return zero identities, cubic inequalities, and quartic inequalities."""
    m = s + 6
    a, b, z = names["CA2"], names["CB2"], names["CZ3"]
    c = sp.expand(m - a - b + z)
    p, q = m - a, m - b
    d = m - z
    cross_independent_pairs = sp.expand(
        names["CW2"] - names["CA3"] - names["CB3"] + names["CZ4"]
    )
    # When c=0, the inclusion-exclusion row counts all independent U--V
    # pairs, so p*q-R is the unique possible U--V edge.  When c=1 there can
    # be no such edge; multiplication by 1-c selects the correct formula.
    h = sp.expand((1 - c) * (p * q - cross_independent_pairs))
    equalities = [("common_neighbor_binary", sp.expand(c * (1 - c)))]
    cubic = [
        ("cross_edge_nonnegative", h),
        ("cross_edge_at_most_one_minus_c", sp.expand(1 - c - h)),
        (
            "W_neighbor_union_exact_pair_lower",
            sp.expand(2 * names["CW2"] - d * (d - 1) + 2 * h),
        ),
    ]
    quartic = [(
        "W_neighbor_union_exact_triple_lower",
        sp.expand(
            6 * names["CW3"] - d * (d - 1) * (d - 2) + 6 * h * (d - 2)
        ),
    )]
    return equalities, cubic, quartic


def main() -> None:
    s = sp.Symbol("s", nonnegative=True)
    names = {
        name: sp.Symbol(name, integer=True, nonnegative=True)
        for name in (
            "CA2", "CA3", "CB2", "CB3", "CW2", "CW3", "CZ3", "CZ4"
        )
    }
    equalities, cubic, quartic = mark_cross_edge_constraints(names, s)
    constraints = equalities + cubic + quartic
    evaluators = []
    for name, expression in constraints:
        variables = tuple(sorted(expression.free_symbols, key=str))
        evaluators.append((name, variables, sp.lambdify(variables, expression, "math")))

    catalog = tree_catalog(10)
    counts = Counter()
    minima = {name: None for name, _, _ in evaluators}
    equality_nonzero = Counter()
    h_mismatches = []
    stream = hashlib.sha256()
    for order in range(8, 11):
        for forest_index, graph in enumerate(nonisomorphic_forests(order, catalog)):
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(tuple(graph), 2):
                if graph.has_edge(u, v):
                    continue
                values = {**categories(rows(graph, u, v)), "s": order - 8}
                h_nodes = set(graph) - {u, v}
                u_set = {node for node in h_nodes if graph.has_edge(v, node)}
                v_set = {node for node in h_nodes if graph.has_edge(u, node)}
                actual_cross_edges = graph.subgraph(u_set | v_set).number_of_edges()
                a, b, z = values["CA2"], values["CB2"], values["CZ3"]
                c = order - 2 - a - b + z
                p, q = order - 2 - a, order - 2 - b
                r = values["CW2"] - values["CA3"] - values["CB3"] + values["CZ4"]
                h_value = (1 - c) * (p * q - r)
                if h_value != actual_cross_edges:
                    h_mismatches.append((order, graph6, u, v, h_value, actual_cross_edges))
                for name, variables, evaluate in evaluators:
                    value = int(evaluate(*(values[str(variable)] for variable in variables)))
                    if name == "common_neighbor_binary":
                        equality_nonzero[name] += int(value != 0)
                    else:
                        counts[f"{name}:{'negative' if value < 0 else 'nonnegative'}"] += 1
                        minima[name] = value if minima[name] is None else min(minima[name], value)
                    stream.update(
                        f"{order}|{forest_index}|{graph6}|{u}|{v}|{name}|{value};".encode()
                    )

    negatives = sum(value for key, value in counts.items() if key.endswith(":negative"))
    passed = not negatives and not sum(equality_nonzero.values()) and not h_mismatches
    marker = MARKER if passed else "FAIL_EXACT_ISO_N6_BUNDLE_G1_MARK_CROSS_EDGE_CONSTRAINTS_ROOT"
    report = {
        "marker": marker,
        "expressions": {name: str(expression) for name, expression in constraints},
        "proof": (
            "For nonadjacent marks, c=|U intersect V| is 0 or 1.  If c=0, inclusion-exclusion "
            "makes p*q-(CW2-CA3-CB3+CZ4) the number of U--V edges; acyclicity makes it 0 or 1. "
            "If c=1, acyclicity forbids every U--V edge, and the factor 1-c sets h=0."
        ),
        "coverage": "Every nonisomorphic forest of orders 8,9,10 and every nonadjacent marked pair.",
        "counts": dict(counts),
        "minima": minima,
        "equality_nonzero": dict(equality_nonzero),
        "h_mismatches": h_mismatches,
        "negative_cells": negatives,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": (
            "The graph argument is universal; the finite census independently checks the coordinate formula."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": marker,
        "negative_cells": negatives,
        "equality_nonzero": dict(equality_nonzero),
        "h_mismatches": len(h_mismatches),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
