#!/usr/bin/env python3
"""Exact finite census of the uniform Q_k reserve over forest polynomials.

For each requested k, the candidate range is alpha(F) >= 2k-2 and

    Q_k = 2k i_k^2 - i_(k-1)i_k - 2(k+1)i_(k-1)i_(k+1).

This is finite evidence only.  The script deliberately constructs the complete
set of distinct forest independence polynomials at every order in the requested
range, using the independently audited order counts shared by the rank-eight
forest scans.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx
from flint import fmpz_poly as Poly

from scan_forest_iso_reserve_floor import tree_polynomial
from scan_rank8_v8_forest_polynomials import (
    EXPECTED_DISTINCT_FOREST_POLYNOMIALS,
    EXPECTED_TREES,
)


def multiply(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(int(x) for x in Poly(list(a)) * Poly(list(b)))


def q_value(poly: tuple[int, ...], rank: int) -> int:
    return (
        2 * rank * poly[rank] ** 2
        - poly[rank - 1] * poly[rank]
        - 2 * (rank + 1) * poly[rank - 1] * poly[rank + 1]
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--maximum", type=int, default=20)
    ap.add_argument("--rank-first", type=int, default=3)
    ap.add_argument("--rank-last", type=int, default=10)
    args = ap.parse_args()
    maximum = args.maximum
    rank_first = args.rank_first
    rank_last = args.rank_last
    if not 3 <= rank_first <= rank_last:
        raise SystemExit("require 3 <= rank-first <= rank-last")
    if not 2 * rank_first - 2 <= maximum <= len(EXPECTED_TREES):
        raise SystemExit("maximum is outside the audited tree-count table")

    ranks = list(range(rank_first, rank_last + 1))
    trees: list[set[tuple[int, ...]]] = [set() for _ in range(maximum + 1)]
    forests: list[set[tuple[int, ...]]] = [set() for _ in range(maximum + 1)]
    forests[0].add((1,))
    summaries: dict[int, dict[str, object]] = {
        rank: {
            "cutoff_alpha": 2 * rank - 2,
            "eligible_rows": 0,
            "negative_rows": 0,
            "minimum": None,
            "minimum_order": None,
            "minimum_alpha": None,
            "minimum_polynomial": None,
            "by_order": {},
        }
        for rank in ranks
    }

    for order in range(1, maximum + 1):
        if order == 1:
            trees[order].add((1, 1))
            tree_count = 1
        else:
            tree_count = 0
            for tree in nx.nonisomorphic_trees(order):
                tree_count += 1
                trees[order].add(tree_polynomial(tree))
        assert tree_count == EXPECTED_TREES[order - 1]

        current = set(trees[order])
        for component_order in range(1, order // 2 + 1):
            for component in trees[component_order]:
                for rest in forests[order - component_order]:
                    current.add(multiply(component, rest))
        forests[order] = current
        assert len(current) == EXPECTED_DISTINCT_FOREST_POLYNOMIALS[order - 1]

        order_text: list[str] = []
        for rank in ranks:
            cutoff = 2 * rank - 2
            if order < cutoff:
                continue
            eligible = 0
            negatives = 0
            local_minimum: tuple[int, int, tuple[int, ...]] | None = None
            for poly in current:
                alpha = len(poly) - 1
                if alpha < cutoff:
                    continue
                eligible += 1
                value = q_value(poly, rank)
                negatives += value < 0
                candidate = (value, alpha, poly)
                if local_minimum is None or candidate < local_minimum:
                    local_minimum = candidate
            if local_minimum is None:
                continue
            summary = summaries[rank]
            summary["eligible_rows"] = int(summary["eligible_rows"]) + eligible
            summary["negative_rows"] = int(summary["negative_rows"]) + negatives
            summary["by_order"][str(order)] = {
                "eligible_rows": eligible,
                "negative_rows": negatives,
                "minimum": local_minimum[0],
                "minimum_alpha": local_minimum[1],
                "minimum_polynomial": list(local_minimum[2]),
            }
            old = summary["minimum"]
            if old is None or local_minimum[0] < int(old):
                summary["minimum"] = local_minimum[0]
                summary["minimum_order"] = order
                summary["minimum_alpha"] = local_minimum[1]
                summary["minimum_polynomial"] = list(local_minimum[2])
            order_text.append(
                f"Q{rank}:rows={eligible},neg={negatives},min={local_minimum[0]}"
            )
        print(
            f"order={order} trees={tree_count} forest_polynomials={len(current)} "
            + " ".join(order_text),
            flush=True,
        )

    all_nonnegative = all(int(s["negative_rows"]) == 0 for s in summaries.values())
    payload = {
        "status": (
            "PASS_EXACT_FINITE_UNIFORM_QK_FOREST_POLYNOMIAL_CENSUS"
            if all_nonnegative
            else "FOUND_EXACT_FINITE_UNIFORM_QK_NEGATIVE_ROW"
        ),
        "maximum_order": maximum,
        "rank_first": rank_first,
        "rank_last": rank_last,
        "candidate_range": "alpha(F)>=2k-2",
        "functional": "Q_k=2k*i_k^2-i_(k-1)*i_k-2(k+1)*i_(k-1)*i_(k+1)",
        "ranks": {str(rank): summaries[rank] for rank in ranks},
        "all_required_rows_nonnegative": all_nonnegative,
        "warning": "Finite exact evidence only; no order above maximum_order is covered.",
    }
    output = Path(__file__).with_name(
        f"uniform_qk_forest_polynomials_r{rank_first}_r{rank_last}_n{maximum}_exact_20260817.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
