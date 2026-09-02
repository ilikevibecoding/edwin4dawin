"""Probe compatibility of coordinate derivatives of spectral gamma rows."""

from __future__ import annotations

import random
from fractions import Fraction

from verify_aligned_endpoint_three_ray_reduction import add
from verify_endpoint_fg_parameter_derivative_reduction import real_rooted


def gamma_spectrum(lam, s):
    # table[u_degree][t_degree]
    table = [[Fraction(1)]]
    for x in lam:
        nxt = [[Fraction(0)] * ((k + 2) // 2 + 1) for k in range(len(table) + 2)]
        for udeg, row in enumerate(table):
            for h, value in enumerate(row):
                nxt[udeg][h] += value
                nxt[udeg + 1][h] += x * value
                nxt[udeg + 2][h + 1] += x * x * value
        table = nxt
    return table[s] if s < len(table) else [Fraction(0)]


def coordinate_derivative(lam, s, index):
    left = gamma_spectrum(lam[:index] + lam[index + 1 :], s - 1)
    lower = gamma_spectrum(lam[:index] + lam[index + 1 :], s - 2)
    return add(left, [Fraction(0)] + [2 * lam[index] * x for x in lower])


def main():
    rng = random.Random(20260813)
    for trial in range(5000):
        n = rng.randint(3, 12)
        lam = [Fraction(rng.randint(1, 80), rng.randint(1, 20)) for _ in range(n)]
        s = rng.randint(2, 2 * n - 1)
        partials = [coordinate_derivative(lam, s, i) for i in range(n)]
        for i, p in enumerate(partials):
            if not real_rooted(p):
                print("PARTIAL FAIL", trial, n, s, i, lam)
                return
        for i in range(n):
            for j in range(i + 1, n):
                for q in (Fraction(1, 100), Fraction(1), Fraction(100)):
                    if not real_rooted(add(partials[i], partials[j], q)):
                        print("PAIR FAIL", trial, n, s, i, j, q, lam)
                        return
    print("PASS")

    # Coordinatewise spectral increase need not move all zeros in the same
    # direction; audit it separately from compatibility of the partials.
    for trial in range(5000):
        n = rng.randint(3, 12)
        lam = [Fraction(rng.randint(1, 80), rng.randint(1, 20)) for _ in range(n)]
        s = rng.randint(2, 2 * n - 1)
        base = gamma_spectrum(lam, s)
        partial = coordinate_derivative(lam, s, rng.randrange(n))
        # At roots of base, signs of -partial/base' are the root velocities.
        # Instead test compatibility, which is the weaker fact actually needed.
        for q in (Fraction(1, 100), Fraction(1), Fraction(100)):
            if not real_rooted(add(base, partial, q)):
                print("BASE/PARTIAL FAIL", trial, n, s, q, lam)
                return
    print("BASE/PARTIAL PASS")


if __name__ == "__main__":
    main()
