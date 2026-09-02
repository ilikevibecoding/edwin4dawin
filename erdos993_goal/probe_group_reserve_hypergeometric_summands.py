#!/usr/bin/env python3
"""Probe the fixed-k terminating 3F2 summands behind the group reserve."""

from __future__ import annotations

import json
import math
from pathlib import Path

from flint import ctx, fmpz_poly


OUTPUT_PATH = Path("group_reserve_hypergeometric_summands_probe_20260802.json")


def choose(n, k):
    return math.comb(n, k) if n >= 0 and 0 <= k <= n else 0


def fixed_k(a, b, r, N, p, q, k):
    return [
        choose(b, k) * choose(r, j)
        * choose(a + b - k, N - q - b + k - j)
        * choose(a + k + r - j, N - p - k)
        for j in range(r + 1)
    ]


def roots(values):
    while values and values[-1] == 0:
        values = values[:-1]
    if len(values) <= 1:
        return {"degree": len(values) - 1, "negative": len(values) - 1, "positive": 0, "nonreal": 0}, []
    counts = {"degree": len(values) - 1, "negative": 0, "positive": 0, "nonreal": 0}
    real = []
    for root, multiplicity in fmpz_poly(values).complex_roots():
        if root.imag.is_zero():
            if root.real < 0:
                counts["negative"] += multiplicity
                real.extend([float(root.real.mid())] * multiplicity)
            elif root.real > 0:
                counts["positive"] += multiplicity
        else:
            counts["nonreal"] += multiplicity
    return counts, sorted(real)


def pair_word(left, right):
    labels = sorted([(x, "L") for x in left] + [(x, "R") for x in right])
    return "".join(label for _, label in labels)


def main():
    ctx.prec = 100
    records = []
    for m, x, r in [(2, 4, 4), (3, 6, 6), (4, 8, 8), (6, 12, 12), (8, 16, 16)]:
        a, b, N = m + x + 1, 2 * m + 1, m + r + 4
        summands = []
        root_lists = []
        for k in range(b + 1):
            values = fixed_k(a, b, r, N, 0, 0, k)
            counts, real = roots(values)
            summands.append({"k": k, **counts})
            root_lists.append(real)
        neighbor_words = [pair_word(root_lists[k], root_lists[k + 1]) for k in range(b)]
        prefix = [0] * (r + 1)
        prefix_records = []
        for k in range(b + 1):
            values = fixed_k(a, b, r, N, 0, 0, k)
            prefix = [u + v for u, v in zip(prefix, values)]
            counts, _ = roots(prefix)
            prefix_records.append({"through_k": k, **counts})
        paired_records = []
        paired = [0] * (r + 1)
        for k in range((b + 2) // 2):
            mate = b - k
            left = fixed_k(a, b, r, N, 0, 0, k)
            right = [0] * (r + 1) if mate == k else fixed_k(a, b, r, N, 0, 0, mate)
            paired = [u + v + w for u, v, w in zip(paired, left, right)]
            counts, _ = roots(paired)
            paired_records.append({"through_pair": [k, mate], **counts})
        records.append({
            "m": m, "x": x, "r": r,
            "summands": summands,
            "neighbor_root_words": neighbor_words,
            "prefix_sums": prefix_records,
            "symmetric_pair_sums": paired_records,
        })
    report = {"status": "GROUP_RESERVE_HYPERGEOMETRIC_SUMMAND_PROBE", "records": records, "warning": "Finite numerical root isolation only."}
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
