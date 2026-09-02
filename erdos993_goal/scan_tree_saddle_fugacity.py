#!/usr/bin/env python3
"""Find tree independence polynomials with the largest 2/3-alpha saddle.

For ``A(x)=I(T;x)`` of degree ``d``, let rho be the unique positive
solution

    rho A'(rho) / A(rho) = 2d/3.

In a large bouquet of copies of T, the terminal-PGC boundary ratio has
leading limit rho/(1+rho) as the number of terminal leaves also grows.
This script searches every unlabeled tree through a requested order for
large rho, using exact tree DP and stable log-domain bisection.
"""

from __future__ import annotations

import argparse
import heapq
import json
import math
import time
from pathlib import Path

import networkx as nx


Polynomial = tuple[int, ...]


def add(a: Polynomial, b: Polynomial) -> Polynomial:
    out = [0] * max(len(a), len(b))
    for i, value in enumerate(a):
        out[i] += value
    for i, value in enumerate(b):
        out[i] += value
    return tuple(out)


def multiply(a: Polynomial, b: Polynomial) -> Polynomial:
    out = [0] * (len(a) + len(b) - 1)
    for i, avalue in enumerate(a):
        for j, bvalue in enumerate(b):
            out[i + j] += avalue * bvalue
    return tuple(out)


def tree_polynomial(tree: nx.Graph, root: int = 0) -> Polynomial:
    def visit(vertex: int, parent: int | None):
        excluded = (1,)
        included = (0, 1)
        for child in tree[vertex]:
            if child == parent:
                continue
            child_total, child_excluded = visit(child, vertex)
            excluded = multiply(excluded, child_total)
            included = multiply(included, child_excluded)
        return add(excluded, included), excluded

    return visit(root, None)[0]


def tilted_mean(poly: Polynomial, log_rho: float) -> float:
    logs = [
        math.log(value) + k * log_rho
        for k, value in enumerate(poly)
        if value
    ]
    maximum = max(logs)
    weights = [
        (k, math.exp(math.log(value) + k * log_rho - maximum))
        for k, value in enumerate(poly)
        if value
    ]
    denominator = sum(weight for _, weight in weights)
    return sum(k * weight for k, weight in weights) / denominator


def saddle(poly: Polynomial) -> tuple[float, float]:
    degree = len(poly) - 1
    target = 2 * degree / 3
    low = -60.0
    high = 60.0
    while tilted_mean(poly, high) < target:
        high *= 2
    for _ in range(60):
        middle = (low + high) / 2
        if tilted_mean(poly, middle) < target:
            low = middle
        else:
            high = middle
    log_rho = (low + high) / 2
    rho = math.exp(log_rho) if log_rho < 700 else math.inf
    limit = 1.0 if log_rho > 40 else 1 / (1 + math.exp(-log_rho))
    return rho, limit


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--min-order", type=int, default=1)
    parser.add_argument("--max-order", type=int, default=16)
    parser.add_argument("--top", type=int, default=50)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    heap: list[tuple[float, int, dict]] = []
    serial = 0
    tree_counts = {}
    distinct_polynomials: set[Polynomial] = set()

    for order in range(args.min_order, args.max_order + 1):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        count = 0
        order_best = None
        for tree in trees:
            count += 1
            poly = tree_polynomial(tree, next(iter(tree)))
            if poly in distinct_polynomials:
                continue
            distinct_polynomials.add(poly)
            rho, limit = saddle(poly)
            item = {
                "order": order,
                "graph6": nx.to_graph6_bytes(
                    tree, header=False
                ).decode("ascii").strip(),
                "independence_polynomial": list(poly),
                "alpha": len(poly) - 1,
                "rho": rho,
                "rho_over_one_plus_rho": limit,
            }
            serial += 1
            if len(heap) < args.top:
                heapq.heappush(heap, (limit, serial, item))
            elif limit > heap[0][0]:
                heapq.heapreplace(heap, (limit, serial, item))
            if order_best is None or limit > order_best["rho_over_one_plus_rho"]:
                order_best = item
        tree_counts[str(order)] = count
        print(
            f"n={order}: trees={count:,}, "
            f"distinct_total={len(distinct_polynomials):,}, "
            f"order_best={order_best['rho_over_one_plus_rho']:.12g}, "
            f"global_best={max(x[0] for x in heap):.12g}",
            flush=True,
        )

    top = [entry[2] for entry in sorted(heap, reverse=True)]
    report = {
        "status": "SEARCH_COMPLETE_NOT_PROOF",
        "parameters": vars(args) | {"output": str(args.output)},
        "tree_counts": tree_counts,
        "distinct_independence_polynomials": len(distinct_polynomials),
        "top": top,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
