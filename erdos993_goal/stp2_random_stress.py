#!/usr/bin/env python3
"""Exact stress test for the rooted STP2 inequalities in forest DP.

For a rooted tree let

    E = I(T-r),   J = I(T-N[r]),   I = E + x J.

The two diagonal inequalities tested at every valid k are

    E[k+1] I[k-1] <= E[k] I[k]       (IE)
    J[k+1] E[k-1] <= J[k] E[k].      (EJ)

The first one is exactly the coefficient-ratio statement that implies the
leaf-step first-descent monotonicity used in the minimal-counterexample route.
All polynomial calculations and comparisons are exact Python integers.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from collections import deque
from pathlib import Path

REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(REPO))

from scripts.valley_scaling_probe import kadd, kmul, shift  # noqa: E402


def prufer_tree(n: int, rng: random.Random) -> list[list[int]]:
    """Return an adjacency list for a uniform labelled tree."""
    if n == 1:
        return [[]]
    code = [rng.randrange(n) for _ in range(n - 2)]
    degree = [1] * n
    for v in code:
        degree[v] += 1
    leaves = [v for v, d in enumerate(degree) if d == 1]
    import heapq

    heapq.heapify(leaves)
    adj = [[] for _ in range(n)]
    for v in code:
        leaf = heapq.heappop(leaves)
        adj[leaf].append(v)
        adj[v].append(leaf)
        degree[leaf] -= 1
        degree[v] -= 1
        if degree[v] == 1:
            heapq.heappush(leaves, v)
    a = heapq.heappop(leaves)
    b = heapq.heappop(leaves)
    adj[a].append(b)
    adj[b].append(a)
    return adj


def preferential_tree(n: int, rng: random.Random) -> list[list[int]]:
    """A hub-heavy random recursive tree, complementary to Prüfer trees."""
    adj = [[] for _ in range(n)]
    urn = [0]
    for v in range(1, n):
        parent = rng.choice(urn)
        adj[v].append(parent)
        adj[parent].append(v)
        urn.extend((parent, v))
    return adj


def rooted_pair(adj: list[list[int]], root: int) -> tuple[list[int], list[int]]:
    parent = [-2] * len(adj)
    parent[root] = -1
    order: list[int] = []
    queue = deque([root])
    while queue:
        v = queue.popleft()
        order.append(v)
        for u in adj[v]:
            if parent[u] == -2:
                parent[u] = v
                queue.append(u)

    e_poly: list[list[int] | None] = [None] * len(adj)
    j_poly: list[list[int] | None] = [None] * len(adj)
    for v in reversed(order):
        e = [1]
        j = [1]
        for u in adj[v]:
            if parent[u] != v:
                continue
            child_e = e_poly[u]
            child_j = j_poly[u]
            assert child_e is not None and child_j is not None
            e = kmul(e, kadd(child_e, shift(child_j)))
            j = kmul(j, child_e)
        e_poly[v] = e
        j_poly[v] = j
    result_e = e_poly[root]
    result_j = j_poly[root]
    assert result_e is not None and result_j is not None
    return result_e, result_j


def coefficient(poly: list[int], k: int) -> int:
    return poly[k] if 0 <= k < len(poly) else 0


def test_pair(e: list[int], j: list[int]) -> tuple[dict | None, dict | None]:
    i_poly = kadd(e, shift(j))
    ie_failure = None
    ej_failure = None
    max_k = max(len(i_poly), len(e), len(j))
    for k in range(1, max_k):
        ie_left = coefficient(e, k + 1) * coefficient(i_poly, k - 1)
        ie_right = coefficient(e, k) * coefficient(i_poly, k)
        if ie_left > ie_right and ie_failure is None:
            ie_failure = {
                "k": k,
                "left": ie_left,
                "right": ie_right,
                "excess": ie_left - ie_right,
            }
        ej_left = coefficient(j, k + 1) * coefficient(e, k - 1)
        ej_right = coefficient(j, k) * coefficient(e, k)
        if ej_left > ej_right and ej_failure is None:
            ej_failure = {
                "k": k,
                "left": ej_left,
                "right": ej_right,
                "excess": ej_left - ej_right,
            }
    return ie_failure, ej_failure


def edge_list(adj: list[list[int]]) -> list[list[int]]:
    return [[v, u] for v, nbrs in enumerate(adj) for u in nbrs if v < u]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--trials", type=int, default=2000)
    parser.add_argument("--n-min", type=int, default=30)
    parser.add_argument("--n-max", type=int, default=240)
    parser.add_argument("--roots", type=int, default=3)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    tested_trees = 0
    tested_rootings = 0
    failure = None
    closest = {"IE": None, "EJ": None}

    for trial in range(args.trials):
        n = rng.randint(args.n_min, args.n_max)
        family = "prufer" if trial % 2 == 0 else "preferential"
        adj = prufer_tree(n, rng) if family == "prufer" else preferential_tree(n, rng)
        candidates = list(range(n))
        rng.shuffle(candidates)
        roots = candidates[: min(args.roots, n)]
        tested_trees += 1
        for root in roots:
            e, j = rooted_pair(adj, root)
            ie_failure, ej_failure = test_pair(e, j)
            tested_rootings += 1
            if ie_failure is not None or ej_failure is not None:
                failure = {
                    "trial": trial,
                    "family": family,
                    "n": n,
                    "root": root,
                    "IE": ie_failure,
                    "EJ": ej_failure,
                    "edges": edge_list(adj),
                    "E": e,
                    "J": j,
                }
                break

            i_poly = kadd(e, shift(j))
            for label, first, second in (("IE", e, i_poly), ("EJ", j, e)):
                for k in range(1, max(len(first), len(second))):
                    left = coefficient(first, k + 1) * coefficient(second, k - 1)
                    right = coefficient(first, k) * coefficient(second, k)
                    if left == 0:
                        continue
                    record = closest[label]
                    if record is None or left * record["right"] > record["left"] * right:
                        closest[label] = {
                            "trial": trial,
                            "family": family,
                            "n": n,
                            "root": root,
                            "k": k,
                            "left": left,
                            "right": right,
                            "ratio": left / right,
                        }
        if failure is not None:
            break
        if (trial + 1) % 100 == 0:
            print(
                f"trials={trial+1} rootings={tested_rootings} "
                f"closest_IE={closest['IE']['ratio']:.12g} "
                f"closest_EJ={closest['EJ']['ratio']:.12g}",
                flush=True,
            )

    result = {
        "parameters": vars(args) | {"output": str(args.output) if args.output else None},
        "tested_trees": tested_trees,
        "tested_rootings": tested_rootings,
        "failure": failure,
        "closest": closest,
    }
    print(json.dumps(result, indent=2), flush=True)
    if args.output:
        args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return 1 if failure is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
