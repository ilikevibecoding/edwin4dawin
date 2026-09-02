#!/usr/bin/env python3
"""Exact rooted-tree padding search for the pointed full-square reserve.

For each rooted tree T with F=T-root, multiply both independence
polynomials by a common forest factor.  This preserves the terminal
vertex-deletion relation while moving the relevant coefficient window.
The search targets the rare live negative-cross branch and checks the
inductive GSB hypotheses separately.
"""

from __future__ import annotations

import argparse
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx
from flint import fmpz_poly

from random_leaf_gsb_local_payment import tree_polynomial
from scan_generalized_three_defect_gbcl import gbcl_data


X = fmpz_poly([0, 1])
ONE_PLUS_X = fmpz_poly([1, 1])


def adjacency(graph: nx.Graph) -> list[list[int]]:
    return [
        sorted(int(w) for w in graph.neighbors(v))
        for v in range(graph.number_of_nodes())
    ]


def binomial_poly(order: int) -> fmpz_poly:
    return fmpz_poly([comb(order, j) for j in range(order + 1)])


def common_forest_components() -> list[tuple[str, fmpz_poly, int]]:
    """Return named connected forest component polynomials."""
    components: list[tuple[str, fmpz_poly, int]] = [
        ("isolate", ONE_PLUS_X, 1),
        ("edge", fmpz_poly([1, 2]), 2),
    ]
    for leaves in (2, 3, 5, 8, 13, 21):
        components.append(
            (
                f"star_{leaves}",
                binomial_poly(leaves) + X,
                leaves + 1,
            )
        )
    for order in (3, 4, 5, 6, 8, 10):
        graph = nx.path_graph(order)
        components.append(
            (
                f"path_{order}",
                tree_polynomial(adjacency(graph)),
                order,
            )
        )
    return components


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-tree-order", type=int, default=11)
    parser.add_argument("--maximum-common-count", type=int, default=80)
    parser.add_argument("--count-step", type=int, default=1)
    parser.add_argument("--minimum-rank", type=int, default=3)
    parser.add_argument(
        "--require-inductive",
        action="store_true",
        help="record a counterexample only when both lower GSB gaps pass",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "tree_full_square_padding_20260729.json"
        ),
    )
    args = parser.parse_args()

    summary = {
        "rooted_trees": 0,
        "padded_instances": 0,
        "rank_checks": 0,
        "negative_cross_checks": 0,
        "live_negative_cross_checks": 0,
        "live_inductive_negative_cross_checks": 0,
        "full_square_failures": 0,
        "live_full_square_failures": 0,
        "live_inductive_full_square_failures": 0,
        "first_live_failure": None,
        "first_live_inductive_failure": None,
        "minimum_live_ratio": None,
        "minimum_live_witness": None,
        "minimum_live_inductive_ratio": None,
        "minimum_live_inductive_witness": None,
    }
    stop = False
    for order in range(2, args.maximum_tree_order + 1):
        for tree_index, graph in enumerate(
            nx.generators.nonisomorphic_trees(order)
        ):
            adj = adjacency(graph)
            t0 = tree_polynomial(adj)
            graph_code = nx.to_graph6_bytes(
                graph, header=False
            ).decode("ascii").strip()
            for root in range(order):
                f0 = tree_polynomial(adj, deleted=root)
                summary["rooted_trees"] += 1
                for component_name, component, component_order in (
                    common_forest_components()
                ):
                    common = fmpz_poly([1])
                    for count in range(
                        0,
                        args.maximum_common_count + 1,
                    ):
                        if count % args.count_step == 0:
                            t_poly = t0 * common
                            f_poly = f0 * common
                            summary["padded_instances"] += 1
                            maximum_rank = min(
                                t_poly.degree() - 1,
                                f_poly.degree(),
                            )
                            for k in range(
                                args.minimum_rank,
                                maximum_rank + 1,
                            ):
                                data = gbcl_data(t_poly, f_poly, k)
                                if data is None:
                                    continue
                                summary["rank_checks"] += 1
                                if (
                                    data["split_branch"]
                                    != "z_negative_NCL"
                                ):
                                    continue
                                summary["negative_cross_checks"] += 1
                                if not data["live_C12_required"]:
                                    continue
                                summary[
                                    "live_negative_cross_checks"
                                ] += 1
                                inductive = (
                                    data["G_T"] >= 0
                                    and data["G_F"] >= 0
                                )
                                if inductive:
                                    summary[
                                        "live_inductive_negative_cross_checks"
                                    ] += 1
                                denominator = k * data["U"] ** 2
                                numerator = (
                                    data[
                                        "full_square_reserve_cleared"
                                    ]
                                    + denominator
                                )
                                ratio = float(
                                    Fraction(numerator, denominator)
                                )
                                witness = {
                                    "tree_order": order,
                                    "tree_index": tree_index,
                                    "graph6": graph_code,
                                    "root": root,
                                    "root_degree": graph.degree(root),
                                    "common_component": component_name,
                                    "common_component_order": (
                                        component_order
                                    ),
                                    "common_count": count,
                                    "total_order": (
                                        order + count * component_order
                                    ),
                                    "rank_k": k,
                                    "G_T_nonnegative": (
                                        data["G_T"] >= 0
                                    ),
                                    "G_F_nonnegative": (
                                        data["G_F"] >= 0
                                    ),
                                    "R_T_over_zeta_squared": ratio,
                                    "cleared_margin": str(
                                        data[
                                            "full_square_reserve_cleared"
                                        ]
                                    ),
                                }
                                if (
                                    summary["minimum_live_ratio"] is None
                                    or ratio
                                    < summary["minimum_live_ratio"]
                                ):
                                    summary["minimum_live_ratio"] = ratio
                                    summary[
                                        "minimum_live_witness"
                                    ] = witness
                                if inductive and (
                                    summary[
                                        "minimum_live_inductive_ratio"
                                    ]
                                    is None
                                    or ratio
                                    < summary[
                                        "minimum_live_inductive_ratio"
                                    ]
                                ):
                                    summary[
                                        "minimum_live_inductive_ratio"
                                    ] = ratio
                                    summary[
                                        "minimum_live_inductive_witness"
                                    ] = witness
                                if (
                                    data[
                                        "full_square_reserve_cleared"
                                    ]
                                    < 0
                                ):
                                    summary[
                                        "full_square_failures"
                                    ] += 1
                                    summary[
                                        "live_full_square_failures"
                                    ] += 1
                                    if (
                                        summary["first_live_failure"]
                                        is None
                                    ):
                                        summary[
                                            "first_live_failure"
                                        ] = witness
                                    if inductive:
                                        summary[
                                            "live_inductive_full_square_failures"
                                        ] += 1
                                        if (
                                            summary[
                                                "first_live_inductive_failure"
                                            ]
                                            is None
                                        ):
                                            summary[
                                                "first_live_inductive_failure"
                                            ] = witness
                                            if args.require_inductive:
                                                stop = True
                                                break
                            if stop:
                                break
                        common *= component
                    if stop:
                        break
                if stop:
                    break
            if stop:
                break
        print(
            f"order={order}, rooted={summary['rooted_trees']}, "
            f"live={summary['live_negative_cross_checks']}, "
            "live_inductive_failures="
            f"{summary['live_inductive_full_square_failures']}",
            flush=True,
        )
        if stop:
            break

    report = {
        "status": (
            "FOREST_COUNTEREXAMPLE_TO_PFSR"
            if summary["first_live_inductive_failure"] is not None
            else "PASS_FINITE_AUDIT_NOT_PROOF"
        ),
        "parameters": vars(args) | {"output": str(args.output)},
        "summary": summary,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
