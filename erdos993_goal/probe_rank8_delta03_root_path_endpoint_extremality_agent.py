#!/usr/bin/env python3
"""Broad exact probe of root-motion extrema along maximal degree-two paths.

This intentionally tests a larger class than the current five-cubic-path
obligation.  It is exploratory only and does not certify the conjectured
endpoint/adjacent-root reduction.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from probe_rank8_delta03_e5_five_cubic_path_internal_root_shape_agent import (
    deltas03,
    forest_poly,
)


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_root_path_endpoint_extremality_probe_agent_20260825.json"


def random_tree(order: int, source: random.Random) -> list[list[int]]:
    if order == 1:
        return [[]]
    prufer = [source.randrange(order) for _ in range(order - 2)]
    degree = [1] * order
    for vertex in prufer:
        degree[vertex] += 1
    adjacency = [[] for _ in range(order)]
    for vertex in prufer:
        leaf = next(index for index, value in enumerate(degree) if value == 1)
        adjacency[leaf].append(vertex)
        adjacency[vertex].append(leaf)
        degree[leaf] -= 1
        degree[vertex] -= 1
    last = [index for index, value in enumerate(degree) if value == 1]
    adjacency[last[0]].append(last[1])
    adjacency[last[1]].append(last[0])
    return adjacency


def subdivide(adjacency: list[list[int]], source: random.Random) -> list[list[int]]:
    out = [[] for _ in adjacency]
    for left, row in enumerate(adjacency):
        for right in row:
            if left >= right:
                continue
            previous = left
            distance = source.randint(1, 16)
            for _ in range(distance - 1):
                vertex = len(out)
                out.append([previous])
                out[previous].append(vertex)
                previous = vertex
            out[previous].append(right)
            out[right].append(previous)
    return out


def maximal_chains(adjacency: list[list[int]]) -> list[list[int]]:
    chains = []
    seen_edges: set[tuple[int, int]] = set()
    for endpoint, row in enumerate(adjacency):
        if len(row) == 2:
            continue
        for neighbor in row:
            edge = tuple(sorted((endpoint, neighbor)))
            if edge in seen_edges:
                continue
            chain = [endpoint]
            previous, current = endpoint, neighbor
            seen_edges.add(edge)
            while len(adjacency[current]) == 2:
                chain.append(current)
                following = adjacency[current][0] if adjacency[current][1] == previous else adjacency[current][1]
                previous, current = current, following
                seen_edges.add(tuple(sorted((previous, current))))
            chain.append(current)
            chains.append(chain)
    return chains


def main() -> None:
    source = random.Random(0x993_5EED_20260825)
    counts = {"pendant": 0, "spine": 0}
    failures = {
        "pendant_endpoint": [0] * 4,
        "spine_delta0_endpoint": [0] * 4,
        "spine_delta123_adjacent": [0] * 4,
    }
    witnesses = []
    for sample in range(128):
        adjacency = subdivide(random_tree(source.randint(8, 22), source), source)
        core = forest_poly(adjacency)
        values = [
            deltas03(core, forest_poly(adjacency, frozenset({root})))
            for root in range(len(adjacency))
        ]
        for chain in maximal_chains(adjacency):
            if len(chain) <= 2:
                continue
            endpoint_degrees = (len(adjacency[chain[0]]), len(adjacency[chain[-1]]))
            if 1 in endpoint_degrees and max(endpoint_degrees) >= 3:
                kind = "pendant"
            elif min(endpoint_degrees) >= 3:
                kind = "spine"
            else:
                continue
            counts[kind] += 1
            for rank in range(4):
                internal_minimum = min(values[root][rank] for root in chain[1:-1])
                endpoint_minimum = min(values[chain[0]][rank], values[chain[-1]][rank])
                if kind == "pendant" and internal_minimum < endpoint_minimum:
                    failures["pendant_endpoint"][rank] += 1
                    if len(witnesses) < 12:
                        witnesses.append([sample, kind, rank, endpoint_degrees, len(chain), endpoint_minimum, internal_minimum])
                if kind == "spine" and rank == 0 and internal_minimum < endpoint_minimum:
                    failures["spine_delta0_endpoint"][rank] += 1
                    if len(witnesses) < 12:
                        witnesses.append([sample, kind, rank, endpoint_degrees, len(chain), endpoint_minimum, internal_minimum])
                if kind == "spine" and rank >= 1:
                    adjacent_minimum = min(values[chain[1]][rank], values[chain[-2]][rank])
                    if internal_minimum < adjacent_minimum:
                        failures["spine_delta123_adjacent"][rank] += 1
                        if len(witnesses) < 12:
                            witnesses.append([sample, kind, rank, endpoint_degrees, len(chain), adjacent_minimum, internal_minimum])
    payload = {
        "schema": "rank8-delta03-root-path-endpoint-extremality-probe-agent-v1",
        "status": "PROBE_ONLY",
        "random_subdivided_tree_samples": 128,
        "chain_counts": counts,
        "failure_counts_by_delta": failures,
        "first_witnesses": witnesses,
        "scope_guard": "Random exact probe only; not theorem evidence.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
