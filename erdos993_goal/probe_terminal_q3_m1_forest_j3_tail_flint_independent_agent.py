#!/usr/bin/env python3
"""FLINT construction probe for the conservative-cap forest m1,j3 tail."""

from __future__ import annotations

from time import perf_counter
from math import comb, prod

from flint import fmpq, fmpq_mpoly_ctx


CTX = fmpq_mpoly_ctx.get(["E", "u", "v", "r", "w"])
E, u, v, r, w = CTX.gens()


def q(n, d=1):
    return fmpq(n, d)


def choose(x, k):
    ans = CTX.constant(1)
    for j in range(k):
        ans *= x - j
    return ans / q(1 if k < 2 else (2 if k == 2 else (6 if k == 3 else 24)))


def build():
    # This parameterization is onto the continuous N>=31, S>=5 relaxation:
    # S=5+(N-6)v, H=(S-2)u/2, R=(S-2)(1-u)r,
    # L=(S-2)(1-u)(1-r), d=N-S.
    N = 31 + E
    spanS = 25 + E
    S = 5 + spanS * v
    H = (S - 2) * u / 2
    h = 1 + H
    d = N - S
    R = (S - 2) * (1 - u) * r
    L = (S - 2) * (1 - u) * (1 - r)
    assert not (S - (2 * h + R + L))
    Wlo = choose(d, 2) + R + L
    Whi = Wlo + choose(R + 1, 2) + choose(L + 1, 2)
    W = Wlo + (Whi - Wlo) * w
    m = N - h

    p0 = choose(N + 1, 3) - m * (N - 1) + W + choose(N + 1, 2) - m
    p1 = choose(N + 1, 2) - m + N + 1
    R1 = m * N - 2 * W
    a = choose(N, 2) - (m - d)
    z2 = (m - d) * (N - 2) - 2 * (W - choose(d, 2) - R)
    h2 = choose(S, 2) - (m - d - R)
    c0 = a + z2 + h2
    b = choose(N, 3) - (m - d) * (N - 2) + W - choose(d, 2) - R
    A1 = p0 * a + p1 * c0 + p1 * a - a * R1
    gap = 2 * p1 * c0 - 3 * a * R1

    coarse_f4 = (
        choose(S - 3, 4)
        + d * choose(S - 2, 3) - R * choose(S - 3, 2)
        + choose(d, 2) * choose(S - 1, 2)
        - (d - 1) * R * (S - 2)
        + choose(d, 3) * S - choose(d - 1, 2) * R
        + choose(d, 4)
    )
    C = h2 + coarse_f4
    eH = N - h - d - R
    U3 = choose(S, 3) - eH * (S - 2) + choose(eH, 2)
    B = (
        d * choose(S - 1, 2) - R * (S - 2)
        + choose(d, 2) * S - (d - 1) * R + choose(d, 3)
    )
    Tden = U3 + B

    def scaled(which, yvalue):
        ebar_num = 2 * a * (1 + yvalue) + 3 * z2
        Q0_num = 8 * a * c0 - 3 * ebar_num * (p0 + a)
        Q1_num = (
            2 * a * (4 * (a + R1) - 3 * (p0 + a + p1))
            - 3 * ebar_num * p1
        )
        remainder_num = p0 * Q1_num + p1 * Q0_num + p1 * Q1_num
        t = N - 3
        base = (
            12 * a * p1 * b * t * p0 * R1
            + 4 * a * t * p0 * p0 * gap
            + 8 * a * p1 * t * A1 * p0
            + p1 * b * t * remainder_num
        )
        if which == "coupled":
            u0term = (
                2 * a * p1 * b * t * A1 * (t + 2 * yvalue)
                + 24 * a * p1 * b * A1 * yvalue
            )
        else:
            u0term = (
                8 * a * p1 * b * t * A1 * (1 + yvalue)
                + 8 * a * p1 * t * A1 * C
            )
        return base + u0term

    c0p, c1p = scaled("coupled", 0), scaled("coupled", 1)
    t0p, t1p = scaled("tangent", 0), scaled("tangent", 1)
    Pc = c0p * Tden + (c1p - c0p) * U3
    Pt = t0p * Tden + (t1p - t0p) * U3
    K = (
        4 * C * (N - 3) * Tden
        - b * ((N - 7) * (N - 3) * Tden - 2 * (N - 9) * U3)
    )
    expected = 2 * a * p1 * A1 * K
    assert Pt - Pc == expected
    return Pc, Pt, K, Tden


