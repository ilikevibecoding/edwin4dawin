#!/usr/bin/env python3
"""Stress whether m_j<=2^j alone forces unimodality of facet mixtures.

A disjoint union of simplices with m_j facets of size j is the independence
complex of a complete multipartite graph with m_j parts of size j.  Its
positive-rank face numbers are p_s=sum_{j>=s} m_j C(j,s).  This diagnostic
searches the box 0<=m_j<=2^j.  A witness would show that the forest maximal-
set bound, by itself, cannot prove unimodality.  It would not be a forest
counterexample.
"""

from __future__ import annotations

import hashlib
import json
import random
from math import comb
from pathlib import Path


def row(m: list[int]) -> list[int]:
    alpha = len(m) - 1
    p = [1]
    for s in range(1, alpha + 1):
        p.append(sum(m[j] * comb(j, s) for j in range(s, alpha + 1)))
    while p and p[-1] == 0:
        p.pop()
    return p


def first_valley(p: list[int]) -> int | None:
    for r in range(1, len(p) - 1):
        if p[r - 1] > p[r] < p[r + 1]:
            return r
    return None


def main() -> None:
    rng = random.Random(20260829)
    checked = 0
    # Exact box through alpha=6: 3*5*9*17*33 = 757,350 rows after fixing
    # m_alpha=1; lower alphas are much smaller.
    for alpha in range(2, 7):
        limits = [0] + [1 << j for j in range(1, alpha)] + [1]

        def visit(j: int, m: list[int]) -> dict | None:
            nonlocal checked
            if j == alpha:
                candidate = m + [1]
                p = row(candidate)
                checked += 1
                r = first_valley(p)
                if r is not None:
                    return {"alpha": alpha, "m": candidate, "p": p, "valley_rank": r}
                return None
            for value in range(limits[j] + 1):
                witness = visit(j + 1, m + [value])
                if witness is not None:
                    return witness
            return None

        witness = visit(1, [0])
        if witness is not None:
            break
    else:
        witness = None

    # Random extreme/interior mixtures at larger alpha if the exact small box
    # did not already refute the proposed implication.
    if witness is None:
        for alpha in range(7, 41):
            for _ in range(100000):
                m = [0]
                for j in range(1, alpha):
                    limit = 1 << j
                    mode = rng.randrange(5)
                    if mode == 0:
                        value = 0
                    elif mode == 1:
                        value = limit
                    elif mode == 2:
                        value = rng.randrange(min(limit, 16) + 1)
                    else:
                        value = rng.randrange(limit + 1)
                    m.append(value)
                m.append(1)
                p = row(m)
                checked += 1
                r = first_valley(p)
                if r is not None:
                    witness = {"alpha": alpha, "m": m, "p": p, "valley_rank": r}
                    break
            if witness is not None:
                break

    source_sha = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    if witness is not None:
        report = {
            "marker": "MAXIMAL_SET_BOUND_ALONE_DOES_NOT_FORCE_UNIMODALITY",
            "scope_warning": "complete multipartite nonforest control only",
            "mixtures_checked_before_witness": checked,
            "source_sha256": source_sha,
            **witness,
        }
    else:
        report = {
            "marker": "NO_FACET_MIXTURE_VALLEY_IN_FINITE_SEARCH",
            "scope_warning": "finite diagnostic only; not a proof",
            "mixtures_checked": checked,
            "source_sha256": source_sha,
        }
    Path("maximal_bound_multipartite_search_root_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
