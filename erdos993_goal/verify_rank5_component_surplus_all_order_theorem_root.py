#!/usr/bin/env python3
"""Assemble and independently replay the rank-five component-surplus theorem.

The all-order proof is the finite case split recorded in the five dependency
reports.  This script verifies their source hashes and statuses, checks that
the degree classes exhaust every tree edge, and performs a separate literal
census of all nonisomorphic trees in the requested order range.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
import os
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank5_component_surplus_all_order_theorem_exact_20260825.json"


DEPENDENCIES = (
    {
        "class": "c>=5",
        "source": "verify_rank5_edge_local_high_degree_sum_reduction_root.py",
        "report": "rank5_edge_local_high_degree_sum_reduction_exact_20260825.json",
        "status": "PASS_EXACT_ALL_ORDER_HIGH_DEGREE_SUM_REDUCTION_BOUNDED_AUDIT",
    },
    {
        "class": "degrees (1,2)",
        "source": "verify_rank5_edge_local_leaf_degree2_theorem_root.py",
        "report": "rank5_edge_local_leaf_degree2_theorem_exact_20260825.json",
        "status": "PASS_EXACT_ALL_ORDER_LEAF_DEGREE2_THEOREM_BOUNDED_INJECTION_AUDIT",
    },
    {
        "class": "degrees (2,2)",
        "source": "verify_rank5_edge_local_degree2_degree2_theorem_root.py",
        "report": "rank5_edge_local_degree2_degree2_theorem_exact_20260825.json",
        "status": "PASS_EXACT_ALL_ORDER_DEGREE2_DEGREE2_THEOREM_BOUNDED_INJECTION_AUDIT",
    },
    {
        "class": "degrees (1,3)",
        "source": "verify_rank5_edge_local_leaf_degree3_theorem_root.py",
        "report": "rank5_edge_local_leaf_degree3_theorem_exact_20260825.json",
        "status": "PASS_EXACT_ALL_ORDER_LEAF_DEGREE3_THEOREM_BOUNDED_INJECTION_AUDIT",
    },
    {
        "class": "c in {3,4}",
        "source": "verify_rank5_edge_local_c3_c4_theorem_root.py",
        "report": "rank5_edge_local_c3_c4_theorem_exact_20260825.json",
        "status": "PASS_EXACT_ALL_ORDER_C3_C4_EDGE_THEOREM_BOUNDED_INJECTION_AUDIT",
    },
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent(tree: nx.Graph, chosen: tuple[int, ...] | frozenset[int]) -> bool:
    selected = set(chosen)
    return all(v not in selected for u in selected for v in tree[u])


def theorem_class(degree_u: int, degree_v: int) -> str:
    pair = tuple(sorted((degree_u, degree_v)))
    c = sum(pair) - 2
    if c == 0:
        return "K2-trivial"
    if pair == (1, 2):
        return "degrees (1,2)"
    if pair == (1, 3):
        return "degrees (1,3)"
    if pair == (2, 2):
        return "degrees (2,2)"
    if c in (3, 4):
        return "c in {3,4}"
    if c >= 5:
        return "c>=5"
    raise AssertionError((pair, c))


def dependency_audit() -> list[dict[str, str]]:
    audited = []
    for dependency in DEPENDENCIES:
        source_path = HERE / dependency["source"]
        report_path = HERE / dependency["report"]
        report = json.loads(report_path.read_text(encoding="utf-8"))
        source_hash = sha256(source_path)
        assert report["status"] == dependency["status"]
        assert report["source_sha256"] == source_hash
        audited.append(
            {
                "class": dependency["class"],
                "source": dependency["source"],
                "source_sha256": source_hash,
                "report": dependency["report"],
                "report_sha256": sha256(report_path),
                "status": report["status"],
            }
        )
    return audited


def class_partition_audit() -> dict[str, object]:
    pairs = [(a, b) for a in range(1, 13) for b in range(a, 13)]
    classes: dict[str, list[list[int]]] = {}
    for a, b in pairs:
        name = theorem_class(a, b)
        classes.setdefault(name, []).append([a, b])
    assert classes["K2-trivial"] == [[1, 1]]
    assert classes["degrees (1,2)"] == [[1, 2]]
    assert classes["degrees (1,3)"] == [[1, 3]]
    assert classes["degrees (2,2)"] == [[2, 2]]
    assert classes["c in {3,4}"] == [[1, 4], [1, 5], [2, 3], [2, 4], [3, 3]]
    return {
        "rule": (
            "c=du+dv-2: c=0 is only K2; c=1 is (1,2); c=2 is "
            "(1,3) or (2,2); c=3,4 are the five listed pairs; c>=5 is the tail"
        ),
        "tested_degree_pairs": len(pairs),
        "classes": classes,
    }


def tree_audit(tree: nx.Graph) -> dict[str, object]:
    vertices = tuple(tree)
    n = len(vertices)
    edges = tuple(tree.edges())
    neighborhoods = {
        v: frozenset((v, *tree.neighbors(v))) for v in vertices
    }
    independent_four = [
        frozenset(chosen)
        for chosen in itertools.combinations(vertices, 4)
        if independent(tree, chosen)
    ]
    independent_five = [
        frozenset(chosen)
        for chosen in itertools.combinations(vertices, 5)
        if independent(tree, chosen)
    ]
    i5 = len(independent_five)

    A4 = 0
    C4 = 0
    for chosen in independent_four:
        removed = frozenset().union(*(neighborhoods[v] for v in chosen))
        residual = set(vertices) - removed
        residual_edges = sum(u in residual and v in residual for u, v in edges)
        A4 += len(residual)
        C4 += len(residual) - residual_edges

    local_rows = []
    sum_i4_residual = 0
    sum_h = 0
    class_counts: dict[str, int] = {}
    for u, v in edges:
        residual = set(vertices) - (neighborhoods[u] | neighborhoods[v])
        h = len(residual)
        i4_residual = sum(chosen <= residual for chosen in independent_four)
        margin = 5 * h * i5 - (n - 2) * (n - 3) * i4_residual
        name = theorem_class(tree.degree(u), tree.degree(v))
        assert margin >= 0
        class_counts[name] = class_counts.get(name, 0) + 1
        sum_i4_residual += i4_residual
        sum_h += h
        local_rows.append((margin, name, u, v, h, i4_residual))

    matching_two_literal = sum(
        len(set(first) | set(second)) == 4
        for first, second in itertools.combinations(edges, 2)
    )
    W = math.comb(n - 2, 2) if n >= 2 else 0
    degree_surplus = sum(math.comb(tree.degree(v) - 1, 2) for v in vertices)
    matching_two_formula = W - degree_surplus

    token_edges = set()
    for chosen in independent_five:
        for u in chosen:
            for v in tree[u]:
                target = frozenset((chosen - {u}) | {v})
                if not independent(tree, target):
                    continue
                left, right = tuple(sorted(chosen)), tuple(sorted(target))
                token_edges.add((left, right) if left < right else (right, left))

    assert A4 == 5 * i5
    assert C4 == A4 - sum_i4_residual
    assert len(token_edges) == sum_i4_residual
    assert sum_h == 2 * matching_two_literal
    assert matching_two_literal == matching_two_formula

    local_sum_margin = 5 * i5 * sum_h - (n - 2) * (n - 3) * sum_i4_residual
    token_margin = 5 * matching_two_literal * i5 - W * len(token_edges)
    theorem_margin = W * C4 - degree_surplus * A4
    assert local_sum_margin == 2 * token_margin
    assert token_margin == theorem_margin
    assert theorem_margin >= 0

    active_local = [row for row in local_rows if row[5] > 0]
    return {
        "order": n,
        "i4": len(independent_four),
        "i5": i5,
        "A4": A4,
        "C4": C4,
        "token_edges": len(token_edges),
        "matching_two": matching_two_literal,
        "degree_surplus": degree_surplus,
        "local_sum_margin": local_sum_margin,
        "theorem_margin": theorem_margin,
        "class_counts": class_counts,
        "minimum_active_local_margin": min((row[0] for row in active_local), default=None),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-order", type=int, default=2)
    parser.add_argument("--max-order", type=int, default=13)
    args = parser.parse_args()
    assert 2 <= args.min_order <= args.max_order

    dependencies = dependency_audit()
    partition = class_partition_audit()
    totals = {
        "trees": 0,
        "edges": 0,
        "independent_four_sets": 0,
        "independent_five_sets": 0,
        "token_edges": 0,
        "negative_local_margins": 0,
        "negative_theorem_margins": 0,
        "zero_theorem_margins": 0,
    }
    aggregate_class_counts: dict[str, int] = {}
    per_order = []
    minimum_positive = None
    minimum_active_local = None
    for n in range(args.min_order, args.max_order + 1):
        tree_count = 0
        order_minimum = None
        for index, tree in enumerate(nx.nonisomorphic_trees(n)):
            row = tree_audit(tree)
            code = nx.to_graph6_bytes(tree, header=False).decode().strip()
            witness = row | {"tree_index": index, "graph6": code}
            margin = row["theorem_margin"]
            if order_minimum is None or margin < order_minimum[0]:
                order_minimum = (margin, witness)
            if margin > 0 and (
                minimum_positive is None or margin < minimum_positive[0]
            ):
                minimum_positive = (margin, witness)
            active_margin = row["minimum_active_local_margin"]
            if active_margin is not None and (
                minimum_active_local is None or active_margin < minimum_active_local[0]
            ):
                minimum_active_local = (active_margin, witness)
            totals["trees"] += 1
            totals["edges"] += n - 1
            totals["independent_four_sets"] += row["i4"]
            totals["independent_five_sets"] += row["i5"]
            totals["token_edges"] += row["token_edges"]
            totals["negative_theorem_margins"] += margin < 0
            totals["zero_theorem_margins"] += margin == 0
            for name, count in row["class_counts"].items():
                aggregate_class_counts[name] = aggregate_class_counts.get(name, 0) + count
            tree_count += 1
        per_order.append(
            {
                "order": n,
                "trees": tree_count,
                "minimum_theorem_margin": order_minimum[0],
                "minimum_witness": order_minimum[1],
            }
        )
        print(
            f"COMPONENT_SURPLUS_ORDER {n} TREES {tree_count} "
            f"MIN_MARGIN {order_minimum[0]}",
            flush=True,
        )

    assert totals["negative_local_margins"] == 0
    assert totals["negative_theorem_margins"] == 0
    payload = {
        "schema": "rank5-component-surplus-all-order-theorem-v1",
        "status": "PASS_EXACT_ALL_ORDER_RANK5_COMPONENT_SURPLUS_THEOREM_INDEPENDENT_CENSUS",
        "theorem": (
            "For every finite tree T, C(n-2,2) sum_{S in I4(T)} "
            "components(T-N[S]) >= (sum_v C(deg(v)-1,2)) 5 i5(T)."
        ),
        "local_lemma": (
            "For every edge uv, (n-2)(n-3)i4(T-(N[u] union N[v])) "
            "<= 5(n-deg(u)-deg(v))i5(T)."
        ),
        "assembly_identities": {
            "edge_class_partition": partition,
            "token_edges": "|E(TS5(T))|=sum_uv i4(T-(N[u] union N[v]))",
            "matching_moment": "sum_uv (n-deg(u)-deg(v))=2m2(T)",
            "rank_incidence": "A4=sum_{S in I4}|T-N[S]|=5i5(T)",
            "forest_components": "C4=A4-|E(TS5(T))|",
            "two_matchings": "m2=C(n-2,2)-sum_v C(deg(v)-1,2)",
            "summed_local_bound": "C(n-2,2)|E(TS5(T))|<=5m2(T)i5(T)",
            "final_margin_identity": "W*C4-e*A4=5m2*i5-W*|E(TS5(T))|>=0",
        },
        "dependency_audit": dependencies,
        "independent_bounded_census": {
            "orders": [args.min_order, args.max_order],
            "totals": totals,
            "edge_class_counts": aggregate_class_counts,
            "per_order": per_order,
            "minimum_positive_theorem_margin": (
                minimum_positive[1] if minimum_positive is not None else None
            ),
            "minimum_active_local_margin": (
                minimum_active_local[1] if minimum_active_local is not None else None
            ),
        },
        "proof_boundary": (
            "The dependency notes prove the local lemma all-order for every edge "
            "degree class.  The assembly uses only the displayed exact double-counting "
            "identities.  The census is an independent literal audit, not an extrapolation."
        ),
        "problem_993_boundary": (
            "This closes the rank-five component-surplus lemma used by the rank-eight "
            "program; it does not by itself prove unimodality at every rank."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
