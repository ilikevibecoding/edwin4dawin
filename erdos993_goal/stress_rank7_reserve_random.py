#!/usr/bin/env python3
"""Deterministic exact stress test of the required rank-seven reserve.

This is exploratory evidence only.  It samples random labelled trees and
random products of their exact independence polynomials, retaining the
closest normalized margin and any actual required-range counterexample.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
from fractions import Fraction
from pathlib import Path

import networkx as nx
from flint import fmpz_poly as Poly

from random_leaf_gsb_local_payment import tree_polynomial


def q7(poly: Poly) -> int:
    def c(k: int) -> int:
        return int(poly[k]) if k <= poly.degree() else 0

    return 14 * c(7) ** 2 - c(6) * c(7) - 16 * c(6) * c(8)


def record(poly: Poly, source: str, metadata: dict[str, object]) -> tuple[Fraction, dict]:
    value = q7(poly)
    scale = int(poly[6]) * int(poly[7])
    return Fraction(value, scale), {
        "source": source,
        **metadata,
        "order": int(poly[1]),
        "alpha": poly.degree(),
        "Q7": value,
        "normalized": [value, scale],
        "polynomial": [int(x) for x in poly],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=20000)
    parser.add_argument("--maximum-order", type=int, default=300)
    parser.add_argument("--seed", type=int, default=993007)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    sys.setrecursionlimit(max(5000, 4 * args.maximum_order))
    rng = random.Random(args.seed)
    pool: list[tuple[Poly, dict[str, object]]] = []
    closest: tuple[Fraction, dict] | None = None
    failure = None
    tree_checks = 0
    product_checks = 0

    def inspect(poly: Poly, source: str, metadata: dict[str, object]) -> None:
        nonlocal closest, failure
        if poly.degree() < 12:
            return
        candidate = record(poly, source, metadata)
        if closest is None or candidate[0] < closest[0]:
            closest = candidate
        if candidate[1]["Q7"] < 0 and failure is None:
            failure = candidate[1]

    for sample in range(args.samples):
        order = rng.randint(12, args.maximum_order)
        graph = nx.from_prufer_sequence([rng.randrange(order) for _ in range(order - 2)])
        adjacency = [list(graph.neighbors(v)) for v in range(order)]
        poly = tree_polynomial(adjacency)
        metadata = {"sample": sample, "prufer": nx.to_prufer_sequence(graph)}
        tree_checks += 1
        inspect(poly, "random_tree", metadata)
        pool.append((poly, metadata))
        if len(pool) > 512:
            pool.pop(rng.randrange(len(pool)))

        if len(pool) >= 2:
            factors = rng.sample(pool, rng.randint(2, min(5, len(pool))))
            product = Poly([1])
            ids = []
            for factor, factor_metadata in factors:
                product *= factor
                ids.append(factor_metadata["sample"])
            product_checks += 1
            inspect(product, "random_forest_product", {"factor_samples": ids})

        if failure is not None:
            break

    report = {
        "status": (
            "FAIL_EXACT_REQUIRED_RANK7_RESERVE_COUNTEREXAMPLE"
            if failure is not None
            else "PASS_EXACT_RANDOM_RANK7_RESERVE_STRESS_NOT_THEOREM"
        ),
        "seed": args.seed,
        "tree_checks": tree_checks,
        "product_checks": product_checks,
        "closest": closest[1] if closest else None,
        "failure": failure,
        "warning": "random finite evidence only",
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"], flush=True)
    print("tree checks", tree_checks, "product checks", product_checks, flush=True)
    if closest:
        print("closest", closest[0], closest[1]["source"], closest[1]["order"], closest[1]["alpha"], flush=True)
    if failure:
        print(json.dumps(failure), flush=True)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
