#!/usr/bin/env python3
"""Independent exact replay for the published five-break pattern tree.

The tree is (T_{1,7}:S_{2,10})_3^(214) from Bautista-Ramos,
Guillen-Galvan, and Gomez-Salgado (Graphs and Combinatorics, 2026).
It has five consecutive failures of ordinary log concavity.  This replay
checks that it nevertheless has no coefficient rebound and satisfies the
two-step extension inequality both in the required prefix and globally.
"""

from __future__ import annotations

from fractions import Fraction

from flint import fmpz_poly as Poly


X = Poly([0, 1])
P1 = Poly([1, 1])
P2 = Poly([1, 2])


def spider(t: int) -> Poly:
    return P2**t + X * P1**t


def pattern(k: int, n: int, ell: int, m: int) -> Poly:
    s = spider(n)
    t = s**k + X * P2 ** (k * n)
    return spider(ell) * t**m + X * P2**ell * s ** (k * m)


def two_step_best(a: list[int], prefix: bool) -> tuple[Fraction, int]:
    alpha = len(a) - 1
    tail_start = (2 * alpha + 1) // 3
    last = len(a) - 4
    if prefix:
        last = min(last, tail_start - 2)
    best = None
    best_k = None
    for k in range(3, last + 1):
        numerator = (
            (k + 3) * a[k + 3] * a[k]
            - ((k + 1) * a[k + 1] + 2 * a[k]) * a[k + 2]
        )
        denominator = a[k] * a[k + 2]
        value = Fraction(numerator, denominator)
        if best is None or value > best:
            best, best_k = value, k
    assert best is not None and best_k is not None
    return best, best_k


def main() -> None:
    a = [int(c) for c in pattern(3, 10, 7, 214)]
    alpha = len(a) - 1
    first_descent = next(k for k in range(alpha) if a[k + 1] < a[k])
    first_reascent = next(
        (k for k in range(first_descent + 1, alpha) if a[k + 1] > a[k]),
        None,
    )
    lc_failures = [
        k
        for k in range(1, alpha)
        if a[k] * a[k] < a[k - 1] * a[k + 1]
    ]
    prefix_gap, prefix_k = two_step_best(a, True)
    global_gap, global_k = two_step_best(a, False)

    assert alpha == 7070
    assert first_descent == 4385
    assert first_reascent is None
    assert lc_failures == [7061, 7062, 7063, 7064, 7065]
    assert prefix_gap < 0
    assert global_gap < 0

    print(f"degree: {alpha}")
    print(f"first descent: {first_descent}")
    print("first reascent: none")
    print(f"log-concavity failures: {lc_failures}")
    print(
        "best prefix 2SB additive gap: "
        f"{float(prefix_gap):.15f} at k={prefix_k}"
    )
    print(
        "best global 2SB additive gap: "
        f"{float(global_gap):.15f} at k={global_k}"
    )
    print("all exact assertions passed")


if __name__ == "__main__":
    main()
