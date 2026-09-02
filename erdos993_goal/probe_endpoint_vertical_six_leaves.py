"""Probe the six leaves in the endpoint F/G vertical decomposition."""

from __future__ import annotations

from fractions import Fraction
from itertools import combinations

from verify_aligned_endpoint_three_ray_reduction import (
    add,
    common_gap,
    mixed_gamma,
    p,
)
from verify_endpoint_fg_parameter_derivative_reduction import real_rooted


def main() -> None:
    names = ("A1", "A2", "B1", "B2", "C1", "C2")
    failures = {pair: [] for pair in combinations(names, 2)}
    pencil_failures = {pair: [] for pair in combinations(names, 2)}
    for N in range(5, 41):
        C = [p(N - 1, i) for i in range(N - 1)]
        D = [p(N - 2, i) for i in range(N - 2)]
        R = [p(N - 3, i) for i in range(N - 3)]
        P = [p(N, i) for i in range(N)]
        V = add(P, C, Fraction(-1))
        W = add(C, D, Fraction(-1))
        S, T = V[1:], W[1:]
        for s in range(2, 2 * N - 5):
            n = s - 1
            leaves = {
                "A1": mixed_gamma(S, S, n),
                "A2": mixed_gamma(T, T, n),
                "B1": [Fraction(0)] + mixed_gamma(D, S, n - 1),
                "B2": [Fraction(0)] + mixed_gamma(R, T, n - 1),
                "C1": [Fraction(0)] + mixed_gamma(S, S, n - 1),
                "C2": [Fraction(0)] + mixed_gamma(T, T, n - 1),
            }
            maxlen = max(map(len, leaves.values()))
            leaves = {
                k: v + [Fraction(0)] * (maxlen - len(v))
                for k, v in leaves.items()
            }
            for pair in failures:
                if len(failures[pair]) >= 3:
                    continue
                try:
                    good = common_gap(leaves[pair[0]], leaves[pair[1]])
                except AssertionError:
                    failures[pair].append((N, s, "degree"))
                    continue
                if not good:
                    failures[pair].append((N, s, "gap"))
            for pair in pencil_failures:
                if len(pencil_failures[pair]) >= 3:
                    continue
                for q in (Fraction(1, 1000), Fraction(1), Fraction(1000)):
                    if not real_rooted(add(leaves[pair[0]], leaves[pair[1]], q)):
                        pencil_failures[pair].append((N, s, str(q)))
                        break
    for pair, cells in failures.items():
        print(pair, cells or "PASS")
    print("PENCILS")
    for pair, cells in pencil_failures.items():
        print(pair, cells or "PASS")


if __name__ == "__main__":
    main()
