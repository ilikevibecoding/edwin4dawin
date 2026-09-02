#!/usr/bin/env python3
"""Exact literal scan of every all-short rooted e=2 cell at n>=31."""

from __future__ import annotations

import hashlib
import itertools
import json
import time
from collections import Counter
from pathlib import Path

from scan_rank8_delta23_e1_subdivided_claws_n23_n28 import evaluator
from scan_rank8_delta3_n28_e1_subdivided_claws import forest_poly


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta01_e2_all_short_n31_plus_exact_agent_20260823.json"
RANKS = (0, 1)
EXPECTED = {
    "assemble_rank8_delta01_e2_root_segment_partition_agent.py":
        "4D646E075BF758D34261354C14D981AD968C8C17D8221B5A1E768220D7416F67",
    "rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json":
        "EBAF3FED1DF2D7ACF82F4476CCC1E892131A6A8AF8B0DBFFA8BEBE689083426C",
    "audit_rank8_delta01_e2_root_segment_partition_agent.py":
        "1AF2FFB557C1B4283DC025FF50BB9B80A843DEBBA59CACDB120F98CA2BE31CBD",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json":
        "AD5AE4EEF6DEB576DD2B0EC46CAFA9EF8BC6AC2D4F08231C4837CFBC7991EC61",
    "scan_rank8_delta23_e1_subdivided_claws_n23_n28.py":
        "0CB38CA50A03E84E1C7CBC73A303EC2A5882689D7FF8E5440AB87A44075F4E59",
    "scan_rank8_delta3_n28_e1_subdivided_claws.py":
        "F7766DBA4DFE1FDD11A1857D0C45F8E5B563D44D50A7F226C9FBE274069E4E0A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_graph(lengths):
    left_a, left_b, bridge, right_a, right_b = lengths
    adjacency = [[], []]
    descriptors = {("branch", 0): 0, ("branch", 1): 1}

    def attach(start, length, prefix):
        previous = start
        for distance in range(1, length + 1):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            descriptors[(*prefix, distance)] = vertex
            previous = vertex

    attach(0, left_a, ("arm", 0, 0))
    attach(0, left_b, ("arm", 0, 1))
    previous = 0
    for distance in range(1, bridge):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        descriptors[("bridge", distance)] = vertex
        previous = vertex
    adjacency[previous].append(1)
    adjacency[1].append(previous)
    attach(1, right_a, ("arm", 1, 0))
    attach(1, right_b, ("arm", 1, 1))
    assert len(adjacency) == 1 + sum(lengths) == len(descriptors)
    return adjacency, descriptors


def cells():
    arms = range(1, 7)
    gaps = range(0, 7)
    bridges = range(1, 8)
    pairs = tuple(itertools.combinations_with_replacement(arms, 2))

    for left in pairs:
        for right in pairs:
            for bridge in bridges:
                order = 1 + sum(left) + sum(right) + bridge
                if order >= 31:
                    yield "branch", (left, right, bridge), (*left, bridge, *right), ("branch", 0), order

    for near, tail, sibling, far, bridge in itertools.product(gaps, gaps, arms, pairs, bridges):
        selected = near + tail + 1
        order = 2 + near + tail + sibling + sum(far) + bridge
        if order >= 31:
            yield (
                "pendant", (near, tail, sibling, far, bridge),
                (selected, sibling, bridge, *far), ("arm", 0, 0, near + 1), order,
            )

    modules = tuple((gap, pair) for gap in gaps for pair in pairs)
    for left, right in itertools.combinations_with_replacement(modules, 2):
        bridge = left[0] + right[0] + 2
        order = 3 + left[0] + right[0] + sum(left[1]) + sum(right[1])
        if order >= 31:
            yield (
                "bridge_internal", (left, right), (*left[1], bridge, *right[1]),
                ("bridge", left[0] + 1), order,
            )


def canonical_line(root_type, key, order, values):
    return json.dumps(
        [root_type, key, order, values[0], values[1]],
        separators=(",", ":"), sort_keys=False,
    )


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    partition = json.loads((HERE / "rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json").read_text())
    expected_root_counts = {
        name: partition["roots"][name]["all_short_target_n31_plus_points"]
        for name in ("branch", "pendant", "bridge_internal")
    }

    started = time.perf_counter()
    evaluators = {
        order: {rank: evaluator(rank, order)[0] for rank in RANKS}
        for order in range(31, 40)
    }
    rows = {
        name: {
            "cells": 0, "orders": Counter(),
            "ranks": {str(rank): {"negative": 0, "zero": 0, "positive": 0, "minimum": None, "witness": None} for rank in RANKS},
        }
        for name in expected_root_counts
    }
    lines = []
    for root_type, key, lengths, descriptor, order in cells():
        adjacency, descriptors = build_graph(lengths)
        vertex = descriptors[descriptor]
        core = forest_poly(adjacency)
        deleted = forest_poly(adjacency, vertex)
        inputs = (*core[3:9], deleted[6], deleted[7])
        values = tuple(evaluators[order][rank](inputs) for rank in RANKS)
        row = rows[root_type]
        row["cells"] += 1
        row["orders"][order] += 1
        for rank, value in zip(RANKS, values):
            stats = row["ranks"][str(rank)]
            label = "negative" if value < 0 else "zero" if value == 0 else "positive"
            stats[label] += 1
            if stats["minimum"] is None or value < stats["minimum"]:
                stats["minimum"] = value
                stats["witness"] = {"key": key, "lengths": lengths, "root_descriptor": descriptor, "order": order, "value": value}
        lines.append(canonical_line(root_type, key, order, values))

    assert {name: row["cells"] for name, row in rows.items()} == expected_root_counts
    for row in rows.values():
        for stats in row["ranks"].values():
            assert stats["negative"] == stats["zero"] == 0
            assert stats["positive"] == row["cells"] and stats["minimum"] > 0
        row["orders"] = {str(k): v for k, v in sorted(row["orders"].items())}
    stream = hashlib.sha256(("\n".join(sorted(lines)) + "\n").encode()).hexdigest().upper()

    payload = {
        "schema": "rank8-delta01-e2-all-short-n31-plus-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E2_ALL_SHORT_N31_PLUS",
        "theorem": "For every rooted e=2 double claw whose four arms, direct bridge/root gaps, and root split segments are all short, at every possible order n>=31, Delta0>0 and Delta1>0.",
        "state_scope": "arms 1..6; direct bridge 1..7; root-split near/tail or bridge gaps 0..6",
        "roots": rows,
        "totals": {"cells": sum(row["cells"] for row in rows.values()), "rank_cells": 2 * sum(row["cells"] for row in rows.values())},
        "literal_value_stream_sha256": stream,
        "immutable_input_hashes": actual,
        "runtime_seconds": time.perf_counter() - started,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This closes only the finite all-short n>=31 endpoint. Mixed rays and the separate connected e>=4 layer are not inferred.",
    }
    assert payload["totals"] == {"cells": 2412, "rank_cells": 4824}
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TOTALS", payload["totals"])
    print("STREAM", stream)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
