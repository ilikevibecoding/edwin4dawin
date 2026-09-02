#!/usr/bin/env python3
"""Explore a direct grouped-moment certificate for rank-4 Q leaf growth.

This is a diagnostic.  It reconstructs the exact normalized leaf
increment and then relaxes a rooted tree into four disjoint excess-mass
groups: p, neighbors of p, distance two from p, and all remaining
vertices.  Groupwise second/third/fourth moment inequalities retain the
joint resource constraint that was lost in the first endpoint proof.
"""

from __future__ import annotations

import argparse
import sys
from collections import deque
from itertools import product

import numpy as np
import sympy as sp

sys.setrecursionlimit(10000)


def tensor_bernstein_fast(poly, variables):
    """Return exact tensor Bernstein coefficients as an object array."""
    expanded = sp.Poly(sp.expand(poly), *variables)
    degrees = tuple(expanded.degree(variable) for variable in variables)
    shape = tuple(degree + 1 for degree in degrees)
    coefficients = np.empty(shape, dtype=object)
    coefficients.fill(sp.S.Zero)
    for monomial, coefficient in expanded.terms():
        coefficients[monomial] = coefficient
    for axis, degree in enumerate(degrees):
        moved = np.moveaxis(coefficients, axis, 0)
        transformed = np.empty_like(moved)
        for index in range(degree + 1):
            value = np.empty(moved.shape[1:], dtype=object)
            value.fill(sp.S.Zero)
            for exponent in range(index + 1):
                value += (
                    moved[exponent]
                    * sp.Rational(
                        sp.binomial(index, exponent),
                        sp.binomial(degree, exponent),
                    )
                )
            transformed[index] = value
        coefficients = np.moveaxis(transformed, 0, axis)
    return degrees, coefficients


def split_bernstein_midpoint(coefficients, axis):
    """Subdivide a tensor Bernstein patch at 1/2 along one axis."""
    moved = np.moveaxis(coefficients, axis, 0)
    degree = moved.shape[0] - 1
    layers = [moved[index].copy() for index in range(degree + 1)]
    left = np.empty_like(moved)
    right = np.empty_like(moved)
    left[0] = layers[0]
    right[degree] = layers[degree]
    for level in range(1, degree + 1):
        layers = [
            (layers[index] + layers[index + 1]) / 2
            for index in range(len(layers) - 1)
        ]
        left[level] = layers[0]
        right[degree - level] = layers[-1]
    return np.moveaxis(left, 0, axis), np.moveaxis(right, 0, axis)


def minimum_with_index(coefficients):
    flat_index = min(
        range(coefficients.size),
        key=lambda index: coefficients.flat[index],
    )
    return (
        sp.factor(coefficients.flat[flat_index]),
        np.unravel_index(flat_index, coefficients.shape),
    )


