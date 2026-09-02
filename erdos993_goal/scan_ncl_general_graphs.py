#!/usr/bin/env python3
"""Search for failures of the negative-cross NCL inequality on graphs.

For a graph T and vertex p, put F=T-p.  Adding a new pendant leaf at
p makes this an ordinary pendant terminal pair.  The forest theorem
only needs acyclic T, but nonforest failures identify which structural
hypotheses an NCL proof must use.
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
    graph6,
)
from scan_generalized_three_defect_gbcl import gbcl_data


def scan_graph(
    graph: nx.Graph,
    source: dict,
    summary: dict,
    min_rank: int,
) -> bool:
    order = graph.number_of_nodes()
    if order < 2:
        return True
    graph = nx.convert_node_labels_to_integers(graph)
    engine = MaskIndependencePolynomial(graph)
    full_mask = (1 << order) - 1
    t_poly = engine.polynomial(full_mask)
    for vertex in graph:
        f_mask = full_mask ^ (1 << engine.position[vertex])
        f_poly = engine.polynomial(f_mask)
        for k in range(min_rank, len(t_poly) - 1):
            data = gbcl_data(t_poly, f_poly, k)
            if data is None or data["split_branch"] != "z_negative_NCL":
                continue
            summary["negative_cross_checks"] += 1
            if data["live_C12_required"]:
                summary["live_negative_cross_checks"] += 1
            else:
                summary["direct_descent_negative_cross_checks"] += 1
            for candidate_name, data_key in (
                (
                    "negative_cross_reserve_cascade",
                    "negative_cross_reserve_cascade_cleared",
                ),
                (
                    "terminal_square_reserve",
                    "terminal_square_reserve_cleared",
                ),
                (
                    "full_square_reserve",
                    "full_square_reserve_cleared",
                ),
                (
                    "upper_unit_cross",
                    "upper_unit_cross_cleared",
                ),
                (
                    "reserve_cascade_after_square",
                    "reserve_cascade_after_square_cleared",
                ),
                (
                    "shifted_base",
                    "shifted_base_cleared",
                ),
            ):
                value = data[data_key]
                candidate = summary["candidate_inequalities"][
                    candidate_name
                ]
                if value < 0:
                    candidate["failures"] += 1
                    if candidate["first_failure"] is None:
                        candidate["first_failure"] = source | {
                            "order_T": order,
                            "edges_T": graph.number_of_edges(),
                            "graph6_T": graph6(graph),
                            "deleted_vertex_p": vertex,
                            "rank_k": k,
                            "cleared_margin": str(value),
                        }
            scale = max(
                abs(data["split_left"]),
                abs(data["split_right"]),
                1,
            )
            relative = data["split_margin"] / scale
            witness = source | {
                "order_T": order,
                "edges_T": graph.number_of_edges(),
                "graph6_T": graph6(graph),
                "deleted_vertex_p": vertex,
                "rank_k": k,
                "relative_margin": relative,
                "G_T": data["G_T"],
                "G_F": data["G_F"],
                "U": data["U"],
                "L": data["L"],
            }
            if (
                summary["minimum_relative_margin"] is None
                or relative < summary["minimum_relative_margin"]
            ):
                summary["minimum_relative_margin"] = relative
                summary["minimum_witness"] = witness
            if data["split_margin"] < 0:
                summary["first_failure"] = witness | {
                    "margin": str(data["split_margin"]),
                    "left": str(data["split_left"]),
                    "right": str(data["split_right"]),
                }
                return False
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--random-graphs", type=int, default=20_000)
    parser.add_argument("--random-order-min", type=int, default=8)
    parser.add_argument("--random-order-max", type=int, default=18)
    parser.add_argument("--min-rank", type=int, default=2)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("ncl_general_graph_scan_20260729.json"),
    )
    args = parser.parse_args()

    summary = {
        "graphs": 0,
        "negative_cross_checks": 0,
        "live_negative_cross_checks": 0,
        "direct_descent_negative_cross_checks": 0,
        "minimum_relative_margin": None,
        "minimum_witness": None,
        "first_failure": None,
        "candidate_inequalities": {
            "negative_cross_reserve_cascade": {
                "failures": 0,
                "first_failure": None,
            },
            "terminal_square_reserve": {
                "failures": 0,
                "first_failure": None,
            },
            "full_square_reserve": {
                "failures": 0,
                "first_failure": None,
            },
            "upper_unit_cross": {
                "failures": 0,
                "first_failure": None,
            },
            "reserve_cascade_after_square": {
                "failures": 0,
                "first_failure": None,
            },
            "shifted_base": {
                "failures": 0,
                "first_failure": None,
            },
        },
    }

    for atlas_index, graph in enumerate(nx.graph_atlas_g()):
        if graph.number_of_nodes() < 2:
            continue
        summary["graphs"] += 1
        if not scan_graph(
            graph,
            {"source": "graph_atlas", "atlas_index": atlas_index},
            summary,
            args.min_rank,
        ):
            break

    rng = random.Random(args.seed)
    completed_random = 0
    if summary["first_failure"] is None:
        for sample in range(args.random_graphs):
            order = rng.randint(
                args.random_order_min,
                args.random_order_max,
            )
            edge_probability = rng.uniform(0.03, 0.97)
            graph = nx.gnp_random_graph(
                order,
                edge_probability,
                seed=rng.randrange(1 << 63),
            )
            summary["graphs"] += 1
            completed_random += 1
            if not scan_graph(
                graph,
                {
                    "source": "random_Gnp",
                    "sample": sample,
                    "edge_probability": edge_probability,
                },
                summary,
                args.min_rank,
            ):
                break

    report = {
        "status": (
            "COUNTEREXAMPLE_TO_GENERAL_GRAPH_NCL"
            if summary["first_failure"] is not None
            else "PASS_FINITE_AUDIT_NOT_PROOF"
        ),
        "scope_warning": (
            "A nonforest failure does not refute the forest conjecture "
            "or its terminal NCL target."
        ),
        "parameters": {
            "random_graphs_requested": args.random_graphs,
            "random_graphs_completed": completed_random,
            "random_order_min": args.random_order_min,
            "random_order_max": args.random_order_max,
            "min_rank": args.min_rank,
            "seed": args.seed,
        },
        "summary": summary,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
