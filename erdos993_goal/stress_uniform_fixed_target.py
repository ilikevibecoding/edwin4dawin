#!/usr/bin/env python3
"""Floating reconnaissance for a u,v-independent selected-root product floor."""

from __future__ import annotations

import argparse
import json
import math
import random

import numpy as np


def falling_polynomials(rank: int) -> list[np.poly1d]:
    result = [np.poly1d([1.0])]
    for j in range(rank):
        result.append(result[-1] * np.poly1d([1.0, -float(j)]))
    return result


def build(B: int, u: float, v: float, ds: list[float]):
    rank = len(ds)
    source = np.poly1d([1.0])
    for d in ds:
        source *= np.poly1d([4.0, -d])
    ascending = source.c[::-1]
    falls = falling_polynomials(rank)
    H = np.poly1d([0.0])
    rising = 1.0
    for j in range(rank + 1):
        if j:
            rising *= B + 1 + j
        H += ascending[j] * falls[j] / rising

    x = np.poly1d([1.0, 0.0])

    def shifted(poly: np.poly1d) -> np.poly1d:
        return poly(np.poly1d([1.0, -1.0]))

    J = u * np.poly1d([1.0, B + 1.0]) * H + (4.0 - u) * x * shifted(H)
    T = v * np.poly1d([1.0, B]) * J + (4.0 - v) * x * shifted(J)
    return H, T


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cases", type=int, default=100000)
    parser.add_argument("--seed", type=int, default=9935301)
    args = parser.parse_args()
    rng = random.Random(args.seed)
    worst = None
    accepted = 0
    for _ in range(args.cases):
        rank = rng.randint(1, 10)
        B = rng.randint(3 * rank + 4, 8 * rank + 30)
        u = 10 ** rng.uniform(-7.0, 0.0)
        v = 10 ** rng.uniform(-7.0, 0.0)
        if rng.random() < 0.25:
            u = rng.random()
        if rng.random() < 0.25:
            v = rng.random()
        ds = [10 ** rng.uniform(-5.0, 5.0) for _j in range(rank)]
        H, T = build(B, u, v, ds)
        xi_roots = np.roots(H)
        alpha_roots = np.roots(T)
        xi = sorted(
            root.real for root in xi_roots
            if root.real > 0 and abs(root.imag) <= 1e-5 * (1 + abs(root.real))
        )
        alpha = sorted(
            root.real for root in alpha_roots
            if root.real > 0 and abs(root.imag) <= 1e-5 * (1 + abs(root.real))
        )
        if len(xi) != rank or len(alpha) < rank:
            continue
        selected = alpha[-rank:]
        log_ratio = sum(math.log(value) for value in selected) - sum(
            math.log(value) for value in xi
        )
        N = B + rank + 1
        uniform_target = B * (B + 1) / (N * (N - 1))
        normalized = math.exp(log_ratio) / uniform_target
        record = {
            "normalized_uniform_ratio": normalized,
            "selected_product_ratio": math.exp(log_ratio),
            "uniform_target": uniform_target,
            "rank": rank,
            "B": B,
            "N": N,
            "u": u,
            "v": v,
            "ds": ds,
            "positive_T_roots": len(alpha),
        }
        if worst is None or normalized < worst[0]:
            worst = (normalized, record)
        accepted += 1
    print(json.dumps({
        "cases_requested": args.cases,
        "cases_accepted": accepted,
        "worst": None if worst is None else worst[1],
    }, indent=2))


if __name__ == "__main__":
    main()
