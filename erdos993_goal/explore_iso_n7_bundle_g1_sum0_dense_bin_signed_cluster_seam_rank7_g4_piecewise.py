#!/usr/bin/env python3
"""Explore the exact no-parent G1 seam in the densest forest bin.

This is deliberately an exploration, not a proof producer.  It streams free
trees, computes their independence rows through rank eight by tree DP, and
records the exact common0/sum0 no-parent G1 value together with the low edge
cluster statistics that enter inclusion--exclusion through three edges.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_bin_signed_cluster_seam_exploration_rank7_g4_piecewise_20260831.json"


def convolution(left: list[int], right: list[int], cap: int = 8) -> list[int]:
    result = [0] * (min(cap, len(left) + len(right) - 2) + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            if i + j <= cap:
                result[i + j] += a * b
    return result


def independence_rows(tree: nx.Graph, cap: int = 8) -> list[int]:
    root = next(iter(tree))

    def visit(vertex: int, parent: int | None) -> tuple[list[int], list[int]]:
        excluded = [1]
        included = [0, 1]
        for child in tree[vertex]:
            if child == parent:
                continue
            child_excluded, child_included = visit(child, vertex)
            child_total = [
                (child_excluded[index] if index < len(child_excluded) else 0)
                + (child_included[index] if index < len(child_included) else 0)
                for index in range(max(len(child_excluded), len(child_included)))
            ]
            excluded = convolution(excluded, child_total, cap)
            included = convolution(included, child_excluded, cap)
        return excluded, included

    excluded, included = visit(root, None)
    return [
        (excluded[index] if index < len(excluded) else 0)
        + (included[index] if index < len(included) else 0)
        for index in range(cap + 1)
    ]


def g1(rows: list[int]) -> int:
    w = rows
    return (
        8*w[3]**2 + 24*w[3]*w[4] - 64*w[3]*w[5]
        - 106*w[3]*w[6] - 51*w[3]*w[7] - 8*w[3]*w[8]
        + 80*w[4]**2 + 90*w[4]*w[5] - 12*w[4]*w[6]
        - 10*w[4]*w[7] + 39*w[5]**2 + 10*w[5]*w[6]
    )


def cluster_statistics(tree: nx.Graph) -> dict[str, int]:
    degrees = dict(tree.degree())
    omega = sum(degree * (degree - 1) // 2 for degree in degrees.values())
    star3 = sum(
        degree * (degree - 1) * (degree - 2) // 6
        for degree in degrees.values()
    )
    p4 = 0
    for left, right in tree.edges():
        p4 += (degrees[left] - 1) * (degrees[right] - 1)
    tau = star3 + p4
    return {"omega": omega, "star3": star3, "p4": p4, "tau": tau}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=18)
    args = parser.parse_args()
    summaries = []
    stream = hashlib.sha256()
    global_minimum = None
    for order in range(2, args.max_order + 1):
        count = 0
        minimum = None
        minimizer = None
        for index, tree in enumerate(nx.nonisomorphic_trees(order)):
            rows = independence_rows(tree)
            value = g1(rows)
            stats = cluster_statistics(tree)
            degree_sequence = sorted((degree for _, degree in tree.degree()), reverse=True)
            record = (
                order, index, value, tuple(rows[3:9]), tuple(degree_sequence),
                stats["omega"], stats["tau"], stats["p4"],
            )
            stream.update((repr(record) + "\n").encode())
            count += 1
            if minimum is None or value < minimum:
                minimum = value
                minimizer = {
                    "tree_index": index,
                    "value": value,
                    "rows_3_through_8": rows[3:9],
                    "degree_sequence": degree_sequence,
                    **stats,
                }
        assert minimum is not None and minimum >= 0
        summaries.append({"order": order, "trees": count, "minimum": minimizer})
        global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
        print(order, count, minimum, minimizer["degree_sequence"])
    report = {
        "marker": "EXPLORE_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_BIN_SIGNED_CLUSTER_SEAM_RANK7_G4_PIECEWISE",
        "status": "exact finite evidence only",
        "orders": summaries,
        "global_minimum": global_minimum,
        "record_stream_sha256": stream.hexdigest().upper(),
        "scope": "Free trees only; this is not a universal forest certificate.",
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
