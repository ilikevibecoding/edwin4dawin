#!/usr/bin/env python3
"""Exact obstruction to the claimed canonical rank-four mode exhaustion.

This is not a negative bundle payment.  It exhibits a deepest eligible
unmarked support whose support-neighbourhood has two vertices, one an
unmarked parent and one a protected marked child.  Its D rows are outside
all singleton-parent, endpoint-parent, and no-parent root-star identities
currently proved for g1 and g2.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from derive_iso_leaf_bundle_telescope_agent import bundle_components


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_bundle_canonical_mode_exhaustiveness_obstruction_agent_20260829.json"


def independence_row(graph: nx.Graph, maximum: int = 5):
    vertices = tuple(graph.nodes())
    return tuple(
        sum(
            all(not graph.has_edge(x, y) for x, y in itertools.combinations(chosen, 2))
            for chosen in itertools.combinations(vertices, rank)
        )
        for rank in range(maximum + 1)
    )


def marked_rows(graph: nx.Graph, u: int, v: int):
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        rows.append(independence_row(reduced))
    return tuple(rows)


def trim(row):
    row = list(row)
    while len(row) > 1 and row[-1] == 0:
        row.pop()
    return tuple(row)


def finite_differences(values):
    coefficients = []
    current = list(values)
    while current:
        coefficients.append(current[0])
        current = [current[index + 1] - current[index] for index in range(len(current) - 1)]
    return coefficients


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    # Root at v.  The rooted path is v-b-s-u, and z is an unmarked leaf
    # child of s.  Thus s is the deepest support and has the eligible bundle
    # {z}, but its nonbundle neighbours are the unmarked parent b and the
    # protected marked child u.
    u, s, b, v = 0, 1, 2, 3
    base = nx.Graph(((u, s), (s, b), (b, v)))
    assert nx.is_tree(base)
    root_depth = {v: 0, b: 1, s: 2, u: 3}
    assert root_depth[b] + 1 == root_depth[s]
    assert root_depth[s] + 1 == root_depth[u]
    nonbundle_neighbours = {u, b}
    assert set(base.neighbors(s)) == nonbundle_neighbours
    assert not base.has_edge(u, b)

    # C deletes s and the factored bundle leaves.  D also deletes the two
    # nonbundle neighbours of s.
    c_graph = base.copy()
    c_graph.remove_node(s)
    d_graph = c_graph.copy()
    d_graph.remove_nodes_from(nonbundle_neighbours)
    crows = tuple(trim(row) for row in marked_rows(c_graph, u, v))
    drows = tuple(trim(row) for row in marked_rows(d_graph, u, v))
    assert crows == ((1, 3, 2), (1, 2), (1, 2, 1), (1, 1))
    assert drows == ((1, 1), (1, 1), (1,), (1,))

    ordinary_parent_b = tuple(
        trim(row) for row in marked_rows(nx.restricted_view(c_graph, (b,), ()), u, v)
    )
    endpoint_u = (crows[1], crows[1], crows[3], crows[3])
    endpoint_v = (crows[2], crows[3], crows[2], crows[3])
    no_parent_k0 = crows
    no_parent_k2 = (crows[3],) * 4
    candidate_rows = {
        "ordinary_singleton_parent_b": ordinary_parent_b,
        "endpoint_or_no_parent_k1_u": endpoint_u,
        "endpoint_or_no_parent_k1_v": endpoint_v,
        "no_parent_k0": no_parent_k0,
        "no_parent_k2": no_parent_k2,
    }
    assert all(drows != rows for rows in candidate_rows.values())

    # Directly evaluate the defining whole-bundle payment for M=0,...,6.
    gamma = [0]
    for number in range(1, 7):
        gamma.append(sum(bundle_components(base, (u, v), s, number, 4)))
    coefficients = finite_differences(gamma)
    assert gamma == [0, 16, 110, 456, 1386, 3440, 7416]
    assert coefficients == [0, 16, 78, 174, 158, 50, 0]
    assert all(value >= 0 for value in coefficients)

    report = {
        "marker": "EXACT_OBSTRUCTION_CANONICAL_RANK4_BUNDLE_MODE_EXHAUSTIVENESS_AGENT",
        "witness": {
            "marks": {"u": u, "v": v},
            "support": s,
            "unmarked_parent": b,
            "base_edges_before_adding_bundle": sorted(map(list, base.edges())),
            "root": v,
            "root_depths": {str(vertex): depth for vertex, depth in root_depth.items()},
            "eligible_bundle": "one or more unmarked leaf children z of s",
            "support_neighbourhood_after_factoring_bundle": sorted(nonbundle_neighbours),
            "support_neighbourhood_size": 2,
        },
        "exact_rows": {
            "C": [list(row) for row in crows],
            "D_actual": [list(row) for row in drows],
            "tested_proved_mode_rows": {
                name: [list(row) for row in rows] for name, rows in candidate_rows.items()
            },
            "outside_every_tested_mode": True,
        },
        "direct_payment": {
            "Gamma_M_M0_through_M6": gamma,
            "binomial_coefficients_g0_through_g6": coefficients,
            "sign": "all nonnegative",
        },
        "conclusion": (
            "A canonical deepest eligible unmarked support need not have a "
            "singleton nonbundle parent and need not be a no-parent root star. "
            "An internal support on the protected u-v spine can have an "
            "unmarked parent and a protected marked child, so its independent "
            "support-neighbourhood has size two."
        ),
        "remaining_theorem": (
            "Prove g1 and g2 for multivertex independent-transversal support "
            "neighbourhoods (already covered universally only for g3), or give "
            "a different induction that provably avoids these cells."
        ),
        "scope": (
            "Exact obstruction to the proposed proof-mode exhaustion only. "
            "The witness payment is positive; this is not a counterexample to "
            "rank-four bundle positivity, N4, forest ISO, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
