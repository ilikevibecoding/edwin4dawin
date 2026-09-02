#!/usr/bin/env python3
"""Probe the pointed out-boundary count conjecture on oriented forests.

For an oriented forest D on n vertices and a fixed point p, count

    N_e(p) = #{S subseteq V(D): p in S, |N^+(S) \\ S| = e}.

The candidate payment needed by the maximum-set Hall reduction is
N_e(p) <= e*binom(n,e) when 3e>n.

This file is exploratory evidence only, not a proof.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from math import comb
from pathlib import Path

import networkx as nx


def boundary_counts(n: int, arcs: list[tuple[int, int]], point: int) -> list[int]:
    out = [0] * n
    for u, v in arcs:
        out[u] |= 1 << v
    full = (1 << n) - 1
    counts = [0] * (n + 1)
    for rest in range(1 << (n - 1)):
        low = rest & ((1 << point) - 1)
        high = rest >> point
        chosen = low | (1 << point) | (high << (point + 1))
        image = 0
        bits = chosen
        while bits:
            lsb = bits & -bits
            image |= out[lsb.bit_length() - 1]
            bits -= lsb
        boundary = image & (full ^ chosen)
        counts[boundary.bit_count()] += 1
    return counts


def orient(graph: nx.Graph, mask: int) -> list[tuple[int, int]]:
    arcs: list[tuple[int, int]] = []
    for index, (u, v) in enumerate(sorted((min(a, b), max(a, b)) for a, b in graph.edges())):
        arcs.append((v, u) if (mask >> index) & 1 else (u, v))
    return arcs


def audit(n: int, arcs: list[tuple[int, int]], tag: str, state: dict) -> None:
    for point in range(n):
        counts = boundary_counts(n, arcs, point)
        for excess in range(n + 1):
            if 3 * excess <= n or excess == 0:
                continue
            bound = excess * comb(n, excess)
            count = counts[excess]
            state["rows"] += 1
            payload = f"{n}|{tag}|{point}|{excess}|{count}|{bound}\n".encode()
            state["stream"].update(payload)
            if count > bound:
                raise AssertionError((n, tag, point, excess, count, bound, arcs))
            ratio = count / bound
            if ratio > state["max_ratio"]:
                state["max_ratio"] = ratio
                state["max_witness"] = {
                    "n": n,
                    "tag": tag,
                    "point": point,
                    "excess": excess,
                    "count": count,
                    "bound": bound,
                    "arcs": arcs,
                }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--atlas", type=int, default=7)
    parser.add_argument("--random-max", type=int, default=20)
    parser.add_argument("--random-per-n", type=int, default=80)
    parser.add_argument("--seed", type=int, default=993)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    state = {
        "rows": 0,
        "stream": hashlib.sha256(),
        "max_ratio": -1.0,
        "max_witness": None,
    }

    atlas_graphs = 0
    atlas_orientations = 0
    for graph0 in nx.graph_atlas_g():
        n = len(graph0)
        if n == 0 or n > args.atlas or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
        atlas_graphs += 1
        for mask in range(1 << graph.number_of_edges()):
            audit(n, orient(graph, mask), f"atlas{atlas_graphs}:o{mask}", state)
            atlas_orientations += 1

    random_instances = 0
    for n in range(args.atlas + 1, args.random_max + 1):
        for sample in range(args.random_per_n):
            # A random tree, with random edge deletions to include forest effects.
            graph = nx.random_labeled_tree(n, seed=rng.randrange(1 << 30))
            for edge in list(graph.edges()):
                if rng.random() < 0.15:
                    graph.remove_edge(*edge)
            mask = rng.randrange(1 << graph.number_of_edges())
            audit(n, orient(graph, mask), f"random{n}:{sample}", state)
            random_instances += 1

    report = {
        "status": "PASS_PROBE_ORIENTED_FOREST_POINTED_BOUNDARY_COUNT",
        "scope": "finite/random evidence only; not a theorem",
        "atlas_graphs": atlas_graphs,
        "atlas_orientations": atlas_orientations,
        "random_instances": random_instances,
        "inequality_rows": state["rows"],
        "max_ratio": state["max_ratio"],
        "max_witness": state["max_witness"],
        "value_stream_sha256": state["stream"].hexdigest().upper(),
    }
    Path("oriented_forest_pointed_boundary_count_probe_agent_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
