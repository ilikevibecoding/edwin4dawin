#!/usr/bin/env python3
"""Random abstract-complex falsification probe for rank-weighted avoidance."""

from __future__ import annotations

import argparse
import json
import random


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=200_000)
    parser.add_argument("--seed", type=int, default=993120260829)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    checks = 0
    first_failure = None

    for sample in range(args.samples):
        n = rng.randint(4, 16)
        raw_facets = {
            sum(1 << vertex for vertex in range(n) if rng.random() < rng.uniform(0.15, 0.85))
            for _ in range(rng.randint(1, 12))
        }
        raw_facets.discard(0)
        if not raw_facets:
            continue
        facets = [
            facet
            for facet in raw_facets
            if not any(facet != other and facet & ~other == 0 for other in raw_facets)
        ]
        faces = {0}
        for facet in facets:
            subface = facet
            while True:
                faces.add(subface)
                if subface == 0:
                    break
                subface = (subface - 1) & facet
        alpha = max(face.bit_count() for face in faces)
        cutoff = (2 * alpha + 3) // 3
        marked = rng.choice(tuple(faces))
        b = [0] * (alpha + 1)
        c = [0] * (alpha + 1)
        for face in faces:
            rank = face.bit_count()
            b[rank] += 1
            if face & marked == 0:
                c[rank] += 1
        for j in range(1, alpha):
            if j + 1 >= cutoff:
                continue
            checks += 1
            left = (j + 2) * c[j] * b[j + 1]
            right = (j + 1) * c[j + 1] * b[j]
            if left < right:
                first_failure = {
                    "sample": sample,
                    "n": n,
                    "facets": facets,
                    "marked_face": marked,
                    "alpha": alpha,
                    "cutoff": cutoff,
                    "j": j,
                    "b_window": [b[j], b[j + 1]],
                    "c_window": [c[j], c[j + 1]],
                    "left": left,
                    "right": right,
                }
                break
        if first_failure is not None:
            break

    report = {
        "status": "PASS_RANDOM_COMPLEX_PROBE" if first_failure is None else "FAIL_RANDOM_COMPLEX_NOT_FOREST_COUNTEREXAMPLE",
        "requested_samples": args.samples,
        "completed_samples": sample + 1,
        "checks": checks,
        "seed": args.seed,
        "first_failure": first_failure,
        "scope": "abstract simplicial complexes only; a failure is not a graph or forest counterexample",
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
