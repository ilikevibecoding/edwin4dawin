#!/usr/bin/env python3
"""Random exact stress test of one factorial-curvature rank."""

from __future__ import annotations

import argparse
import json
import random
import time
from pathlib import Path

import networkx as nx

from random_acwf_leaf_monotonicity_scan import random_tree
from scan_fixed_rank_leaf_curvature_fast import (
    all_root_states,
    coefficient,
    curvature,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rank", type=int, required=True)
    parser.add_argument("--trials", type=int, default=100_000)
    parser.add_argument("--min-order", type=int, default=18)
    parser.add_argument("--max-order", type=int, default=200)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    limit = args.rank + 1
    rng = random.Random(args.seed)
    started = time.time()
    minimum_increment = None
    minimum_witness = None
    first_failure = None

    for trial in range(args.trials):
        order = rng.randint(args.min_order, args.max_order)
        tree = random_tree(rng, order)
        p = rng.randrange(order)
        root_deleted, whole = all_root_states(tree, limit)
        old_curvature = curvature(whole, args.rank)
        extended = list(whole)
        if len(extended) < limit + 1:
            extended.extend([0] * (limit + 1 - len(extended)))
        b = root_deleted[p]
        for k in range(1, limit + 1):
            extended[k] += coefficient(b, k - 1)
        new_curvature = curvature(extended, args.rank)
        increment = new_curvature - old_curvature
        if minimum_increment is None or increment < minimum_increment:
            minimum_increment = increment
            minimum_witness = {
                "trial": trial,
                "old_order": order,
                "attachment_vertex": p,
                "attachment_degree": tree.degree(p),
                "old_curvature": old_curvature,
                "new_curvature": new_curvature,
                "increment": increment,
                "prufer": nx.to_prufer_sequence(tree),
                "old_coefficients": whole,
                "new_coefficients": extended,
            }
        if increment < 0:
            first_failure = minimum_witness
            break
        if (trial + 1) % 10_000 == 0:
            print(
                f"trials={trial + 1:,} min_delta={minimum_increment}",
                flush=True,
            )

    payload = {
        "rank": args.rank,
        "parameters": vars(args) | {"out": str(args.out)},
        "trials_completed": trial + 1,
        "minimum_increment": minimum_increment,
        "minimum_witness": minimum_witness,
        "first_failure": first_failure,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps(payload, indent=2))
    return 1 if first_failure is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
