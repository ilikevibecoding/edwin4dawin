#!/usr/bin/env python3
"""Bounded core/leaf census for degree-two-free order-26 trees.

Deleting all leaves from such a tree leaves a tree on its branching vertices.
There are at most twelve branching vertices.  We enumerate every unlabeled
core and every ordered leaf-count assignment satisfying full degree at least
three.  Automorphism duplicates are harmless; no actual tree can be missed.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "probe_iso_n7_bundle_g1_no_parent_n26_degree2free_core_leaf_census_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PROBE_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N26_DEGREE2FREE_CORE_LEAF_"
    "CENSUS_RANK7_G4_PIECEWISE"
)
ORDER = 26
TRUNCATION = 8


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def multiply(left, right):
    result = [0]*(min(TRUNCATION, len(left) + len(right) - 2) + 1)
    for i, x in enumerate(left):
        if not x:
            continue
        for j, y in enumerate(right[:TRUNCATION + 1 - i]):
            result[i + j] += x*y
    return tuple(result)


def add(left, right):
    length = max(len(left), len(right))
    return tuple(
        (left[i] if i < len(left) else 0)
        + (right[i] if i < len(right) else 0)
        for i in range(length)
    )


def weak_compositions(total, length, prefix=()):
    if length == 1:
        yield prefix + (total,)
        return
    for first in range(total + 1):
        yield from weak_compositions(total - first, length - 1, prefix + (first,))


def rooted_structure(core):
    parent = [-1]*len(core)
    order = [0]
    for vertex in order:
        for neighbor in sorted(core.neighbors(vertex)):
            if neighbor == parent[vertex]:
                continue
            parent[neighbor] = vertex
            order.append(neighbor)
    assert len(order) == len(core)
    children = [[] for _ in core]
    for vertex in order[1:]:
        children[parent[vertex]].append(vertex)
    return order, children


def weighted_independence_row(core, leaves):
    order, children = rooted_structure(core)
    excluded = [None]*len(core)
    included = [None]*len(core)
    for vertex in reversed(order):
        exc = tuple(math.comb(leaves[vertex], rank)
                    for rank in range(min(TRUNCATION, leaves[vertex]) + 1))
        inc = (0, 1)
        for child in children[vertex]:
            exc = multiply(exc, add(excluded[child], included[child]))
            inc = multiply(inc, excluded[child])
        excluded[vertex] = exc
        included[vertex] = inc
    row = add(excluded[0], included[0])
    return row + (0,)*(TRUNCATION + 1 - len(row))


def generic_full_tree_row(core, leaves):
    """Independent reconstruction with all 26 vertices explicitly present."""
    graph = nx.Graph(core)
    next_vertex = len(core)
    for vertex, count in enumerate(leaves):
        for _ in range(count):
            graph.add_edge(vertex, next_vertex)
            next_vertex += 1
    assert next_vertex == ORDER and nx.is_tree(graph)
    parent = {0: -1}
    traversal = [0]
    for vertex in traversal:
        for neighbor in sorted(graph.neighbors(vertex)):
            if neighbor == parent[vertex]:
                continue
            parent[neighbor] = vertex
            traversal.append(neighbor)
    excluded = {}
    included = {}
    for vertex in reversed(traversal):
        exc = (1,)
        inc = (0, 1)
        for neighbor in graph.neighbors(vertex):
            if parent.get(neighbor) != vertex:
                continue
            exc = multiply(exc, add(excluded[neighbor], included[neighbor]))
            inc = multiply(inc, excluded[neighbor])
        excluded[vertex] = exc
        included[vertex] = inc
    row = add(excluded[0], included[0])
    return row + (0,)*(TRUNCATION + 1 - len(row))


def q(row):
    w3, w4, w5, w6, w7, w8 = row[3:9]
    return (
        8*w3*w3 + 24*w3*w4 - 64*w3*w5 - 106*w3*w6
        - 51*w3*w7 - 8*w3*w8 + 80*w4*w4 + 90*w4*w5
        - 12*w4*w6 - 10*w4*w7 + 39*w5*w5 + 10*w5*w6
    )


def main() -> None:
    total_assignments = 0
    eligible_assignments = 0
    negative = 0
    crosschecks = 0
    minimum = None
    by_core_order = {}
    stream = hashlib.sha256()

    for branching in range(3, 13):
        core_count = 0
        local_total = 0
        local_eligible = 0
        for core_index, core in enumerate(nx.nonisomorphic_trees(branching)):
            core_count += 1
            core_degrees = tuple(core.degree(vertex) for vertex in range(branching))
            floors = tuple(max(0, 3 - degree) for degree in core_degrees)
            remaining = ORDER - branching - sum(floors)
            if remaining < 0:
                continue
            for extra in weak_compositions(remaining, branching):
                leaves = tuple(floors[i] + extra[i] for i in range(branching))
                degrees = tuple(core_degrees[i] + leaves[i] for i in range(branching))
                total_assignments += 1
                local_total += 1
                if max(degrees) < 4:
                    continue
                eligible_assignments += 1
                local_eligible += 1
                row = weighted_independence_row(core, leaves)
                assert row[0] == 1 and row[1] == ORDER
                assert row[2] == math.comb(ORDER, 2) - (ORDER - 1)
                value = q(row)
                negative += value < 0
                record = (
                    branching, core_index, core_degrees, leaves, degrees,
                    row, value,
                )
                stream.update((repr(record) + "\n").encode("ascii"))
                candidate = (value, branching, core_index, leaves, degrees, row)
                minimum = candidate if minimum is None else min(minimum, candidate)
                if eligible_assignments % 1024 == 0:
                    assert generic_full_tree_row(core, leaves) == row
                    crosschecks += 1
        by_core_order[str(branching)] = {
            "unlabeled_cores": core_count,
            "ordered_leaf_assignments": local_total,
            "eligible_assignments": local_eligible,
        }

    report = {
        "marker": MARKER,
        "status": "exact bounded probe; promotion requires independent replay",
        "order": ORDER,
        "core_orders": [3, 12],
        "by_core_order": by_core_order,
        "ordered_leaf_assignments": total_assignments,
        "eligible_assignments": eligible_assignments,
        "negative": negative,
        "independent_full_tree_crosschecks": crosschecks,
        "minimum": {
            "value": minimum[0],
            "branching_vertices": minimum[1],
            "core_index": minimum[2],
            "leaves": list(minimum[3]),
            "branch_degrees": list(minimum[4]),
            "independence_row_0_through_8": list(minimum[5]),
        },
        "ordered_certificate_stream_sha256": stream.hexdigest().upper(),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps({
        "marker": MARKER,
        "ordered_leaf_assignments": total_assignments,
        "eligible_assignments": eligible_assignments,
        "negative": negative,
        "minimum": report["minimum"],
        "ordered_certificate_stream_sha256": stream.hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
