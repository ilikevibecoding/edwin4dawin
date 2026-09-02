#!/usr/bin/env python3
"""Independent literal-tree audit of all 2,412 all-short e=2 Delta3 cells."""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23_independent import delta3, forest_poly


ROOT = Path(__file__).resolve().parent
PRIMARY_SOURCE = ROOT / "scan_rank8_delta3_e2_all_short_n31_plus_root.py"
PRIMARY_REPORT = ROOT / "rank8_delta3_e2_all_short_n31_plus_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta3_e2_all_short_n31_plus_independent_audit_root_20260823.json"
EXPECTED = {
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json":
        "AD5AE4EEF6DEB576DD2B0EC46CAFA9EF8BC6AC2D4F08231C4837CFBC7991EC61",
    PRIMARY_SOURCE.name:
        "A4411F6CCA984A5C6639F5349D22434E02CC37CCFBFBF78DD4F56A60B226EF3E",
    PRIMARY_REPORT.name:
        "1E666AD8D5225078FDACBFE7A625D1BCBF60B259B8E39D5CFB62E3738ADF8482",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


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
    left_a, left_b, bridge, right_a, right_b = lengths
    adjacency = [[]]
    right, central = add_path(adjacency, 0, bridge)
    _, arm_a = add_path(adjacency, 0, left_a)
    _, arm_b = add_path(adjacency, 0, left_b)
    _, arm_c = add_path(adjacency, right, right_a)
    _, arm_d = add_path(adjacency, right, right_b)
    assert len(adjacency) == 1 + sum(lengths)
    return adjacency, {
        "left": 0,
        "right": right,
        "bridge": central[:-1],
        "arms": (arm_a, arm_b, arm_c, arm_d),
    }


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
            yield (
                "pendant", (near, tail, sibling, far, bridge),
                (near + tail + 1, sibling, bridge, *far), ("arm", near), order,
            )
    modules = tuple((gap, pair) for gap in gaps for pair in pairs)
    for left, right in itertools.combinations_with_replacement(modules, 2):
        order = 3 + left[0] + right[0] + sum(left[1]) + sum(right[1])
        if order >= 31:
            yield (
                "bridge_internal", (left, right),
                (*left[1], left[0] + right[0] + 2, *right[1]),
                ("bridge", left[0]), order,
            )


def canonical_line(root_type, key, order, value):
    return json.dumps([root_type, key, order, value], separators=(",", ":"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA3_E2_ALL_SHORT_N31_PLUS"

    counts = Counter()
    order_counts = {
        name: Counter() for name in ("branch", "pendant", "bridge_internal")
    }
    minima = {name: None for name in order_counts}
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
        value = delta3(core, deleted)
        assert value > 0
        counts[root_type] += 1
        order_counts[root_type][order] += 1
        minima[root_type] = value if minima[root_type] is None else min(minima[root_type], value)
        lines.append(canonical_line(root_type, key, order, value))

    stream = hashlib.sha256(
        ("\n".join(sorted(lines)) + "\n").encode()
    ).hexdigest().upper()
    assert dict(counts) == {
        name: primary["roots"][name]["cells"] for name in counts
    }
    assert {
        name: {str(key): value for key, value in sorted(row.items())}
        for name, row in order_counts.items()
    } == {
        name: primary["roots"][name]["orders"] for name in order_counts
    }
    assert minima == {
        name: primary["roots"][name]["minimum"] for name in minima
    }
    assert stream == primary["literal_value_stream_sha256"]

    payload = {
        "schema": "rank8-delta3-e2-all-short-n31-plus-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA3_E2_ALL_SHORT_N31_PLUS_AUDIT",
        "method": "independent bridge-first tree numbering, independent rooted forest DP, and sealed expanded Delta3 identity",
        "cells_rebuilt": sum(counts.values()),
        "root_counts": dict(counts),
        "minimum_values": minima,
        "literal_value_stream_sha256": stream,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit of the all-short n>=31 e=2 Delta3 endpoint only.",
    }
    assert payload["cells_rebuilt"] == 2412
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS", payload["cells_rebuilt"], "STREAM", stream)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
