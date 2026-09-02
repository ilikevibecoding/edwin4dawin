#!/usr/bin/env python3
"""Probe exact-union shadow transport for the marked-forest N_4 kernel.

The exact-union charge of a support S is local: it only depends on the
induced marked forest B[S].  Negative supports can therefore be computed by
enumerating the at most 3^6 ordered two-colour coverings of S, independently
of the ambient forest.  This probe asks whether every negative support can be
paid by positive proper-subset supports through a capacitated Hall flow.

This is an experimental probe, not a theorem certificate.
"""

from __future__ import annotations

from collections import Counter
from functools import lru_cache
import argparse
import itertools
import json

import networkx as nx

from verify_iso_n4_exact_union_counterexample_root import TERMS
from prove_iso_n4_low_alpha_root import unlabeled_forests
from probe_iso_leaf_cross_remainder_root import graph6


def edge_code(graph: nx.Graph, vertices: tuple[int, ...]) -> int:
    positions = {vertex: index for index, vertex in enumerate(vertices)}
    code = 0
    bit = 0
    for left in range(len(vertices)):
        for right in range(left + 1, len(vertices)):
            if graph.has_edge(vertices[left], vertices[right]):
                code |= 1 << bit
            bit += 1
    return code


@lru_cache(maxsize=None)
def local_charge(order: int, edges: int, u_local: int, v_local: int) -> int:
    """Exact support charge; local index == order means mark is absent."""
    pairs = []
    for state in range(3 ** order):
        work = state
        first = 0
        second = 0
        for vertex in range(order):
            colour = work % 3
            work //= 3
            if colour != 1:
                first |= 1 << vertex
            if colour != 0:
                second |= 1 << vertex
        # States 0,1,2 mean first-only, second-only, both, respectively.
        pairs.append((first, second))

    edge_pairs = []
    bit = 0
    for left in range(order):
        for right in range(left + 1, order):
            if edges >> bit & 1:
                edge_pairs.append((1 << left) | (1 << right))
            bit += 1

    independent = {
        chosen
        for chosen in range(1 << order)
        if all(chosen & edge != edge for edge in edge_pairs)
    }
    total = 0
    for coefficient, left_row, left_rank, right_row, right_rank in TERMS:
        for first, second in pairs:
            if first not in independent or second not in independent:
                continue
            if first.bit_count() != left_rank or second.bit_count() != right_rank:
                continue
            if left_row in "UW" and u_local < order and first >> u_local & 1:
                continue
            if left_row in "VW" and v_local < order and first >> v_local & 1:
                continue
            if right_row in "UW" and u_local < order and second >> u_local & 1:
                continue
            if right_row in "VW" and v_local < order and second >> v_local & 1:
                continue
            total += coefficient
    return total


def charges(graph: nx.Graph, u: int, v: int) -> dict[int, int]:
    vertices = tuple(graph.nodes())
    assert vertices == tuple(range(len(vertices)))
    answer = {}
    for order in range(1, min(6, len(vertices)) + 1):
        for chosen in itertools.combinations(vertices, order):
            support = sum(1 << vertex for vertex in chosen)
            positions = {vertex: index for index, vertex in enumerate(chosen)}
            value = local_charge(
                order,
                edge_code(graph, chosen),
                positions.get(u, order),
                positions.get(v, order),
            )
            if value:
                answer[support] = value
    return answer


