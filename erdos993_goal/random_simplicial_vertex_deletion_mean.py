#!/usr/bin/env python3
"""Test the present-component mean inequality on arbitrary downsets.

Choose a random simplicial complex D and a random vertex subset U.
Let J be the restriction of D to U and B=D+xJ.  Test

    r D_r/D_(r-1) <= 1 + r B_r/B_(r-1).
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=100_000)
    parser.add_argument("--max-order", type=int, default=14)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    checks = 0
    first_failure = None
    minimum = None
    minimum_item = None

    for sample in range(args.samples):
        n = rng.randint(2, args.max_order)
        facets = []
        for _ in range(rng.randint(1, 2 * n)):
            size = rng.randint(0, n)
            facet = sum(
                1 << vertex
                for vertex in rng.sample(range(n), size)
            )
            facets.append(facet)
        faces = {0}
        for facet in facets:
            submask = facet
            while True:
                faces.add(submask)
                if submask == 0:
                    break
                submask = (submask - 1) & facet
        u_mask = rng.randrange(1 << n)
        d_counts = [0] * (n + 1)
        j_counts = [0] * (n + 1)
        for face in faces:
            d_counts[face.bit_count()] += 1
            if face & ~u_mask == 0:
                j_counts[face.bit_count()] += 1
        b_counts = [
            (d_counts[rank] if rank < len(d_counts) else 0)
            + (j_counts[rank - 1] if rank else 0)
            for rank in range(n + 2)
        ]
        for r in range(1, n + 1):
            dm, d = d_counts[r - 1], d_counts[r]
            bm, b = b_counts[r - 1], b_counts[r]
            if min(dm, bm, b) <= 0:
                continue
            margin = 1 + Fraction(r * b, bm) - Fraction(r * d, dm)
            checks += 1
            item = {
                "sample": sample,
                "order": n,
                "rank_r": r,
                "D_counts": d_counts,
                "J_counts": j_counts,
                "B_counts": b_counts,
                "restriction_mask": u_mask,
                "facets": facets,
                "margin": str(margin),
            }
            if minimum is None or margin < minimum:
                minimum = margin
                minimum_item = item
            if margin < 0:
                first_failure = item
                break
        if first_failure is not None:
            break

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "minimum": (
            None
            if minimum is None
            else {"exact": str(minimum), "float": float(minimum)}
        ),
        "minimum_item": minimum_item,
        "first_failure": first_failure,
    }
    args.out.write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
