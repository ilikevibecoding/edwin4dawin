#!/usr/bin/env python3
"""Exact finite probe of the isolate gap's adjacent/curvature split.

For the symmetric bivariate nested kernel N and the derivative-free form R,

  [z^r w^r]((z+w)N-(z-w)^2 R/2)
    = 2[z^(r-1)w^r]N + [z^(r-1)w^(r-1)]R
      - [z^(r-2)w^r]R.

The left side is the exact isolate third-leaf recurrence gap.  This census
separates the adjacent N term from the R-curvature term on finite forests.
It is evidence only; no all-order positivity is claimed.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_nested_near_diagonal_root import nested2


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_isolate_adjacent_coupling_probe_root_20260829.json"


def at(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def rcoefficient(rows: tuple[tuple[int, ...], ...], a: int, b: int) -> int:
    """Coefficient [z^a w^b] of R(E,U,V,W)."""
    E, U, V, W = rows
    return (
        at(W, a - 2) * at(E, b)
        + at(E, a) * at(W, b - 2)
        + at(V, a - 1) * at(U, b - 1)
        + at(U, a - 1) * at(V, b - 1)
    )


def split_curvature(rows: tuple[tuple[int, ...], ...], r: int) -> tuple[int, int]:
    E, U, V, W = rows
    ew = (
        2 * at(E, r - 1) * at(W, r - 3)
        - at(E, r) * at(W, r - 4)
        - at(E, r - 2) * at(W, r - 2)
    )
    uv = (
        2 * at(U, r - 2) * at(V, r - 2)
        - at(U, r - 1) * at(V, r - 3)
        - at(U, r - 3) * at(V, r - 1)
    )
    return ew, uv


def split_j(rows: tuple[tuple[int, ...], ...], r: int) -> tuple[int, int]:
    E, U, V, W = rows
    ew = (
        at(W, r - 4) * at(E, r - 1)
        + at(E, r - 2) * at(W, r - 3)
        - at(W, r - 5) * at(E, r)
        - at(E, r - 3) * at(W, r - 2)
    )
    uv = (
        at(V, r - 3) * at(U, r - 2)
        + at(U, r - 3) * at(V, r - 2)
        - at(V, r - 4) * at(U, r - 1)
        - at(U, r - 4) * at(V, r - 1)
    )
    return ew, uv


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(
        nx.convert_node_labels_to_integers(graph), header=False
    ).decode().strip()


def update(bucket: dict, value: int, witness: dict) -> None:
    bucket["checks"] += 1
    if value < 0:
        bucket["negative"] += 1
    if value == 0:
        bucket["zero"] += 1
    if bucket["minimum"] is None or value < bucket["minimum"]["value"]:
        bucket["minimum"] = {"value": value, **witness}


def audit(graph: nx.Graph, report: dict) -> None:
    vertices = tuple(graph)
    cache: dict[frozenset[int], tuple[int, ...]] = {}

    def polynomial(deleted: frozenset[int]) -> tuple[int, ...]:
        if deleted not in cache:
            reduced = graph.copy()
            reduced.remove_nodes_from(deleted)
            cache[deleted] = tuple(poly_forest(reduced))
        return cache[deleted]

    E = polynomial(frozenset())
    for index, u in enumerate(vertices):
        for v in vertices[index + 1 :]:
            rows = (
                E,
                polynomial(frozenset((u,))),
                polynomial(frozenset((v,))),
                polynomial(frozenset((u, v))),
            )
            # After adjoining one isolate, the maximum supported rank is
            # alpha(E)+1=len(E); omit the next identically-zero padding rank.
            for r in range(2, len(E) + 1):
                # nested2 returns twice the coefficient of N, so this is
                # exactly M_r=2[z^(r-1)w^r]N.
                adjacent = nested2(rows, r - 1, r)
                curvature = (
                    rcoefficient(rows, r - 1, r - 1)
                    - rcoefficient(rows, r - 2, r)
                )
                curvature_ew, curvature_uv = split_curvature(rows, r)
                j_ew, j_uv = split_j(rows, r)
                assert curvature == curvature_ew + curvature_uv
                gap = adjacent + curvature
                witness = {
                    "n": len(graph),
                    "r": r,
                    "u": int(u),
                    "v": int(v),
                    "graph6": graph6(graph),
                    "polynomial": E,
                }
                update(report["adjacent"], adjacent, witness)
                update(report["curvature"], curvature, witness)
                update(report["curvature_ew"], curvature_ew, witness)
                update(report["curvature_uv"], curvature_uv, witness)
                update(report["j"], j_ew + j_uv, witness)
                update(report["j_ew"], j_ew, witness)
                update(report["j_uv"], j_uv, witness)
                update(report["gap"], gap, witness)


def main() -> None:
    report = {
        "marker": "PROBE_EXACT_ISO_ISOLATE_ADJACENT_CURVATURE_COUPLING",
        "identity": (
            "gap_r=M_r+R_(r-1,r-1)-R_(r-2,r), "
            "M_r=2[z^(r-1)w^r]N"
        ),
        "adjacent": {"checks": 0, "negative": 0, "zero": 0, "minimum": None},
        "curvature": {"checks": 0, "negative": 0, "zero": 0, "minimum": None},
        "curvature_ew": {"checks": 0, "negative": 0, "zero": 0, "minimum": None},
        "curvature_uv": {"checks": 0, "negative": 0, "zero": 0, "minimum": None},
        "j": {"checks": 0, "negative": 0, "zero": 0, "minimum": None},
        "j_ew": {"checks": 0, "negative": 0, "zero": 0, "minimum": None},
        "j_uv": {"checks": 0, "negative": 0, "zero": 0, "minimum": None},
        "gap": {"checks": 0, "negative": 0, "zero": 0, "minimum": None},
        "scope": (
            "Finite exact atlas/tree census only. The displayed coefficient "
            "identity is algebraic; observed signs are not an all-order proof."
        ),
    }
    forests = 0
    for graph0 in nx.graph_atlas_g():
        if len(graph0) >= 2 and nx.is_forest(graph0):
            audit(nx.convert_node_labels_to_integers(graph0), report)
            forests += 1
    for n in range(8, 11):
        for graph in nx.nonisomorphic_trees(n):
            audit(graph, report)
            forests += 1
    report["forests"] = forests
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
