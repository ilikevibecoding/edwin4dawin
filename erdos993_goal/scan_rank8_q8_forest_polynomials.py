#!/usr/bin/env python3
"""Exact finite census of rank-eight Q8 over forest polynomials."""

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


def q8(p: tuple[int, ...]) -> int:
    return 16 * p[8] ** 2 - p[7] * p[8] - 18 * p[7] * p[9]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--maximum", type=int, default=20)
    args = ap.parse_args()
    maximum = args.maximum
    if not 9 <= maximum <= len(EXPECTED_TREES):
        raise SystemExit("maximum must lie in 9..20")

    trees: list[set[tuple[int, ...]]] = [set() for _ in range(maximum + 1)]
    forests: list[set[tuple[int, ...]]] = [set() for _ in range(maximum + 1)]
    forests[0].add((1,))
    by_order: dict[str, dict[str, object]] = {}
    negative_by_alpha: dict[int, int] = {}
    negative_by_order_alpha: dict[str, int] = {}
    most_negative: tuple[int, int, int, tuple[int, ...]] | None = None
    negative_rows: list[dict[str, object]] = []
    required_minimum: tuple[int, int, tuple[int, ...]] | None = None

    for n in range(1, maximum + 1):
        if n == 1:
            trees[n].add((1, 1))
            tree_count = 1
        else:
            tree_count = 0
            for tree in nx.nonisomorphic_trees(n):
                tree_count += 1
                trees[n].add(tree_polynomial(tree))
        assert tree_count == EXPECTED_TREES[n - 1]

        current = set(trees[n])
        for component_order in range(1, n // 2 + 1):
            for component in trees[component_order]:
                for rest in forests[n - component_order]:
                    current.add(multiply(component, rest))
        forests[n] = current
        assert len(current) == EXPECTED_DISTINCT_FOREST_POLYNOMIALS[n - 1]

        eligible = 0
        negative = 0
        local_minimum: tuple[int, tuple[int, ...]] | None = None
        for p in current:
            alpha = len(p) - 1
            if alpha < 9:
                continue
            value = q8(p)
            if value < 0:
                negative_by_alpha[alpha] = negative_by_alpha.get(alpha, 0) + 1
                key = f"n={n},alpha={alpha}"
                negative_by_order_alpha[key] = negative_by_order_alpha.get(key, 0) + 1
                negative_candidate = (value, n, alpha, p)
                if most_negative is None or negative_candidate < most_negative:
                    most_negative = negative_candidate
                negative_rows.append({
                    "value": value,
                    "order": n,
                    "alpha": alpha,
                    "polynomial": list(p),
                })
            if alpha < 14:
                continue
            eligible += 1
            if value < 0:
                negative += 1
            candidate = (value, p)
            if local_minimum is None or candidate < local_minimum:
                local_minimum = candidate
            global_candidate = (value, n, p)
            if required_minimum is None or global_candidate < required_minimum:
                required_minimum = global_candidate

        if n >= 14:
            assert local_minimum is not None
            by_order[str(n)] = {
                "unlabeled_trees": tree_count,
                "distinct_tree_polynomials": len(trees[n]),
                "distinct_forest_polynomials": len(current),
                "eligible_alpha_at_least_14": eligible,
                "negative_eligible_rows": negative,
                "minimum_Q8": local_minimum[0],
                "minimum_polynomial": list(local_minimum[1]),
            }
        print(n, tree_count, len(current), eligible, None if local_minimum is None else local_minimum[0], flush=True)

    assert required_minimum is not None
    output = Path(__file__).with_name(
        f"rank8_q8_forest_polynomials_through_n{maximum}_exact_20260816.json"
    )
    payload = {
        "status": f"PASS_EXACT_Q8_FOREST_POLYNOMIAL_CENSUS_THROUGH_ORDER_{maximum}",
        "functional": "Q8=16*i8^2-i7*i8-18*i7*i9",
        "theorem_candidate_range": "alpha>=14",
        "orders": by_order,
        "global_required_minimum": {
            "value": required_minimum[0],
            "order": required_minimum[1],
            "polynomial": list(required_minimum[2]),
        },
        "negative_rows_all_alphas": dict(sorted(negative_by_alpha.items())),
        "negative_rows_by_order_alpha": negative_by_order_alpha,
        "most_negative_row": None if most_negative is None else {
            "value": most_negative[0],
            "order": most_negative[1],
            "alpha": most_negative[2],
            "polynomial": list(most_negative[3]),
        },
        "negative_rows": sorted(negative_rows, key=lambda row: (row["value"], row["order"], row["polynomial"])),
        "all_required_rows_nonnegative": all(x["negative_eligible_rows"] == 0 for x in by_order.values()),
        "warning": "Finite exact evidence only; orders above the maximum are not covered.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
