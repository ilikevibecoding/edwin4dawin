#!/usr/bin/env python3
"""Verify the algebra and finite linear-factor cases of the ULC theorem."""

from __future__ import annotations

from fractions import Fraction
from itertools import product
from math import comb


def convolve(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, ai in enumerate(a):
        for j, bj in enumerate(b):
            out[i + j] += ai * bj
    return out


def verify(weights: tuple[int, ...]) -> int:
    m = len(weights)
    k_poly = [1]
    for weight in weights:
        k_poly = convolve(k_poly, [1, weight])
    l_poly = [comb(m, j) for j in range(m + 1)]
    inside = k_poly + [0]
    for j, value in enumerate(l_poly):
        if j + 1 == len(inside):
            inside.append(0)
        inside[j + 1] += value
    b_poly = convolve(inside, [1, 1])

    q = [Fraction(k_poly[j], l_poly[j]) for j in range(m + 1)]
    for j in range(1, m):
        assert q[j] * q[j] >= q[j - 1] * q[j + 1]

    checks = 0
    for k in range(m + 1):
        kp1 = k_poly[k + 1] if k < m else 0
        delta = b_poly[k + 1] * k_poly[k] - b_poly[k] * kp1
        assert delta > 0, (weights, k, delta)
        if 1 <= k < m:
            u, v, z = q[k - 1], q[k], q[k + 1]
            p, r = v / u, z / v
            a_ratio = Fraction(k, m - k + 1)
            lam = Fraction(
                k * (m - k),
                (k + 1) * (m - k + 1),
            )
            theta = Fraction(
                k * (m - k),
                (k + 1) * (m - k + 2),
            )
            normalized = (
                v * (1 - lam * r / p)
                + (1 + a_ratio) * (1 - r * theta)
            )
            assert normalized == Fraction(
                delta,
                v * l_poly[k] * l_poly[k],
            )
            assert p >= r
            assert v >= r**k
            lower = (
                v * (1 - lam)
                + (1 + a_ratio) * (1 - r * theta)
            )
            assert normalized >= lower
            assert lower > 0
        checks += 1
    return checks


def main() -> int:
    cases = 0
    checks = 0
    for m in range(1, 8):
        for weights in product(range(1, 5), repeat=m):
            checks += verify(weights)
            cases += 1
    print(
        f"PASS: {cases:,} positive integer weight lists; "
        f"{checks:,} exact PIRD minors"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
