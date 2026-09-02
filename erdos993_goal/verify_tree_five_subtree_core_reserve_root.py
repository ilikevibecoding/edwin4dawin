#!/usr/bin/env python3
"""Exact all-order core reserve for connected five-vertex tree motifs.

This isolates a sharp structural input for the unresolved all-tree q4/q3
margin.  The proof is the core identity in ``symbolic_certificate``; the
bounded census is a literal audit and extremal probe only.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "tree_five_subtree_core_reserve_exact_root_20260828.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value: int, rank: int) -> int:
    return math.comb(value, rank) if value >= rank else 0


def symbolic_certificate() -> dict[str, str]:
    a, b, delta = sp.symbols("a b delta", integer=True, nonnegative=True)
    x, y = a + 1, b + 1
    twice_edge_y = sp.expand(
        2 * ((x * (x - 1) / 2) * y + x * (y * (y - 1) / 2))
    )
    expected_edge = sp.expand(
        a**2 + a + b**2 + b + a * b * (a + b) + 2 * a * b
    )
    assert sp.expand(twice_edge_y - expected_edge) == 0

    vertex_remainder = sp.expand(
        delta * (a**2 + a)
        - (a**2 + a)
        - 2 * (delta - 1) * a
    )
    assert sp.expand(vertex_remainder - (delta - 1) * a * (a - 1)) == 0

    m, n_mass, child_mass = sp.symbols(
        "m N child_mass", integer=True, nonnegative=True
    )
    root_bound_gap = sp.expand(m * (n_mass - m) - m * child_mass)
    assert sp.expand(root_bound_gap.subs(child_mass, n_mass - m)) == 0
    return {
        "edge_expansion": str(expected_edge),
        "vertex_collection": str(sp.factor(vertex_remainder)),
        "core_identity": (
            "2(Y-e-X)=sum_v(delta_v-1)a_v(a_v-1)+"
            "sum_uv a_u a_v(a_u+a_v)"
        ),
        "maximum_weight_bound": (
            "root at x=m: sum_edges x_u*x_v <= "
            "m*sum_(v!=root)x_v=m(N-m)"
        ),
        "moment_bound": (
            "with weights C(x,2) and y=x-2, Cauchy gives "
            "4e*B4>=B3(3B3-e)"
        ),
    }


def motif_data(tree: nx.Graph) -> dict[str, object]:
    n = len(tree)
    excess = {vertex: tree.degree(vertex) - 1 for vertex in tree}
    mass = sum(excess.values())
    assert mass == n - 2
    b2 = sum(choose(value, 2) for value in excess.values())
    b3 = sum(choose(value, 3) for value in excess.values())
    b4 = sum(choose(value, 4) for value in excess.values())
    edge_product = sum(excess[u] * excess[v] for u, v in tree.edges())
    x_surplus = edge_product - (n - 3)
    t_shape = sum(
        choose(excess[u], 2) * excess[v]
        + excess[u] * choose(excess[v], 2)
        for u, v in tree.edges()
    )
    p5_shape = sum(
        excess[u] * excess[v]
        for center in tree
        for u, v in itertools.combinations(tree[center], 2)
    )
    star_shape = b4 + b3
    connected_five = star_shape + t_shape + p5_shape

    core_vertices = [vertex for vertex in tree if tree.degree(vertex) >= 2]
    core = tree.subgraph(core_vertices).copy()
    is_star = len(core_vertices) == 1
    if core_vertices:
        assert nx.is_connected(core)
    a = {vertex: excess[vertex] - 1 for vertex in core}
    reserve_twice = sum(
        (core.degree(vertex) - 1) * a[vertex] * (a[vertex] - 1)
        for vertex in core
    ) + sum(
        a[u] * a[v] * (a[u] + a[v]) for u, v in core.edges()
    )
    reserve = t_shape - b2 - x_surplus
    assert 2 * reserve == reserve_twice
    if not is_star:
        assert x_surplus >= 0
        assert reserve >= 0
        x_core = sum(
            (core.degree(vertex) - 1) * a[vertex] for vertex in core
        ) + sum(a[u] * a[v] for u, v in core.edges())
        assert x_core == x_surplus

    max_excess = max(excess.values())
    maximum_weight_margin = (
        max_excess * (mass - max_excess) - edge_product
    )
    assert maximum_weight_margin >= 0
    if not is_star:
        assert x_surplus <= max_excess * (mass - max_excess) - (mass - 1)

    if b2:
        moment_margin = 4 * b2 * b4 - b3 * (3 * b3 - b2)
        assert moment_margin >= 0
    else:
        moment_margin = 0

    sharp_lower_margin = (
        connected_five - (b4 + b3 + b2 + x_surplus)
    )
    assert sharp_lower_margin == reserve + p5_shape
    if not is_star:
        assert sharp_lower_margin >= 0

    return {
        "order": n,
        "B2": b2,
        "B3": b3,
        "B4": b4,
        "edge_product": edge_product,
        "X": x_surplus,
        "T_shape": t_shape,
        "P5_shape": p5_shape,
        "V5": connected_five,
        "core_order": len(core),
        "max_excess": max_excess,
        "is_star": is_star,
        "core_reserve": reserve,
        "sharp_lower_margin": sharp_lower_margin,
        "maximum_weight_margin": maximum_weight_margin,
        "moment_margin": moment_margin,
    }


def literal_connected_five(tree: nx.Graph) -> int:
    return sum(
        nx.is_connected(tree.subgraph(chosen))
        for chosen in itertools.combinations(tuple(tree), 5)
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=3)
    parser.add_argument("--max-order", type=int, default=18)
    parser.add_argument("--literal-five-through", type=int, default=11)
    args = parser.parse_args()
    assert 3 <= args.min_order <= args.max_order

    symbolic = symbolic_certificate()
    totals = {
        "trees": 0,
        "nonstars": 0,
        "stars": 0,
        "core_edges": 0,
        "literal_five_subsets": 0,
        "zero_core_reserve_nonstars": 0,
        "zero_sharp_lower_margin_nonstars": 0,
        "negative_core_reserves": 0,
        "negative_sharp_lower_margins": 0,
        "negative_maximum_weight_margins": 0,
        "negative_moment_margins": 0,
    }
    stream = hashlib.sha256()
    per_order = []
    minimum_positive_core_reserve = None
    minimum_positive_sharp_margin = None

    for n in range(args.min_order, args.max_order + 1):
        order_trees = 0
        order_nonstars = 0
        order_zero = 0
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            row = motif_data(tree)
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            totals["trees"] += 1
            order_trees += 1
            if row["is_star"]:
                totals["stars"] += 1
            else:
                totals["nonstars"] += 1
                order_nonstars += 1
                if row["core_reserve"] == 0:
                    totals["zero_core_reserve_nonstars"] += 1
                if row["sharp_lower_margin"] == 0:
                    totals["zero_sharp_lower_margin_nonstars"] += 1
                    order_zero += 1
            totals["core_edges"] += max(0, row["core_order"] - 1)

            if n <= args.literal_five_through:
                literal = literal_connected_five(tree)
                totals["literal_five_subsets"] += choose(n, 5)
                assert literal == row["V5"]

            witness = row | {"tree_index": index, "graph6": code}
            if row["core_reserve"] > 0 and (
                minimum_positive_core_reserve is None
                or row["core_reserve"] < minimum_positive_core_reserve[0]
            ):
                minimum_positive_core_reserve = (row["core_reserve"], witness)
            if row["sharp_lower_margin"] > 0 and (
                minimum_positive_sharp_margin is None
                or row["sharp_lower_margin"] < minimum_positive_sharp_margin[0]
            ):
                minimum_positive_sharp_margin = (
                    row["sharp_lower_margin"], witness
                )
            stream.update(
                (
                    f"{n}|{index}|{code}|{row['B2']}|{row['B3']}|{row['B4']}|"
                    f"{row['X']}|{row['T_shape']}|{row['P5_shape']}|{row['V5']}|"
                    f"{row['core_reserve']}|{row['sharp_lower_margin']}|"
                    f"{row['maximum_weight_margin']}|{row['moment_margin']}\n"
                ).encode("ascii")
            )
        per_order.append(
            {
                "order": n,
                "trees": order_trees,
                "nonstars": order_nonstars,
                "zero_sharp_lower_margin_nonstars": order_zero,
            }
        )

    report = {
        "status": "PASS_EXACT_ALL_ORDER_TREE_FIVE_SUBTREE_CORE_RESERVE",
        "theorem": {
            "scope": "every finite nonstar tree",
            "coordinates": (
                "x_v=d(v)-1, Bk=sum_v C(x_v,k), "
                "X=sum_edges x_u*x_v-(n-3), V5=connected induced 5-subtrees"
            ),
            "core_identity": symbolic["core_identity"],
            "sharp_consequence": "V5>=B4+B3+B2+X",
            "shifted_consequence": (
                "Omega=V5-(n-4)>=B4+B3+B2+X-(n-4)"
            ),
            "maximum_weight_consequence": (
                "if m=max x_v and N=n-2, then "
                "0<=X<=m(N-m)-(N-1) for nonstars"
            ),
            "moment_consequence": "4*B2*B4>=B3*(3*B3-B2)",
        },
        "symbolic_certificate": symbolic,
        "bounded_audit": {
            "orders": [args.min_order, args.max_order],
            "literal_connected_five_through": args.literal_five_through,
            "totals": totals,
            "per_order": per_order,
            "minimum_positive_core_reserve": minimum_positive_core_reserve,
            "minimum_positive_sharp_margin": minimum_positive_sharp_margin,
            "ordered_value_stream_sha256": stream.hexdigest().upper(),
        },
        "scope_warning": (
            "This is a structural lower bound for the unresolved q4/q3 margin; "
            "it does not by itself prove q4<=q3 or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(totals, indent=2))
    print(f"ordered_value_stream_sha256={stream.hexdigest().upper()}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
