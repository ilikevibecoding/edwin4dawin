#!/usr/bin/env python3
"""Exact finite scout for length-extension monotonicity on e=2 double claws."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from scan_rank8_delta23_e1_subdivided_claws_n23_n28 import evaluator
from scan_rank8_delta3_n28_e1_subdivided_claws import forest_poly


RANKS = (0, 1, 2, 3)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical_lengths(order: int):
    total = order - 1
    for left_a in range(1, total + 1):
        for left_b in range(left_a, total + 1):
            for bridge in range(1, total + 1):
                for right_a in range(1, total + 1):
                    right_b = total - left_a - left_b - bridge - right_a
                    if right_b < right_a:
                        continue
                    if (left_a, left_b) > (right_a, right_b):
                        continue
                    yield (left_a, left_b, bridge, right_a, right_b)


def build_graph(lengths: tuple[int, int, int, int, int]):
    left_a, left_b, bridge, right_a, right_b = lengths
    adjacency = [[], []]
    descriptor_to_vertex = {("branch", 0): 0, ("branch", 1): 1}

    def attach(start: int, length: int, descriptor_prefix: tuple):
        previous = start
        for distance in range(1, length + 1):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            descriptor_to_vertex[(*descriptor_prefix, distance)] = vertex
            previous = vertex

    attach(0, left_a, ("arm", 0, 0))
    attach(0, left_b, ("arm", 0, 1))
    previous = 0
    for distance in range(1, bridge):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        descriptor_to_vertex[("bridge", distance)] = vertex
        previous = vertex
    adjacency[previous].append(1)
    adjacency[1].append(previous)
    attach(1, right_a, ("arm", 1, 0))
    attach(1, right_b, ("arm", 1, 1))
    assert len(adjacency) == 1 + sum(lengths)
    assert len(descriptor_to_vertex) == len(adjacency)
    return adjacency, descriptor_to_vertex


def rooted_values(adjacency, descriptor_map, evaluators):
    core = forest_poly(adjacency)
    out = {}
    for descriptor, vertex in descriptor_map.items():
        deletion = forest_poly(adjacency, vertex)
        inputs = (*core[3:9], deletion[6], deletion[7])
        out[descriptor] = {
            rank: evaluators[rank](inputs) for rank in RANKS
        }
    return out


def new_descriptor(lengths, extended_index: int):
    left_a, left_b, bridge, right_a, right_b = lengths
    if extended_index == 0:
        return ("arm", 0, 0, left_a + 1)
    if extended_index == 1:
        return ("arm", 0, 1, left_b + 1)
    if extended_index == 2:
        return ("bridge", bridge)
    if extended_index == 3:
        return ("arm", 1, 0, right_a + 1)
    if extended_index == 4:
        return ("arm", 1, 1, right_b + 1)
    raise ValueError(extended_index)


def main() -> None:
    order_rows = []
    global_minima = {rank: None for rank in RANKS}
    global_witnesses = {rank: None for rank in RANKS}
    for order in range(23, 30):
        old_evaluators = {rank: evaluator(rank, order)[0] for rank in RANKS}
        new_evaluators = {rank: evaluator(rank, order + 1)[0] for rank in RANKS}
        minima = {rank: None for rank in RANKS}
        witnesses = {rank: None for rank in RANKS}
        new_root_minima = {rank: None for rank in RANKS}
        core_count = 0
        comparisons = 0
        inserted_roots = 0
        for lengths in canonical_lengths(order):
            adjacency, descriptor_map = build_graph(lengths)
            old = rooted_values(adjacency, descriptor_map, old_evaluators)
            core_count += 1
            for extended_index in range(5):
                extended = list(lengths)
                extended[extended_index] += 1
                extended = tuple(extended)
                new_adjacency, new_descriptor_map = build_graph(extended)
                new = rooted_values(
                    new_adjacency, new_descriptor_map, new_evaluators
                )
                assert set(old).issubset(new)
                for descriptor, old_row in old.items():
                    comparisons += 1
                    for rank in RANKS:
                        increment = new[descriptor][rank] - old_row[rank]
                        if minima[rank] is None or increment < minima[rank]:
                            minima[rank] = increment
                            witnesses[rank] = {
                                "lengths": list(lengths),
                                "extended_index": extended_index,
                                "root_descriptor": list(descriptor),
                                "old": old_row[rank],
                                "new": new[descriptor][rank],
                                "increment": increment,
                            }
                        if (
                            global_minima[rank] is None
                            or increment < global_minima[rank]
                        ):
                            global_minima[rank] = increment
                            global_witnesses[rank] = {
                                "source_order": order,
                                **witnesses[rank],
                            }
                descriptor = new_descriptor(lengths, extended_index)
                assert descriptor in new
                inserted_roots += 1
                for rank in RANKS:
                    value = new[descriptor][rank]
                    if (
                        new_root_minima[rank] is None
                        or value < new_root_minima[rank]
                    ):
                        new_root_minima[rank] = value
        assert all(minima[rank] > 0 for rank in RANKS), (order, minima, witnesses)
        assert all(new_root_minima[rank] > 0 for rank in RANKS), (
            order,
            new_root_minima,
        )
        row = {
            "source_order": order,
            "canonical_cores": core_count,
            "old_root_comparisons": comparisons,
            "inserted_roots": inserted_roots,
            "minimum_increments": {str(rank): minima[rank] for rank in RANKS},
            "minimum_inserted_root_values": {
                str(rank): new_root_minima[rank] for rank in RANKS
            },
            "minimum_witnesses": {
                str(rank): witnesses[rank] for rank in RANKS
            },
        }
        order_rows.append(row)
        print("ORDER_PASS", order, core_count, comparisons, minima, flush=True)

    payload = {
        "status": "PASS_EXACT_SCOUT_RANK8_DELTA013_E2_LENGTH_EXTENSION_ORDERS_23_29",
        "scope": "all canonical e=2 double claws at source orders23..29, every one-step increase of each of five suppressed-edge lengths, every existing root and the inserted vertex",
        "warning": "Finite evidence only; not an all-order length-extension theorem.",
        "orders": order_rows,
        "global_minimum_increments": {
            str(rank): global_minima[rank] for rank in RANKS
        },
        "global_witnesses": {
            str(rank): global_witnesses[rank] for rank in RANKS
        },
    }
    output = Path(__file__).with_name(
        "rank8_delta013_e2_length_extension_scout_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
