#!/usr/bin/env python3
"""Exact finite probe of a rooted-forest reserve for the q3 envelope.

The proposed all-order inequality is

  2(j+1) h2 f_j + (j-2)(2 f2-s2) f_j >= 6 h_j f2,

where F is a forest with one distinguished root in each component,
H is obtained by deleting those roots, f_k=i_k(F), h_k=i_k(H), and
s2 is the number of token-sliding edges on independent two-sets of F.

This file records finite exact evidence only; PASS is not a proof.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rooted_forest_q3_reserve_probe_independent_20260828.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[int], right: list[int]) -> list[int]:
    out = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        out[index] += value
    for index, value in enumerate(right):
        out[index] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            out[i + j] += a * b
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def shift(row: list[int]) -> list[int]:
    return [0, *row]


def independence_row(forest: nx.Graph) -> list[int]:
    """Rooted-tree DP, component by component."""

    seen: set[int] = set()

    def visit(vertex: int, parent: int | None) -> tuple[list[int], list[int]]:
        seen.add(vertex)
        excluded = [1]
        included = [1]
        for child in sorted(forest[vertex]):
            if child == parent or child in seen:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded = multiply(excluded, add(child_excluded, child_included))
            included = multiply(included, child_excluded)
        return excluded, shift(included)

    total = [1]
    for root in sorted(forest):
        if root in seen:
            continue
        excluded, included = visit(root, None)
        total = multiply(total, add(excluded, included))
    return total


def token_edges_rank_two(forest: nx.Graph) -> int:
    """Count three-vertex sets inducing one edge by their unique edge."""

    order = len(forest)
    return sum(
        order - forest.degree[u] - forest.degree[v]
        for u, v in forest.edges()
    )


def row_for(base: nx.Graph, root: int) -> dict[str, object]:
    F = base.subgraph(set(base) - {root}).copy()
    H = base.subgraph(set(base) - {root, *base[root]}).copy()
    f = independence_row(F)
    h = independence_row(H)
    f2 = f[2] if len(f) > 2 else 0
    h2 = h[2] if len(h) > 2 else 0
    s2 = token_edges_rank_two(F)
    if 2 * f2 < s2:
        raise AssertionError("rank-two K=D-C reserve became negative")

    checks = 0
    minimum = None
    minimum_ratio = None
    naive_failure = None
    equality_count = 0
    for j in range(3, len(f)):
        fj = f[j]
        if not fj or not f2:
            continue
        hj = h[j] if j < len(h) else 0
        rhs = 2 * (j + 1) * h2 * fj + (j - 2) * (2 * f2 - s2) * fj
        lhs = 6 * hj * f2
        margin = rhs - lhs
        if margin < 0:
            raise AssertionError(
                f"rooted reserve failed at root={root}, j={j}, margin={margin}"
            )
        checks += 1
        equality_count += margin == 0
        candidate = (margin, j, lhs, rhs)
        if minimum is None or candidate < minimum:
            minimum = candidate
        if lhs:
            ratio = Fraction(rhs, lhs)
            ratio_candidate = (ratio, margin, j, lhs, rhs)
            if minimum_ratio is None or ratio_candidate < minimum_ratio:
                minimum_ratio = ratio_candidate

        naive_margin = (j + 1) * h2 * fj - 3 * hj * f2
        if naive_margin < 0 and naive_failure is None:
            naive_failure = (naive_margin, j, h2, fj, hj, f2)

    return {
        "checks": checks,
        "minimum": minimum,
        "minimum_ratio": minimum_ratio,
        "naive_failure": naive_failure,
        "equality_count": equality_count,
    }


def main() -> None:
    totals = {
        "trees": 0,
        "rooted_forest_cells": 0,
        "reserve_checks": 0,
        "zero_margins": 0,
    }
    global_minimum = None
    global_ratio = None
    first_naive_failure = None
    per_order = []

    for n in range(2, 15):
        order_trees = 0
        order_cells = 0
        order_checks = 0
        for tree_index, base in enumerate(nx.nonisomorphic_trees(n)):
            code = nx.to_graph6_bytes(base, header=False).decode().strip()
            totals["trees"] += 1
            order_trees += 1
            for root in sorted(base):
                result = row_for(base, root)
                totals["rooted_forest_cells"] += 1
                totals["reserve_checks"] += result["checks"]
                totals["zero_margins"] += result["equality_count"]
                order_cells += 1
                order_checks += result["checks"]

                if result["minimum"] is not None:
                    candidate = result["minimum"] + (n, tree_index, root, code)
                    if global_minimum is None or candidate < global_minimum:
                        global_minimum = candidate
                if result["minimum_ratio"] is not None:
                    ratio, margin, j, lhs, rhs = result["minimum_ratio"]
                    candidate = (ratio, margin, j, lhs, rhs, n, tree_index, root, code)
                    if global_ratio is None or candidate < global_ratio:
                        global_ratio = candidate
                if result["naive_failure"] is not None:
                    candidate = result["naive_failure"] + (n, tree_index, root, code)
                    if first_naive_failure is None or (
                        candidate[-4], candidate[-3], candidate[-2], candidate[1]
                    ) < (
                        first_naive_failure[-4],
                        first_naive_failure[-3],
                        first_naive_failure[-2],
                        first_naive_failure[1],
                    ):
                        first_naive_failure = candidate
        per_order.append(
            {
                "order_of_augmented_tree": n,
                "trees": order_trees,
                "rooted_forest_cells": order_cells,
                "reserve_checks": order_checks,
            }
        )

    if global_minimum is None or global_minimum[0] < 0:
        raise AssertionError("finite reserve census did not complete cleanly")
    if first_naive_failure is None:
        raise AssertionError("expected fail-closed guard for the naive shadow is missing")

    min_margin, min_j, min_lhs, min_rhs, min_n, min_index, min_root, min_code = global_minimum
    ratio, ratio_margin, ratio_j, ratio_lhs, ratio_rhs, ratio_n, ratio_index, ratio_root, ratio_code = global_ratio
    naive_margin, naive_j, naive_h2, naive_fj, naive_hj, naive_f2, naive_n, naive_index, naive_root, naive_code = first_naive_failure

    report = {
        "status": "PASS_EXACT_FINITE_ROOTED_FOREST_Q3_RESERVE_PROBE_NOT_PROOF",
        "candidate": {
            "inequality": (
                "2(j+1)h2*f_j+(j-2)(2f2-s2)*f_j >= 6h_j*f2, j>=3"
            ),
            "normalized": (
                "3 rho_j <= (j+1)rho_2+(j-2)(1-q2(F))"
            ),
            "definitions": (
                "F is a forest with one distinguished root in each component; "
                "H=F-roots; f_j=i_j(F); h_j=i_j(H); s2 is the rank-two "
                "token-sliding edge count of F"
            ),
            "role": (
                "together with the inductive hypothesis q_j(F)<=q2(F), this "
                "implies the v-included block q_(j+1)<=its q3 anchor for every t>=1"
            ),
        },
        "scope": {
            "finite_only": True,
            "coverage": (
                "every rooted forest F of order at most 13 represented by adding "
                "one new vertex adjacent to its distinguished component roots, "
                "enumerated as all rooted unlabeled trees through order 14"
            ),
            "not_claimed": (
                "no all-order proof, no complete terminal-support preservation, "
                "no all-tree higher-rank envelope, and no Erdos Problem 993"
            ),
        },
        "totals": totals,
        "per_order": per_order,
        "minimum_absolute_margin": {
            "margin": min_margin,
            "j": min_j,
            "lhs": min_lhs,
            "rhs": min_rhs,
            "augmented_order": min_n,
            "tree_index": min_index,
            "root": min_root,
            "graph6": min_code,
        },
        "minimum_rhs_over_positive_lhs": {
            "ratio": str(ratio),
            "margin": ratio_margin,
            "j": ratio_j,
            "lhs": ratio_lhs,
            "rhs": ratio_rhs,
            "augmented_order": ratio_n,
            "tree_index": ratio_index,
            "root": ratio_root,
            "graph6": ratio_code,
        },
        "naive_shadow_counterexample": {
            "false_inequality": "(j+1)h2*f_j >= 3h_j*f2",
            "margin": naive_margin,
            "j": naive_j,
            "h2": naive_h2,
            "f_j": naive_fj,
            "h_j": naive_hj,
            "f2": naive_f2,
            "augmented_order": naive_n,
            "tree_index": naive_index,
            "root": naive_root,
            "graph6": naive_code,
            "interpretation": "the K2=2f2-s2 reserve is essential",
        },
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(totals, indent=2))
    print(json.dumps(report["minimum_absolute_margin"], indent=2))
    print(json.dumps(report["minimum_rhs_over_positive_lhs"], indent=2))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
