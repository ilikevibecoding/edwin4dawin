#!/usr/bin/env python3
"""Independent audit of generated e=6 skeleton edge-group data."""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_e6_n28_skeleton_data_independent_audit_root_20260826.json"
EXPECTED = {
    "generate_rank8_delta2_e6_n28_skeleton_data_root.py":
        "7BDB81DE4971F8416F619D8F30CB8897BFF6DAF8B523FB2101BB5F36921FA696",
    "rank8_delta2_e6_n28_skeleton_data_root.rs":
        "3A040EBED79C47BD11E55712A2176C68D047E65E594BC9B0DD8C850F5E8540E5",
    "rank8_delta2_e6_n28_skeleton_data_root_20260826.json":
        "F8B97078683A1ADA815FAED259DB42D13F25E6F0B7068F98D33EFC0A733A231D",
    "audit_rank8_delta03_e6_skeleton_root_partition_root.py":
        "1A2BE02D0C2AD9AD45543BFAC2E7025D95AF198B82492272F8542C2FEDAAA939",
    "rank8_delta03_e6_skeleton_root_partition_independent_audit_20260825.json":
        "247DF3AC57F265839055CCF258BCC1E946A0470BAE83F2B79E61F1D8BD17E65F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def normalized_edge(u: int, v: int) -> tuple[int, int]:
    return (u, v) if u < v else (v, u)


def fixed_count(permutation: tuple[int, ...]) -> int:
    seen: set[int] = set()
    cycles = []
    for start in range(len(permutation)):
        if start in seen:
            continue
        current = start
        length = 0
        while current not in seen:
            seen.add(current)
            current = permutation[current]
            length += 1
        cycles.append(length)
    coefficients = [0] * 28
    coefficients[0] = 1
    for weight in cycles:
        updated = [0] * 28
        for subtotal, count in enumerate(coefficients):
            for value in range(1, (27 - subtotal) // weight + 1):
                updated[subtotal + value * weight] += count
        coefficients = updated
    return coefficients[27]


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    producer = json.loads(
        (HERE / "rank8_delta2_e6_n28_skeleton_data_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    text = (HERE / "rank8_delta2_e6_n28_skeleton_data_root.rs").read_text(
        encoding="utf-8"
    )
    rows = []
    for index, claimed in enumerate(producer["skeletons"], 1):
        edge_match = re.search(
            rf"static E6_SKELETON_{index:02d}_EDGES:[^=]+= \[(.*?)\];",
            text, re.DOTALL,
        )
        permutation_match = re.search(
            rf"static E6_SKELETON_{index:02d}_PERMUTATIONS:[^=]+= \[(.*?)\];",
            text, re.DOTALL,
        )
        assert edge_match and permutation_match
        edges = [
            (int(left), int(right))
            for left, right in re.findall(r"\((\d+),(\d+)\)", edge_match.group(1))
        ]
        assert [list(item) for item in edges] == claimed["edges"]
        width = len(edges)
        flat = [int(value) for value in re.findall(r"\d+", permutation_match.group(1))]
        assert len(flat) % width == 0
        emitted = {
            tuple(flat[start:start + width])
            for start in range(0, len(flat), width)
        }

        graph = nx.Graph()
        graph.add_edges_from(edges)
        edge_index = {item: position for position, item in enumerate(edges)}
        rebuilt = {
            tuple(
                edge_index[normalized_edge(mapping[u], mapping[v])]
                for u, v in edges
            )
            for mapping in nx.algorithms.isomorphism.GraphMatcher(
                graph, graph
            ).isomorphisms_iter()
        }
        assert emitted == rebuilt
        group_order = len(rebuilt)
        burnside_sum = sum(fixed_count(permutation) for permutation in rebuilt)
        assert burnside_sum % group_order == 0
        orbit_count = burnside_sum // group_order
        assert group_order == claimed["automorphism_group_order"]
        assert orbit_count == claimed["burnside_canonical_orbits"]
        assert math.comb(26, width - 1) == claimed["raw_positive_compositions_of_27"]
        rows.append({
            "index": index,
            "edge_count": width,
            "rebuilt_group_order": group_order,
            "burnside_orbits": orbit_count,
        })

    assert sum(row["burnside_orbits"] for row in rows) == 6_361_943
    payload = {
        "schema": "rank8-delta2-e6-n28-skeleton-data-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_E6_N28_SKELETON_AUTOMORPHISM_DATA_AUDIT",
        "verified": [
            "all Rust edge arrays match the independently audited skeleton report",
            "every emitted edge permutation is exactly induced by a graph automorphism",
            "no induced edge automorphism is missing",
            "Burnside counts are recomputed from permutation cycles",
            "the ten orbit counts sum independently to 6,361,943",
        ],
        "skeletons": rows,
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
