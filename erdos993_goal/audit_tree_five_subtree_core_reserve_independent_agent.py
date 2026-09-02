#!/usr/bin/env python3
"""Independent fail-closed audit of the five-subtree core reserve theorem.

The producer is treated as frozen data and is never imported or executed.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "verify_tree_five_subtree_core_reserve_root.py"
PRODUCER_REPORT = HERE / "tree_five_subtree_core_reserve_exact_root_20260828.json"
NOTE = HERE / "TREE_FIVE_SUBTREE_CORE_RESERVE_2026-08-28.md"
OUTPUT = HERE / "tree_five_subtree_core_reserve_independent_audit_20260828.json"

EXPECTED = {
    PRODUCER.name: "4DC79FF0F9FAAB2B12F12D5C29EE2FF9E1597775E67BEA1E940A7514A80BF96D",
    PRODUCER_REPORT.name: "A82530D4B6214D3C45E0D7969A3F7C1E62DAF9E1EAAAB037E3675820F4DA64F2",
    NOTE.name: "09434B2FDACAA51C981CDE2C0DB47F97065022CC2A93527969B94153275C40BC",
}
EXPECTED_STATUS = "PASS_EXACT_ALL_ORDER_TREE_FIVE_SUBTREE_CORE_RESERVE"
EXPECTED_STREAM = "2E4B575C110FFEDA296030FBABA68042D9506D62A82DBE99CF210B08764E78F3"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value: int, rank: int) -> int:
    return math.comb(value, rank) if value >= rank else 0


def symbolic_reconstruction() -> dict[str, str]:
    a, b, delta = sp.symbols("a b delta", integer=True, nonnegative=True)
    x, y = a + 1, b + 1
    twice_oriented_edge = sp.expand(
        2 * (sp.binomial(x, 2) * y + x * sp.binomial(y, 2))
    )
    expected_edge = sp.expand(
        a**2 + a + b**2 + b + a * b * (a + b) + 2 * a * b
    )
    assert sp.expand(sp.expand_func(twice_oriented_edge - expected_edge)) == 0

    vertex_collection = sp.expand(
        delta * (a**2 + a) - (a**2 + a) - 2 * (delta - 1) * a
    )
    assert sp.expand(vertex_collection - (delta - 1) * a * (a - 1)) == 0

    q = sp.symbols("q", integer=True, nonnegative=True)
    w = sp.binomial(q, 2)
    assert sp.expand(
        sp.expand_func(w * (q - 2) - 3 * sp.binomial(q, 3))
    ) == 0
    assert sp.expand(
        sp.expand_func(
            w * (q - 2) ** 2
            - 12 * sp.binomial(q, 4)
            - 3 * sp.binomial(q, 3)
        )
    ) == 0
    return {
        "twice_edge_expansion": str(expected_edge),
        "vertex_collection": str(sp.factor(vertex_collection)),
        "moment_first": "C(x,2)(x-2)=3C(x,3)",
        "moment_second": "C(x,2)(x-2)^2=12C(x,4)+3C(x,3)",
    }


def literal_five_shapes(tree: nx.Graph) -> tuple[int, int, int]:
    counts = {(4, 1, 1, 1, 1): 0, (3, 2, 1, 1, 1): 0, (2, 2, 2, 1, 1): 0}
    for chosen in itertools.combinations(tuple(sorted(tree)), 5):
        induced = tree.subgraph(chosen)
        if not nx.is_connected(induced):
            continue
        signature = tuple(sorted((degree for _, degree in induced.degree()), reverse=True))
        if signature not in counts:
            raise AssertionError(f"unexpected connected five-tree shape {signature}")
        counts[signature] += 1
    return (
        counts[(4, 1, 1, 1, 1)],
        counts[(3, 2, 1, 1, 1)],
        counts[(2, 2, 2, 1, 1)],
    )


def audit_tree(tree: nx.Graph, literal: bool) -> dict[str, object]:
    n = len(tree)
    excess = {v: tree.degree[v] - 1 for v in tree}
    N = sum(excess.values())
    if N != n - 2:
        raise AssertionError("excess mass identity failed")

    B2 = sum(choose(value, 2) for value in excess.values())
    B3 = sum(choose(value, 3) for value in excess.values())
    B4 = sum(choose(value, 4) for value in excess.values())
    edge_product = sum(excess[u] * excess[v] for u, v in tree.edges())
    X = edge_product - (n - 3)

    star_shape = sum(choose(tree.degree[v], 4) for v in tree)
    if star_shape != B4 + B3:
        raise AssertionError("K1,4 shape identity failed")
    T_shape = 0
    for u, v in tree.edges():
        T_shape += choose(excess[u], 2) * excess[v]
        T_shape += excess[u] * choose(excess[v], 2)
    P5_shape = 0
    for middle in tree:
        for u, v in itertools.combinations(tuple(tree[middle]), 2):
            P5_shape += excess[u] * excess[v]
    V5 = star_shape + T_shape + P5_shape

    if literal:
        literal_star, literal_T, literal_P = literal_five_shapes(tree)
        if (literal_star, literal_T, literal_P) != (star_shape, T_shape, P5_shape):
            raise AssertionError("literal five-shape partition disagrees with formulas")

    core_vertices = {v for v in tree if tree.degree[v] >= 2}
    core = tree.subgraph(core_vertices).copy()
    if core_vertices and not nx.is_tree(core):
        raise AssertionError("nonleaf core is not a tree")
    is_star = len(core_vertices) == 1
    a = {v: excess[v] - 1 for v in core}

    # Reconstruct n-3=|E(K)|+sum a before using the X identity.
    if core_vertices:
        if n - 3 != core.number_of_edges() + sum(a.values()):
            raise AssertionError("core mass identity failed")
    x_core = sum((core.degree[v] - 1) * a[v] for v in core)
    x_core += sum(a[u] * a[v] for u, v in core.edges())
    if not is_star and x_core != X:
        raise AssertionError("core X identity failed")

    twice_reserve = sum(
        (core.degree[v] - 1) * a[v] * (a[v] - 1) for v in core
    )
    twice_reserve += sum(
        a[u] * a[v] * (a[u] + a[v]) for u, v in core.edges()
    )
    reserve = T_shape - B2 - X
    if twice_reserve != 2 * reserve:
        raise AssertionError("exact core reserve identity failed")
    if not is_star and (X < 0 or reserve < 0):
        raise AssertionError("nonstar core nonnegativity failed")

    # Independently orient from a maximum-excess root and check every edge term.
    max_excess = max(excess.values())
    root = min(v for v in tree if excess[v] == max_excess)
    parent = {root: None}
    queue = [root]
    oriented_sum = 0
    dominated_sum = 0
    for vertex in queue:
        for child in sorted(tree[vertex]):
            if child == parent[vertex]:
                continue
            if child in parent:
                raise AssertionError("orientation encountered a cycle")
            parent[child] = vertex
            queue.append(child)
            oriented_sum += excess[vertex] * excess[child]
            dominated_sum += max_excess * excess[child]
    if oriented_sum != edge_product or dominated_sum != max_excess * (N - max_excess):
        raise AssertionError("maximum-weight orientation identity failed")
    maximum_weight_margin = dominated_sum - edge_product
    if maximum_weight_margin < 0:
        raise AssertionError("maximum-weight bound failed")
    if not is_star and not (0 <= X <= max_excess * (N - max_excess) - (N - 1)):
        raise AssertionError("shifted maximum-weight consequence failed")

    weights = [choose(value, 2) for value in excess.values()]
    ys = [value - 2 for value in excess.values()]
    sum_w = sum(weights)
    sum_wy = sum(w * y for w, y in zip(weights, ys))
    sum_wy2 = sum(w * y * y for w, y in zip(weights, ys))
    if sum_w != B2 or sum_wy != 3 * B3 or sum_wy2 != 12 * B4 + 3 * B3:
        raise AssertionError("B2/B3/B4 weighted moments failed")
    if sum_wy**2 > sum_w * sum_wy2:
        raise AssertionError("weighted Cauchy inequality failed")
    moment_margin = 4 * B2 * B4 - B3 * (3 * B3 - B2)
    if moment_margin < 0:
        raise AssertionError("moment consequence failed")

    sharp_margin = V5 - (B4 + B3 + B2 + X)
    if sharp_margin != reserve + P5_shape:
        raise AssertionError("sharp lower margin decomposition failed")
    if not is_star and sharp_margin < 0:
        raise AssertionError("five-subtree lower bound failed")
    return {
        "B2": B2,
        "B3": B3,
        "B4": B4,
        "X": X,
        "T_shape": T_shape,
        "P5_shape": P5_shape,
        "V5": V5,
        "core_order": len(core),
        "is_star": is_star,
        "core_reserve": reserve,
        "sharp_lower_margin": sharp_margin,
        "maximum_weight_margin": maximum_weight_margin,
        "moment_margin": moment_margin,
    }


def main() -> None:
    observed = {}
    for path in (PRODUCER, PRODUCER_REPORT, NOTE):
        observed[path.name] = sha256(path)
        if observed[path.name] != EXPECTED[path.name]:
            raise AssertionError(f"frozen hash mismatch: {path.name}")
    producer_report = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    if producer_report.get("status") != EXPECTED_STATUS:
        raise AssertionError("producer status mismatch")
    if producer_report.get("source_sha256") != EXPECTED[PRODUCER.name]:
        raise AssertionError("producer report source hash mismatch")
    if producer_report["bounded_audit"]["ordered_value_stream_sha256"] != EXPECTED_STREAM:
        raise AssertionError("producer stream pin mismatch")

    symbolic = symbolic_reconstruction()
    stream = hashlib.sha256()
    totals = {
        "trees": 0,
        "nonstars": 0,
        "stars": 0,
        "core_edges": 0,
        "literal_five_subsets": 0,
        "zero_core_reserve_nonstars": 0,
        "zero_sharp_lower_margin_nonstars": 0,
    }
    per_order = []
    for n in range(3, 19):
        count = nonstars = zeros = 0
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            row = audit_tree(tree, literal=n <= 11)
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            stream.update(
                (
                    f"{n}|{index}|{code}|{row['B2']}|{row['B3']}|{row['B4']}|"
                    f"{row['X']}|{row['T_shape']}|{row['P5_shape']}|{row['V5']}|"
                    f"{row['core_reserve']}|{row['sharp_lower_margin']}|"
                    f"{row['maximum_weight_margin']}|{row['moment_margin']}\n"
                ).encode("ascii")
            )
            totals["trees"] += 1
            totals["core_edges"] += max(0, row["core_order"] - 1)
            count += 1
            if row["is_star"]:
                totals["stars"] += 1
            else:
                totals["nonstars"] += 1
                nonstars += 1
                if row["core_reserve"] == 0:
                    totals["zero_core_reserve_nonstars"] += 1
                if row["sharp_lower_margin"] == 0:
                    totals["zero_sharp_lower_margin_nonstars"] += 1
                    zeros += 1
            if n <= 11:
                totals["literal_five_subsets"] += choose(n, 5)
        per_order.append({"order": n, "trees": count, "nonstars": nonstars, "zero_sharp": zeros})

    independent_stream = stream.hexdigest().upper()
    if independent_stream != EXPECTED_STREAM:
        raise AssertionError("independent value stream does not match producer")
    producer_totals = producer_report["bounded_audit"]["totals"]
    for key, value in totals.items():
        if value != producer_totals[key]:
            raise AssertionError(f"bounded total mismatch for {key}")

    report = {
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_TREE_FIVE_SUBTREE_CORE_RESERVE_AUDIT",
        "frozen_inputs": {
            name: {"expected_sha256": EXPECTED[name], "observed_sha256": value}
            for name, value in observed.items()
        },
        "producer_status": producer_report["status"],
        "proof_reconstruction": {
            "three_shapes": (
                "K1,4=B4+B3; fork=Y; P5=Z, each counted by its unique center/oriented central edge"
            ),
            "core_identity": (
                "2(Y-B2-X)=sum_v(delta_v-1)a_v(a_v-1)+sum_uv a_u a_v(a_u+a_v)"
            ),
            "maximum_weight": (
                "rooting at a maximum x gives sum_edges x_u*x_v<=m(N-m); core X>=0 supplies the shift"
            ),
            "moments": symbolic,
        },
        "scope": {
            "proved": (
                "V5>=B4+B3+B2+X and the two companion coordinate bounds for every finite nonstar tree"
            ),
            "not_proved": "q4<=q3, any later-rank envelope, or Erdos Problem 993",
            "sharp_family_wording": (
                "the zero sharp-margin tree in each order is a star with one edge subdivided once"
            ),
        },
        "bounded_replay": {
            "orders": [3, 18],
            "literal_shape_partition_through": 11,
            "totals": totals,
            "per_order": per_order,
            "ordered_value_stream_sha256": independent_stream,
            "matches_producer_stream": True,
        },
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(totals, indent=2))
    print(f"ordered_value_stream_sha256={independent_stream}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
