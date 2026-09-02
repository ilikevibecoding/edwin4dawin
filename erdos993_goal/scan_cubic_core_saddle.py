#!/usr/bin/env python3
"""Search cubic-core trees with subdivided internal edges and pendant tails.

The rooted cubic core is a complete binary tree of a given height.  Its
root receives one extra pendant path; every bottom core vertex receives
two pendant paths.  Thus every core vertex has degree three.  Internal
core edges may be uniformly subdivided.

The small exhaustive saddle-fugacity champions are exactly the first
members of this structural class, motivating an asymptotic search here.
"""

from __future__ import annotations

import argparse
import heapq
import json
import time
from pathlib import Path

import networkx as nx

from scan_tree_saddle_fugacity import saddle, tree_polynomial


def add_path(graph: nx.Graph, start: int, length: int) -> int:
    current = start
    for _ in range(length):
        nxt = len(graph)
        graph.add_edge(current, nxt)
        current = nxt
    return current


def cubic_core_tree(
    height: int,
    internal_length: int,
    terminal_length: int,
    root_tail_length: int,
) -> nx.Graph:
    graph = nx.Graph()
    graph.add_node(0)
    add_path(graph, 0, root_tail_length)

    def grow(hub: int, depth: int):
        if depth == height:
            add_path(graph, hub, terminal_length)
            add_path(graph, hub, terminal_length)
            return
        for _ in range(2):
            child_hub = add_path(graph, hub, internal_length)
            grow(child_hub, depth + 1)

    grow(0, 0)
    assert nx.is_tree(graph)
    assert max(dict(graph.degree()).values()) == 3
    return graph


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--height-max", type=int, default=6)
    parser.add_argument("--internal-length-max", type=int, default=4)
    parser.add_argument("--terminal-length-max", type=int, default=6)
    parser.add_argument("--root-tail-length-max", type=int, default=6)
    parser.add_argument("--order-max", type=int, default=2000)
    parser.add_argument("--top", type=int, default=100)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    heap = []
    serial = 0
    cases = 0
    for height in range(args.height_max + 1):
        for internal_length in range(1, args.internal_length_max + 1):
            for terminal_length in range(1, args.terminal_length_max + 1):
                for root_tail_length in range(
                    1, args.root_tail_length_max + 1
                ):
                    tree = cubic_core_tree(
                        height,
                        internal_length,
                        terminal_length,
                        root_tail_length,
                    )
                    order = len(tree)
                    if order > args.order_max:
                        continue
                    poly = tree_polynomial(tree)
                    rho, limit = saddle(poly)
                    item = {
                        "height": height,
                        "internal_length": internal_length,
                        "terminal_length": terminal_length,
                        "root_tail_length": root_tail_length,
                        "order": order,
                        "alpha": len(poly) - 1,
                        "independence_polynomial": list(poly),
                        "rho": rho,
                        "rho_over_one_plus_rho": limit,
                    }
                    cases += 1
                    serial += 1
                    if len(heap) < args.top:
                        heapq.heappush(heap, (limit, serial, item))
                    elif limit > heap[0][0]:
                        heapq.heapreplace(heap, (limit, serial, item))
        print(
            f"height={height}: cases={cases:,}, "
            f"best={max(entry[0] for entry in heap):.12g}",
            flush=True,
        )

    report = {
        "status": "SEARCH_COMPLETE_NOT_PROOF",
        "parameters": vars(args) | {"output": str(args.output)},
        "cases": cases,
        "top": [entry[2] for entry in sorted(heap, reverse=True)],
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            report
            | {
                "top": report["top"][:10],
                "top_truncated_on_stdout": True,
            },
            indent=2,
        ),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
