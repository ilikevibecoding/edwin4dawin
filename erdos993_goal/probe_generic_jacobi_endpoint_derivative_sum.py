"""Probe derivative-sum gamma RR for generic Jacobi endpoint scaling."""

from __future__ import annotations

import random
from fractions import Fraction

from probe_generic_jacobi_vertical_six_leaves import continuant
from verify_aligned_endpoint_three_ray_reduction import add, mixed_gamma
from verify_endpoint_fg_parameter_derivative_reduction import real_rooted


def main():
    rng = random.Random(20260813)
    for trial in range(10000):
        n = rng.randint(4, 12)
        edges = [Fraction(rng.randint(1, 4), 10) for _ in range(n - 1)]
        diag = [Fraction(rng.randint(10, 40), 10) for _ in range(n)]
        if any(diag[i] <= (edges[i - 1] if i else 0) + (edges[i] if i < n - 1 else 0)
               for i in range(n)):
            continue
        full = continuant(diag, edges)
        zero = continuant(diag[:-1], edges[:-1])
        principal_full = continuant(diag[1:], edges[1:])
        principal_zero = continuant(diag[1:-1], edges[1:-1])
        V = add(full, zero, -1)
        W = add(principal_full, principal_zero, -1)
        c = Fraction(rng.randint(0, 100), 10)
        u = Fraction(rng.randint(1, 100), 10)
        A = add(zero, V, c)
        B = add(principal_zero, W, c)
        s = rng.randint(2, 2 * n - 2)
        H = add(mixed_gamma(A, V, s), mixed_gamma(B, W, s), u)
        if not real_rooted(H):
            print("FAIL", trial, n, s, c, u, diag, edges)
            return
    print("PASS")


if __name__ == "__main__":
    main()
