#!/usr/bin/env python3
"""Exact distinct-polynomial census for the rank-eight V residual.

This is an exhaustive finite census through the requested maximum order,
not an all-order theorem.  Forests are represented by their exact full
independence polynomials; equality of rows is safe because V8 and alpha
depend only on that polynomial.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import networkx as nx
from flint import fmpz_poly as Poly

from scan_forest_iso_reserve_floor import tree_polynomial


EXPECTED_TREES = (
    1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159,
    7741, 19320, 48629, 123867, 317955, 823065,
)

EXPECTED_DISTINCT_FOREST_POLYNOMIALS = (
    1, 2, 3, 6, 10, 20, 36, 73, 142, 294, 618, 1348, 2974, 6777,
    15739, 37524, 90965, 224562, 561475, 1425505,
)


def multiply(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(int(x) for x in Poly(list(a)) * Poly(list(b)))


def v8(p: tuple[int, ...]) -> int:
    return 10 * p[6] * p[7] + 136 * p[6] * p[8] - 98 * p[7] ** 2


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--maximum", type=int, default=20)
    args = ap.parse_args()
    maximum = args.maximum
    if not 14 <= maximum <= len(EXPECTED_TREES):
        raise SystemExit("maximum must lie in 14..20")

    trees: list[set[tuple[int, ...]]] = [set() for _ in range(maximum + 1)]
    forests: list[set[tuple[int, ...]]] = [set() for _ in range(maximum + 1)]
    forests[0].add((1,))
    rows: dict[str, dict[str, object]] = {}
    global_minimum: tuple[int, int, tuple[int, ...]] | None = None
    negative_by_alpha: dict[int, int] = {}

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

        current: set[tuple[int, ...]] = set(trees[n])
        # Every disconnected forest has a component of order at most n/2.
        # Multiplying every such component row by every already-complete
        # remainder row is therefore exhaustive; the set removes duplicates.
        for component_order in range(1, n // 2 + 1):
            for component in trees[component_order]:
                for rest in forests[n - component_order]:
                    current.add(multiply(component, rest))
        forests[n] = current
        assert len(current) == EXPECTED_DISTINCT_FOREST_POLYNOMIALS[n - 1]

        eligible = 0
        local_minimum: tuple[int, tuple[int, ...]] | None = None
        local_negative = 0
        for p in current:
            alpha = len(p) - 1
            value = v8(p) if alpha >= 8 else 0
            if value < 0:
                negative_by_alpha[alpha] = negative_by_alpha.get(alpha, 0) + 1
            if alpha < 14:
                continue
            eligible += 1
            if value < 0:
                local_negative += 1
            candidate = (value, p)
            if local_minimum is None or candidate < local_minimum:
                local_minimum = candidate
            global_candidate = (value, n, p)
            if global_minimum is None or global_candidate < global_minimum:
                global_minimum = global_candidate
        if n >= 14:
            assert local_minimum is not None
            rows[str(n)] = {
                "unlabeled_trees": tree_count,
                "distinct_tree_polynomials": len(trees[n]),
                "distinct_forest_polynomials": len(current),
                "eligible_alpha_at_least_14": eligible,
                "minimum_V8": local_minimum[0],
                "minimum_polynomial": list(local_minimum[1]),
                "negative_eligible_rows": local_negative,
            }
        print(
            n, "trees", tree_count, "tree_rows", len(trees[n]),
            "forest_rows", len(current),
            "eligible", eligible,
            "minimum", None if local_minimum is None else local_minimum[0],
            flush=True,
        )

    assert global_minimum is not None
    report_path = Path(__file__).with_name(
        f"rank8_v8_forest_polynomials_through_n{maximum}_exact_20260816.json"
    )
    payload = {
        "status": f"PASS_EXACT_V8_FOREST_POLYNOMIAL_CENSUS_THROUGH_ORDER_{maximum}",
        "scope": (
            "Every distinct full independence polynomial of an unlabeled forest "
            f"through order {maximum}; theorem range alpha>=14."
        ),
        "functional": "V8=10*i6*i7+136*i6*i8-98*i7^2",
        "orders": rows,
        "global_minimum": {
            "value": global_minimum[0],
            "order": global_minimum[1],
            "polynomial": list(global_minimum[2]),
        },
        "negative_rows_all_alphas": dict(sorted(negative_by_alpha.items())),
        "all_required_rows_nonnegative": all(
            row["negative_eligible_rows"] == 0 for row in rows.values()
        ),
        "warning": "Finite exact evidence only; orders above the maximum are not covered.",
    }
    report_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(report_path.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