def stats(name, poly):
    values = list(poly.to_dict().values())
    print(name, "terms", len(poly), "degrees", poly.degrees(),
          "total_degree", poly.total_degree(), "negative_power", sum(x < 0 for x in values),
          flush=True)


def bernstein_net(poly):
    """Homogenize E to e=E/(1+E), then Bernstein-convert u,v,r,w."""
    degrees = tuple(poly.degrees())
    shape = tuple(x + 1 for x in degrees)
    size = prod(shape)
    values = [fmpq(0)] * size
    strides = tuple(prod(shape[j + 1:]) for j in range(len(shape)))
    for powers, coefficient in poly.to_dict().items():
        index = sum(power * stride for power, stride in zip(powers, strides))
        values[index] = coefficient / comb(degrees[0], powers[0])
    for axis in range(1, len(shape)):
        n = degrees[axis]
        stride = strides[axis]
        outer_count = prod(shape[:axis])
        converted = [fmpq(0)] * size
        weights = [[fmpq(comb(i, k), comb(n, k)) for k in range(i + 1)]
                   for i in range(n + 1)]
        for outer in range(outer_count):
            block = outer * shape[axis] * stride
            for inner in range(stride):
                line = [values[block + k * stride + inner] for k in range(n + 1)]
                for i in range(n + 1):
                    total = fmpq(0)
                    for k in range(i + 1):
                        total += weights[i][k] * line[k]
                    converted[block + i * stride + inner] = total
        values = converted
    return shape, values


def net_stats(values):
    negative = [x for x in values if x < 0]
    return len(negative), min(values), sum(x == 0 for x in values)


def subdivide(shape, values, axis):
    n = shape[axis] - 1
    stride = prod(shape[axis + 1:])
    outer_count = prod(shape[:axis])
    left = [fmpq(0)] * len(values)
    right = [fmpq(0)] * len(values)
    for outer in range(outer_count):
        block = outer * shape[axis] * stride
        for inner in range(stride):
            level = [values[block + k * stride + inner] for k in range(n + 1)]
            lline = [level[0]]
            rline = [None] * (n + 1)
            rline[n] = level[-1]
            for depth in range(1, n + 1):
                level = [(level[k] + level[k + 1]) / 2
                         for k in range(len(level) - 1)]
                lline.append(level[0])
                rline[n - depth] = level[-1]
            for k in range(n + 1):
                left[block + k * stride + inner] = lline[k]
                right[block + k * stride + inner] = rline[k]
    return left, right


def main():
    started = perf_counter()
    Pc, Pt, K, Tden = build()
    print("build_seconds", perf_counter() - started, flush=True)
    for name, poly in (("Pc",Pc),("Pt",Pt),("K",K),("Tden",Tden)):
        stats(name,poly)
    nets = []
    for name, poly in (("Pc",Pc),("Pt",Pt)):
        started = perf_counter()
        shape, values = bernstein_net(poly)
        print(name, "net", shape, "seconds", perf_counter()-started,
              "stats", net_stats(values), flush=True)
        nets.append((shape, values))
    for axis, label in enumerate(("e", "u", "v", "r", "w")):
        started = perf_counter()
        children = [subdivide(shape, values, axis) for shape, values in nets]
        child_stats = []
        for side in range(2):
            child_stats.append(tuple(net_stats(children[b][side]) for b in range(2)))
        print("split", label, "seconds", perf_counter()-started,
              "children", child_stats, flush=True)
    current = [values for _shape, values in nets]
    vleft3 = None
    print("v_dyadic_start", flush=True)
    for depth in range(1, 9):
        pairs = [subdivide(nets[b][0], current[b], 2) for b in range(2)]
        lefts = [pairs[b][0] for b in range(2)]
        rights = [pairs[b][1] for b in range(2)]
        print("v_band_depth", depth,
              "right", tuple(net_stats(x) for x in rights),
              "left", tuple(net_stats(x) for x in lefts), flush=True)
        current = lefts
        if depth == 3:
            vleft3 = lefts
    assert vleft3 is not None
    for axis, label in enumerate(("e", "u", "v", "r", "w")):
        children = [subdivide(nets[b][0], vleft3[b], axis) for b in range(2)]
        print("vleft3_split", label,
              [tuple(net_stats(children[b][side]) for b in range(2))
               for side in range(2)], flush=True)


if __name__ == "__main__":
    main()
