#!/usr/bin/env python3
"""Look for failures of the elementary ISO reserve in arbitrary downsets."""

from __future__ import annotations

import argparse
import json
import random
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
        n = rng.randint(3, args.max_order)
        facet_count = rng.randint(1, 2 * n)
        facets = []
        for _ in range(facet_count):
            size = rng.randint(0, n)
            vertices = rng.sample(range(n), size)
            mask = sum(1 << vertex for vertex in vertices)
            facets.append(mask)
        faces = {0}
        for facet in facets:
            submask = facet
            while True:
                faces.add(submask)
                if submask == 0:
                    break
                submask = (submask - 1) & facet
        counts = [0] * (n + 1)
        for face in faces:
            counts[face.bit_count()] += 1
        for r in range(1, n):
            bm, b, bp = counts[r - 1 : r + 2]
            if min(bm, b) <= 0:
                continue
            reserve = r * b * b + bm * bm - (r + 1) * bm * bp
            checks += 1
            scale = bm * bm
            relative = reserve / scale
            item = {
                "sample": sample,
                "order": n,
                "rank_r": r,
                "counts": counts,
                "facets": facets,
                "coefficient_reserve": reserve,
                "relative_reserve": relative,
            }
            if minimum is None or relative < minimum:
                minimum = relative
                minimum_item = item
            if reserve < 0 and first_failure is None:
                first_failure = item
                break
        if first_failure is not None:
            break

    report = {
        "parameters": vars(args) | {"out": str(args.out)},
        "checks": checks,
        "minimum_relative_reserve": minimum,
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
