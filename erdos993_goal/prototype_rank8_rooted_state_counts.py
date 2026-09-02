#!/usr/bin/env python3
"""Count exact truncated rooted-tree DP states (exploratory)."""

from __future__ import annotations

import argparse

R = 8


def add(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(x + y for x, y in zip(a, b))


def mul(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * (R + 1)
    for i, x in enumerate(a):
        if not x:
            continue
        for j in range(R + 1 - i):
            out[i + j] += x * b[j]
    return tuple(out)


ONE = (1,) + (0,) * R


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--maximum", type=int, default=18)
    args = ap.parse_args()

    # rooted states: (excluded polynomial, included polynomial, alpha_exc, alpha_inc)
    roots: list[set[tuple]] = [set() for _ in range(args.maximum + 1)]
    # child-forest aggregates: (product(any), product(excluded), alpha_any, alpha_exc)
    forests: list[set[tuple]] = [set() for _ in range(args.maximum + 1)]
    forests[0].add((ONE, ONE, 0, 0))
    for n in range(1, args.maximum + 1):
        for fa, fe, faa, fee in forests[n - 1]:
            roots[n].add((fa, (0,) + fe[:-1], faa, 1 + fee))
        agg = set()
        for m in range(1, n + 1):
            for e, i, ae, ai in roots[m]:
                anyp = add(e, i)
                aa = max(ae, ai)
                for fa, fe, faa, fee in forests[n - m]:
                    agg.add((mul(fa, anyp), mul(fe, e), faa + aa, fee + ae))
        forests[n] = agg
        print(n, "rooted", len(roots[n]), "child_forests", len(forests[n]), flush=True)


if __name__ == "__main__":
    main()
