#!/usr/bin/env python3
"""Test exact rank-split product bounds for unresolved four-gap rows."""

from __future__ import annotations

import argparse
import math

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from explore_uniform_low_high_four_gap_symbolic_payments_root import (
    CACHE,
    load_rows,
    sign,
)


def transformed_polynomial_coefficients(value, mode):
    result = {}
    if mode == "large":
        for (u_degree, x_degree, w_degree), coefficient in value.terms():
            for new_degree in range(w_degree + 1):
                monomial = (u_degree, x_degree, new_degree)
                result[monomial] = (
                    result.get(monomial, QQ.zero)
                    + coefficient * math.comb(w_degree, new_degree)
                )
    elif mode == "small":
        maximum = max(monomial[2] for monomial, _ in value.terms())
        for (u_degree, x_degree, w_degree), coefficient in value.terms():
            remainder = maximum - w_degree
            for added_degree in range(remainder + 1):
                monomial = (u_degree, x_degree, w_degree + added_degree)
                result[monomial] = (
                    result.get(monomial, QQ.zero)
                    + coefficient * math.comb(remainder, added_degree)
                )
    else:
        raise ValueError(mode)
    return [coefficient for coefficient in result.values() if coefficient]


def transformed_fraction_sign(value, mode):
    numerator = transformed_polynomial_coefficients(value.numer, mode)
    denominator = transformed_polynomial_coefficients(value.denom, mode)
    positive = (
        numerator and denominator
        and all(coefficient > 0 for coefficient in numerator)
        and all(coefficient > 0 for coefficient in denominator)
    )
    return (
        "positive" if positive else "mixed",
        len(numerator), min(numerator),
        len(denominator), min(denominator),
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=int, default=2)
    parser.add_argument("--threshold", type=int, default=16)
    parser.add_argument("--high-only", action="store_true")
    parser.add_argument("--fixed-only", action="store_true")
    parser.add_argument("--fixed-start", type=int, default=8)
    parser.add_argument("--split-scaled", action="store_true")
    arguments = parser.parse_args()
    assert arguments.threshold >= 8
    assert not (arguments.high_only and arguments.fixed_only)
    assert CACHE.exists()
    F, k, x, y = field("k,x,y", QQ)
    rows = load_rows(F)
    keys = sorted({key for row in rows.values() for key in row if key[0] >= 1})
    key = keys[arguments.index - 1]

    def coefficient(product):
        return rows[product].get(key, F.zero)

    beta = coefficient(("T", "R"))
    gamma = -coefficient(("L", "R"))
    delta = -coefficient(("R", "R"))
    N, M = k + x, k + y

    threshold = arguments.threshold
    bound_degree = threshold - 1
    print("KEY", key, flush=True)
    if not arguments.fixed_only:
        G, u, xg, zg = field("u,x,z", QQ)
        high_rank_value = (
            beta
            - gamma * (N / (N + M)) ** bound_degree
            - delta * (M / (N + M)) ** bound_degree
        )
        high_rank = G.from_expr(high_rank_value.as_expr().subs({
            k.as_expr(): u.as_expr() + threshold,
            x.as_expr(): xg.as_expr(),
            y.as_expr(): xg.as_expr() + zg.as_expr(),
        }))
        K, uk, xk, wk = field("u,x,w", QQ)
        high_rank_scaled = K.from_expr(high_rank_value.as_expr().subs({
            k.as_expr(): uk.as_expr() + threshold,
            x.as_expr(): xk.as_expr(),
            y.as_expr(): (
                xk.as_expr() + wk.as_expr() * (
                    uk.as_expr() + xk.as_expr() + threshold
                )
            ),
        }))
        print("K_AT_LEAST", threshold, sign(high_rank), flush=True)
        print("K_AT_LEAST_SCALED", threshold, sign(high_rank_scaled), flush=True)
        if arguments.split_scaled:
            print(
                "K_AT_LEAST_SCALED_LARGE", threshold,
                transformed_fraction_sign(high_rank_scaled, "large"), flush=True,
            )
            print(
                "K_AT_LEAST_SCALED_SMALL", threshold,
                transformed_fraction_sign(high_rank_scaled, "small"), flush=True,
            )
        if arguments.high_only:
            return 0

    H, xh, zh = field("x,z", QQ)
    J, xj, wj = field("x,w", QQ)
    for rank in range(arguments.fixed_start, threshold):
        degree = rank - 1
        value = (
            beta
            - gamma * (N / (N + M)) ** degree
            - delta * (M / (N + M)) ** degree
        )
        ordinary = H.from_expr(value.as_expr().subs({
            k.as_expr(): rank,
            x.as_expr(): xh.as_expr(),
            y.as_expr(): xh.as_expr() + zh.as_expr(),
        }))
        ordinary_sign = sign(ordinary)
        if ordinary_sign[0] == "positive":
            scaled_sign = ("not_needed", 0, 0)
        else:
            scaled = J.from_expr(value.as_expr().subs({
                k.as_expr(): rank,
                x.as_expr(): xj.as_expr(),
                y.as_expr(): xj.as_expr() + wj.as_expr() * (xj.as_expr() + rank),
            }))
            scaled_sign = sign(scaled)
        print(
            "FIXED_RANK", rank,
            "ORDINARY", ordinary_sign,
            "SCALED", scaled_sign,
            flush=True,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
