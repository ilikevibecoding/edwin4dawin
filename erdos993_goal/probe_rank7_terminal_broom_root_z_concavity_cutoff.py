#!/usr/bin/env python3
"""Test exact coefficientwise root/D6 concavity at a proposed order cutoff."""

from __future__ import annotations

import argparse
import sympy as sp

from verify_rank7_terminal_broom_reduction import c, exact_decomposition, h, newton_coefficients, t


def stats(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables, domain=sp.QQ)
    negative = [(monomial, coefficient) for monomial, coefficient in polynomial.terms() if coefficient < 0]
    return len(polynomial.terms()), polynomial.degree_list(), negative[:3], len(negative)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, required=True)
    args = parser.parse_args()
    N, S, A, B = sp.symbols("N S A B", nonnegative=True)
    variables = (N, S, A, B, *c[:8], h[5], h[6])
    failures = []
    for rank, coefficient in enumerate(newton_coefficients(exact_decomposition())[:7]):
        checks = {
            "h5": -sp.diff(coefficient, h[5], 2).subs(t, 1).subs(
                {sp.Symbol("n"): N + args.cutoff, h[6]: c[6] - B}
            ),
            "h6": -sp.diff(coefficient, h[6], 2).subs(t, 1).subs(
                {sp.Symbol("n"): N + args.cutoff, h[5]: c[5] - A}
            ),
            "c7": -sp.diff(coefficient, c[7], 2).subs(t, 1).subs(
                {sp.Symbol("n"): N + args.cutoff, h[5]: c[5] * (1 + S) / 2}
            ),
        }
        for coordinate, expression in checks.items():
            result = stats(expression, variables)
            print("rank", rank, coordinate, "terms", result[0], "negative", result[3])
            if result[3]:
                failures.append((rank, coordinate, result[2]))
    if failures:
        print("CUTOFF_CONCAVITY_COEFFICIENTWISE_NO_GO", args.cutoff, failures)
        return 1
    print("PASS_ROOT_Z_CONCAVITY_CUTOFF", args.cutoff)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
