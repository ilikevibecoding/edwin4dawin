#!/usr/bin/env python3
"""Inspect midpoint AM-GM pairs in a rank-six quotient slice."""

from __future__ import annotations

import argparse
import gzip
import json
import math
from pathlib import Path

import sympy as sp


COEFFICIENT_FILE = Path(__file__).with_name(
    "rank6_hard_quotient_coefficients.json.gz"
)


def quotient_slice(b_power: int) -> tuple[
    tuple[sp.Symbol, ...], dict[tuple[int, ...], int]
]:
    with gzip.open(COEFFICIENT_FILE, "rt", encoding="utf-8") as handle:
        rows = json.load(handle)
    active = sp.symbols("ta a3 a4 a5 tb b0", nonnegative=True)
    coefficients = {
        tuple(int(value) for value in exponents[1:]): int(coefficient)
        for exponents, coefficient in rows
        if int(exponents[0]) == b_power
    }
    return active, coefficients


def monomial_text(
    variables: tuple[sp.Symbol, ...], exponents: tuple[int, ...]
) -> str:
    return " ".join(
        f"{variable}^{exponent}"
        for variable, exponent in zip(variables, exponents)
        if exponent
    ) or "1"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--b-power", type=int, default=1)
    parser.add_argument("--top", type=int, default=3)
    args = parser.parse_args()
    variables, coefficients = quotient_slice(args.b_power)
    positives = {
        monomial: coefficient
        for monomial, coefficient in coefficients.items()
        if coefficient > 0
    }
    negatives = sorted(
        (-coefficient, monomial)
        for monomial, coefficient in coefficients.items()
        if coefficient < 0
    )
    print(
        f"b_power={args.b_power} positive={len(positives)} "
        f"negative={len(negatives)}"
    )
    for needed, middle in sorted(negatives, reverse=True):
        candidates = []
        for left, left_coefficient in positives.items():
            right = tuple(
                2 * middle_index - left_index
                for middle_index, left_index in zip(middle, left)
            )
            if left > right or right not in positives:
                continue
            right_coefficient = positives[right]
            ratio = 2 * math.sqrt(left_coefficient * right_coefficient) / needed
            candidates.append(
                (ratio, left_coefficient, right_coefficient, left, right)
            )
        candidates.sort(reverse=True)
        print(
            f"NEG {needed} {monomial_text(variables, middle)} "
            f"pairs={len(candidates)} best={candidates[0][0] if candidates else 0:.4f}"
        )
        for ratio, lc, rc, left, right in candidates[: args.top]:
            print(
                f"  ratio={ratio:.4f} coefficients=({lc},{rc}) "
                f"L={monomial_text(variables, left)} "
                f"R={monomial_text(variables, right)}"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