def shadow_flow(
    graph: nx.Graph, u: int, v: int, *, max_codimension: int | None = None
) -> dict[str, object]:
    values = charges(graph, u, v)
    negative = {support: -value for support, value in values.items() if value < 0}
    positive = {support: value for support, value in values.items() if value > 0}
    demand = sum(negative.values())
    if not demand:
        return {
            "demand": 0,
            "flow": 0,
            "negative": 0,
            "positive": len(positive),
            "components": [],
            "values": values,
        }

    source = ("source",)
    sink = ("sink",)
    network = nx.DiGraph()
    for support, capacity in positive.items():
        network.add_edge(source, ("p", support), capacity=capacity)
    for support, capacity in negative.items():
        network.add_edge(("n", support), sink, capacity=capacity)
        subset = support
        while subset:
            subset = (subset - 1) & support
            if subset in positive and (
                max_codimension is None
                or support.bit_count() - subset.bit_count() <= max_codimension
            ):
                network.add_edge(("p", subset), ("n", support), capacity=demand)
    flow, flow_dict = nx.maximum_flow(network, source, sink)

    incidence = nx.Graph()
    for neg in negative:
        incidence.add_node(("n", neg))
        subset = neg
        while subset:
            subset = (subset - 1) & neg
            if subset in positive and (
                max_codimension is None
                or neg.bit_count() - subset.bit_count() <= max_codimension
            ):
                incidence.add_edge(("p", subset), ("n", neg))
    components = []
    for nodes in nx.connected_components(incidence):
        negs = [mask for kind, mask in nodes if kind == "n"]
        poss = [mask for kind, mask in nodes if kind == "p"]
        vertex_union = 0
        for mask in negs:
            vertex_union |= mask
        components.append(
            {
                "negative_nodes": len(negs),
                "positive_nodes": len(poss),
                "vertex_span": vertex_union.bit_count(),
                "demand": sum(negative[mask] for mask in negs),
                "capacity": sum(positive[mask] for mask in poss),
            }
        )
    return {
        "demand": demand,
        "flow": flow,
        "negative": len(negative),
        "positive": len(positive),
        "components": components,
        "values": values,
        "flow_dict": flow_dict,
    }


def graph_family(order: int, family: str):
    if family == "trees":
        return [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
    if family == "forests":
        return unlabeled_forests(order)
    raise ValueError(family)


def run(
    order: int,
    family: str,
    max_graphs: int | None,
    max_codimension: int | None,
) -> dict[str, object]:
    graphs = graph_family(order, family)
    if max_graphs is not None:
        graphs = itertools.islice(graphs, max_graphs)
    summary = {
        "order": order,
        "family": family,
        "max_codimension": max_codimension,
        "graphs": 0,
        "marked_pairs": 0,
        "cells_with_negative": 0,
        "failures": 0,
        "minimum_slack": None,
        "max_component_vertex_span": 0,
        "max_component_negative_nodes": 0,
        "tight_witness": None,
        "failure_witness": None,
    }
    for index, graph in enumerate(graphs):
        graph = nx.convert_node_labels_to_integers(graph)
        summary["graphs"] += 1
        for u, v in itertools.combinations(range(order), 2):
            summary["marked_pairs"] += 1
            result = shadow_flow(
                graph, u, v, max_codimension=max_codimension
            )
            if not result["demand"]:
                continue
            summary["cells_with_negative"] += 1
            slack = result["flow"] - result["demand"]
            if summary["minimum_slack"] is None or slack < summary["minimum_slack"]:
                summary["minimum_slack"] = slack
                summary["tight_witness"] = {
                    "graph_index": index,
                    "graph6": graph6(graph),
                    "edges": list(graph.edges()),
                    "u": u,
                    "v": v,
                    "demand": result["demand"],
                    "flow": result["flow"],
                    "negative": result["negative"],
                    "positive": result["positive"],
                }
            summary["failures"] += int(slack < 0)
            if slack < 0 and summary["failure_witness"] is None:
                summary["failure_witness"] = summary["tight_witness"]
            for component in result["components"]:
                summary["max_component_vertex_span"] = max(
                    summary["max_component_vertex_span"], component["vertex_span"]
                )
                summary["max_component_negative_nodes"] = max(
                    summary["max_component_negative_nodes"],
                    component["negative_nodes"],
                )
    return summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("order", type=int)
    parser.add_argument("--family", choices=("trees", "forests"), default="trees")
    parser.add_argument("--max-graphs", type=int)
    parser.add_argument("--max-codimension", type=int)
    args = parser.parse_args()
    report = run(
        args.order, args.family, args.max_graphs, args.max_codimension
    )
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
