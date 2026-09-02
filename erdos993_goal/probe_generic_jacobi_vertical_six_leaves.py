"""Probe six-leaf compatibility for generic positive Jacobi deletion squares."""

from __future__ import annotations

import random
from fractions import Fraction

from verify_aligned_endpoint_three_ray_reduction import add, mixed_gamma
from verify_endpoint_fg_parameter_derivative_reduction import real_rooted


def mul(a, b):
    out = [Fraction(0)] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return out


def sub(a, b):
    return add(a, b, Fraction(-1))


def continuant(diag, edge):
    if not diag:
        return [Fraction(1)]
    p0 = [Fraction(1)]
    p1 = [Fraction(1), diag[0]]
    for k in range(1, len(diag)):
        p2 = sub(
            mul([Fraction(1), diag[k]], p1),
            [Fraction(0), Fraction(0)] + [edge[k - 1] ** 2 * x for x in p0],
        )
        # Trim exact high zeros introduced by padding.
        while len(p2) > 1 and p2[-1] == 0:
            p2.pop()
        p0, p1 = p1, p2
    return p1


def main():
    rng = random.Random(20260813)
    failures = set()
    for trial in range(1000):
        k = rng.randint(4, 10)
        # Strict diagonal dominance guarantees positive definiteness.
        edge = [Fraction(rng.randint(1, 3), 10) for _ in range(k - 1)]
        diag = [Fraction(3 + rng.randint(0, 20), 5) for _ in range(k)]
        S = continuant(diag, edge)
        T = continuant(diag[1:], edge[1:])
        D = continuant(diag[:-1], edge[:-1])
        R = continuant(diag[1:-1], edge[1:-1])
        s = rng.randint(2, 2 * k - 2)
        n = s - 1
        leaves = [
            mixed_gamma(S, S, n),
            mixed_gamma(T, T, n),
            [Fraction(0)] + mixed_gamma(D, S, n - 1),
            [Fraction(0)] + mixed_gamma(R, T, n - 1),
            [Fraction(0)] + mixed_gamma(S, S, n - 1),
            [Fraction(0)] + mixed_gamma(T, T, n - 1),
        ]
        size = max(map(len, leaves))
        leaves = [x + [Fraction(0)] * (size - len(x)) for x in leaves]
        for i in range(6):
            for j in range(i + 1, 6):
                for q in (Fraction(1, 100), Fraction(1), Fraction(100)):
                    if not real_rooted(add(leaves[i], leaves[j], q)):
                        failures.add((i, j))
    print("GENERIC FAIL PAIRS", sorted(failures))


def constant_chain_probe():
    rng = random.Random(20260814)
    for trial in range(3000):
        k = rng.randint(4, 12)
        edge_value = Fraction(rng.randint(1, 8), 10)
        interior = Fraction(rng.randint(10, 30), 10)
        endpoint = Fraction(rng.randint(10, 30), 10)
        edge = [edge_value] * (k - 1)
        diag = [interior] * (k - 1) + [endpoint]
        # Require an obviously positive definite chain.
        if min(interior, endpoint) <= 2 * edge_value:
            continue
        S = continuant(diag, edge)
        T = continuant(diag[1:], edge[1:])
        D = continuant(diag[:-1], edge[:-1])
        R = continuant(diag[1:-1], edge[1:-1])
        s = rng.randint(2, 2 * k - 2)
        n = s - 1
        leaves = [
            mixed_gamma(S, S, n), mixed_gamma(T, T, n),
            [Fraction(0)] + mixed_gamma(D, S, n - 1),
            [Fraction(0)] + mixed_gamma(R, T, n - 1),
            [Fraction(0)] + mixed_gamma(S, S, n - 1),
            [Fraction(0)] + mixed_gamma(T, T, n - 1),
        ]
        size = max(map(len, leaves))
        leaves = [x + [Fraction(0)] * (size - len(x)) for x in leaves]
        for i in range(6):
            for j in range(i + 1, 6):
                for q in (Fraction(1, 100), Fraction(1), Fraction(100)):
                    if not real_rooted(add(leaves[i], leaves[j], q)):
                        print("CONSTANT FAIL", trial, k, s, i, j, q,
                              interior, endpoint, edge_value)
                        return
    print("CONSTANT PASS")


def target_ray_probe():
    for endpoint_int in range(11, 31):
        endpoint = Fraction(endpoint_int, 10)
        for k in range(4, 20):
            edge = [Fraction(1)] * (k - 1)
            diag = [Fraction(2)] * (k - 1) + [endpoint]
            S = continuant(diag, edge)
            T = continuant(diag[1:], edge[1:])
            D = continuant(diag[:-1], edge[:-1])
            R = continuant(diag[1:-1], edge[1:-1])
            for s in range(2, 2 * k - 1):
                n = s - 1
                leaves = [
                    mixed_gamma(S, S, n), mixed_gamma(T, T, n),
                    [Fraction(0)] + mixed_gamma(D, S, n - 1),
                    [Fraction(0)] + mixed_gamma(R, T, n - 1),
                    [Fraction(0)] + mixed_gamma(S, S, n - 1),
                    [Fraction(0)] + mixed_gamma(T, T, n - 1),
                ]
                size = max(map(len, leaves))
                leaves = [x + [Fraction(0)] * (size - len(x)) for x in leaves]
                for i in range(6):
                    for j in range(i + 1, 6):
                        for q in (Fraction(1, 100), Fraction(1), Fraction(100)):
                            if not real_rooted(add(leaves[i], leaves[j], q)):
                                print("TARGET RAY FAIL", endpoint, k, s, i, j, q)
                                return
    print("TARGET RAY PASS")


if __name__ == "__main__":
    main()
    constant_chain_probe()
    target_ray_probe()
