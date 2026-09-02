#!/usr/bin/env python3
"""Search split graphs for a counterexample to chordal deletion drift.

A split graph consists of a clique C and an independent set S.  Its
independence polynomial, and every one-vertex deletion polynomial, can
be computed directly from the C-to-S non-neighbour masks.  This permits
much larger randomized tests than generic chordal graph enumeration.
"""

from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path


def add_binomial(coeffs: list[int], n: int, shift: int = 0) -> None:
    for j in range(n + 1):
        degree = j + shift
        if degree >= len(coeffs):
            coeffs.extend([0] * (degree + 1 - len(coeffs)))
        coeffs[degree] += math.comb(n, j)


def split_polynomial(s: int, masks: list[int]) -> list[int]:
    coeffs = [0] * (s + 1)
    add_binomial(coeffs, s)
    for mask in masks:
        add_binomial(coeffs, mask.bit_count(), 1)
    while len(coeffs) > 1 and coeffs[-1] == 0:
        coeffs.pop()
    return coeffs


def delete_clique_polynomial(
    s: int, masks: list[int], deleted: int
) -> list[int]:
    return split_polynomial(
        s, masks[:deleted] + masks[deleted + 1 :]
    )


def delete_independent_polynomial(
    s: int, masks: list[int], deleted: int
) -> list[int]:
    low = (1 << deleted) - 1
    new_masks = []
    for mask in masks:
        below = mask & low
        above = (mask >> (deleted + 1)) << deleted
        new_masks.append(below | above)
    return split_polynomial(s - 1, new_masks)


def first_failure(a: list[int], b: list[int]) -> dict | None:
    for r in range(1, min(len(a) - 1, len(b))):
        if r - 1 >= len(b) or r >= len(b):
            continue
        lhs = (r + 1) * a[r + 1] * b[r - 1]
        rhs = r * a[r] * b[r] + a[r] * b[r - 1]
        if lhs > rhs:
            return {
                "r": r,
                "lhs": lhs,
                "rhs": rhs,
                "gap": lhs - rhs,
                "a": a,
                "b": b,
            }
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--trials", type=int, default=100_000)
    parser.add_argument("--max-clique", type=int, default=30)
    parser.add_argument("--max-independent", type=int, default=60)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    rng = random.Random(args.seed)
    checked_vertices = 0
    checked_ranks = 0
    minimum_gap: dict | None = None
    failure: dict | None = None

    for trial in range(args.trials):
        c = rng.randint(1, args.max_clique)
        s = rng.randint(1, args.max_independent)
        # Mix sparse, dense, and unstructured compatibility patterns.
        mode = trial % 5
        if mode == 0:
            probability = rng.random() ** 3
        elif mode == 1:
            probability = 1.0 - rng.random() ** 3
        else:
            probability = rng.random()
        masks = []
        for _ in range(c):
            mask = 0
            for j in range(s):
                if rng.random() < probability:
                    mask |= 1 << j
            masks.append(mask)

        a = split_polynomial(s, masks)
        for kind, count in (("clique", c), ("independent", s)):
            for deleted in range(count):
                if kind == "clique":
                    b = delete_clique_polynomial(s, masks, deleted)
                else:
                    b = delete_independent_polynomial(
                        s, masks, deleted
                    )
                checked_vertices += 1
                for r in range(1, min(len(a) - 1, len(b))):
                    if r >= len(b):
                        continue
                    lhs = (r + 1) * a[r + 1] * b[r - 1]
                    rhs = r * a[r] * b[r] + a[r] * b[r - 1]
                    gap = rhs - lhs
                    checked_ranks += 1
                    if minimum_gap is None or gap < minimum_gap["gap"]:
                        minimum_gap = {
                            "gap": gap,
                            "trial": trial,
                            "clique": c,
                            "independent": s,
                            "kind": kind,
                            "deleted": deleted,
                            "r": r,
                            "a": a,
                            "b": b,
                            "masks": masks,
                        }
                    if gap < 0:
                        failure = minimum_gap
                        break
                if failure is not None:
                    break
            if failure is not None:
                break
        if failure is not None:
            break

    result = {
        "status": "FAIL" if failure else "PASS",
        "trials_completed": trial + 1,
        "checked_vertices": checked_vertices,
        "checked_ranks": checked_ranks,
        "failure": failure,
        "minimum_gap": minimum_gap,
        "parameters": vars(args) | {"output": str(args.output)},
    }
    text = json.dumps(result, indent=2)
    if args.output:
        args.output.write_text(text + "\n", encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()
