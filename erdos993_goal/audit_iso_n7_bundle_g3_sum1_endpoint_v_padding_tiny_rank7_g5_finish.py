#!/usr/bin/env python3
"""Exact tiny rooted-core audit for endpoint_v common0/sum1 G3 padding."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_n7_bundle_g3_sum1_endpoint_v_isolate_padding_safe_cap_rank7_g5_finish import padding_coefficients


HERE = Path(__file__).resolve().parent
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_V_PADDING_TINY_AUDIT_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent_rows(graph: nx.Graph, root: int):
    vertices = tuple(graph.nodes())
    rows = {rank: 0 for rank in range(9)}
    rooted = {rank: 0 for rank in range(8)}
    for mask in range(1 << len(vertices)):
        selected = tuple(vertices[index] for index in range(len(vertices)) if mask & (1 << index))
        if any(graph.has_edge(u, v) for index, u in enumerate(selected) for v in selected[index+1:]):
            continue
        rows[len(selected)] += 1
        if root in selected and len(selected) <= 7:
            rooted[len(selected)] += 1
    return rows, rooted


def main() -> None:
    h, I, J, coefficients = padding_coefficients()
    exact_rows = []
    for order in (2, 3):
        for graph in nx.graph_atlas_g():
            if graph.number_of_nodes() != order or not nx.is_forest(graph):
                continue
            for root in graph.nodes():
                rows, rooted = independent_rows(graph, root)
                substitutions = {h: order}
                substitutions.update({I[rank]: rows[rank] for rank in range(2, 9)})
                substitutions.update({J[rank]: rooted[rank] for rank in range(1, 8)})
                value = sp.expand(coefficients[1].subs(substitutions))
                assert not value.free_symbols
                exact_rows.append({
                    "order": order, "edges": sorted(tuple(sorted(edge)) for edge in graph.edges()),
                    "root": root, "H1": int(value),
                })
    assert len(exact_rows) == 13 and min(row["H1"] for row in exact_rows) >= 0
    substitutions = {h: 1}
    substitutions.update({I[rank]: 0 for rank in range(2, 9)})
    substitutions.update({J[1]: 1, **{J[rank]: 0 for rank in range(2, 8)}})
    edgeless = {index: int(sp.expand(value.subs(substitutions))) for index, value in coefficients.items()}
    assert min(edgeless.values()) >= 0
    output = HERE / "iso_n7_bundle_g3_sum1_endpoint_v_padding_tiny_audit_exact_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER, "rooted_rows": exact_rows, "rooted_row_count": len(exact_rows),
        "minimum_H1": min(row["H1"] for row in exact_rows),
        "one_vertex_edgeless_newton_coefficients": edgeless,
        "scope": "endpoint_v H1 on rooted forests h=2,3 and every Newton row on h=1.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "rooted_row_count": len(exact_rows),
        "minimum_H1": report["minimum_H1"], "one_vertex_edgeless_newton_coefficients": edgeless,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
