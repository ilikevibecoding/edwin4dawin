#!/usr/bin/env python3
"""Exact stress tests for prefix ordered log-concavity of forest polynomials.

For ``I(F;x)=sum a[k] x^k`` and
``L=ceil((2*alpha-1)/3)``, the tested inequality is

    (k+2) a[k] a[k+2] <= (k+1) a[k+1]^2

for every ``0 <= k <= L-2``.  All decisions use integer arithmetic.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from math import comb
from pathlib import Path

import networkx as nx

PUBLIC_REPO = Path(r"C:\Users\chris\tmp\erdos993_public")
sys.path.insert(0, str(PUBLIC_REPO))

from indpoly import independence_poly  # noqa: E402


def multiply(left: list[int], right: list[int]) -> list[int]:
    result = [0] * (len(left) + len(right) - 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            result[i + j] += x * y
    return result


def ordered_lc_margin(poly: list[int]) -> dict:
    """Return the closest exact prefix inequality.

    ``difference > 0`` is a counterexample.  ``extension_gap`` is
    ``mu[k+1]-mu[k]``.
    """

    alpha = len(poly) - 1
    tail_start = (2 * alpha + 1) // 3
    best = None
    for k in range(max(0, tail_start - 1)):
        left = (k + 2) * poly[k] * poly[k + 2]
        right = (k + 1) * poly[k + 1] * poly[k + 1]
        difference = left - right
        denominator = poly[k] * poly[k + 1]
        candidate = {
            "k": k,
            "left": left,
            "right": right,
            "difference": difference,
            "extension_gap_numerator": difference,
            "extension_gap_denominator": denominator,
            "extension_gap": difference / denominator,
        }
        if best is None or (
            difference * best["extension_gap_denominator"]
            > best["difference"] * denominator
        ):
            best = candidate
    return {
        "alpha": alpha,
        "tail_start": tail_start,
        "last_tested_k": tail_start - 2,
        "best": best,
    }


def adjacency(graph: nx.Graph) -> list[list[int]]:
    mapping = {vertex: i for i, vertex in enumerate(graph.nodes())}
    return [
        sorted(mapping[neighbor] for neighbor in graph.neighbors(vertex))
        for vertex in graph.nodes()
    ]


def tree_polynomial(graph: nx.Graph) -> list[int]:
    adj = adjacency(graph)
    return independence_poly(len(adj), adj)


def compact_certificate(graph: nx.Graph, poly: list[int], margin: dict) -> dict:
    mapping = {vertex: i for i, vertex in enumerate(graph.nodes())}
    return {
        "order": len(graph),
        "edges": sorted(
            sorted((mapping[u], mapping[v])) for u, v in graph.edges()
        ),
        "polynomial": poly,
        "margin": margin,
    }


def check_poly(
    poly: list[int],
    label: str,
    champion: dict | None,
) -> tuple[dict | None, dict | None]:
    margin = ordered_lc_margin(poly)
    best = margin["best"]
    record = {"label": label, "margin": margin}
    if best is not None and best["difference"] > 0:
        record["polynomial"] = poly
        return champion, record
    if best is not None and (
        champion is None
        or best["difference"]
        * champion["margin"]["best"]["extension_gap_denominator"]
        > champion["margin"]["best"]["difference"]
        * best["extension_gap_denominator"]
    ):
        champion = record
    return champion, None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-unlabeled-order", type=int, default=16)
    parser.add_argument("--random-order", type=int, default=120)
    parser.add_argument("--random-samples", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=9930724)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("prefix_ordered_lc_stress.json"),
    )
    args = parser.parse_args()

    if args.max_unlabeled_order < 1:
        raise ValueError("--max-unlabeled-order must be positive")
    rng = random.Random(args.seed)
    started = time.time()
    tested = 0
    by_order: dict[str, int] = {}
    champion = None

    # NetworkX has no nonisomorphic_trees(1) case.
    champion, failure = check_poly([1, 1], "unlabeled_n1", champion)
    tested += 1
    by_order["1"] = 1
    if failure is not None:
        raise AssertionError("the one-vertex tree cannot fail")

    for n in range(2, args.max_unlabeled_order + 1):
        count = 0
        for graph in nx.generators.nonisomorphic_trees(n):
            poly = tree_polynomial(graph)
            champion, failure = check_poly(
                poly, f"unlabeled_n{n}", champion
            )
            tested += 1
            count += 1
            if failure is not None:
                failure.update(compact_certificate(graph, poly, failure["margin"]))
                payload = {
                    "status": "counterexample",
                    "tested": tested,
                    "failure": failure,
                }
                args.output.write_text(
                    json.dumps(payload, indent=2), encoding="utf-8"
                )
                print(json.dumps(payload, indent=2), flush=True)
                return 1
        by_order[str(n)] = count
        print(f"unlabeled order {n}: {count}", flush=True)

    for sample in range(args.random_samples):
        graph = nx.random_labeled_tree(
            args.random_order,
            seed=rng.randrange(1 << 63),
        )
        poly = tree_polynomial(graph)
        champion, failure = check_poly(
            poly, f"random_{sample}", champion
        )
        tested += 1
        if failure is not None:
            failure.update(compact_certificate(graph, poly, failure["margin"]))
            payload = {
                "status": "counterexample",
                "tested": tested,
                "failure": failure,
            }
            args.output.write_text(
                json.dumps(payload, indent=2), encoding="utf-8"
            )
            print(json.dumps(payload, indent=2), flush=True)
            return 1

    # Three transparent disjoint-union controls around the strong n=32
    # all-rank log-concavity failure.
    strong = [
        1, 32, 465, 4079, 24208, 103176, 326882, 785311, 1444705,
        2038009, 2189235, 1760579, 1027270, 411255, 101405, 11818,
        89, 1,
    ]
    controls_tested = 0
    for isolates in range(301):
        factor = [comb(isolates, j) for j in range(isolates + 1)]
        champion, failure = check_poly(
            multiply(strong, factor),
            f"strong32_plus_{isolates}_isolates",
            champion,
        )
        controls_tested += 1
        if failure is not None:
            break
    if failure is None:
        for leaves in range(1, 301):
            star = [1, leaves + 1] + [
                comb(leaves, j) for j in range(2, leaves + 1)
            ]
            champion, failure = check_poly(
                multiply(strong, star),
                f"strong32_times_star_{leaves}",
                champion,
            )
            controls_tested += 1
            if failure is not None:
                break
    if failure is None:
        for edges in range(1, 151):
            matching = [
                comb(edges, j) * (2**j) for j in range(edges + 1)
            ]
            champion, failure = check_poly(
                multiply(strong, matching),
                f"strong32_plus_{edges}_edges",
                champion,
            )
            controls_tested += 1
            if failure is not None:
                break
    tested += controls_tested

    status = "counterexample" if failure is not None else "no_counterexample"
    payload = {
        "status": status,
        "parameters": vars(args) | {"output": str(args.output)},
        "tested": tested,
        "unlabeled_by_order": by_order,
        "random_samples": args.random_samples,
        "disjoint_union_controls": controls_tested,
        "elapsed_seconds": time.time() - started,
        "champion": champion,
    }
    if failure is not None:
        payload["failure"] = failure
    args.output.write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    print(json.dumps(payload, indent=2), flush=True)
    return 1 if failure is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
