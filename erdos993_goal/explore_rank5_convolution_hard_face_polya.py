#!/usr/bin/env python3
"""Search a compact exact Pólya certificate on the hard rank-5 face."""

from __future__ import annotations

import argparse

from flint import fmpz_mpoly_ctx

from explore_rank5_three_halves_convolution import low_high
from verify_rank4_three_halves_forest_certificate import (
    polynomial_statistics,
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-power", type=int, default=30)
    args = parser.parse_args()

    margin, _ = low_high()
    kept = (0, 1, 2, 5, 6, 7, 8)
    names = ("a", "b", "ta", "a3", "a4", "tb", "b0")
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    variables = context.gens()
    face = context.constant(0)
    for monomial, coefficient in margin.terms():
        if any(
            exponent != 0
            for index, exponent in enumerate(monomial)
            if index not in kept
        ):
            continue
        term = context.constant(int(coefficient))
        for variable, index in zip(variables, kept):
            term *= variable ** int(monomial[index])
        face += term
    variable_sum = sum(variables, context.constant(0))
    certificate = face
    for power in range(args.max_power + 1):
        stats = polynomial_statistics(certificate)
        print(power, stats, flush=True)
        if stats["negative"] == 0:
            print(f"PASS power={power}", flush=True)
            return 0
        certificate *= variable_sum
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
