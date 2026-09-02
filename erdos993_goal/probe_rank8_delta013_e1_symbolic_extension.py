#!/usr/bin/env python3
"""Low-memory symbolic probes for e=1 subdivided-claw leaf extension."""

from __future__ import annotations

import argparse

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


MAX_RANK = 8


def choose(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def path_coefficients(order: sp.Expr) -> list[sp.Expr]:
    return [choose(order - rank + 1, rank) for rank in range(MAX_RANK + 1)]


def multiply(left: list[sp.Expr], right: list[sp.Expr]) -> list[sp.Expr]:
    out = [sp.S.Zero] * (MAX_RANK + 1)
    for i, left_value in enumerate(left):
        for j, right_value in enumerate(right[: MAX_RANK + 1 - i]):
            out[i + j] += left_value * right_value
    return [sp.expand(value) for value in out]


def product(rows: list[list[sp.Expr]]) -> list[sp.Expr]:
    out = [sp.S.One] + [sp.S.Zero] * MAX_RANK
    for row in rows:
        out = multiply(out, row)
    return out


def claw_coefficients(arms: tuple[sp.Expr, sp.Expr, sp.Expr]) -> list[sp.Expr]:
    excluded = product([path_coefficients(length) for length in arms])
    included_product = product(
        [path_coefficients(length - 1) for length in arms]
    )
    included = [sp.S.Zero] + included_product[:MAX_RANK]
    return [sp.expand(excluded[index] + included[index]) for index in range(MAX_RANK + 1)]


def new_leaf_expression(delta_rank: int, extended_arm: int):
    A, B, C = sp.symbols("A B C", integer=True, nonnegative=True)
    shortest = A + 1
    old_arms = (shortest, shortest + B, shortest + B + C)
    new_arms = list(old_arms)
    new_arms[extended_arm] += 1
    old_coefficients = claw_coefficients(old_arms)
    new_coefficients = claw_coefficients(tuple(new_arms))
    delta = newton_coefficients(residual())[delta_rank]
    expression = sp.expand(
        delta.subs(
            {
                **{c[index]: new_coefficients[index] for index in range(9)},
                h[6]: old_coefficients[6],
                h[7]: old_coefficients[7],
            },
            simultaneous=True,
        )
    )
    return expression, (A, B, C)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", type=int, choices=(0, 1, 2, 3), required=True)
    parser.add_argument("--extended-arm", type=int, choices=(0, 1, 2), required=True)
    args = parser.parse_args()
    expression, variables = new_leaf_expression(args.rank, args.extended_arm)
    polynomial = sp.Poly(expression, *variables, domain=sp.QQ)
    coefficients = polynomial.coeffs()
    print("NEW_LEAF", args.rank, args.extended_arm)
    print("DEGREES", polynomial.degree_list())
    print("TERMS", len(polynomial.terms()))
    print(
        "SIGNS",
        sum(value < 0 for value in coefficients),
        sum(value == 0 for value in coefficients),
        sum(value > 0 for value in coefficients),
    )
    print("MIN", min(coefficients))


if __name__ == "__main__":
    main()
