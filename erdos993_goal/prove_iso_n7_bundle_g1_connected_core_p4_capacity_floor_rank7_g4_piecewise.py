#!/usr/bin/env python3
"""Exact degree-profile lower floor for induced P4s in a tree."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_connected_core_p4_capacity_floor_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_CONNECTED_CORE_P4_CAPACITY_FLOOR_"
    "RANK7_G4_PIECEWISE"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def capacity_floor(increments: tuple[int, ...]) -> int:
    """The proved profile floor for P4=sum_(uv in K)x_u*x_v."""
    order = sum(increments)+2
    core_order = len(increments)
    assert core_order >= 2

    # There are core_order-2 degree units above the mandatory degree one at
    # every core vertex.  Vertex v has x_v available slots, each of cost x_v-1.
    remaining = core_order-2
    slot_cost = 0
    for excess in sorted(increments):
        used = min(remaining, excess)
        slot_cost += used*(excess-1)
        remaining -= used
        if remaining == 0:
            break
    assert remaining == 0

    hub_weights = [excess-1 for excess in increments if excess >= 2]
    degree_two_core = increments.count(1)
    forced_hub_edges = max(0, len(hub_weights)-1-degree_two_core)
    pair_costs = sorted(
        left*right
        for index, left in enumerate(hub_weights)
        for right in hub_weights[index+1:]
    )
    return order-3+slot_cost+sum(pair_costs[:forced_hub_edges])


def actual_p4(core: nx.Graph, increments: tuple[int, ...]) -> int:
    return sum(increments[left]*increments[right] for left, right in core.edges())


def main() -> None:
    stream = hashlib.sha256()
    assignments = 0
    equality = 0
    minimum_slack = None

    # Independent bounded audit of every core tree through seven vertices and
    # every compatible x_v<=5 assignment.  The theorem itself is algebraic and
    # unbounded; this catches implementation and slot-order errors.
    for core_order in range(2, 8):
        for tree_index, core in enumerate(nx.nonisomorphic_trees(core_order)):
            # NetworkX's iteration order need not equal its integer labels;
            # actual_p4 indexes the assignment by label, so pin label order.
            assert set(core) == set(range(core_order))
            lower = tuple(
                max(1, core.degree(vertex)-1) for vertex in range(core_order)
            )
            ranges = [range(value, 6) for value in lower]
            for values in itertools.product(*ranges):
                increments = tuple(values)
                floor = capacity_floor(increments)
                actual = actual_p4(core, increments)
                slack = actual-floor
                assert slack >= 0
                record = (core_order, tree_index, increments, floor, actual, slack)
                stream.update((repr(record)+"\n").encode("ascii"))
                assignments += 1
                equality += slack == 0
                minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
    assert assignments == 618775
    assert equality == 1587
    assert minimum_slack == 0
    assert stream.hexdigest().upper() == (
        "B421C5BBAB0F073F7B04DC6EED3AD26F6A7AEFCCB92A438CA7A916C25DB0D216"
    )

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let W be a nonstar tree and K its nonleaf core. Put "
            "x_v=d_W(v)-1 and y_v=x_v-1. Then the number P4(W) of induced "
            "four-vertex paths is at least m-3 plus the cheapest |K|-2 "
            "capacity-slot costs y_v (x_v copies at v) plus the cheapest "
            "max(0,h-1-z) distinct hub-pair products y_u y_v, where h is "
            "the number of x_v>=2 core vertices and z the number with x_v=1."
        ),
        "exact_identity": (
            "P4=sum_(uv in E(K))x_u x_v = m-3 + "
            "sum_v(d_K(v)-1)y_v + sum_(uv in E(K))y_u y_v"
        ),
        "slot_floor": (
            "The integers d_K(v)-1 total |K|-2 and lie between 0 and x_v. "
            "Their weighted sum is therefore at least the cheapest |K|-2 "
            "members of the multiset containing x_v copies of y_v."
        ),
        "hub_edge_floor": (
            "K has h+z-1 edges. The z vertices with y=0 have degree at most "
            "two, so at most 2z edges touch them; hence at least h-1-z "
            "edges join two hubs. Their distinct pair products are at least "
            "the corresponding number of cheapest hub-pair products."
        ),
        "bounded_independent_audit": {
            "core_orders": [2, 7],
            "maximum_increment": 5,
            "compatible_assignments": assignments,
            "equality_assignments": equality,
            "minimum_slack": minimum_slack,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_gap_within_connected_tree_p4_floor_scope": None,
        "scope": (
            "Universal induced-P4 lower bound for a connected nonstar tree. "
            "It is a structural input, not by itself a G1 sign theorem."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "compatible_assignments": assignments,
        "equality_assignments": equality,
        "minimum_slack": minimum_slack,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "coverage_gap_within_connected_tree_p4_floor_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
