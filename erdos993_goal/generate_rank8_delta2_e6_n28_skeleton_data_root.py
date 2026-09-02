#!/usr/bin/env python3
"""Generate immutable Rust data for the exact n=28, e=6 Delta2 census."""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

import networkx as nx

import classify_rank8_delta03_e6_skeleton_root_partition_root as partition


HERE = Path(__file__).resolve().parent
RUST_OUTPUT = HERE / "rank8_delta2_e6_n28_skeleton_data_root.rs"
REPORT_OUTPUT = HERE / "rank8_delta2_e6_n28_skeleton_data_root_20260826.json"
EXPECTED = {
    "classify_rank8_delta03_e6_skeleton_root_partition_root.py":
        "2D09166564BD9D9286781CB17E6F7387D1AF3F57BB03A761ED2548B9EE76077A",
    "rank8_delta03_e6_skeleton_root_partition_exact_20260825.json":
        "B8D2D160F679361AED1D337B9E814DA6B985ACCD19434DF629887DE0E7AE5307",
}
EXPECTED_GROUPS = [120, 72, 48, 12, 48, 8, 128, 8, 16, 16]
EXPECTED_ORBITS = [255, 6373, 160417, 533796, 116356,
                   677677, 219848, 2015735, 1295723, 1335763]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def edge(u: int, v: int) -> tuple[int, int]:
    return tuple(sorted((u, v)))


def edge_permutations(graph: nx.Graph) -> list[tuple[int, ...]]:
    edges = sorted(edge(u, v) for u, v in graph.edges())
    index = {item: position for position, item in enumerate(edges)}
    rows = {
        tuple(index[edge(mapping[u], mapping[v])] for u, v in edges)
        for mapping in nx.algorithms.isomorphism.GraphMatcher(
            graph, graph
        ).isomorphisms_iter()
    }
    return sorted(rows)


