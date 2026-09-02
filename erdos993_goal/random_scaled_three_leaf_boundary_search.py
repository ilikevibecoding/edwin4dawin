#!/usr/bin/env python3
"""Random exact stress search for the sole SM3 leaf-induction boundary.

For a random tree T and a chosen root p, put F=T-p and H=T-N[p].
Common isolated vertices are then appended to both F and H.  Whenever
alpha(T)=alpha(F), the relevant exceptional residues are tested at

    r = floor(2 alpha(F) / 3),
    B = D[r+1](F) + D[r](F) + D[r](H).

The program also audits the conditional split

    D[r](H) < 0  ==>  f[r] >= h[r-1]
                           and
                           D[r+1](F)+D[r](F) >= f[r].

All polynomial arithmetic is exact.  This is a falsification search,
not a proof.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from fractions import Fraction
from pathlib import Path

import networkx as nx
from flint import fmpz_poly

from random_leaf_gsb_local_payment import ONE, coeff
from scan_patternboost_scaled_three_boundary_payment import rooted_pair


ISOLATE = fmpz_poly([1, 1])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, default=1000)
    parser.add_argument("--min-order", type=int, default=20)
    parser.add_argument("--max-order", type=int, default=300)
    parser.add_argument("--roots", type=int, default=5)
    parser.add_argument("--max-padding", type=int, default=30)
    parser.add_argument("--max-extra-roots", type=int, default=30)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    sys.setrecursionlimit(max(5000, 4 * args.max_order))
    rng = random.Random(args.seed)
    started = time.time()
    roots_checked = 0
    boundary_instances = 0
    negative_closed_terms = 0
    direct_failure = None
    strengthened_direct_failure = None
    conditional_half_failure = None
    conditional_current_reserve_failure = None
    largest_negative_ratio: Fraction | None = None
    largest_negative_item = None

    for sample in range(args.samples):
        order = rng.randint(args.min_order, args.max_order)
        prufer = [rng.randrange(order) for _ in range(order - 2)]
        graph = nx.from_prufer_sequence(prufer)
        adjacency = [list(graph.neighbors(v)) for v in range(order)]
        roots = rng.sample(range(order), min(args.roots, order))

        for root in roots:
            roots_checked += 1
            full, pair_base, closed_base = rooted_pair(adjacency, root)
            if full.degree() != pair_base.degree():
                continue

            pair_with_extra_roots = pair_base
            for extra_roots in range(args.max_extra_roots + 1):
                pair_deleted = pair_with_extra_roots
                closed_deleted = closed_base
                for padding in range(args.max_padding + 1):
                    beta = pair_deleted.degree()
                    if beta % 3 in (1, 2):
                        boundary_instances += 1
                        rank = (2 * beta) // 3
                        reserve = (
                            3 * coeff(pair_deleted, rank + 1)
                            + 2 * coeff(pair_deleted, rank)
                            - coeff(pair_deleted, rank - 1)
                        )
                        closed_difference = (
                            3 * coeff(closed_deleted, rank)
                            - coeff(closed_deleted, rank - 1)
                        )
                        boundary = reserve + closed_difference
                        strengthened_boundary = (
                            boundary - coeff(pair_deleted, rank)
                        )
                        item = {
                            "sample": sample,
                            "order": order,
                            "prufer_zero_based": prufer,
                            "root_zero_based": root,
                            "extra_isolated_roots": extra_roots,
                            "padding": padding,
                            "beta": beta,
                            "rank": rank,
                            "pair_reserve": int(reserve),
                            "pair_current": int(
                                coeff(pair_deleted, rank)
                            ),
                            "closed_previous": int(
                                coeff(closed_deleted, rank - 1)
                            ),
                            "D_closed": int(closed_difference),
                            "boundary": int(boundary),
                            "strengthened_boundary": int(
                                strengthened_boundary
                            ),
                        }
                        if boundary < 0 and direct_failure is None:
                            direct_failure = item
                            break
                        if (
                            strengthened_boundary < 0
                            and strengthened_direct_failure is None
                        ):
                            strengthened_direct_failure = item
                        if closed_difference < 0:
                            negative_closed_terms += 1
                            if (
                                coeff(pair_deleted, rank)
                                < coeff(closed_deleted, rank - 1)
                                and conditional_half_failure is None
                            ):
                                conditional_half_failure = item
                            if (
                                reserve < coeff(pair_deleted, rank)
                                and conditional_current_reserve_failure is None
                            ):
                                conditional_current_reserve_failure = item
                            if reserve > 0:
                                ratio = Fraction(
                                    int(-closed_difference), int(reserve)
                                )
                                if (
                                    largest_negative_ratio is None
                                    or ratio > largest_negative_ratio
                                ):
                                    largest_negative_ratio = ratio
                                    largest_negative_item = item | {
                                        "minus_D_closed_over_pair_reserve":
                                            float(ratio)
                                    }
                    pair_deleted *= ISOLATE
                    closed_deleted *= ISOLATE
                if direct_failure is not None:
                    break
                pair_with_extra_roots *= ISOLATE
            if direct_failure is not None:
                break
        if direct_failure is not None:
            break
        if (sample + 1) % 100 == 0:
            print(f"completed {sample + 1}/{args.samples}", flush=True)

    report = {
        "status": "PASS_NOT_PROOF" if direct_failure is None else "FAIL",
        "parameters": {
            "samples": args.samples,
            "min_order": args.min_order,
            "max_order": args.max_order,
            "roots": args.roots,
            "max_padding": args.max_padding,
            "max_extra_roots": args.max_extra_roots,
            "seed": args.seed,
        },
        "roots_checked": roots_checked,
        "boundary_instances": boundary_instances,
        "negative_closed_terms": negative_closed_terms,
        "direct_boundary_failure": direct_failure,
        "strengthened_direct_boundary_failure":
            strengthened_direct_failure,
        "conditional_half_occupancy_failure": conditional_half_failure,
        "conditional_current_reserve_failure":
            conditional_current_reserve_failure,
        "largest_negative_ratio": largest_negative_item,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2), flush=True)
    return 0 if direct_failure is None else 1


if __name__ == "__main__":
    raise SystemExit(main())
