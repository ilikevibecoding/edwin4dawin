#!/usr/bin/env python3
"""Exact counterexample to separate nonnegativity of the leaf residual Q.

The full leaf increments remain positive in this witness.  Only the tempting
subclaim Q(X,Y)>=0 is disproved; the negative Q is compensated by T and by the
other positive blocks in the exact ordinary-leaf split.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import add_leaf
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from search_iso_n6_bundle_g1_random_g1_nonadjacent import rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_ordinary_leaf_residual_q_counterexample_exact_"
    "g1_nonadjacent_20260831.json"
)
MARKER = "DISPROVED_ISO_N6_BUNDLE_G1_ORDINARY_LEAF_RESIDUAL_Q_NONNEGATIVE_G1_NONADJACENT"

EDGES = (
    (0, 1), (0, 2), (0, 4), (1, 17), (1, 52), (2, 14), (3, 31),
    (5, 29), (6, 8), (8, 9), (15, 20), (15, 21), (17, 47),
    (18, 36), (20, 48), (21, 22), (21, 25), (21, 41), (21, 46),
    (24, 32), (24, 45), (25, 30), (29, 53),
)
RETAINED = frozenset((
    0, 2, 3, 4, 5, 7, 8, 9, 10, 11, 16, 17, 18, 21, 22, 30,
    33, 34, 35, 36, 38, 40, 45, 46, 47, 52,
))
U, V, LEAF, PARENT = 44, 19, 36, 18
EXPECTED = {
    "g2_H_J": 129_185_727_684,
    "F_H_K": 24_863_490_814,
    "Q_H_L": -113_715_696,
    "Q_H_J": -113_715_696,
    "Q_K_J": -113_715_696,
    "T_H_J": 481_896_484,
    "leaf_add": 254_465_092,
    "delta00": 154_049_218_498,
    "delta01": 154_303_683_590,
    "delta10": 153_935_502_802,
    "delta11": 154_189_967_894,
}


def evaluator(index):
    expression = reconstruct(index)
    variables = tuple(sorted(expression.free_symbols, key=str))
    evaluate = sp.lambdify(variables, expression, "math")

    def value(crows, drows):
        data = {}
        for prefix, rowset in (("c", crows), ("d", drows)):
            for family, sequence in zip("EUVW", rowset):
                for rank in range(8):
                    data[f"{prefix}{family}{rank}"] = sequence[rank]
        return int(evaluate(*(data[str(variable)] for variable in variables)))

    return value


def add_rows(left, right):
    return tuple(tuple(a + b for a, b in zip(x, y)) for x, y in zip(left, right))


def main():
    graph = nx.Graph()
    graph.add_nodes_from(range(55))
    graph.add_edges_from(EDGES)
    assert nx.is_forest(graph)
    assert graph.degree(LEAF) == 1 and tuple(graph.neighbors(LEAF)) == (PARENT,)
    assert PARENT not in (U, V) and LEAF not in (U, V)

    agraph = graph.copy()
    agraph.remove_node(LEAF)
    hgraph = agraph.copy()
    hgraph.remove_node(PARENT)
    kgraph = agraph.copy()
    kgraph.remove_nodes_from({PARENT, *agraph.neighbors(PARENT)})
    assert hgraph.nodes == kgraph.nodes and hgraph.edges == kgraph.edges

    jnodes = RETAINED - {LEAF, PARENT}
    lnodes = jnodes - set(agraph.neighbors(PARENT))
    assert jnodes == lnodes
    hrows = rows(hgraph, U, V)
    krows = rows(kgraph, U, V)
    jrows = rows(hgraph.subgraph(jnodes).copy(), U, V)
    lrows = rows(kgraph.subgraph(lnodes).copy(), U, V)
    zeros = tuple(tuple(0 for _ in range(8)) for _ in "EUVW")
    xhrows = add_leaf(zeros, hrows)
    xkrows = add_leaf(zeros, krows)
    xjrows = add_leaf(zeros, jrows)
    xlrows = add_leaf(zeros, lrows)
    arows = add_rows(hrows, xkrows)
    crows = add_rows(arows, xhrows)

    g1, g2 = evaluator(1), evaluator(2)
    values = {
        "g2_H_J": g2(hrows, jrows),
        "F_H_K": g1(crows, zeros) - g1(arows, zeros) - g2(hrows, zeros),
        "Q_H_L": g1(xhrows, xlrows) - g1(xhrows, zeros),
        "Q_H_J": g1(xhrows, xjrows) - g1(xhrows, zeros),
        "Q_K_J": g1(xkrows, xjrows) - g1(xkrows, zeros),
        "T_H_J": g1(hrows, xjrows) - g1(hrows, zeros),
    }
    values["leaf_add"] = values["Q_H_J"] + values["Q_K_J"] + values["T_H_J"]
    values["delta00"] = values["g2_H_J"] + values["F_H_K"]
    values["delta01"] = values["delta00"] + values["leaf_add"]
    values["delta10"] = values["delta00"] + values["Q_H_L"]
    values["delta11"] = values["delta01"] + values["Q_H_L"]
    assert values == EXPECTED

    # Directly replay all four original leaf differences, independently of
    # the displayed residual sums.
    cgraph = graph
    d00 = hgraph.subgraph(jnodes).copy()
    d01 = cgraph.subgraph(jnodes | {LEAF}).copy()
    d10 = cgraph.subgraph(jnodes | {PARENT}).copy()
    d11 = cgraph.subgraph(jnodes | {PARENT, LEAF}).copy()
    direct = {
        "delta00": g1(rows(cgraph, U, V), rows(d00, U, V))
        - g1(rows(agraph, U, V), rows(d00, U, V)),
        "delta01": g1(rows(cgraph, U, V), rows(d01, U, V))
        - g1(rows(agraph, U, V), rows(d00, U, V)),
        "delta10": g1(rows(cgraph, U, V), rows(d10, U, V))
        - g1(rows(agraph, U, V), rows(d10, U, V)),
        "delta11": g1(rows(cgraph, U, V), rows(d11, U, V))
        - g1(rows(agraph, U, V), rows(d10, U, V)),
    }
    assert direct == {label: EXPECTED[label] for label in direct}

    report = {
        "marker": MARKER,
        "witness": {
            "order": 55,
            "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
            "edges": [list(edge) for edge in EDGES],
            "marks": [U, V],
            "leaf": LEAF,
            "parent": PARENT,
            "retained_vertices": sorted(RETAINED),
            "structural_simplification": "K=H and L=J because the leaf-parent edge is a detached K2",
        },
        "exact_values": values,
        "direct_leaf_differences": direct,
        "disproved_claim": "Q(X,Y)>=0 on every genuine ordinary-leaf residual pair",
        "compensation": (
            "Q=-113715696, but T+2Q=254465092>0; all four complete leaf deltas are positive"
        ),
        "scope_guard": (
            "This disproves separate Q nonnegativity only. It is not a counterexample to the "
            "ordinary-leaf monotonicity lemma, universal rank-six g1, or Erdos Problem 993."
        ),
        "dependencies": {
            "rank6_reconstruction": hashlib.sha256(
                (HERE / "explore_iso_n6_bundle_g2_marked_cone_g1_bernstein.py").read_bytes()
            ).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "exact_values": values,
        "scope_guard": report["scope_guard"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
