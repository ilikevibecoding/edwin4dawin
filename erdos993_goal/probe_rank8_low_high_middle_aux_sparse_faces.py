#!/usr/bin/env python3
"""Exact sparse-face probe for the rank-eight low/high middle auxiliary.

This is an enclosure diagnostic, not a cone theorem.  It restricts all but a
small number of high-cone slacks to zero, expands the resulting polynomial in
``h,ta,tb`` and the live slacks, and stops at the first negative coefficient.
"""

from __future__ import annotations

import argparse
from itertools import combinations

from explore_rank8_low_high_middle_aux_faces import (
    LEFT_SLACKS,
    RIGHT_SLACKS,
    build,
)


def first_negative(polynomial):
    for monomial, coefficient in polynomial.terms():
        value = int(coefficient)
        if value < 0:
            return list(monomial), value
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--depth", type=int, default=3)
    args = parser.parse_args()
    slacks = (*LEFT_SLACKS, *RIGHT_SLACKS)
    checked = 0
    for depth in range(args.depth + 1):
        for subset in combinations(slacks, depth):
            live = ("h", "ta", "tb", *subset)
            middle, q2 = build(live)
            for name, polynomial in (("middle", middle), ("q2", q2)):
                negative = first_negative(polynomial)
                if negative is not None:
                    print(
                        {
                            "status": "EXACT_ENCLOSURE_OBSTRUCTION",
                            "live": live,
                            "polynomial": name,
                            "negative": negative,
                            "classification": "negative coefficient is not a negative cone value",
                        }
                    )
                    return
            checked += 1
            if checked % 100 == 0:
                print({"checked": checked, "last": subset}, flush=True)
    print(
        {
            "status": "PASS_SPARSE_FACES_ONLY_NOT_CONE_THEOREM",
            "depth": args.depth,
            "faces": checked,
        }
    )


if __name__ == "__main__":
    main()
