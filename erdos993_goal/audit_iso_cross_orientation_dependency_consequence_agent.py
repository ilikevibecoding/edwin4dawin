#!/usr/bin/env python3
"""Freeze the exact dependency consequence of the C_4,C_5,C_6 theorem.

The cross-orientation theorem truncates one paired Q/D branch.  It does not
truncate the separate N recurrence, so it does not by itself remove FML at
ranks four through six.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from audit_iso_direct_rank_bypass_dependency_agent import leaf_remainder
from probe_iso_four_minor_third_leaf_root import four_minor_vector
from probe_iso_leaf_cross_remainder_root import graph6, iso, poly_forest


def at(row: list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def audit(max_order: int = 10) -> dict[str, object]:
    checks = 0
    by_rank: dict[int, int] = {}
    minimum_c: dict | None = None
    for order in range(4, max_order + 1):
        for graph in nx.nonisomorphic_trees(order):
            leaves = [vertex for vertex in graph if graph.degree(vertex) == 1]
            for a, b in itertools.permutations(leaves, 2):
                u = next(iter(graph.neighbors(a)))
                v = next(iter(graph.neighbors(b)))
                if u == v:
                    continue
                base = graph.copy()
                base.remove_nodes_from((a, b))
                f_minus_a = graph.copy()
                f_minus_a.remove_node(a)
                f_minus_b = graph.copy()
                f_minus_b.remove_node(b)
                q_cross_graph = graph.copy()
                q_cross_graph.remove_nodes_from((a, u))
                d_cross_graph = graph.copy()
                d_cross_graph.remove_nodes_from((b, v))
                for rank in range(3, len(poly_forest(graph)) + 2):
                    k = rank - 1
                    cross_q = iso(poly_forest(q_cross_graph), k)
                    cross_d = leaf_remainder(d_cross_graph, a, k)
                    cross = cross_q + cross_d
                    nested = at(four_minor_vector(base, u, v), rank)
                    terms = (
                        iso(poly_forest(f_minus_a), rank)
                        + leaf_remainder(f_minus_b, a, rank)
                        + nested
                        + cross
                    )
                    assert iso(poly_forest(graph), rank) == terms
                    witness = {
                        "value": cross,
                        "order": order,
                        "rank": rank,
                        "cross_rank": k,
                        "a": a,
                        "b": b,
                        "graph6": graph6(graph),
                    }
                    if minimum_c is None or cross < minimum_c["value"]:
                        minimum_c = witness
                    checks += 1
                    by_rank[rank] = by_rank.get(rank, 0) + 1
    return {
        "orders": [4, max_order],
        "checks": checks,
        "checks_by_rank": by_rank,
        "minimum_cross_term": minimum_c,
    }


def main() -> None:
    report = {
        "marker": "PASS_EXACT_C456_TRUNCATES_QD_BRANCH_NOT_N_FML_CHAIN",
        "reassembly_identity": (
            "Q_r(F)=Q_r(F-a)+D_r(F-b,a)+N_r(F-{a,b};u,v)+"
            "C_(r-1)(F-{a,b};u,v)"
        ),
        "cross_term": (
            "C_(r-1)=Q_(r-1)(F-{a,u})+"
            "D_(r-1)(F-{b,v},a)"
        ),
        "proved_cross_ranks": [4, 5, 6],
        "consequence": (
            "At target ranks r=5,6,7 the paired lower Q/D branch is a "
            "nonnegative terminal.  No separate D_(r-1) proof is needed "
            "for that occurrence."
        ),
        "remaining_N_dependency": (
            "N_r(B)=N_r(B-z)+N_(r-1)(B-{z,s})+G_r(B,z)"
        ),
        "remaining_chain_for_Q7": ["N7", "N6", "N5", "N4"],
        "remaining_FML_ranks_for_Q7": [7, 6, 5, 4],
        "logical_boundary": (
            "C4-C6 alone does not move the auxiliary FML floor above rank "
            "four.  That requires a new lower-N coupling or direct N4-N6."
        ),
        "literal_identity_audit": audit(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
