#!/usr/bin/env python3
"""Explore a global rank-3 Q certificate for arbitrary forests."""

from __future__ import annotations

import argparse

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank4_global_leaf_curvature import (
    tensor_bernstein_coefficients,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scale", type=int, default=16)
    parser.add_argument("--parts", type=int, default=2)
    parser.add_argument("--adaptive", action="store_true")
    parser.add_argument("--max-depth", type=int, default=18)
    args = parser.parse_args()

    n, e, S, R = sp.symbols("n e S R", nonnegative=True)

    def choose(a, k):
        return sp.prod(a - j for j in range(k)) / sp.factorial(k)

    p2 = choose(n, 2) - e
    p3 = choose(n, 3) - e * (n - 2) + S
    p4 = (
        choose(n, 4)
        - e * choose(n - 2, 2)
        + S * (n - 4)
        + choose(e, 2)
        - R
    )
    Q = sp.expand(6 * p3**2 - p2 * p3 - 8 * p2 * p4)
    assert sp.expand(sp.diff(Q, R) - 8 * p2) == 0
    line_bound = (2 * S**2 / e - S) / 3
    lower = sp.cancel(Q.subs(R, line_bound))

    u, v, s, z, w = sp.symbols("u v s z w", nonnegative=True)
    N = 1 / u
    edge_box = 1 + (N - 2) * s
    S_box = edge_box * (edge_box - 1) * z / 2
    box = sp.cancel(
        lower.subs({n: N, e: edge_box, S: S_box}) * u**6
    )
    print("denominator:", sp.factor(sp.denom(box)))
    box = sp.expand(box.subs(u, v / args.scale))
    print("degrees:", sp.Poly(box, v, s, z).degree_list())
    print("v=1,s=1:", sp.factor(box.subs({v: 1, s: 1})))
    if args.adaptive:
        degrees, coefficients = tensor_bernstein_fast(box, (v, s, z))
        print("full minimum:", minimum_with_index(coefficients))
        stack = [(coefficients, 0)]
        certified = 0
        unresolved = []
        depth_counts = {}
        smallest = None
        while stack:
            patch, depth = stack.pop()
            minimum = minimum_with_index(patch)
            if minimum[0] >= 0:
                certified += 1
                depth_counts[depth] = depth_counts.get(depth, 0) + 1
                if smallest is None or minimum[0] < smallest[0]:
                    smallest = minimum
                continue
            if depth >= args.max_depth:
                unresolved.append(minimum)
                continue
            axis = depth % 3
            left, right = split_bernstein_midpoint(patch, axis)
            stack.append((left, depth + 1))
            stack.append((right, depth + 1))
        print("certified:", certified)
        print("depth counts:", sorted(depth_counts.items()))
        print("smallest:", smallest)
        print("unresolved:", len(unresolved), unresolved[:10])
        return
    for part in range(args.parts):
        subbox = sp.expand(box.subs(z, (part + w) / args.parts))
        degrees, coefficients = tensor_bernstein_coefficients(
            subbox, (v, s, w)
        )
        minimum = min(coefficients, key=lambda item: item[0])
        print(part, degrees, minimum)


if __name__ == "__main__":
    main()
