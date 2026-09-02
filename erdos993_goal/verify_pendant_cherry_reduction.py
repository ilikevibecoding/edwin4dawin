#!/usr/bin/env python3
"""Exact evidence for the pendant-cherry reduction in Erdős 993.

Given a tree R, a vertex w, and r >= 2, form C_r(R,w) by adding a new
vertex v adjacent to w and adding r new leaves adjacent to v.  Then

    I(C_r(R,w)) = (1+x)^r I(R) + x I(R-w).

The identity is elementary.  This script exhausts rooted unlabeled trees and
checks the still-conjectural assertion that the right side is unimodal.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx

from verify_edge_interface_identity import (
    add,
    independence_polynomial,
    is_unimodal,
    modes,
    multiply,
    shift,
)


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(
        nx.convert_node_labels_to_integers(graph), header=False
    ).decode("ascii").strip()


def trees_of_order(order: int):
    if order == 1:
        graph = nx.Graph()
        graph.add_node(0)
        yield graph
    elif order == 2:
        graph = nx.Graph()
        graph.add_edge(0, 1)
        yield graph
    else:
        yield from nx.nonisomorphic_trees(order)


def binomial_polynomial(power: int) -> tuple[int, ...]:
    result = (1,)
    for _ in range(power):
        result = multiply(result, (1, 1))
    return result


def check(max_base_order: int, r_min: int, r_max: int) -> dict:
    rooted_states = 0
    parameter_instances = 0
    failures = []
    maximum_mode_gap = -1
    maximum_mode_gap_witness = None
    kernels = {
        r: binomial_polynomial(r) for r in range(r_min, r_max + 1)
    }

    for order in range(1, max_base_order + 1):
        for base in trees_of_order(order):
            base_poly = independence_polynomial(base)
            for attachment in base:
                rooted_states += 1
                deleted = base.subgraph(
                    [node for node in base if node != attachment]
                ).copy()
                deleted_poly = independence_polynomial(deleted)
                for r, kernel in kernels.items():
                    smoothed = multiply(kernel, base_poly)
                    correction = shift(deleted_poly)
                    result = add(smoothed, correction)
                    parameter_instances += 1

                    if not is_unimodal(result):
                        failures.append(
                            {
                                "base_order": order,
                                "base_graph6": graph6(base),
                                "attachment": attachment,
                                "leaves": r,
                                "base_polynomial": base_poly,
                                "deleted_polynomial": deleted_poly,
                                "result": result,
                            }
                        )

                    gap = min(
                        abs(left - right)
                        for left in modes(smoothed)
                        for right in modes(correction)
                    )
                    if gap > maximum_mode_gap:
                        maximum_mode_gap = gap
                        maximum_mode_gap_witness = {
                            "base_order": order,
                            "base_graph6": graph6(base),
                            "attachment": attachment,
                            "leaves": r,
                            "base_polynomial": base_poly,
                            "deleted_polynomial": deleted_poly,
                            "smoothed_modes": modes(smoothed),
                            "correction_modes": modes(correction),
                            "gap": gap,
                            "result": result,
                        }

    # This abstract pair shows that unimodality plus B <= A is insufficient.
    abstract_a = (1, 1, 1, 1, 2)
    abstract_b = (1, 1)
    abstract_result = add(
        multiply((1, 2, 1), abstract_a), shift(abstract_b)
    )
    assert is_unimodal(abstract_a)
    assert is_unimodal(abstract_b)
    assert not is_unimodal(abstract_result)

    return {
        "certificate": "passed" if not failures else "failed",
        "scope": {
            "base_tree_orders": [1, max_base_order],
            "rooted_states": rooted_states,
            "leaf_multiplicities": [r_min, r_max],
            "parameter_instances": parameter_instances,
        },
        "identity": "I(C_r(R,w)) = (1+x)^r I(R) + x I(R-w)",
        "unimodality_failures": failures,
        "maximum_summand_mode_gap": maximum_mode_gap,
        "maximum_summand_mode_gap_witness": maximum_mode_gap_witness,
        "abstract_negative_control": {
            "A": abstract_a,
            "B": abstract_b,
            "r": 2,
            "(1+x)^r A + xB": abstract_result,
            "unimodal": False,
            "meaning": (
                "Unimodality of A and B and coefficientwise B<=A do not "
                "prove the cherry lemma without graph structure."
            ),
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-base-order", type=int, default=14)
    parser.add_argument("--r-min", type=int, default=2)
    parser.add_argument("--r-max", type=int, default=12)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = check(args.max_base_order, args.r_min, args.r_max)
    encoded = json.dumps(report, indent=2) + "\n"
    if args.output:
        args.output.write_text(encoded, encoding="utf-8")
        digest = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
        print(f"wrote {args.output}")
        print(f"sha256 {digest}")
    print(encoded, end="")


if __name__ == "__main__":
    main()
