#!/usr/bin/env python3
"""Compare a direct-H tail-gap negative part with tb -> tb + b_j.

Exploration only.
"""

from __future__ import annotations

import argparse
import math

from explore_rank8_low_high_strong_aux_faces import build


BASE = ("h", "ta", "a3", "a4", "tb", "b0", "b1", "b2")


def negatives(polynomial):
    return {
        tuple(map(int, monomial)): -int(coefficient)
        for monomial, coefficient in polynomial.terms()
        if int(coefficient) < 0
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tail", choices=("b3", "b4", "b5", "b6", "b7"), required=True)
    args = parser.parse_args()
    base_polynomial, base_names = build(BASE, "strong")
    assert base_names == BASE
    base_negative = negatives(base_polynomial)
    actual_names = (*BASE, args.tail)
    actual_polynomial, names = build(actual_names, "strong")
    assert names == actual_names
    actual_negative = negatives(actual_polynomial)
    tb_index = BASE.index("tb")
    tail_index = len(BASE)
    predicted = {}
    for monomial, demand in base_negative.items():
        degree = monomial[tb_index]
        for tail_degree in range(degree + 1):
            lifted = list(monomial) + [tail_degree]
            lifted[tb_index] = degree - tail_degree
            key = tuple(lifted)
            predicted[key] = predicted.get(key, 0) + demand * math.comb(degree, tail_degree)
    missing = {key: value for key, value in predicted.items()
               if actual_negative.get(key) != value}
    extra = {key: value for key, value in actual_negative.items()
             if predicted.get(key) != value}
    print({
        "tail": args.tail,
        "base_negative": len(base_negative),
        "predicted_negative": len(predicted),
        "actual_negative": len(actual_negative),
        "missing_or_mismatched": len(missing),
        "extra_or_mismatched": len(extra),
        "first_missing": next(iter(missing.items()), None),
        "first_extra": next(iter(extra.items()), None),
    })


if __name__ == "__main__":
    main()
