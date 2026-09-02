#!/usr/bin/env python3
"""Exact finite diagnostic for Q4 >= (1/4) i3 i4 on forest rows."""

import argparse
from fractions import Fraction

from verify_rank4_three_halves_forest_certificate import forest_polynomials


def q4(poly):
    p = list(poly) + [0] * (6 - len(poly))
    return 8 * p[4] * p[4] - p[3] * p[4] - 10 * p[3] * p[5]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=16)
    args = parser.parse_args()
    forests = forest_polynomials(args.max_order)
    overall = None
    failures = 0
    for order in range(1, args.max_order + 1):
        eligible = []
        for poly in forests[order]:
            p = list(poly) + [0] * (6 - len(poly))
            if p[3] and p[4]:
                ratio = Fraction(q4(poly), p[3] * p[4])
                eligible.append((ratio, poly))
                if 4 * q4(poly) < p[3] * p[4]:
                    failures += 1
        if eligible:
            minimum = min(eligible, key=lambda item: item[0])
            if overall is None or minimum[0] < overall[0]:
                overall = (minimum[0], order, minimum[1])
            print(
                order, len(forests[order]), len(eligible),
                minimum[0], minimum[1], flush=True,
            )
        else:
            print(order, len(forests[order]), 0, "NA", flush=True)
    print("FAILURES", failures, flush=True)
    print("OVERALL", overall, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
