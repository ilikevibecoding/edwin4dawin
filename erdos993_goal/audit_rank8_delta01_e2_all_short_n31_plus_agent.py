#!/usr/bin/env python3
"""Independent literal-tree audit of all 2,412 all-short e=2 root cells."""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23_independent import delta0, delta1, forest_poly


HERE = Path(__file__).resolve().parent
PRIMARY_SOURCE = HERE / "scan_rank8_delta01_e2_all_short_n31_plus_agent.py"
PRIMARY_REPORT = HERE / "rank8_delta01_e2_all_short_n31_plus_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta01_e2_all_short_n31_plus_independent_audit_agent_20260823.json"
EXPECTED = {
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json":
        "AD5AE4EEF6DEB576DD2B0EC46CAFA9EF8BC6AC2D4F08231C4837CFBC7991EC61",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add_path(adjacency, start, length):
    previous = start
    vertices = []
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        vertices.append(vertex)
        previous = vertex
    return previous, vertices


def literal_tree(lengths):
    # Independent numbering: create the complete central bridge first.  Its
    # final vertex is the right branch; append the four pendant arms afterward.
    a, b, bridge, c, d = lengths
    adjacency = [[]]
    right, central = add_path(adjacency, 0, bridge)
    _, arm_a = add_path(adjacency, 0, a)
    _, arm_b = add_path(adjacency, 0, b)
    _, arm_c = add_path(adjacency, right, c)
    _, arm_d = add_path(adjacency, right, d)
    assert len(adjacency) == 1 + sum(lengths)
    return adjacency, {"left": 0, "right": right, "bridge": central[:-1], "arms": (arm_a, arm_b, arm_c, arm_d)}


def cells():
    arms = range(1, 7)
    gaps = range(0, 7)
    bridges = range(1, 8)
    pairs = tuple(itertools.combinations_with_replacement(arms, 2))
    for left, right, bridge in itertools.product(pairs, pairs, bridges):
        order = 1 + sum(left) + sum(right) + bridge
        if order >= 31:
            yield "branch", (left, right, bridge), (*left, bridge, *right), ("left", 0), order
    for near, tail, sibling, far, bridge in itertools.product(gaps, gaps, arms, pairs, bridges):
        order = 2 + near + tail + sibling + sum(far) + bridge
        if order >= 31:
            yield "pendant", (near, tail, sibling, far, bridge), (near + tail + 1, sibling, bridge, *far), ("arm", near), order
    modules = tuple((gap, pair) for gap in gaps for pair in pairs)
    for left, right in itertools.combinations_with_replacement(modules, 2):
        order = 3 + left[0] + right[0] + sum(left[1]) + sum(right[1])
        if order >= 31:
            yield "bridge_internal", (left, right), (*left[1], left[0] + right[0] + 2, *right[1]), ("bridge", left[0]), order


def canonical_line(root_type, key, order, values):
    return json.dumps([root_type, key, order, values[0], values[1]], separators=(",", ":"), sort_keys=False)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA01_E2_ALL_SHORT_N31_PLUS"

    counts = Counter()
    order_counts = {name: Counter() for name in ("branch", "pendant", "bridge_internal")}
    minima = {name: [None, None] for name in order_counts}
    lines = []
    for root_type, key, lengths, locator, order in cells():
        adjacency, metadata = literal_tree(lengths)
        if root_type == "branch":
            root = metadata["left"]
        elif root_type == "pendant":
            root = metadata["arms"][0][locator[1]]
        else:
            root = metadata["bridge"][locator[1]]
        core = forest_poly(adjacency)
        deleted = forest_poly(adjacency, root)
        values = (delta0(core, deleted), delta1(core, deleted))
        assert values[0] > 0 and values[1] > 0
        counts[root_type] += 1
        order_counts[root_type][order] += 1
        for rank, value in enumerate(values):
            if minima[root_type][rank] is None or value < minima[root_type][rank]:
                minima[root_type][rank] = value
        lines.append(canonical_line(root_type, key, order, values))

    stream = hashlib.sha256(("\n".join(sorted(lines)) + "\n").encode()).hexdigest().upper()
    assert dict(counts) == {name: primary["roots"][name]["cells"] for name in counts}
    assert {name: {str(k): v for k, v in sorted(row.items())} for name, row in order_counts.items()} == {
        name: primary["roots"][name]["orders"] for name in order_counts
    }
    assert {
        name: minima[name] for name in minima
    } == {
        name: [primary["roots"][name]["ranks"][str(rank)]["minimum"] for rank in (0, 1)]
        for name in minima
    }
    assert stream == primary["literal_value_stream_sha256"]

    payload = {
        "schema": "rank8-delta01-e2-all-short-n31-plus-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA01_E2_ALL_SHORT_N31_PLUS_AUDIT",
        "method": "independent bridge-first literal tree numbering, independent rooted forest DP, and sealed expanded Delta0/Delta1 identities",
        "cells_rebuilt": sum(counts.values()),
        "rank_values_rebuilt": 2 * sum(counts.values()),
        "root_counts": dict(counts),
        "minimum_values": {name: {str(rank): minima[name][rank] for rank in (0, 1)} for name in minima},
        "literal_value_stream_sha256": stream,
        "primary_source_sha256": sha256(PRIMARY_SOURCE),
        "primary_report_sha256": sha256(PRIMARY_REPORT),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit of the finite all-short endpoint only; no mixed or e>=4 claim.",
    }
    assert payload["cells_rebuilt"] == 2412 and payload["rank_values_rebuilt"] == 4824
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS", payload["cells_rebuilt"], "STREAM", stream)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
