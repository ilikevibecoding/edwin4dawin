#!/usr/bin/env python3
"""Exact relaxation and component probes for bundle coefficients g1,g2.

The forest theorem is not inferred from these finite probes.  The purpose is
to determine which tempting stronger cones fail and whether the three exact
bundle components retain their signs after taking binomial differences.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import random
from functools import lru_cache
from pathlib import Path

import networkx as nx
import sympy as sp

import derive_iso_leaf_bundle_telescope_agent as bundle_module
from analyze_bundle_g12_agent_20260829 import symbolic_coefficients
from derive_iso_leaf_bundle_telescope_agent import bundle_components
from probe_iso_leaf_cross_remainder_root import graph6


TOTAL_VARIABLES: tuple[sp.Symbol, ...] = ()
TOTAL_EVALUATORS: dict[int, object] = {}


def differences(values: list[int]) -> list[int]:
    out: list[int] = []
    while values:
        out.append(values[0])
        values = [values[i + 1] - values[i] for i in range(len(values) - 1)]
    return out


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        out[index] += value
    for index, value in enumerate(right):
        out[index] += value
    return tuple(out)


@lru_cache(maxsize=None)
def poly_key(
    nodes: tuple[int, ...], edges: tuple[tuple[int, int], ...]
) -> tuple[int, ...]:
    if not nodes:
        return (1,)
    vertex = nodes[0]
    neighbors = {
        b if a == vertex else a
        for a, b in edges
        if a == vertex or b == vertex
    }

    without_v = tuple(node for node in nodes if node != vertex)
    without_v_edges = tuple(
        edge for edge in edges if vertex not in edge
    )
    excluded = poly_key(without_v, without_v_edges)

    removed = neighbors | {vertex}
    without_closed = tuple(node for node in nodes if node not in removed)
    without_closed_edges = tuple(
        edge for edge in edges if edge[0] not in removed and edge[1] not in removed
    )
    included_base = poly_key(without_closed, without_closed_edges)
    included = (0, *included_base)
    return add(excluded, included)


def poly_graph(graph: nx.Graph) -> list[int]:
    nodes = tuple(sorted(int(node) for node in graph))
    edges = tuple(
        sorted(
            (min(int(a), int(b)), max(int(a), int(b)))
            for a, b in graph.edges()
        )
    )
    result = list(poly_key(nodes, edges))
    while len(result) > 1 and result[-1] == 0:
        result.pop()
    return result


def minor_rows_general(
    graph: nx.Graph, marks: tuple[int, int]
) -> tuple[tuple[int, ...], ...]:
    out = []
    u, v = marks
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        row = poly_graph(reduced)
        out.append(tuple(row + [0] * max(0, 6 - len(row))))
    return tuple(out)


def direct_coefficients(
    graph: nx.Graph, marks: tuple[int, int], support: int
) -> tuple[int, int]:
    cgraph = graph.copy()
    cgraph.remove_node(support)
    dgraph = graph.copy()
    dgraph.remove_nodes_from([support, *tuple(graph.neighbors(support))])
    crows = minor_rows_general(cgraph, marks)
    drows = minor_rows_general(dgraph, marks)
    mapping: dict[str, int] = {}
    for prefix, rows in (("c", crows), ("d", drows)):
        for name, row in zip("EUVW", rows):
            for rank in range(6):
                mapping[f"{prefix}{name}{rank}"] = row[rank]
    arguments = [mapping[str(symbol)] for symbol in TOTAL_VARIABLES]
    return tuple(int(TOTAL_EVALUATORS[rank](*arguments)) for rank in (1, 2))


def component_coefficients(
    graph: nx.Graph, marks: tuple[int, int], support: int
) -> tuple[list[int], list[list[int]]]:
    component_values = [[0, 0, 0]]
    for number in range(1, 7):
        component_values.append(
            list(bundle_components(graph, marks, support, number, 4))
        )
    per_component = [
        differences([row[index] for row in component_values])
        for index in range(3)
    ]
    total = [sum(per_component[index][rank] for index in range(3)) for rank in range(7)]
    return total, per_component


def scan_graphs(
    graphs: list[nx.Graph], scope: str, include_components: bool = False
) -> dict:
    minima: dict[str, dict | None] = {
        "g1_total": None,
        "g2_total": None,
    }
    if include_components:
        minima.update(
            {
                "g1_polar": None,
                "g2_polar": None,
                "g1_PN": None,
                "g2_PN": None,
                "g1_curvature": None,
                "g2_curvature": None,
            }
        )
    negatives = {key: 0 for key in minima}
    cells = 0
    labels = ("polar", "PN", "curvature")
    for graph0 in graphs:
        graph = nx.convert_node_labels_to_integers(graph0)
        if len(graph) < 3:
            continue
        for marks in itertools.combinations(tuple(graph), 2):
            for support in graph:
                if support in marks:
                    continue
                g1, g2 = direct_coefficients(graph, marks, support)
                values: dict[str, int] = {
                    "g1_total": g1,
                    "g2_total": g2,
                }
                if include_components:
                    total, pieces = component_coefficients(graph, marks, support)
                    assert (total[1], total[2]) == (g1, g2)
                    for index, label in enumerate(labels):
                        values[f"g1_{label}"] = pieces[index][1]
                        values[f"g2_{label}"] = pieces[index][2]
                record_base = {
                    "order": len(graph),
                    "edges": graph.number_of_edges(),
                    "graph6": graph6(graph),
                    "marks": list(marks),
                    "support": support,
                    "is_forest": nx.is_forest(graph),
                }
                for key, value in values.items():
                    record = {**record_base, "value": value}
                    old = minima[key]
                    if old is None or value < old["value"]:
                        minima[key] = record
                    negatives[key] += int(value < 0)
                cells += 1
    return {
        "scope": scope,
        "graph_count": len(graphs),
        "marked_support_cells": cells,
        "negative_counts": negatives,
        "minima": minima,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--random-graphs", type=int, default=1000)
    parser.add_argument("--random-order", type=int, default=10)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("bundle_g12_relaxation_probe_agent_20260829.json"),
    )
    args = parser.parse_args()

    # The root bundle helper deliberately rejects cyclic graphs.  For this
    # relaxation-only probe, replace its polynomial evaluator with the same
    # exact deletion recurrence valid on every finite graph.
    bundle_module.poly_forest = poly_graph
    coefficients, _ = symbolic_coefficients()
    global TOTAL_VARIABLES, TOTAL_EVALUATORS
    TOTAL_VARIABLES = tuple(
        sorted((coefficients[1].free_symbols | coefficients[2].free_symbols), key=str)
    )
    TOTAL_EVALUATORS = {
        rank: sp.lambdify(TOTAL_VARIABLES, coefficients[rank], modules="math")
        for rank in (1, 2)
    }

    atlas = [graph for graph in nx.graph_atlas_g() if len(graph) >= 3]
    forests = [graph for graph in atlas if nx.is_forest(graph)]

    rng = random.Random(993_082_902)
    random_graphs: list[nx.Graph] = []
    for _ in range(args.random_graphs):
        order = rng.randint(3, args.random_order)
        probability = rng.choice((0.15, 0.25, 0.4, 0.6, 0.8))
        random_graphs.append(nx.gnp_random_graph(order, probability, seed=rng.randrange(1 << 63)))

    report = {
        "marker": "PROBE_EXACT_BUNDLE_G12_RELAXATIONS_AGENT_20260829",
        "forest_atlas": scan_graphs(
            forests,
            "complete NetworkX atlas forest census through order 7; finite exact evidence",
            include_components=True,
        ),
        "all_graph_atlas": scan_graphs(
            atlas,
            "complete NetworkX atlas graph census through order 7; finite exact relaxation test",
        ),
        "random_general_graphs": scan_graphs(
            random_graphs,
            "seeded finite exact general-graph stress; not exhaustive",
        ),
        "scope": (
            "No all-forest theorem is asserted. Negative component coefficients only "
            "refute separate-sign decompositions; negative general-graph totals only "
            "show that a proof must use stronger structure."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    args.output.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
