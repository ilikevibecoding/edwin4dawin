#!/usr/bin/env python3
"""Exact targeted forest-counterexample search from non-log-concave trees.

This is a finite diagnostic.  It tests whether either known order-26
log-concavity breaker, its powers, or standard path/star/double-star factors
produce a non-unimodal product.  Any hit is saved with exact coefficients;
no-hit output is evidence only.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
from pathlib import Path

from flint import fmpz_poly


HERE = Path(__file__).resolve().parent
SOURCE = (
    HERE / "literature_sources" / "erdos-problem-993-current" / "results"
    / "analysis_n26.json"
)
OUTPUT = HERE / (
    "nonlogconcave_tree_product_counterexample_search_root_20260827.json"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[int], right: list[int]) -> list[int]:
    result = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        result[index] += value
    for index, value in enumerate(right):
        result[index] += value
    while len(result) > 1 and result[-1] == 0:
        result.pop()
    return result


def convolve(left: list[int], right: list[int]) -> list[int]:
    product = fmpz_poly(left) * fmpz_poly(right)
    return [int(product[index]) for index in range(len(product))]


def shift(polynomial: list[int]) -> list[int]:
    return [0, *polynomial]


def binomial_row(order: int) -> list[int]:
    return [math.comb(order, index) for index in range(order + 1)]


def path_polynomial(order: int) -> list[int]:
    if order == 0:
        return [1]
    if order == 1:
        return [1, 1]
    previous_previous = [1]
    previous = [1, 1]
    for _ in range(2, order + 1):
        current = add(previous, shift(previous_previous))
        previous_previous, previous = previous, current
    return previous


def star_polynomial(leaves: int) -> list[int]:
    return add(binomial_row(leaves), [0, 1])


def double_star_polynomial(left_leaves: int, right_leaves: int) -> list[int]:
    left = binomial_row(left_leaves)
    right = binomial_row(right_leaves)
    return add(
        convolve(left, add(right, [0, 1])),
        shift(right),
    )


def first_unimodality_failure(row: list[int]) -> dict | None:
    falling = False
    for index in range(1, len(row)):
        if row[index] < row[index - 1]:
            falling = True
        elif row[index] > row[index - 1] and falling:
            return {
                "increase_index": index,
                "triple": row[max(0, index - 2):index + 1],
            }
    return None


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    breakers = [
        {
            "name": f"order26_lc_breaker_{index + 1}",
            "order": 26,
            "graph6": row["graph6"],
            "poly": row["poly"],
        }
        for index, row in enumerate(source["lc_failures"])
    ]
    assert len(breakers) == 2
    assert all(first_unimodality_failure(row["poly"]) is None for row in breakers)

    standard: list[dict] = []
    for order in range(1, 121):
        standard.append({
            "name": f"path_{order}", "order": order,
            "poly": path_polynomial(order),
        })
    for leaves in range(1, 121):
        standard.append({
            "name": f"star_{leaves}", "order": leaves + 1,
            "poly": star_polynomial(leaves),
        })
    for left in range(0, 41):
        for right in range(left, 41):
            standard.append({
                "name": f"double_star_{left}_{right}",
                "order": left + right + 2,
                "poly": double_star_polynomial(left, right),
            })
    unique: dict[tuple[int, ...], dict] = {}
    for row in standard:
        unique.setdefault(tuple(row["poly"]), row)
    standard = list(unique.values())
    assert all(first_unimodality_failure(row["poly"]) is None for row in standard)

    checks = 0
    hits: list[dict] = []

    def check(factors: list[dict]) -> None:
        nonlocal checks
        polynomial = [1]
        order = 0
        for factor in factors:
            polynomial = convolve(polynomial, factor["poly"])
            order += factor["order"]
        checks += 1
        failure = first_unimodality_failure(polynomial)
        if failure:
            hits.append({
                "factor_names": [factor["name"] for factor in factors],
                "factor_orders": [factor["order"] for factor in factors],
                "forest_order": order,
                "independence_polynomial": polynomial,
                "failure": failure,
            })

    for breaker in breakers:
        for factor in standard:
            check([breaker, factor])

    powers: list[list[dict]] = []
    for breaker in breakers:
        factors: list[dict] = []
        for _ in range(1, 31):
            factors = [*factors, breaker]
            powers.append(factors)
            check(factors)
            for factor in standard:
                check([*factors, factor])

    for first_power in range(1, 21):
        for second_power in range(1, 21 - first_power):
            check(
                [breakers[0]] * first_power
                + [breakers[1]] * second_power
            )

    for first_index, first in enumerate(standard):
        for second in standard[first_index:]:
            check([first, second])
            if hits:
                break
        if hits:
            break

    payload = {
        "schema": "nonlogconcave-tree-product-counterexample-search-root-v1",
        "status": (
            "FINITE_EXACT_FOREST_COUNTEREXAMPLE_CANDIDATE_FOUND_REQUIRES_AUDIT"
            if hits else
            "NO_NONUNIMODAL_PRODUCT_IN_TARGETED_EXACT_SEARCH_EVIDENCE_ONLY"
        ),
        "source": str(SOURCE),
        "source_sha256": sha256(SOURCE),
        "known_order26_breakers": [
            {key: value for key, value in row.items() if key != "poly"}
            for row in breakers
        ],
        "standard_unique_tree_polynomials": len(standard),
        "families": {
            "paths_orders": [1, 120],
            "stars_leaf_counts": [1, 120],
            "double_star_leaf_counts_each": [0, 40],
            "breaker_powers": [1, 30],
            "mixed_breaker_total_power_maximum": 20,
        },
        "exact_product_checks": checks,
        "hits": hits,
        "scope_warning": (
            "A no-hit result is finite evidence only.  A hit is only a candidate "
            "until each tree factor and the exact product are independently replayed."
        ),
        "script_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("CHECKS", checks, "HITS", len(hits), flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)


if __name__ == "__main__":
    main()
