#!/usr/bin/env python3
"""Search the abstract weighted Boolean-interval mixture for a valley.

Every forest admits a recursive partition whose terms are x^a(1+x)^b, one
per maximal independent set, with top size m=a+b.  The maximal-set recurrence
also gives sum 2^-m <= 1, and the all-free branch supplies (1+x)^alpha.

This script asks whether those abstract conditions alone force unimodality.
A witness is only an obstruction to that compressed proof route; it need not
be realizable by a forest.
"""

from __future__ import annotations

import hashlib
import json
import random
from math import comb
from pathlib import Path


def add_term(p: list[int], a: int, b: int, multiplicity: int = 1) -> None:
    for j in range(b + 1):
        p[a + j] += multiplicity * comb(b, j)


def valley(p: list[int]) -> int | None:
    for r in range(1, len(p) - 1):
        if p[r - 1] > p[r] < p[r + 1]:
            return r
    return None


def main() -> None:
    rng = random.Random(20260829)
    checked = 0
    witness = None
    # Capacity is measured in units 2^-alpha.  The mandatory (1+x)^alpha
    # consumes one unit; a term with top m consumes 2^(alpha-m) units.
    for alpha in range(4, 41):
        types = [(a, m - a, 1 << (alpha - m)) for m in range(1, alpha + 1) for a in range(1, m + 1)]
        for _ in range(200000):
            capacity = (1 << alpha) - 1
            p = [comb(alpha, s) for s in range(alpha + 1)]
            terms: dict[tuple[int, int], int] = {}
            # Mix greedy extreme allocations with fragmented random ones.
            steps = rng.randrange(1, 2 * alpha + 2)
            for _step in range(steps):
                eligible = [item for item in types if item[2] <= capacity]
                if not eligible:
                    break
                if rng.randrange(3) == 0:
                    # Bias toward a target rank to create a localized bump.
                    target = rng.randrange(1, alpha)
                    eligible.sort(key=lambda item: (abs((item[0] + item[1] / 2) - target), -item[0] - item[1]))
                    a, b, cost = eligible[rng.randrange(min(10, len(eligible)))]
                else:
                    a, b, cost = rng.choice(eligible)
                max_mult = capacity // cost
                if rng.randrange(2):
                    mult = max_mult
                else:
                    mult = rng.randrange(1, max_mult + 1)
                add_term(p, a, b, mult)
                terms[(a, b)] = terms.get((a, b), 0) + mult
                capacity -= mult * cost
            checked += 1
            r = valley(p)
            if r is not None:
                witness = {
                    "alpha": alpha,
                    "terms": [
                        {"a": a, "b": b, "top": a + b, "multiplicity": mult}
                        for (a, b), mult in sorted(terms.items())
                    ],
                    "unused_capacity_units": capacity,
                    "capacity_denominator": 1 << alpha,
                    "p": p,
                    "valley_rank": r,
                }
                break
        if witness is not None:
            break

    source_sha = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    if witness is None:
        report = {
            "marker": "NO_WEIGHTED_INTERVAL_MIXTURE_VALLEY_IN_FINITE_SEARCH",
            "scope_warning": "finite abstract diagnostic only; not a proof",
            "mixtures_checked": checked,
            "source_sha256": source_sha,
        }
    else:
        report = {
            "marker": "WEIGHTED_INTERVAL_BUDGET_ALONE_DOES_NOT_FORCE_UNIMODALITY",
            "scope_warning": "abstract interval mixture; not necessarily forest-realizable",
            "mixtures_checked_before_witness": checked,
            "source_sha256": source_sha,
            **witness,
        }
    Path("weighted_interval_mixture_search_root_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
