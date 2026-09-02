"""Numerically audit ordered-root monotonicity of the endpoint family K_c."""

from __future__ import annotations

from fractions import Fraction
from math import comb

import numpy as np

from verify_aligned_endpoint_three_ray_reduction import add, mixed_gamma


def path(M: int) -> list[Fraction]:
    return [Fraction(comb(2 * M - i - 1, i)) for i in range(M)]


def trim(poly):
    poly = list(poly)
    while len(poly) > 1 and poly[-1] == 0:
        poly.pop()
    return poly


def roots(poly):
    poly = trim(poly)
    values = np.array([float(x) for x in reversed(poly)], dtype=float)
    rr = np.roots(values)
    if np.max(np.abs(rr.imag), initial=0.0) > 2e-5:
        raise AssertionError(rr)
    return np.sort(rr.real)


def evaluate(poly, x):
    out = 0.0
    for coefficient in reversed(poly):
        out = out * x + float(coefficient)
    return out


def derivative_t(poly):
    return [i * poly[i] for i in range(1, len(poly))]


def main():
    u_values = [Fraction(1, 10**6), Fraction(1, 1000), Fraction(1),
                Fraction(1000), Fraction(10**6)]
    c_values = [Fraction(0), Fraction(1, 1000), Fraction(1, 10),
                Fraction(1), Fraction(10), Fraction(1000)]
    total = 0
    minimum = float("inf")
    maximum = -float("inf")
    worst = None
    best = None
    sign_patterns = set()
    for N in range(5, 51):
        P, C, D, R = path(N), path(N - 1), path(N - 2), path(N - 3)
        V, W = add(P, C, -1), add(C, D, -1)
        for s in range(2, 2 * N - 5):
            E1, E2 = mixed_gamma(C, C, s), mixed_gamma(D, D, s)
            F1, F2 = mixed_gamma(C, V, s), mixed_gamma(D, W, s)
            G1, G2 = mixed_gamma(V, V, s), mixed_gamma(W, W, s)
            for u in u_values:
                E, F, G = add(E1, E2, u), add(F1, F2, u), add(G1, G2, u)
                for c in c_values:
                    K = add(add(E, F, 2 * c), G, c * c)
                    H = add(F, G, c)
                    rr = roots(K)
                    dt = derivative_t(K)
                    velocities = [-2.0 * evaluate(H, x) / evaluate(dt, x) for x in rr]
                    # Ignore the forced zero roots, whose derivative may be 0/0
                    # after the common factor has not been stripped.
                    velocities = [x for x in velocities if np.isfinite(x)]
                    if velocities:
                        pattern = tuple(np.sign(x) for x in velocities)
                        sign_patterns.add(pattern)
                        local_min, local_max = min(velocities), max(velocities)
                        if local_min < minimum:
                            minimum, worst = local_min, (N, s, u, c, rr, velocities)
                        if local_max > maximum:
                            maximum, best = local_max, (N, s, u, c, rr, velocities)
                        if local_min < -1e-7 and local_max > 1e-7:
                            print("MIXED SIGN FAIL", (N, s, u, c, rr, velocities))
                            return
                    total += len(rr)
    print("PASS", total, "root velocities", "range", minimum, maximum)
    print("patterns", sign_patterns)
    print("worst", worst)


def forest_cone_main():
    u_values = [Fraction(1, 10**6), Fraction(1, 1000), Fraction(1),
                Fraction(1000), Fraction(10**6)]
    c_values = [Fraction(0), Fraction(1, 1000), Fraction(1, 10),
                Fraction(1), Fraction(10), Fraction(1000)]
    minimum = float("inf")
    maximum = -float("inf")
    worst = None
    best = None
    total = 0
    for s in range(2, 31):
        for excess in (0, 1, 5, 20, 100):
            N = 2 * s + 5 + excess
            P, C, D = path(N), path(N - 1), path(N - 2)
            V, W = add(P, C, -1), add(C, D, -1)
            E1, E2 = mixed_gamma(C, C, s), mixed_gamma(D, D, s)
            F1, F2 = mixed_gamma(C, V, s), mixed_gamma(D, W, s)
            G1, G2 = mixed_gamma(V, V, s), mixed_gamma(W, W, s)
            for u in u_values:
                E, F, G = add(E1, E2, u), add(F1, F2, u), add(G1, G2, u)
                for c in c_values:
                    K = add(add(E, F, 2 * c), G, c * c)
                    H = add(F, G, c)
                    rr = roots(K)
                    dt = derivative_t(K)
                    velocities = [-2.0 * evaluate(H, x) / evaluate(dt, x) for x in rr]
                    velocities = [x for x in velocities if np.isfinite(x)]
                    if velocities:
                        local_min, local_max = min(velocities), max(velocities)
                        if local_min < minimum:
                            minimum, worst = local_min, (N, s, u, c, rr, velocities)
                        if local_max > maximum:
                            maximum, best = local_max, (N, s, u, c, rr, velocities)
                        if local_min < -1e-6 and local_max > 1e-6:
                            print("FOREST MIXED SIGN FAIL", (N, s, u, c, rr, velocities))
                            return
                    total += len(rr)
    print("FOREST PASS", total, minimum, maximum, worst, "best", best)


if __name__ == "__main__":
    main()
    forest_cone_main()
