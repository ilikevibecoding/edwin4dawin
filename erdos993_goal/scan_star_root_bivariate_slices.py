#!/usr/bin/env python3
"""Exact bivariate slice scan for the disjoint-centre star-root polynomial.

For star-leaf counts a_i, put

  F_a(x,y) = (1+x)^a(1+y)^a + x(1+y)^a + y(1+x)^a,
  G = product_i F_ai,
  L = (1+x)^M,
  K = product_i((1+x)^ai+x),
  H0 = (1+x)(G + x L(x)K(y)).

The star-root PIRD obstruction is the central orientation of the odd
homogeneous slices of H0.  This script also stress-tests the stronger
observed properties: every slice is unimodal, log-concave, and ULC.
"""

from __future__ import annotations

import argparse
import json
import random
from math import comb
from pathlib import Path

import numpy as np

from find_min_star_root_pird_failure import (
    binomial,
    conv,
    partitions_with_cost,
    star,
)


Matrix = list[list[int]]


def f_matrix(a: int) -> Matrix:
    b = binomial(a)
    size = a + 2
    out = [[0] * size for _ in range(size)]
    for i, bi in enumerate(b):
        for j, bj in enumerate(b):
            out[i][j] += bi * bj
    for j, bj in enumerate(b):
        out[1][j] += bj
        out[j][1] += bj
    return out


def conv2(left: Matrix, right: Matrix) -> Matrix:
    rows = len(left) + len(right) - 1
    cols = len(left[0]) + len(right[0]) - 1
    out = [[0] * cols for _ in range(rows)]
    left_terms = [
        (i, j, value)
        for i, row in enumerate(left)
        for j, value in enumerate(row)
        if value
    ]
    right_terms = [
        (i, j, value)
        for i, row in enumerate(right)
        for j, value in enumerate(row)
        if value
    ]
    for i, j, value in left_terms:
        for p, q, other in right_terms:
            out[i + p][j + q] += value * other
    return out


def build_h0(branches: tuple[int, ...]) -> Matrix:
    g: Matrix = [[1]]
    k_poly = [1]
    total_leaves = 0
    for a in branches:
        g = conv2(g, f_matrix(a))
        k_poly = conv(k_poly, star(a))
        total_leaves += a
    l_poly = binomial(total_leaves)

    rows = max(len(g) + 2, len(l_poly) + 3)
    cols = max(len(g[0]), len(k_poly))
    q = [[0] * cols for _ in range(rows)]
    for i, row in enumerate(g):
        for j, value in enumerate(row):
            q[i][j] += value
    # x L(x)K(y)
    for i, li in enumerate(l_poly):
        for j, kj in enumerate(k_poly):
            q[i + 1][j] += li * kj

    h0 = [[0] * cols for _ in range(rows + 1)]
    for i, row in enumerate(q):
        for j, value in enumerate(row):
            h0[i][j] += value
            h0[i + 1][j] += value
    return h0


def inspect(branches: tuple[int, ...], check_real_roots: bool = False):
    h0 = build_h0(branches)
    maximum_total = len(h0) + len(h0[0]) - 2
    for total in range(maximum_total + 1):
        values = [
            h0[i][total - i]
            if i < len(h0) and 0 <= total - i < len(h0[0])
            else 0
            for i in range(total + 1)
        ]
        support = [i for i, value in enumerate(values) if value]
        if not support:
            continue
        lo, hi = support[0], support[-1]
        modes = [
            i
            for i in range(lo, hi + 1)
            if values[i] == max(values)
        ]
        if max(modes) < (total + 1) // 2:
            return "ORIENTATION", total, None, values
        first_mode = modes[0]
        if any(
            values[i] > values[i + 1]
            for i in range(lo, first_mode)
        ) or any(
            values[i] < values[i + 1]
            for i in range(first_mode, hi)
        ):
            return "UNIMODALITY", total, None, values
        for i in range(lo + 1, hi):
            if values[i] * values[i] < values[i - 1] * values[i + 1]:
                return "LOG_CONCAVITY", total, i, values
            if (
                values[i] * values[i] * i * (total - i)
                <
                values[i - 1]
                * values[i + 1]
                * (i + 1)
                * (total - i + 1)
            ):
                return "ULC", total, i, values
        if check_real_roots and hi > lo:
            trimmed = values[lo : hi + 1]
            scale = max(trimmed)
            roots = np.roots(
                [float(value / scale) for value in reversed(trimmed)]
            )
            nonreal = [
                complex(root)
                for root in roots
                if abs(root.imag) > 1e-7 * (1 + abs(root.real))
            ]
            if nonreal:
                return (
                    "NONREAL_ROOT",
                    total,
                    None,
                    values,
                )
    return None


def random_branches(rng: random.Random, max_branches: int, max_leaves: int):
    count = rng.randint(1, max_branches)
    return tuple(
        sorted(rng.randint(1, max_leaves) for _ in range(count))
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exhaustive-order", type=int, default=24)
    parser.add_argument("--random-trials", type=int, default=2000)
    parser.add_argument("--max-branches", type=int, default=12)
    parser.add_argument("--max-leaves", type=int, default=12)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--check-real-roots", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    instances = slices = 0
    witness = None
    rng = random.Random(args.seed)

    for order in range(1, args.exhaustive_order + 1):
        for branches in partitions_with_cost(order - 1):
            instances += 1
            failure = inspect(branches, args.check_real_roots)
            slices += 1
            if failure is not None:
                kind, total, index, values = failure
                witness = {
                    "source": "exhaustive",
                    "rooted_tree_order": order,
                    "branches": list(branches),
                    "failure_kind": kind,
                    "total_degree": total,
                    "index": index,
                    "slice": values,
                }
                break
        if witness:
            break

    if witness is None:
        for trial in range(args.random_trials):
            branches = random_branches(
                rng,
                args.max_branches,
                args.max_leaves,
            )
            instances += 1
            failure = inspect(branches, args.check_real_roots)
            slices += 1
            if failure is not None:
                kind, total, index, values = failure
                witness = {
                    "source": "random",
                    "trial": trial,
                    "branches": list(branches),
                    "rooted_tree_order":
                        1 + sum(a + 1 for a in branches),
                    "failure_kind": kind,
                    "total_degree": total,
                    "index": index,
                    "slice": values,
                }
                break
            if (trial + 1) % 100 == 0:
                print(
                    f"random={trial + 1:,}/{args.random_trials:,}",
                    flush=True,
                )

    report = {
        "status": "FAILURE_FOUND" if witness else "PASS_NOT_PROOF",
        "parameters": vars(args) | {"out": str(args.out)},
        "instances": instances,
        "polynomials_inspected": slices,
        "witness": witness,
    }
    args.out.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 1 if witness else 0


if __name__ == "__main__":
    raise SystemExit(main())
