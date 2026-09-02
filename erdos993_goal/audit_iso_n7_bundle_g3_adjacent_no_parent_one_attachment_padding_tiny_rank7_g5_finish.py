#!/usr/bin/env python3
"""Tiny rooted padding audit for adjacent no-parent one attachment."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_n7_bundle_g3_adjacent_no_parent_one_attachment_padding_rank7_g5_finish import padding_coefficients


HERE = Path(__file__).resolve().parent
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ONE_ATTACHMENT_PADDING_TINY_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rows(graph, root):
    vertices = tuple(graph.nodes())
    I, J = {k: 0 for k in range(9)}, {k: 0 for k in range(8)}
    for mask in range(1 << len(vertices)):
        selected = tuple(vertices[i] for i in range(len(vertices)) if mask & (1 << i))
        if any(graph.has_edge(u, v) for i, u in enumerate(selected) for v in selected[i+1:]):
            continue
        I[len(selected)] += 1
        if root in selected and len(selected) <= 7:
            J[len(selected)] += 1
    return I, J


def main() -> None:
    h, I, J, coefficients = padding_coefficients()
    audit = []
    for order in (2, 3):
        for graph in nx.graph_atlas_g():
            if graph.number_of_nodes() != order or not nx.is_forest(graph):
                continue
            for root in graph.nodes():
                ir, jr = rows(graph, root)
                subs = {h: order, **{I[k]: ir[k] for k in range(2, 9)}, **{J[k]: jr[k] for k in range(1, 8)}}
                value = sp.expand(coefficients[1].subs(subs))
                assert not value.free_symbols
                audit.append({"order": order, "edges": sorted(tuple(sorted(e)) for e in graph.edges()), "root": root, "H1": int(value)})
    assert len(audit) == 13 and min(row["H1"] for row in audit) >= 0
    subs = {h: 1, **{I[k]: 0 for k in range(2, 9)}, J[1]: 1, **{J[k]: 0 for k in range(2, 8)}}
    one_root = {i: int(sp.expand(value.subs(subs))) for i, value in coefficients.items()}
    assert min(one_root.values()) >= 0
    output = HERE / "iso_n7_bundle_g3_adjacent_no_parent_one_attachment_padding_tiny_exact_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER, "rooted_rows": audit, "rooted_row_count": len(audit),
        "minimum_H1": min(row["H1"] for row in audit), "one_vertex_root_newton_coefficients": one_root,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "rooted_row_count": len(audit), "minimum_H1": report["minimum_H1"],
        "one_vertex_root_newton_coefficients": one_root,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
