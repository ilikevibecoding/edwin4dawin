#!/usr/bin/env python3
"""Diagnostic grouped-moment model for the quantitative rank-4 reserve.

The target reserve is

    8 i4^2 - (5/4) i3 i4 - 10 i3 i5.

This module deliberately keeps the same exact rooted-tree normalization and
the same structural substitutions as the already sealed qualitative rank-4
leaf certificate.  It is an exploration aid; a final verifier must separately
prove that each monotone substitution remains valid after the extra reserve.
"""

from __future__ import annotations

import argparse

import numpy as np
import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)


BETA = sp.Rational(1, 4)


def reconstruct_normalized_increment(beta=BETA):
    u = sp.symbols("u", nonnegative=True)
    A2, A3, A4, t = sp.symbols("A2 A3 A4 t", nonnegative=True)
    B, Tc, P5 = sp.symbols("B Tc P5", nonnegative=True)
    q1, q2, qd = sp.symbols("q1 q2 qd", nonnegative=True)
    n, S, R, H, W, d, Z, Y = sp.symbols("n S R H W d Z Y", real=True)

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
    reserve = sp.expand(8 * i4**2 - (1 + beta) * i3 * i4 - 10 * i3 * i5)
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
    return F, {
        "u": u, "A2": A2, "A3": A3, "A4": A4, "t": t,
        "B": B, "Tc": Tc, "P5": P5, "q1": q1, "q2": q2, "qd": qd,
    }


def build_expression(beta=BETA):
    F, x = reconstruct_normalized_increment(beta)
    u = x["u"]
    A2, A3, A4, t = x["A2"], x["A3"], x["A4"], x["t"]
    B, Tc, P5 = x["B"], x["Tc"], x["P5"]
    q1, q2, qd = x["q1"], x["q2"], x["qd"]

    v, s, a, w, zn, zd, zr = sp.symbols("v s a w zn zd zr", nonnegative=True)
    M = 1 - 2 * u
    t0 = (1 - 3 * u) * s
    h = (1 - 3 * u) * (1 - s)
    q = u + h * a
    qdistance = h * (1 - a) * w
    r = h * (1 - a) * (1 - w)
    A2g = t0**2 + q**2 * zn + qdistance**2 * zd + r**2 * zr
    A3g = t0**3 + q**3 * zn**2 + qdistance**3 * zd**2 + r**3 * zr**2
    A4g = t0**4 + q**4 * zn**2 + qdistance**4 * zd**2 + r**4 * zr**2
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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scale", type=int, default=20)
    parser.add_argument("--samples", type=int, default=250000)
    parser.add_argument("--seed", type=int, default=993)
    parser.add_argument("--bernstein", action="store_true")
    parser.add_argument("--max-depth", type=int, default=20)
    args = parser.parse_args()
    G, variables = build_expression()
    print("degrees", sp.Poly(G, *variables).degree_list(), flush=True)
    v = sp.symbols("v", nonnegative=True)
    box_variables = (v,) + variables[1:]
    box_poly = sp.expand(G.subs(variables[0], v / args.scale))
    if args.bernstein:
        degrees, coefficients = tensor_bernstein_fast(box_poly, box_variables)
        print("bernstein degrees", degrees, flush=True)
        print("full minimum", minimum_with_index(coefficients), flush=True)
        stack = [(coefficients, 0, ())]
        certified = 0
        unresolved = []
        while stack:
            patch, depth, address = stack.pop()
            minimum = minimum_with_index(patch)
            if minimum[0] >= 0:
                certified += 1
                continue
            if depth >= args.max_depth:
                unresolved.append((minimum, address))
                continue
            axis = depth % len(box_variables)
            left, right = split_bernstein_midpoint(patch, axis)
            stack.append((left, depth + 1, address + ((axis, 0),)))
            stack.append((right, depth + 1, address + ((axis, 1),)))
        print("certified", certified, "unresolved", len(unresolved), flush=True)
        for item in unresolved[:20]:
            print("unresolved", item, flush=True)
        return 0 if not unresolved else 2

    numeric = sp.lambdify(variables, sp.horner(G, *variables), modules="numpy", cse=True)
    rng = np.random.default_rng(args.seed)
    best = (float("inf"), None)
    for start in range(0, args.samples, 50000):
        size = min(50000, args.samples - start)
        points = rng.random((size, 7))
        points[:, 0] /= args.scale
        values = np.asarray(numeric(*(points[:, j] for j in range(7))))
        index = int(np.argmin(values))
        candidate = float(values[index])
        if candidate < best[0]:
            best = (candidate, points[index].copy())
    print("sample minimum", best[0], flush=True)
    print("point", best[1].tolist(), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