def build_expression():
    u = sp.symbols("u", nonnegative=True)
    A2, A3, A4, t = sp.symbols("A2 A3 A4 t", nonnegative=True)
    B, Tc, P5 = sp.symbols("B Tc P5", nonnegative=True)
    q1, q2, qd = sp.symbols("q1 q2 qd", nonnegative=True)
    n, S, R, H, W, d, Z, Y = sp.symbols(
        "n S R H W d Z Y", real=True
    )

    def choose(a, k):
        return sp.prod(a - j for j in range(k)) / sp.factorial(k)

    e = n - 1
    i3 = choose(n, 3) - e * (n - 2) + S
    i4 = (
        choose(n, 4)
        - e * choose(n - 2, 2)
        + S * (n - 4)
        + choose(e, 2)
        - R
    )
    disconnected_pair_plus_edge = S * (e - 2) - 2 * R - H
    i5 = (
        choose(n, 5)
        - e * choose(n - 2, 3)
        + S * choose(n - 3, 2)
        + (choose(e, 2) - S) * (n - 4)
        - R * (n - 4)
        - disconnected_pair_plus_edge
        + W
    )
    reserve = sp.expand(8 * i4**2 - i3 * i4 - 10 * i3 * i5)
    delta = sp.expand(
        reserve.xreplace(
            {
                n: n + 1,
                S: S + d,
                R: R + Z,
                H: H + choose(d, 2),
                W: W + Y,
            }
        )
        - reserve
    )
    N = 1 / u
    F = sp.cancel(
        delta.subs(
            {
                n: N,
                S: (N**2 * A2 + N - 2) / 2,
                H: (N**3 * A3 - (N - 2)) / 6,
                R: (N**3 * A3 - (N - 2)) / 6 + N**2 * B,
                W: (
                    N**4 * A4
                    - 2 * N**3 * A3
                    - N**2 * A2
                    + 2 * (N - 2)
                )
                / 24
                + N**3 * Tc
                + N**2 * P5,
                d: N * t + 1,
                Z: (N**2 * t**2 + N * t) / 2 + N * q1,
                Y: (
                    (N**3 * t**3 - N * t) / 6
                    + (N**2 * q2 - N * q1) / 2
                    + N**2 * t * q1
                    + N * qd
                ),
            }
        )
        * u**6
    )
    assert sp.denom(F) == 1

    # Box variables.  For a nonstar rooted tree q1>=u and m>=u.
    # The three non-root groups have masses q, qd, and r.
    v, s, a, w, zn, zd, zr = sp.symbols(
        "v s a w zn zd zr", nonnegative=True
    )
    M = 1 - 2 * u
    t0 = (1 - 3 * u) * s
    h = (1 - 3 * u) * (1 - s)
    q = u + h * a
    qdistance = h * (1 - a) * w
    r = h * (1 - a) * (1 - w)

    A2g = t0**2 + q**2 * zn + qdistance**2 * zd + r**2 * zr
    A3g = (
        t0**3
        + q**3 * zn**2
        + qdistance**3 * zd**2
        + r**3 * zr**2
    )
    A4g = (
        t0**4
        + q**4 * zn**2
        + qdistance**4 * zd**2
        + r**4 * zr**2
    )
    Blower = t0 * q + u * qdistance
    G = sp.expand(
        F.subs(
            {
                A2: A2g,
                A3: A3g,
                A4: A4g,
                t: t0,
                B: Blower,
                Tc: (1 - 4 * u) * Blower / 2,
                P5: (M**2 - A2g) / 2,
                q1: q,
                q2: q**2 * zn,
                qd: qdistance,
            }
        )
    )
    return G, (u, s, a, w, zn, zd, zr)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scale", type=int, default=20)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--samples", type=int, default=1000000)
    parser.add_argument("--rounds", type=int, default=250)
    parser.add_argument("--bernstein", action="store_true")
    parser.add_argument("--max-depth", type=int, default=20)
    args = parser.parse_args()

    G, variables = build_expression()
    print("polynomial degrees:", sp.Poly(G, *variables).degree_list())
    if args.bernstein:
        v = sp.symbols("v", nonnegative=True)
        box_variables = (v,) + variables[1:]
        box_poly = sp.expand(G.subs(variables[0], v / args.scale))
        degrees, coefficients = tensor_bernstein_fast(
            box_poly, box_variables
        )
        print("Bernstein degrees:", degrees)
        print("full-box minimum:", minimum_with_index(coefficients))
        # Depth-first traversal keeps only one branch worth of dense
        # exact coefficient tensors resident at a time.
        queue = [(coefficients, 0, ())]
        certified = 0
        certified_minimum = None
        maximum_depth = 0
        depth_counts = {}
        unresolved = []
        while queue:
            patch, depth, address = queue.pop()
            minimum = minimum_with_index(patch)
            if minimum[0] >= 0:
                certified += 1
                maximum_depth = max(maximum_depth, depth)
                depth_counts[depth] = depth_counts.get(depth, 0) + 1
                if (
                    certified_minimum is None
                    or minimum[0] < certified_minimum[0]
                ):
                    certified_minimum = (minimum[0], minimum[1], address)
                continue
            if depth >= args.max_depth:
                unresolved.append((minimum, address))
                continue
            # Cycle through the variables.  This intentionally simple
            # policy is a diagnostic; the final certificate can retain
            # the resulting finite subdivision tree.
            axis = depth % len(box_variables)
            left, right = split_bernstein_midpoint(patch, axis)
            queue.append((left, depth + 1, address + ((axis, 0),)))
            queue.append((right, depth + 1, address + ((axis, 1),)))
        print("certified patches:", certified)
        print("maximum certified depth:", maximum_depth)
        print("certified depth counts:", sorted(depth_counts.items()))
        print("smallest certified coefficient:", certified_minimum)
        print("unresolved patches:", len(unresolved))
        for item in unresolved[:20]:
            print("unresolved:", item)
        return

    horner = sp.horner(G, *variables)
    numeric = sp.lambdify(
        variables, horner, modules="numpy", cse=True, docstring_limit=0
    )

    rng = np.random.default_rng(args.seed)
    best_value = float("inf")
    best_point = None
    batch_size = 100000
    for start in range(0, args.samples, batch_size):
        size = min(batch_size, args.samples - start)
        points = rng.random((size, 7))
        points[:, 0] /= args.scale
        values = np.asarray(numeric(*(points[:, j] for j in range(7))))
        index = int(np.argmin(values))
        if float(values[index]) < best_value:
            best_value = float(values[index])
            best_point = points[index].copy()

    # Simple bounded stochastic polishing, sufficient for falsification.
    assert best_point is not None
    widths = np.array([1 / args.scale] + [1.0] * 6)
    for round_index in range(args.rounds):
        scale = 0.25 * (0.95 ** round_index)
        candidates = best_point + rng.normal(
            0.0, scale, size=(5000, 7)
        ) * widths
        candidates[:, 0] = np.clip(
            candidates[:, 0], 0.0, 1.0 / args.scale
        )
        candidates[:, 1:] = np.clip(candidates[:, 1:], 0.0, 1.0)
        values = np.asarray(
            numeric(*(candidates[:, j] for j in range(7)))
        )
        index = int(np.argmin(values))
        if float(values[index]) < best_value:
            best_value = float(values[index])
            best_point = candidates[index].copy()

    exact_boundary = sp.factor(
        G.subs(dict(zip(variables, map(sp.Rational, best_point))))
    )
    print("minimum diagnostic:", best_value)
    print("point:", best_point.tolist())
    print("exact-at-float-rationals:", exact_boundary)


if __name__ == "__main__":
    main()
