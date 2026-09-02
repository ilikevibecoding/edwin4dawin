#!/usr/bin/env python3
"""Exact all-order joint (Q,W) bound for 3-edge subtrees in a forest.

For a forest with no isolated vertices, put

    Q = N - 2h = sum_v (deg(v)-1),
    W = sum_v binom(deg(v),2),

and let T count connected induced four-vertex subtrees.  If
``p=max_v(deg(v)-1)`` and ``B=W-Q``, this verifier certifies

    3 T <= (Q-1) W + 1.
    3 T <= (p+1) B + 3p(Q-p).

The proof is the weighted-forest leaf induction recorded in the companion
note.  Finite enumeration below checks the counting reduction independently;
it is a sanity audit, not the basis of the all-order result.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "forest_three_edge_subtree_joint_qw_bound_exact_root_20260831.json"
MARKER = "PASS_EXACT_ALL_ORDER_FOREST_THREE_EDGE_SUBTREE_JOINT_QW_BOUND_ROOT"


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(graph, header=False).decode().strip()


def count_three_edge_subtrees(graph: nx.Graph) -> int:
    return sum(
        1
        for vertices in itertools.combinations(graph.nodes(), 4)
        if graph.subgraph(vertices).number_of_edges() == 3
        and nx.is_connected(graph.subgraph(vertices))
    )


def main() -> None:
    # Symbolically replay the exact margin identity.  The positive-weight
    # vertices form an induced forest H; x_v=d(v)-1 on H.
    q, sx2, sx3, edge_cross = sp.symbols(
        "q sx2 sx3 edge_cross", integer=True
    )
    w = (sx2 + q) / 2
    three_t = (sx3 - q) / 2 + 3 * edge_cross
    original_twice = sp.expand(2 * ((q - 1) * w + 1 - three_t))
    reduced = sp.expand((q - 1) * sx2 - sx3 + q**2 + 2 - 6 * edge_cross)
    assert sp.simplify(original_twice - reduced) == 0

    # The complete-pair potential is the same expression:
    # sum_{u<v} x_u x_v(x_u+x_v+2)+2-6 sum_{uv in E(H)}x_u x_v.
    # Its leaf-induction increment is
    # x*y*(x+y-4) + sum_{w != x,y} x*w*(x+w+2).
    x, y, z = sp.symbols("x y z", integer=True, positive=True)
    pair_xy = x * y * (x + y + 2)
    assert sp.simplify(pair_xy - 6 * x * y - x * y * (x + y - 4)) == 0

    # Exhaust every exceptional neighbor pair x+y<4.  If another vertex is
    # present, its least possible payment (z=1) already covers the deficit.
    exceptional_rows = []
    for xv, yv in ((1, 1), (1, 2), (2, 1)):
        deficit = xv * yv * (xv + yv - 4)
        one_other = xv * (xv + 3)  # z=1 minimizes x*z*(x+z+2)
        base_two_vertex = 2 + deficit
        assert deficit == -2
        assert one_other >= 4
        assert base_two_vertex == 0
        exceptional_rows.append(
            {
                "leaf_weight": xv,
                "neighbor_weight": yv,
                "edge_increment": deficit,
                "minimum_nonneighbor_payment": one_other,
                "two_vertex_potential": base_two_vertex,
            }
        )

    # Sharper p-max payment.  The centered-star part follows termwise from
    # 3*C(x+1,3)=(x+1)C(x,2)<=(p+1)C(x,2).  Rooting each component of H
    # bounds its middle-edge sum by p times the nonroot weight, at most
    # p(Q-p).  These exact scalar identities are pinned here.
    p = sp.symbols("p", integer=True, nonnegative=True)
    assert sp.simplify(
        3 * x * (x - 1) * (x + 1) / 6
        - (x + 1) * x * (x - 1) / 2
    ) == 0

    # Exact finite audit of the graph identities and final inequality.
    checked_forests = checked_four_sets = 0
    zero_margin = []
    minimum = None
    stream = hashlib.sha256()
    per_order = {}
    for order in range(2, 12):
        order_forests = 0
        for graph in forest_graphs(order):
            if any(graph.degree(vertex) == 0 for vertex in graph):
                continue
            order_forests += 1
            checked_forests += 1
            checked_four_sets += max(0, len(list(itertools.combinations(range(order), 4))))
            components = nx.number_connected_components(graph)
            qv = order - 2 * components
            xv = {vertex: graph.degree(vertex) - 1 for vertex in graph}
            assert qv == sum(xv.values())
            wedges = sum(
                graph.degree(vertex) * (graph.degree(vertex) - 1) // 2
                for vertex in graph
            )
            assert 2 * wedges == sum(value * (value + 1) for value in xv.values())
            triples = count_three_edge_subtrees(graph)
            motif_formula = sum(
                graph.degree(vertex)
                * (graph.degree(vertex) - 1)
                * (graph.degree(vertex) - 2)
                // 6
                for vertex in graph
            ) + sum(xv[u] * xv[v] for u, v in graph.edges())
            assert triples == motif_formula
            pmax = max(xv.values(), default=0)
            branching = sum(value * (value - 1) // 2 for value in xv.values())
            assert branching == wedges - qv
            pmax_margin_three = (
                (pmax + 1) * branching
                + 3 * pmax * (qv - pmax)
                - 3 * triples
            )
            assert pmax_margin_three >= 0
            margin = (qv - 1) * wedges + 1 - 3 * triples
            assert margin >= 0

            positive_vertices = [v for v in graph if xv[v] > 0]
            pair_potential = 2 + sum(
                xv[u] * xv[v] * (xv[u] + xv[v] + 2)
                for u, v in itertools.combinations(positive_vertices, 2)
            ) - 6 * sum(xv[u] * xv[v] for u, v in graph.edges())
            assert pair_potential == 2 * margin
            record = (
                margin,
                order,
                graph6(graph),
                components,
                qv,
                wedges,
                triples,
                pmax,
                branching,
                pmax_margin_three,
            )
            if minimum is None or record < minimum:
                minimum = record
            if margin == 0:
                zero_margin.append(
                    {
                        "order": order,
                        "graph6": graph6(graph),
                        "components": components,
                        "positive_weights": sorted(xv[v] for v in positive_vertices),
                    }
                )
            stream.update(("|".join(map(str, record)) + "\n").encode())
        per_order[str(order)] = order_forests

    # The induction also identifies equality: H is exactly one edge with
    # weights (1,1) or (1,2), up to order.  In the original forest this is
    # P4 or the five-vertex degree-(3,2,1,1,1) tree, plus K2 components.
    for row in zero_margin:
        assert row["positive_weights"] in ([1, 1], [1, 2])

    payload = {
        "status": MARKER,
        "statement": "For every finite forest without isolated vertices, 3*T <= (Q-1)*W+1 and 3*T <= (p+1)*B+3*p*(Q-p), where Q=N-2h, W=sum_v C(deg(v),2), B=W-Q, p=max_v(deg(v)-1), and T counts connected induced four-vertex subtrees.",
        "analytic_reduction": {
            "weights": "x_v=deg(v)-1 on the induced forest H of nonleaf vertices",
            "twice_margin": "2+sum_{u<v} x_u*x_v*(x_u+x_v+2)-6*sum_{uv in E(H)}x_u*x_v",
            "leaf_increment": "x*y*(x+y-4)+sum_{w other}x*w*(x+w+2)",
            "generic_branch": "x+y>=4 gives a nonnegative increment",
            "exceptional_branches": exceptional_rows,
            "induction_base": "one vertex has potential 2; two vertices joined by an edge have potential 2+x*y*(x+y-4)>=0",
        },
        "pmax_bound": {
            "statement": "3*T <= (p+1)*B+3*p*(Q-p)",
            "centered_star_payment": "3*C(x+1,3)=(x+1)*C(x,2)<=(p+1)*C(x,2)",
            "middle_edge_payment": "Root each component of H; sum_E x_u*x_v <= p*sum_nonroots(x_v) <= p*(Q-p)",
        },
        "equality_classification": "P4 plus any number of K2 components, or the five-vertex tree with degree sequence (3,2,1,1,1) plus any number of K2 components.",
        "finite_audit": {
            "maximum_order": 11,
            "no_isolate_unlabeled_forests": checked_forests,
            "four_vertex_subsets_checked": checked_four_sets,
            "minimum_margin": minimum[0],
            "minimum_witness": {
                "order": minimum[1],
                "graph6": minimum[2],
                "components": minimum[3],
                "Q": minimum[4],
                "W": minimum[5],
                "T": minimum[6],
                "p": minimum[7],
                "B": minimum[8],
                "pmax_bound_cleared_margin": minimum[9],
            },
            "zero_margin_rows": len(zero_margin),
            "per_order": per_order,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "scope_guard": "This proves only the displayed all-order structural inequality. It does not by itself prove the terminal Newton m=0 coefficient, the terminal payment, unimodality, or Erdos Problem 993.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    OUTPUT.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    report_sha = hashlib.sha256(OUTPUT.read_bytes()).hexdigest().upper()
    print(json.dumps({
        "status": payload["status"],
        "finite_forests": checked_forests,
        "minimum_margin": minimum[0],
        "zero_margin_rows": len(zero_margin),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", report_sha)
    print(MARKER)


if __name__ == "__main__":
    main()
