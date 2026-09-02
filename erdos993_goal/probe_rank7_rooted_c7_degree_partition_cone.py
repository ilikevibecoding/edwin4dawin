#!/usr/bin/env python3
"""Exact low-memory degree-partition probe for the rooted-C7 scalar route.

Retains B3/B4 and the Zagreb edge-correlation ceiling in the exact rank-(4,5)
motif identity instead of collapsing everything to B2.  The output is a
relaxed degree-sequence test only, not a theorem about all trees.
"""

from fractions import Fraction
from functools import lru_cache
from math import comb


def parts(total: int, cap: int | None = None):
    if total == 0:
        yield ()
        return
    if cap is None or cap > total:
        cap = total
    for first in range(cap, 0, -1):
        for rest in parts(total - first, first):
            yield (first,) + rest


def transfer(mu4: Fraction) -> Fraction:
    q = mu4.numerator // mu4.denominator
    assert q >= 3
    phi = Fraction((q - 1) * (q - 2), 2) + (mu4 - q) * (q - 1)
    return 2 * phi / mu4


def choose(x: int, k: int) -> int:
    return comb(x, k) if x >= k else 0


def stats(p: tuple[int, ...]):
    b2 = sum(choose(x, 2) for x in p)
    b3 = sum(choose(x, 3) for x in p)
    b4 = sum(choose(x, 4) for x in p)
    return b2, b3, b4


def ratio_lower(n: int, p: tuple[int, ...]) -> Fraction:
    """Certified by the old exact motif identity under listed relaxations."""
    b2, b3, b4 = stats(p)
    N = n - 2
    m = p[0]
    # Exact universal correlation ceilings from the path-ratio proof.
    x_zagreb = Fraction(2 * (n - 4) * b2 - 6 * b3, 7)
    x_rooted = m * (N - m) - (n - 3)
    X = min(x_zagreb, x_rooted)

    A = Fraction(3 * n**3 - 40 * n**2 + 133 * n - 40, 2)
    B = 4 * n**2 - 35 * n + 49
    C = 4 * n**2 - 30 * n + 34
    D = 5 * (n - 3)
    # W>=B2+B3+max(0,X), and V>=sum C(deg,4)=B3+B4.
    W = max(Fraction(b2 + b3) + max(Fraction(0), X), Fraction(b3 + b4 - (n - 4)))
    L = A * b2 - B * b3 - C * X + D * W
    assert L >= 0

    # In the exact i4 formula E occurs with coefficient -1.  The positive-x
    # core has len(p)-1 edges, each of product at least one.
    E_min = len(p) - 1
    wedges = n - 2 + b2
    triples_min = b2 + b3 + E_min
    i4_cap = (
        comb(n, 4)
        - (n - 1) * comb(n - 2, 2)
        + wedges * (n - 4)
        + comb(n - 1, 2)
        - triples_min
    )
    i4_cap = min(i4_cap, comb(n - 1, 4))
    assert i4_cap > 0
    path_mu4 = Fraction((n - 7) * (n - 8), n - 3)
    return path_mu4 + L / ((n - 3) * i4_cap)


def scalar(n: int, r: int, p: tuple[int, ...]) -> Fraction:
    x = transfer(ratio_lower(n, p)) / 6
    extension_ceiling = Fraction(n - r - 5, 5)
    return 1 + 2 * x - 28 * (extension_ceiling - x) / (1 + extension_ceiling)


def root_degree_possible(n: int, r: int, p: tuple[int, ...]) -> bool:
    if r == 1:
        return len(p) < n  # every nontrivial tree has a leaf
    return r - 1 in p


def main() -> None:
    summaries = []
    global_bad = 0
    for n in range(23, 39):
        plist = list(parts(n - 2))
        for r in range(1, 10):
            feasible = [p for p in plist if root_degree_possible(n, r, p) and stats(p)[0] >= 5]
            bad = [(scalar(n, r, p), p, stats(p)) for p in feasible if scalar(n, r, p) <= 0]
            global_bad += len(bad)
            if bad:
                value, witness, st = min(bad)
                summaries.append((n, r, len(feasible), len(bad), value, witness, st))
    print(f"residual_cells={len(summaries)} residual_partitions={global_bad}")
    for row in summaries:
        print(row)


if __name__ == "__main__":
    main()
