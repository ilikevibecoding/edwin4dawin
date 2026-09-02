#!/usr/bin/env python3
"""Independent literal-DP audit of the n=27 cubic edge-extension census."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from audit_rank8_delta01_e3_cubic_skeleton_n27_n36_agent import (
    canonical,
    compositions,
)
from audit_rank8_delta01_e3_quartic_stars_n27_n36_agent import (
    deltas,
    forest_polynomial,
)


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta01_e3_cubic_edge_extension_n27_exact_agent_20260822.json"
OUTPUT = ROOT / "rank8_delta01_e3_cubic_edge_extension_n27_independent_audit_agent_20260822.json"
EXPECTED = {
    "verify_rank8_delta01_e3_cubic_skeleton_order_agent.rs":
        "8C964E7AC0A760702AFED818481B8560EDCAAC865C9A81239FB0750772EBEA12",
    "scout_rank8_delta01_e3_cubic_edge_extension_order_agent.rs":
        "3063B8D2A9459242F2A689011E058ADE56E84BF1E006A6A1A2BBE8EA3FA67CB2",
    "verify_rank8_delta01_e3_cubic_edge_extension_n27_agent.py":
        "583289A14D89BC3A95A4D4179CE3AF18CF1626230BF052F1A8F9EBCDC0DB6904",
    PRIMARY.name:
        "D8E6285399717636E873B69E5A70C7796D6013ED57D27CA7627CB80A94762771",
    "audit_rank8_delta01_e3_cubic_skeleton_n27_n36_agent.py":
        "F40190243920DBDFD7C0336D60E65A7F887AB6DC4EC103790B17A25FA1492B66",
    "audit_rank8_delta01_e3_quartic_stars_n27_n36_agent.py":
        "94A14B56E224EEF5136B3756AD0C4652F0FECC1A68BB46E932FB3B949F56C201",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def subdivision_with_keys(lengths):
    edges = ((0, 1), (1, 2), (0, 3), (0, 4), (1, 5), (2, 6), (2, 7))
    adjacency = [[] for _ in range(1 + sum(lengths))]
    keys = [("branch", vertex) for vertex in range(8)]
    next_vertex = 8
    for edge_index, ((left, right), length) in enumerate(zip(edges, lengths)):
        previous = left
        for step in range(1, length):
            vertex = next_vertex
            next_vertex += 1
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
            keys.append(("edge", edge_index, step))
        adjacency[previous].append(right)
        adjacency[right].append(previous)
    assert next_vertex == len(adjacency) == len(keys)
    return adjacency, keys


def rooted_values(lengths, key):
    adjacency, keys = subdivision_with_keys(lengths)
    root = keys.index(key)
    return deltas(forest_polynomial(adjacency), forest_polynomial(adjacency, root))


def parse_key(text: str):
    fields = text.split(":")
    if fields[0] == "branch":
        return "branch", int(fields[1])
    assert fields[0] == "edge" and fields[2] == "step"
    return "edge", int(fields[1]), int(fields[3])


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_ALL_EDGE_EXTENSIONS_N27_TO_N28"
    row = primary["result"]
    core_count = sum(1 for lengths in compositions(26, 7) if canonical(lengths))
    assert core_count == row["trees"] == 28448
    assert row["old_root_comparisons"] == core_count * 7 * 27
    assert row["inserted_roots"] == core_count * 7
    replays = []
    for rank in (0, 1):
        witness = row[f"witness_increment{rank}"]
        old_lengths = tuple(witness["lengths"])
        new_lengths = list(old_lengths)
        new_lengths[witness["edge"]] += 1
        root_key = parse_key(witness["root"])
        old_value = rooted_values(old_lengths, root_key)[rank]
        new_value = rooted_values(tuple(new_lengths), root_key)[rank]
        increment = new_value - old_value
        assert str(old_value) == witness["old"]
        assert str(new_value) == witness["new"]
        assert str(increment) == row[f"minimum_increment{rank}"]
        assert increment > 0
        replays.append({
            "kind": "old_root_increment",
            "rank": rank,
            "old_lengths": list(old_lengths),
            "extended_edge": witness["edge"],
            "root": witness["root"],
            "old": old_value,
            "new": new_value,
            "increment": increment,
        })

        witness = row[f"witness_inserted{rank}"]
        old_lengths = tuple(witness["lengths"])
        edge = witness["edge"]
        inserted_step = old_lengths[edge]
        new_lengths = list(old_lengths)
        new_lengths[edge] += 1
        value = rooted_values(tuple(new_lengths), ("edge", edge, inserted_step))[rank]
        assert str(value) == witness["value"] == row[f"minimum_inserted{rank}"]
        assert value > 0
        replays.append({
            "kind": "inserted_root_value",
            "rank": rank,
            "old_lengths": list(old_lengths),
            "extended_edge": edge,
            "value": value,
        })

    payload = {
        "schema": "rank8-delta01-e3-cubic-edge-extension-n27-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_EDGE_EXTENSION_N27_AUDIT",
        "methods": [
            "independent exact automorphism-quotiented composition count",
            "independent Python tree DP and separately transcribed Delta formulas for all four minima",
            "descriptor-preserving old-root mapping and explicit inserted-root reconstruction",
        ],
        "canonical_sources": core_count,
        "old_root_comparisons": row["old_root_comparisons"],
        "inserted_roots": row["inserted_roots"],
        "minimum_replays": replays,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Finite n=27 to n=28 audit only; the all-order induction step remains open.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
