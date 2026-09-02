#!/usr/bin/env python3
"""Exact emptiness certificate for four singleton-ordinary g1 branches.

The branches require the selected edge p-v, an unmarked common neighbour of
p,u, and an unmarked common neighbour of u,v.  If the two common centres are
distinct their five required edges form a 5-cycle; if they coalesce, the
selected edge p-v and the two incident centre edges form a triangle.  Hence
neither realization is a forest.

This source also reconstructs the canonical branch list and asserts that the
four reported indices are exactly all endpoint refinements of this incidence
pattern.  It proves emptiness only; it does not assert any coefficient sign.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_batch_g1_bernstein import (
    branch_key,
    canonical_branches,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_bundle_g1_singleton_ordinary_empty_cycle_branches_exact_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G1_SINGLETON_ORDINARY_EMPTY_CYCLE_BRANCHES_G1_BERNSTEIN"
BATCH_SOURCE = "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_batch_g1_bernstein.py"
SIMPLEX_SOURCE = "probe_exact_iso_n5_bundle_g1_singleton_ordinary_strong_simplex_g1_bernstein.py"


def contains_cycle(vertices, edges) -> bool:
    """Return whether the finite undirected graph has a cycle, via DSU."""
    parent = {vertex: vertex for vertex in vertices}

    def find(vertex):
        while parent[vertex] != vertex:
            parent[vertex] = parent[parent[vertex]]
            vertex = parent[vertex]
        return vertex

    for left, right in edges:
        left_root, right_root = find(left), find(right)
        if left_root == right_root:
            return True
        parent[left_root] = right_root
    return False


def target_pattern(branch) -> bool:
    (
        degrees, adjacency, common, endpoints, uv_common, parent_state,
        positive_parent_interval,
    ) = branch
    return (
        degrees == (1, 1, 1)
        and adjacency == (0, 0, 1)
        and common == (1, 0)
        and endpoints in (("L", "L"), ("L", "U"), ("U", "L"), ("U", "U"))
        and uv_common == 1
        and parent_state == "P"
        and positive_parent_interval == "full"
    )


def main() -> None:
    # Distinct common centres: c is common to p,u and d is common to u,v.
    distinct_vertices = ("u", "v", "p", "c", "d")
    distinct_edges = (
        ("p", "v"), ("v", "d"), ("d", "u"),
        ("u", "c"), ("c", "p"),
    )
    assert len(set(distinct_edges)) == 5
    assert contains_cycle(distinct_vertices, distinct_edges)

    # Coalesced common centre: c is adjacent to p,u,v.  Together with p-v
    # this contains the triangle p-v-c-p (the extra c-u edge is harmless to
    # the assertion but is included because the full incidence requires it).
    coalesced_vertices = ("u", "v", "p", "c")
    coalesced_edges = (
        ("p", "v"), ("p", "c"), ("u", "c"), ("v", "c"),
    )
    assert contains_cycle(coalesced_vertices, coalesced_edges)

    branches = canonical_branches()
    target_rows = [
        {"index": index, "branch": branch_key(branch)}
        for index, branch in enumerate(branches)
        if target_pattern(branch)
    ]
    expected_rows = [
        {"index": 97, "branch": "111/001/10/LL/1/P/full"},
        {"index": 99, "branch": "111/001/10/LU/1/P/full"},
        {"index": 102, "branch": "111/001/10/UL/1/P/full"},
        {"index": 104, "branch": "111/001/10/UU/1/P/full"},
    ]
    assert target_rows == expected_rows

    report = {
        "marker": MARKER,
        "canonical_branch_total_before_empty_pruning": len(branches),
        "empty_branch_count": len(target_rows),
        "empty_rows": target_rows,
        "distinct_witness_graph": {
            "vertices": list(distinct_vertices),
            "edges": [list(edge) for edge in distinct_edges],
            "cycle": True,
            "cycle_order": ["p", "v", "d", "u", "c", "p"],
        },
        "coalesced_witness_graph": {
            "vertices": list(coalesced_vertices),
            "edges": [list(edge) for edge in coalesced_edges],
            "cycle": True,
            "cycle_order": ["p", "v", "c", "p"],
        },
        "scope": (
            "Exact structural emptiness of the four displayed canonical "
            "singleton-ordinary g1 branches only. No coefficient-sign, "
            "all-mode, all-N5, or Problem 993 claim."
        ),
        "dependencies_sha256": {
            BATCH_SOURCE: hashlib.sha256((HERE / BATCH_SOURCE).read_bytes()).hexdigest().upper(),
            SIMPLEX_SOURCE: hashlib.sha256((HERE / SIMPLEX_SOURCE).read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    report_sha256 = hashlib.sha256(raw.encode()).hexdigest().upper()
    print(json.dumps({
        "marker": MARKER,
        "output": OUTPUT.name,
        "empty_branch_count": len(target_rows),
        "source_sha256": report["source_sha256"],
        "report_sha256": report_sha256,
    }, indent=2))
    print(MARKER)


if __name__ == "__main__":
    main()
