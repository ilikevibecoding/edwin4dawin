#!/usr/bin/env python3
"""Fast exact rank-4 leaf-curvature scan using directed-edge messages.

Only coefficients through degree 5 are needed.  For every directed edge
u->v, a cached rooted-tree message gives the truncated independence
polynomial of the component on u's side of uv.  Multiplying the incoming
messages at p yields I(T-p), so all attachment vertices can be tested
without rebuilding the tree or enumerating edge subsets.
"""

from __future__ import annotations

import argparse
import json
import time
from functools import lru_cache
from pathlib import Path

import networkx as nx

from leaf_addition_pendant_monotonicity_scan import graph6
from random_rank4_leaf_curvature_scan import (
    subdivided_double_star_envelope,
)
from verify_rank4_leaf_curvature_identities import (
    rank4_curvature_from_coefficients,
)


LIMIT = 5


def add(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(
        (a[k] if k < len(a) else 0) + (b[k] if k < len(b) else 0)
        for k in range(min(LIMIT + 1, max(len(a), len(b))))
    )


def mul(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * min(LIMIT + 1, len(a) + len(b) - 1)
    for i, avalue in enumerate(a):
        for j, bvalue in enumerate(b):
            if i + j > LIMIT:
                break
            out[i + j] += avalue * bvalue
    return tuple(out)


def shift(a: tuple[int, ...]) -> tuple[int, ...]:
    return (0,) + a[:LIMIT]


def coefficient(a: tuple[int, ...], k: int) -> int:
    return a[k] if k < len(a) else 0


def all_root_states(
    tree: nx.Graph,
) -> tuple[dict[int, tuple[int, ...]], tuple[int, ...]]:
    """Return I(T-p) for every p and I(T), all truncated at degree 5."""

    @lru_cache(maxsize=None)
    def message(u: int, parent: int) -> tuple[tuple[int, ...], tuple[int, ...]]:
        excluded = (1,)
        included_base = (1,)
        for w in tree[u]:
            if w == parent:
                continue
            child_excluded, child_total = message(w, u)
            excluded = mul(excluded, child_total)
            included_base = mul(included_base, child_excluded)
        total = add(excluded, shift(included_base))
        return excluded, total

    root_deleted: dict[int, tuple[int, ...]] = {}
    whole = None
    sentinel = -1
    for p in tree:
        excluded, total = message(p, sentinel)
        root_deleted[p] = excluded
        if whole is None:
            whole = total
        else:
            assert total == whole
    assert whole is not None
    return root_deleted, whole


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--min-order", type=int, required=True)
    parser.add_argument("--max-order", type=int, required=True)
    parser.add_argument("--start-index", type=int, default=0)
    parser.add_argument("--stop-index", type=int)
    parser.add_argument("--progress-every", type=int, default=25_000)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    totals = {
        "trees": 0,
        "attachments": 0,
        "negative_curvatures": 0,
        "negative_leaf_increments": 0,
        "below_double_star_envelope": 0,
    }
    first_negative_curvature = None
    first_negative_increment = None
    first_below_envelope = None
    per_order = []

    for order in range(args.min_order, args.max_order + 1):
        order_started = time.time()
        order_trees = 0
        minimum_curvature = None
        minimum_curvature_witness = None
        minimum_increment = None
        minimum_increment_witness = None
        minimum_envelope_excess = None
        minimum_envelope_excess_witness = None
        envelope, envelope_a, envelope_b = (
            subdivided_double_star_envelope(order)
        )

        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            if tree_index < args.start_index:
                continue
            if (
                args.stop_index is not None
                and tree_index >= args.stop_index
            ):
                break
            order_trees += 1
            totals["trees"] += 1
            root_deleted, whole = all_root_states(tree)
            curvature = rank4_curvature_from_coefficients(whole)
            if minimum_curvature is None or curvature < minimum_curvature:
                minimum_curvature = curvature
                minimum_curvature_witness = {
                    "tree_index": tree_index,
                    "graph6": graph6(tree),
                    "coefficients_0_to_5": whole,
                }
            if curvature < 0:
                totals["negative_curvatures"] += 1
                if first_negative_curvature is None:
                    first_negative_curvature = (
                        minimum_curvature_witness
                        | {"order": order, "curvature": curvature}
                    )

            for p in tree:
                extended = list(whole)
                b = root_deleted[p]
                for k in range(1, LIMIT + 1):
                    extended[k] += coefficient(b, k - 1)
                new_curvature = rank4_curvature_from_coefficients(extended)
                increment = new_curvature - curvature
                excess = increment - envelope
                totals["attachments"] += 1
                if minimum_increment is None or increment < minimum_increment:
                    minimum_increment = increment
                    minimum_increment_witness = {
                        "tree_index": tree_index,
                        "graph6": graph6(tree),
                        "attachment_vertex": p,
                        "attachment_degree": tree.degree(p),
                        "old_curvature": curvature,
                        "new_curvature": new_curvature,
                        "increment": increment,
                        "old_coefficients_0_to_5": whole,
                        "new_coefficients_0_to_5": extended,
                        "root_deleted_coefficients_0_to_4": b[:5],
                    }
                if (
                    minimum_envelope_excess is None
                    or excess < minimum_envelope_excess
                ):
                    minimum_envelope_excess = excess
                    minimum_envelope_excess_witness = {
                        "tree_index": tree_index,
                        "graph6": graph6(tree),
                        "attachment_vertex": p,
                        "attachment_degree": tree.degree(p),
                        "increment": increment,
                        "envelope": envelope,
                        "envelope_parameters": [envelope_a, envelope_b],
                        "excess": excess,
                    }
                if increment < 0:
                    totals["negative_leaf_increments"] += 1
                    if first_negative_increment is None:
                        first_negative_increment = (
                            minimum_increment_witness | {"order": order}
                        )
                if excess < 0:
                    totals["below_double_star_envelope"] += 1
                    if first_below_envelope is None:
                        first_below_envelope = (
                            minimum_envelope_excess_witness
                            | {"order": order}
                        )

            if (
                args.progress_every
                and order_trees % args.progress_every == 0
            ):
                print(
                    f"n={order} trees={order_trees:,} "
                    f"min_delta={minimum_increment} "
                    f"min_excess={minimum_envelope_excess}",
                    flush=True,
                )

        row = {
            "order": order,
            "start_index": args.start_index,
            "stop_index": args.stop_index,
            "trees": order_trees,
            "attachments": order_trees * order,
            "minimum_curvature": minimum_curvature,
            "minimum_curvature_witness": minimum_curvature_witness,
            "minimum_leaf_increment": minimum_increment,
            "minimum_leaf_increment_witness": minimum_increment_witness,
            "double_star_envelope": envelope,
            "double_star_envelope_parameters": [envelope_a, envelope_b],
            "minimum_envelope_excess": minimum_envelope_excess,
            "minimum_envelope_excess_witness": (
                minimum_envelope_excess_witness
            ),
            "elapsed_seconds": time.time() - order_started,
        }
        per_order.append(row)
        print(
            f"n={order} complete trees={order_trees:,} "
            f"min_C4={minimum_curvature} "
            f"min_delta={minimum_increment} "
            f"envelope={envelope} "
            f"min_excess={minimum_envelope_excess}",
            flush=True,
        )

    payload = {
        "parameters": vars(args) | {"out": str(args.out)},
        "totals": totals,
        "first_negative_curvature": first_negative_curvature,
        "first_negative_leaf_increment": first_negative_increment,
        "first_below_double_star_envelope": first_below_envelope,
        "per_order": per_order,
        "elapsed_seconds": time.time() - started,
    }
    args.out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    assert first_negative_curvature is None
    assert first_negative_increment is None
    assert first_below_envelope is None
    print("fast rank-4 leaf-curvature scan: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
