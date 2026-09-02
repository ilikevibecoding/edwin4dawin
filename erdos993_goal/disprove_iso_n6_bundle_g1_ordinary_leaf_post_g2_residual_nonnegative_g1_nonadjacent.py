#!/usr/bin/env python3
"""Exact counterexample to nonnegativity of the post-g2 leaf residual.

The full leaf difference is positive.  The artifact only rules out the route
"universal g2>=0 plus a separately nonnegative residual".
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
    "iso_n6_bundle_g1_ordinary_leaf_post_g2_residual_counterexample_exact_"
    "g1_nonadjacent_20260831.json"
)
MARKER = (
    "DISPROVED_ISO_N6_BUNDLE_G1_ORDINARY_LEAF_POST_G2_RESIDUAL_"
    "NONNEGATIVE_G1_NONADJACENT"
)
EDGES = ((0, 1), (1, 2), (1, 3), (1, 4), (1, 6), (4, 9), (5, 8))
U, V, LEAF, PARENT = 9, 5, 0, 1
RETAINED = frozenset((0, 4, 5, 7))
EXPECTED = {
    "g2_H_J": 29_899,
    "F_H_K": 114,
    "Q_H_L": -257,
    "Q_H_J": 50,
    "Q_K_J": 50,
    "T_H_J": 541,
    "leaf_add": 641,
    "R00": 114,
    "R01": 755,
    "R10": -143,
    "R11": 498,
    "delta00": 30_013,
    "delta01": 30_654,
    "delta10": 29_756,
    "delta11": 30_397,
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
    graph.add_nodes_from(range(10))
    graph.add_edges_from(EDGES)
    assert nx.is_forest(graph) and graph.degree(LEAF) == 1
    agraph = graph.copy()
    agraph.remove_node(LEAF)
    hgraph = agraph.copy()
    hgraph.remove_node(PARENT)
    kgraph = agraph.copy()
    kgraph.remove_nodes_from({PARENT, *agraph.neighbors(PARENT)})
    jnodes = RETAINED - {LEAF, PARENT}
    lnodes = jnodes - set(agraph.neighbors(PARENT))
    hrows, krows = rows(hgraph, U, V), rows(kgraph, U, V)
    jrows = rows(hgraph.subgraph(jnodes).copy(), U, V)
    lrows = rows(kgraph.subgraph(lnodes).copy(), U, V)
    zeros = tuple(tuple(0 for _ in range(8)) for _ in "EUVW")
    xh, xk = add_leaf(zeros, hrows), add_leaf(zeros, krows)
    xj, xl = add_leaf(zeros, jrows), add_leaf(zeros, lrows)
    arows = add_rows(hrows, xk)
    crows = add_rows(arows, xh)
    g1, g2 = evaluator(1), evaluator(2)
    values = {
        "g2_H_J": g2(hrows, jrows),
        "F_H_K": g1(crows, zeros) - g1(arows, zeros) - g2(hrows, zeros),
        "Q_H_L": g1(xh, xl) - g1(xh, zeros),
        "Q_H_J": g1(xh, xj) - g1(xh, zeros),
        "Q_K_J": g1(xk, xj) - g1(xk, zeros),
        "T_H_J": g1(hrows, xj) - g1(hrows, zeros),
    }
    values["leaf_add"] = values["Q_H_J"] + values["Q_K_J"] + values["T_H_J"]
    values["R00"] = values["F_H_K"]
    values["R01"] = values["F_H_K"] + values["leaf_add"]
    values["R10"] = values["F_H_K"] + values["Q_H_L"]
    values["R11"] = values["F_H_K"] + values["Q_H_L"] + values["leaf_add"]
    for case in ("00", "01", "10", "11"):
        values[f"delta{case}"] = values["g2_H_J"] + values[f"R{case}"]
    assert values == EXPECTED

    d00 = graph.subgraph(jnodes).copy()
    d01 = graph.subgraph(jnodes | {LEAF}).copy()
    d10 = graph.subgraph(jnodes | {PARENT}).copy()
    d11 = graph.subgraph(jnodes | {PARENT, LEAF}).copy()
    direct = {
        "delta00": g1(rows(graph, U, V), rows(d00, U, V)) - g1(rows(agraph, U, V), rows(d00, U, V)),
        "delta01": g1(rows(graph, U, V), rows(d01, U, V)) - g1(rows(agraph, U, V), rows(d00, U, V)),
        "delta10": g1(rows(graph, U, V), rows(d10, U, V)) - g1(rows(agraph, U, V), rows(d10, U, V)),
        "delta11": g1(rows(graph, U, V), rows(d11, U, V)) - g1(rows(agraph, U, V), rows(d10, U, V)),
    }
    assert direct == {label: EXPECTED[label] for label in direct}
    report = {
        "marker": MARKER,
        "witness": {
            "order": 10,
            "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
            "edges": [list(edge) for edge in EDGES],
            "marks": [U, V],
            "leaf": LEAF,
            "parent": PARENT,
            "retained_vertices": sorted(RETAINED),
        },
        "exact_values": values,
        "direct_leaf_differences": direct,
        "disproved_claim": "each leaf residual after subtracting g2_6(H,J) is nonnegative",
        "scope_guard": (
            "Only separate post-g2 residual nonnegativity is disproved. The complete leaf "
            "difference is positive in every case of this witness."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({"marker": MARKER, "exact_values": values, "scope_guard": report["scope_guard"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
