#!/usr/bin/env python3
"""Random exact stress test of the prefix leaf-mixture payment inequality."""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from pathlib import Path

import networkx as nx
from flint import fmpz_poly


X = fmpz_poly([0, 1])
ONE = fmpz_poly([1])


def tree_polynomial(adj: list[list[int]], deleted: int | None = None) -> fmpz_poly:
    seen = [False] * len(adj)

    def rooted(v: int, parent: int) -> tuple[fmpz_poly, fmpz_poly]:
        seen[v] = True
        excluded = ONE
        included_without_x = ONE
        for child in adj[v]:
            if child == parent or child == deleted:
                continue
            child_a, child_b = rooted(child, v)
            excluded *= child_a + X * child_b
            included_without_x *= child_a
        return excluded, included_without_x

    out = ONE
    for v in range(len(adj)):
        if v == deleted or seen[v]:
            continue
        a, b = rooted(v, -1)
        out *= a + X * b
    return out


def coeff(poly: fmpz_poly, k: int):
    return poly[k] if 0 <= k <= poly.degree() else 0


def reserve(poly: fmpz_poly, k: int):
    return (
        k * coeff(poly, k) ** 2
        + coeff(poly, k - 1) * coeff(poly, k)
        - (k + 1) * coeff(poly, k - 1) * coeff(poly, k + 1)
    )


def payment_numerator(old: fmpz_poly, deletion: fmpz_poly, r: int):
    a = coeff(old, r)
    ap = coeff(old, r + 1)
    bm = coeff(deletion, r - 1)
    b = coeff(deletion, r)
    bp = coeff(deletion, r + 1)
    local_reserve = a * b + b * b + 2 * (r + 1) * (ap * b - a * bp)
    mean_difference = bm * ((r + 1) * ap + b) - r * b * a
    return (
        local_reserve * bm * (a + bm) - mean_difference * mean_difference,
        local_reserve,
        mean_difference,
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", type=int, default=500)
    ap.add_argument("--min-order", type=int, default=16)
    ap.add_argument("--max-order", type=int, default=300)
    ap.add_argument("--attachments", type=int, default=3)
    ap.add_argument("--seed", type=int, default=993)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    sys.setrecursionlimit(max(5000, 4 * args.max_order))
    rng = random.Random(args.seed)
    started = time.time()
    checked_attachments = 0
    checked_prefix_ranks = 0
    payment_failure = None
    cascade_failure = None
    gsb_failure = None
    two_thirds_curvature_failure = None
    high_occupancy_scaled_curvature_failure = None
    minimum_payment = None
    minimum_payment_witness = None

    for sample in range(args.samples):
        n = rng.randint(args.min_order, args.max_order)
        prufer = [rng.randrange(n) for _ in range(n - 2)]
        graph = nx.from_prufer_sequence(prufer)
        adj = [list(graph.neighbors(v)) for v in range(n)]
        old = tree_polynomial(adj)
        vertices = rng.sample(range(n), min(n, args.attachments))

        for p in vertices:
            checked_attachments += 1
            deletion = tree_polynomial(adj, deleted=p)
            new = old + X * deletion
            cutoff = (2 * new.degree() + 1) // 3

            for k in range(1, cutoff):
                checked_prefix_ranks += 1
                if reserve(new, k) < 0 and gsb_failure is None:
                    gsb_failure = {
                        "sample": sample,
                        "order": n,
                        "prufer": prufer,
                        "attachment": p,
                        "rank": k,
                        "cutoff": cutoff,
                        "reserve": int(reserve(new, k)),
                    }
                if k >= 2:
                    lhs = (
                        k
                        * reserve(new, k)
                        * coeff(deletion, k - 2)
                    )
                    rhs = (
                        (k - 1)
                        * reserve(deletion, k - 1)
                        * coeff(new, k - 1)
                    )
                    if lhs < rhs and cascade_failure is None:
                        cascade_failure = {
                            "sample": sample,
                            "order": n,
                            "prufer": prufer,
                            "attachment": p,
                            "rank": k,
                            "cutoff": cutoff,
                            "lhs": int(lhs),
                            "rhs": int(rhs),
                            "difference": int(lhs - rhs),
                        }
                    if k >= 3:
                        scaled_left = (
                            k
                            * reserve(new, k)
                            * coeff(deletion, k - 2)
                            * coeff(deletion, k - 1)
                        )
                        scaled_right = (
                            (k - 1)
                            * reserve(deletion, k - 1)
                            * coeff(new, k - 1)
                            * coeff(new, k)
                        )
                        package_item = {
                            "sample": sample,
                            "order": n,
                            "prufer": prufer,
                            "attachment": p,
                            "rank": k,
                            "cutoff": cutoff,
                            "scaled_left": int(scaled_left),
                            "scaled_right": int(scaled_right),
                            "twice_reduced_current_minus_full_current": int(
                                2 * coeff(deletion, k - 1)
                                - coeff(new, k)
                            ),
                        }
                        if (
                            3 * scaled_left < 2 * scaled_right
                            and two_thirds_curvature_failure is None
                        ):
                            two_thirds_curvature_failure = package_item
                        if (
                            2 * coeff(deletion, k - 1)
                            >= coeff(new, k)
                            and scaled_left < scaled_right
                            and
                            high_occupancy_scaled_curvature_failure
                            is None
                        ):
                            high_occupancy_scaled_curvature_failure = (
                                package_item
                            )
                if k == 1:
                    continue
                value, local_reserve, mean_difference = payment_numerator(
                    old, deletion, k - 1
                )
                item = {
                    "sample": sample,
                    "order": n,
                    "prufer": prufer,
                    "attachment": p,
                    "rank_r": k - 1,
                    "gsb_rank_k": k,
                    "cutoff": cutoff,
                    "payment_numerator": int(value),
                    "local_reserve_numerator": int(local_reserve),
                    "mean_difference_numerator": int(mean_difference),
                }
                if minimum_payment is None or value < minimum_payment:
                    minimum_payment = value
                    minimum_payment_witness = item
                if value < 0 and payment_failure is None:
                    payment_failure = item
                    break
            if payment_failure:
                break
        if payment_failure:
            break
        if (sample + 1) % 50 == 0:
            print(f"completed {sample + 1}/{args.samples}", flush=True)

    payload = {
        "status": (
            "FAILURE"
            if payment_failure or cascade_failure or gsb_failure
            else "PASS"
        ),
        "parameters": {
            "samples": args.samples,
            "min_order": args.min_order,
            "max_order": args.max_order,
            "attachments": args.attachments,
            "seed": args.seed,
        },
        "checked_attachments": checked_attachments,
        "checked_prefix_ranks": checked_prefix_ranks,
        "payment_failure": payment_failure,
        "cascade_failure": cascade_failure,
        "gsb_failure": gsb_failure,
        "two_thirds_curvature_failure":
            two_thirds_curvature_failure,
        "high_occupancy_scaled_curvature_failure":
            high_occupancy_scaled_curvature_failure,
        "minimum_payment_witness": minimum_payment_witness,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
