#!/usr/bin/env python3
"""Random exact scan of I(S) ~p I(S-root) on planted HIT subtrees."""

from __future__ import annotations

import argparse
import json
import random
import time
from pathlib import Path

import networkx as nx

from hit_curvature_reserve_stress import make_hit, planted_state
from hit_lc_evolution import random_tree
from toeplitz_pair_closure_search import partial_failure


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trials", type=int, default=10_000)
    parser.add_argument("--min-core", type=int, default=10)
    parser.add_argument("--max-core", type=int, default=200)
    parser.add_argument("--max-extra", type=int, default=8)
    parser.add_argument("--states-per-tree", type=int, default=20)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("random_hit_deletion_partial_scan.json"),
    )
    args = parser.parse_args()
    rng = random.Random(args.seed)
    started = time.time()
    states_checked = 0
    first = None
    best_negative = None
    for trial in range(args.trials):
        h = rng.randint(args.min_core, args.max_core)
        core_rows = random_tree(h, rng)
        core = nx.Graph()
        core.add_nodes_from(range(h))
        core.add_edges_from(
            (v, w)
            for v, row in enumerate(core_rows)
            for w in row
            if v < w
        )
        extras = [rng.randint(0, args.max_extra) for _ in range(h)]
        graph, leaves = make_hit(core, extras)
        memo = {}
        oriented = [
            (v, parent)
            for v in graph
            for parent in ([None] if v < h else [])
            + list(graph[v])
        ]
        rng.shuffle(oriented)
        for v, parent in oriented[: args.states_per_tree]:
            state = planted_state(graph, v, parent, memo)
            failure = partial_failure(state.t, state.e)
            states_checked += 1
            if failure is not None:
                first = {
                    "trial": trial,
                    "core_order": h,
                    "core_edges": [
                        [u, w] for u, w in core.edges()
                    ],
                    "extra_leaves": extras,
                    "leaf_counts": leaves,
                    "tree_order": len(graph),
                    "vertex": v,
                    "parent": parent,
                    "T": state.t,
                    "E": state.e,
                    **failure,
                }
                break
        if first is not None:
            break
        if (trial + 1) % 1000 == 0:
            print(
                f"trials={trial + 1:,} states={states_checked:,}",
                flush=True,
            )
    report = {
        "status": "counterexample" if first else "no_failure",
        "parameters": vars(args) | {"out": str(args.out)},
        "trials_completed": trial + 1,
        "states_checked": states_checked,
        "elapsed_seconds": time.time() - started,
        "first_failure": first,
    }
    args.out.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    return 1 if first else 0


if __name__ == "__main__":
    raise SystemExit(main())
