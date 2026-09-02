#!/usr/bin/env python3
"""Exact numerical diagnostics for the unresolved four-gap payment rows."""

from __future__ import annotations

import argparse
import math
from fractions import Fraction

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from explore_uniform_low_high_four_gap_symbolic_payments_root import (
    CACHE,
    PRODUCTS,
    load_rows,
)


def evaluate_polynomial(value, arguments):
    total = Fraction(0)
    for monomial, coefficient in value.terms():
        term = Fraction(int(coefficient.numerator), int(coefficient.denominator))
        for argument, power in zip(arguments, monomial):
            term *= argument**power
        total += term
    return total


def evaluate(value, arguments):
    numerator = evaluate_polynomial(value.numer, arguments)
    denominator = evaluate_polynomial(value.denom, arguments)
    return numerator / denominator


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=int, default=2)
    arguments = parser.parse_args()
    assert CACHE.exists()
    F, k, x, y = field("k,x,y", QQ)
    rows = load_rows(F)
    keys = sorted({key for row in rows.values() for key in row if key[0] >= 1})
    key = keys[arguments.index - 1]

    def coefficient(product):
        return rows[product].get(key, F.zero)

    alpha = coefficient(("T", "L"))
    beta = coefficient(("T", "R"))
    epsilon = coefficient(("L", "L"))
    gamma = -coefficient(("L", "R"))
    delta = -coefficient(("R", "R"))
    assert coefficient(("T", "T")) == 0
    print("KEY", key, flush=True)

    samples = (0, 1, 2, 5, 20, 100, 1000)
    ranks = (8, 9, 12, 20, 50, 100)
    minima = {
        "coarse_gamma_positive": None,
        "tight_gamma_positive": None,
        "tight15_gamma_positive": None,
        "tight31_gamma_positive": None,
        "tight63_gamma_positive": None,
        "right_normalized": None,
        "left_normalized": None,
        "full_normalized": None,
    }
    witnesses = {}
    sign_counts = {
        "gamma_positive": 0,
        "gamma_negative": 0,
        "delta_positive": 0,
        "delta_negative": 0,
        "right_negative": 0,
        "full_negative": 0,
    }
    for rank in ranks:
        for xv in samples:
            for gap in samples:
                yv = xv + gap
                values = {
                    "alpha": evaluate(alpha, (rank, xv, yv)),
                    "beta": evaluate(beta, (rank, xv, yv)),
                    "epsilon": evaluate(epsilon, (rank, xv, yv)),
                    "gamma": evaluate(gamma, (rank, xv, yv)),
                    "delta": evaluate(delta, (rank, xv, yv)),
                }
                N, M = rank + xv, rank + yv
                T = math.prod(xv + yv + rank + index for index in range(2, rank + 1))
                L = math.prod(xv + index for index in range(2, rank + 1))
                R = math.prod(yv + index for index in range(2, rank + 1))
                coarse = (
                    values["beta"] - values["delta"]
                    - values["gamma"] * Fraction(N, M) ** 7
                )
                tight = (
                    values["beta"]
                    - values["gamma"] * Fraction(N, N + M) ** 7
                    - values["delta"] * Fraction(M, N + M) ** 7
                )
                stronger = {
                    degree: (
                        values["beta"]
                        - values["gamma"] * Fraction(N, N + M) ** degree
                        - values["delta"] * Fraction(M, N + M) ** degree
                    )
                    for degree in (15, 31, 63)
                    if rank >= degree + 1
                }
                right = (
                    values["beta"]
                    - values["gamma"] * Fraction(L, T)
                    - values["delta"] * Fraction(R, T)
                )
                left = (
                    values["alpha"] * Fraction(L, R)
                    + values["epsilon"] * Fraction(L * L, T * R)
                )
                full = left + right
                row = {
                    "coarse_gamma_positive": coarse,
                    "tight_gamma_positive": tight,
                    "right_normalized": right,
                    "left_normalized": left,
                    "full_normalized": full,
                }
                row.update({
                    f"tight{degree}_gamma_positive": value
                    for degree, value in stronger.items()
                })
                for label, value in row.items():
                    if minima[label] is None or value < minima[label]:
                        minima[label] = value
                        witnesses[label] = (rank, xv, yv)
                sign_counts["gamma_positive" if values["gamma"] >= 0 else "gamma_negative"] += 1
                sign_counts["delta_positive" if values["delta"] >= 0 else "delta_negative"] += 1
                if right < 0:
                    sign_counts["right_negative"] += 1
                if full < 0:
                    sign_counts["full_negative"] += 1
    for label, value in minima.items():
        print(
            label,
            "SIGN", (value > 0) - (value < 0),
            "FLOAT", f"{float(value):.12g}",
            "WITNESS", witnesses[label],
            "EXACT", value,
            flush=True,
        )
    print("SIGN_COUNTS", sign_counts, flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
