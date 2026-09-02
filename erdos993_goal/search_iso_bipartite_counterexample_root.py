#!/usr/bin/env python3
"""Deterministic exact search for a bipartite counterexample to ISO.

This is diagnostic only.  It evaluates the independence polynomial of a
bipartite graph by summing over subsets of the smaller color class:

    I_G(x) = sum_{S subseteq L} x^|S| (1+x)^|R minus N(S)|.

No claim is inferred from a failure-free finite search.
"""

from __future__ import annotations

import hashlib
import json
import random
from math import comb
from pathlib import Path


def independence_poly_bipartite(rows: tuple[int, ...], right_size: int) -> list[int]:
    left_size = len(rows)
    p = [0] * (left_size + right_size + 1)
    unions = [0] * (1 << left_size)
    for subset in range(1 << left_size):
        if subset:
            bit = subset & -subset
            idx = bit.bit_length() - 1
            unions[subset] = unions[subset ^ bit] | rows[idx]
        left_count = subset.bit_count()
        free_right = right_size - unions[subset].bit_count()
        for j in range(free_right + 1):
            p[left_count + j] += comb(free_right, j)
    while p and p[-1] == 0:
        p.pop()
    return p


def iso_minimum(p: list[int]) -> tuple[int, int]:
    minimum = 10**100
    arg = -1
    for r in range(1, len(p) - 1):
        gap = r * p[r] * p[r] + p[r - 1] * p[r - 1] - (r + 1) * p[r - 1] * p[r + 1]
        if gap < minimum:
            minimum = gap
            arg = r
    return minimum, arg


def check(rows: tuple[int, ...], right_size: int) -> tuple[bool, dict | None, int]:
    p = independence_poly_bipartite(rows, right_size)
    gap, r = iso_minimum(p)
    if gap < 0:
        return False, {"rows": list(rows), "right_size": right_size, "p": p, "rank": r, "gap": gap}, gap
    return True, None, gap


def main() -> None:
    checked = 0
    minimum_gap = None
    minimum_record = None

    # Exhaust every labelled 4-by-4 bipartite graph.
    exhaustive_left = 4
    exhaustive_right = 4
    for code in range(1 << (exhaustive_left * exhaustive_right)):
        mask = (1 << exhaustive_right) - 1
        rows = tuple((code >> (i * exhaustive_right)) & mask for i in range(exhaustive_left))
        ok, witness, gap = check(rows, exhaustive_right)
        checked += 1
        if minimum_gap is None or gap < minimum_gap:
            minimum_gap = gap
            minimum_record = {"rows": list(rows), "right_size": exhaustive_right, "gap": gap}
        if not ok:
            print(json.dumps({"marker": "FOUND_BIPARTITE_ISO_COUNTEREXAMPLE", **witness}, indent=2))
            return

    # Deterministic random stress with strongly unbalanced sides and a wide
    # density range.  The smaller side is always enumerated.
    rng = random.Random(20260829)
    sizes = [(4, 20), (5, 15), (6, 12), (7, 10), (8, 8), (8, 14), (10, 10)]
    densities = (0.03, 0.08, 0.15, 0.25, 0.4, 0.6, 0.8, 0.95)
    for left, right in sizes:
        for density in densities:
            for _ in range(1000):
                rows = tuple(
                    sum((1 << j) for j in range(right) if rng.random() < density)
                    for _i in range(left)
                )
                ok, witness, gap = check(rows, right)
                checked += 1
                if minimum_gap is None or gap < minimum_gap:
                    minimum_gap = gap
                    minimum_record = {"rows": list(rows), "right_size": right, "gap": gap}
                if not ok:
                    edge_count = sum(row.bit_count() for row in rows)
                    out = {
                        "marker": "FOUND_BIPARTITE_ISO_COUNTEREXAMPLE",
                        "scope_warning": "bipartite nonforest; not a counterexample to Erdos Problem 993",
                        "graphs_checked_before_witness": checked,
                        "left_size": left,
                        "edge_count": edge_count,
                        "vertex_count": left + right,
                        "is_forest": False,
                        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
                        **witness,
                    }
                    Path("iso_bipartite_counterexample_root_20260829.json").write_text(
                        json.dumps(out, indent=2) + "\n", encoding="utf-8"
                    )
                    print(json.dumps(out, indent=2))
                    return

    source_sha = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "marker": "NO_BIPARTITE_ISO_COUNTEREXAMPLE_IN_EXACT_SEARCH",
        "scope_warning": "finite diagnostic only; not a proof",
        "exhaustive_labelled_class": "all 4-by-4 bipartite graphs",
        "random_seed": 20260829,
        "random_sizes": sizes,
        "random_densities": densities,
        "random_graphs_per_size_density": 1000,
        "graphs_checked": checked,
        "minimum_raw_gap": minimum_gap,
        "minimum_record": minimum_record,
        "source_sha256": source_sha,
    }
    Path("iso_bipartite_search_exact_root_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
