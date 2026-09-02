#!/usr/bin/env python3
"""Random graph falsification probe for rank-weighted root avoidance."""

from __future__ import annotations

import argparse
import json
import random


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", type=int, default=20_000)
    parser.add_argument("--seed", type=int, default=993220260829)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    checks = 0
    first_failure = None

    for sample in range(args.samples):
        n = rng.randint(5, 16)
        probability = rng.uniform(0.05, 0.95)
        adjacency = [0] * n
        for left in range(n):
            for right in range(left + 1, n):
                if rng.random() < probability:
                    adjacency[left] |= 1 << right
                    adjacency[right] |= 1 << left
        order = list(range(n))
        rng.shuffle(order)
        marked = 0
        for vertex in order:
            if marked & adjacency[vertex] == 0 and rng.random() < 0.55:
                marked |= 1 << vertex

        independent = bytearray(1 << n)
        independent[0] = 1
        b = [0] * (n + 1)
        c = [0] * (n + 1)
        b[0] = c[0] = 1
        for mask in range(1, 1 << n):
            low = mask & -mask
            vertex = low.bit_length() - 1
            remainder = mask ^ low
            if independent[remainder] and adjacency[vertex] & remainder == 0:
                independent[mask] = 1
                rank = mask.bit_count()
                b[rank] += 1
                if mask & marked == 0:
                    c[rank] += 1
        alpha = max(rank for rank, count in enumerate(b) if count)
        cutoff = (2 * alpha + 3) // 3
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
                    "edge_probability": probability,
                    "adjacency_masks": adjacency,
                    "marked_mask": marked,
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
        "status": "PASS_RANDOM_GRAPH_PROBE" if first_failure is None else "FAIL_RANDOM_GRAPH_NOT_FOREST_COUNTEREXAMPLE",
        "requested_samples": args.samples,
        "completed_samples": sample + 1,
        "checks": checks,
        "seed": args.seed,
        "first_failure": first_failure,
        "scope": "general graphs only; a failure is not a forest counterexample",
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
