#!/usr/bin/env python3
"""Search disjoint midpoint AM-GM payments for a scoped H_str polynomial.

Exploration only. A result becomes theorem-grade only after an exact producer,
coverage proof, and independent audit are packaged.
"""

from __future__ import annotations

import argparse
import itertools

from explore_rank8_low_high_strong_aux_faces import ALLOWED, build


def candidates(target, demand, positive):
    rows = []
    ranges = [range(2 * exponent + 1) for exponent in target]
    for low in itertools.product(*ranges):
        high = tuple(2 * target[i] - low[i] for i in range(len(target)))
        if low >= high:
            continue
        a = positive.get(low)
        b = positive.get(high)
        if a is None or b is None or 4 * a * b < demand * demand:
            continue
        rows.append((min(a, b), a * b, low, high, a, b))
    rows.sort(reverse=True)
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", required=True)
    parser.add_argument("--kind", choices=("strong", "middle", "endpoint"), default="strong")
    args = parser.parse_args()
    live = tuple(name for name in args.live.split(",") if name)
    if not {"h", "ta", "tb"}.issubset(live):
        raise SystemExit("h,ta,tb must remain live")
    if set(live) - set(ALLOWED):
        raise SystemExit("unknown variable")
    polynomial, names = build(live, args.kind)
    positive = {}
    negative = {}
    for monomial, coefficient in polynomial.terms():
        key = tuple(map(int, monomial))
        value = int(coefficient)
        if value > 0:
            positive[key] = value
        elif value < 0:
            negative[key] = -value
    candidate_rows = {}
    for target, demand in negative.items():
        candidate_rows[target] = candidates(target, demand, positive)
    ordered = sorted(negative, key=lambda target: (len(candidate_rows[target]), -negative[target]))
    used = set()
    allocations = []
    failures = []
    for target in ordered:
        available = [row for row in candidate_rows[target]
                     if row[2] not in used and row[3] not in used]
        if not available:
            failures.append(target)
            continue
        row = available[0]
        used.update((row[2], row[3]))
        allocations.append((target, negative[target], row[2], row[3], row[4], row[5]))
    print({
        "kind": args.kind,
        "variables": names,
        "positive_terms": len(positive),
        "negative_terms": len(negative),
        "targets_with_candidates": sum(bool(rows) for rows in candidate_rows.values()),
        "minimum_candidate_count": min(map(len, candidate_rows.values()), default=0),
        "disjoint_allocations": len(allocations),
        "failures": len(failures),
        "first_failures": [list(row) for row in failures[:10]],
        "candidate_count_histogram": {
            str(bound): sum(len(rows) == bound for rows in candidate_rows.values())
            for bound in sorted(set(map(len, candidate_rows.values())))[:20]
        },
    })


if __name__ == "__main__":
    main()