def compose(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(left[right[index]] for index in range(len(left)))


def cycle_lengths(permutation: tuple[int, ...]) -> list[int]:
    seen: set[int] = set()
    out = []
    for start in range(len(permutation)):
        if start in seen:
            continue
        current = start
        length = 0
        while current not in seen:
            seen.add(current)
            current = permutation[current]
            length += 1
        out.append(length)
    return out


def fixed_positive_compositions(permutation: tuple[int, ...], total: int) -> int:
    dp = [0] * (total + 1)
    dp[0] = 1
    for weight in cycle_lengths(permutation):
        next_dp = [0] * (total + 1)
        for subtotal, count in enumerate(dp):
            if not count:
                continue
            for value in range(1, (total - subtotal) // weight + 1):
                next_dp[subtotal + weight * value] += count
        dp = next_dp
    return dp[total]


def rust_array(values: list[int], width: int = 24) -> str:
    lines = []
    for start in range(0, len(values), width):
        lines.append("    " + ",".join(map(str, values[start:start + width])) + ",")
    return "\n".join(lines)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    prior = json.loads(
        (HERE / "rank8_delta03_e6_skeleton_root_partition_exact_20260825.json")
        .read_text(encoding="utf-8")
    )
    assert prior["status"] == (
        "PASS_EXACT_E6_SUPPRESSED_SKELETON_AND_ROOT_LOCATION_PARTITION"
    )

    raw_rows = partition.enumerate_skeletons()
    assert len(raw_rows) == 10
    generated = [
        "// Generated exact data; do not edit by hand.",
        "// Producer: generate_rank8_delta2_e6_n28_skeleton_data_root.py",
        "",
        "struct E6SkeletonData {",
        "    name: &'static str,",
        "    skeleton_order: usize,",
        "    edges: &'static [(usize, usize)],",
        "    edge_permutations: &'static [u8],",
        "    raw_compositions: u64,",
        "    canonical_orbits: u64,",
        "}",
        "",
    ]
    report_rows = []
    for index, raw in enumerate(raw_rows, 1):
        graph: nx.Graph = raw["graph"]
        edges = sorted(edge(u, v) for u, v in graph.edges())
        permutations = edge_permutations(graph)
        width = len(edges)
        identity = tuple(range(width))
        assert identity in permutations
        assert len(permutations) == EXPECTED_GROUPS[index - 1]
        permutation_set = set(permutations)
        assert all(
            compose(left, right) in permutation_set
            for left in permutations for right in permutations
        )
        fixed_sum = sum(
            fixed_positive_compositions(permutation, 27)
            for permutation in permutations
        )
        assert fixed_sum % len(permutations) == 0
        canonical = fixed_sum // len(permutations)
        assert canonical == EXPECTED_ORBITS[index - 1]
        raw_compositions = math.comb(26, width - 1)

        prefix = f"E6_SKELETON_{index:02d}"
        edge_text = ",".join(f"({u},{v})" for u, v in edges)
        flat = [value for permutation in permutations for value in permutation]
        generated.extend([
            f"static {prefix}_EDGES: [(usize, usize); {width}] = [{edge_text}];",
            f"static {prefix}_PERMUTATIONS: [u8; {len(flat)}] = [",
            rust_array(flat),
            "];",
            "",
        ])
        report_rows.append({
            "name": f"e6_skeleton_{index:02d}",
            "skeleton_order": graph.number_of_nodes(),
            "edges": [list(item) for item in edges],
            "edge_count": width,
            "automorphism_group_order": len(permutations),
            "raw_positive_compositions_of_27": raw_compositions,
            "burnside_canonical_orbits": canonical,
            "burnside_fixed_sum": fixed_sum,
        })

    generated.append("static E6_SKELETONS: [E6SkeletonData; 10] = [")
    for index, row in enumerate(report_rows, 1):
        prefix = f"E6_SKELETON_{index:02d}"
        generated.append(
            "    E6SkeletonData { "
            f"name: \"{row['name']}\", "
            f"skeleton_order: {row['skeleton_order']}, "
            f"edges: &{prefix}_EDGES, "
            f"edge_permutations: &{prefix}_PERMUTATIONS, "
            f"raw_compositions: {row['raw_positive_compositions_of_27']}, "
            f"canonical_orbits: {row['burnside_canonical_orbits']} "
            "},"
        )
    generated.extend(["];"])
    rust_text = "\n".join(generated) + "\n"
    temporary_rust = RUST_OUTPUT.with_suffix(RUST_OUTPUT.suffix + ".tmp")
    temporary_rust.write_text(rust_text, encoding="utf-8")
    os.replace(temporary_rust, RUST_OUTPUT)

    payload = {
        "schema": "rank8-delta2-e6-n28-skeleton-data-root-v1",
        "status": "PASS_EXACT_E6_N28_SKELETON_AUTOMORPHISM_DATA",
        "order": 28,
        "degree_surplus": 6,
        "subdivision_equation": "sum(edge_lengths)=27 with every edge_length>=1",
        "skeletons": report_rows,
        "totals": {
            "skeletons": len(report_rows),
            "raw_subdivision_vectors": sum(
                row["raw_positive_compositions_of_27"] for row in report_rows
            ),
            "canonical_subdivision_orbits": sum(
                row["burnside_canonical_orbits"] for row in report_rows
            ),
        },
        "proof": (
            "Every order-28 degree-surplus-six tree is a positive subdivision "
            "of exactly one of the ten pinned suppressed skeletons. Vertex "
            "automorphisms induce the emitted edge-permutation groups. Burnside's "
            "lemma counts their orbits on positive edge-length vectors summing "
            "to 27."
        ),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "generated_rust_sha256": sha256(RUST_OUTPUT),
    }
    assert payload["totals"] == {
        "skeletons": 10,
        "raw_subdivision_vectors": 51_374_180,
        "canonical_subdivision_orbits": 6_361_943,
    }
    temporary_report = REPORT_OUTPUT.with_suffix(REPORT_OUTPUT.suffix + ".tmp")
    temporary_report.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary_report, REPORT_OUTPUT)
    print(payload["status"])
    print("TOTALS", payload["totals"])
    print("SOURCE", payload["source_sha256"])
    print("RUST", payload["generated_rust_sha256"])
    print("REPORT", sha256(REPORT_OUTPUT))


if __name__ == "__main__":
    main()
