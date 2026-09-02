#!/usr/bin/env python3
"""Exact tiny rooted-core audit for no-parent common0/sum1 G3 padding."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_n7_bundle_g3_sum1_no_parent_isolate_padding_safe_cap_rank7_g5_finish import (
    padding_coefficients,
)


HERE = Path(__file__).resolve().parent
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_NO_PARENT_PADDING_TINY_AUDIT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent_rows(graph: nx.Graph, root: int) -> tuple[dict[int, int], dict[int, int]]:
    vertices = tuple(graph.nodes())
    rows = {rank: 0 for rank in range(9)}
    rooted = {rank: 0 for rank in range(8)}
    for mask in range(1 << len(vertices)):
        selected = tuple(vertices[index] for index in range(len(vertices)) if mask & (1 << index))
        if any(graph.has_edge(u, v) for index, u in enumerate(selected) for v in selected[index + 1 :]):
            continue
        rank = len(selected)
        if rank <= 8:
            rows[rank] += 1
        if root in selected and rank <= 7:
            rooted[rank] += 1
    return rows, rooted


def rooted_forests(order: int):
    for graph in nx.graph_atlas_g():
        if graph.number_of_nodes() != order or not nx.is_forest(graph):
            continue
        for root in graph.nodes():
            yield graph, root


def main() -> None:
    h, I, J, coefficients = padding_coefficients()
    exact_rows = []
    for order in (2, 3):
        for graph, root in rooted_forests(order):
            rows, rooted = independent_rows(graph, root)
            substitutions = {h: order}
            substitutions.update({I[rank]: rows[rank] for rank in range(2, 9)})
            substitutions.update({J[rank]: rooted[rank] for rank in range(1, 8)})
            value = sp.expand(coefficients[1].subs(substitutions))
            assert not value.free_symbols
            exact_rows.append({
                "order": order,
                "edges": sorted(tuple(sorted(edge)) for edge in graph.edges()),
                "root": root,
                "H1": int(value),
            })
    assert exact_rows and min(row["H1"] for row in exact_rows) >= 0

    edgeless_substitutions = {h: 1}
    edgeless_substitutions.update({I[rank]: 0 for rank in range(2, 9)})
    edgeless_substitutions.update({J[1]: 1, **{J[rank]: 0 for rank in range(2, 8)}})
    edgeless_newton = {
        index: int(sp.expand(coefficient.subs(edgeless_substitutions)))
        for index, coefficient in coefficients.items()
    }
    assert min(edgeless_newton.values()) >= 0

    output = HERE / "iso_n7_bundle_g3_sum1_no_parent_padding_tiny_audit_exact_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "scope": "H1 for every rooted forest of order 2 or 3; all Newton coefficients for the one-vertex edgeless rooted core.",
        "rooted_rows": exact_rows,
        "rooted_row_count": len(exact_rows),
        "minimum_H1": min(row["H1"] for row in exact_rows),
        "one_vertex_edgeless_newton_coefficients": edgeless_newton,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "rooted_row_count": len(exact_rows),
        "minimum_H1": report["minimum_H1"],
        "one_vertex_edgeless_newton_coefficients": edgeless_newton,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
