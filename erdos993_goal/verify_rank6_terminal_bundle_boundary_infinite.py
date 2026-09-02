#!/usr/bin/env python3
"""Exact infinite certificates for the two terminal-bundle boundaries.

The domain is n>=24.  Adjacent whole-tree ratios are coupled through

    E = 1 - Z/X,  Z = c3/c4,  X = c4/c5,

rather than bounded independently.  Rank-4 defect bounds give

    (2+X)/(10+X) <= E <= (1+3X)/(3(2+X)).

The q-concavity endpoint q=r-D/2 is certified directly.  At the other
endpoint, q=1-X*u*Y, orders m<=8 use Y>=0 and the common upper bound
u<=C(8,3)/C(n-3,4); m>=9 uses the path/forest bound
Y>=(m^2-10m+15)/(4(m-1)).
"""

from __future__ import annotations

import argparse
from collections import deque

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank6_terminal_bundle_boundary_reduction import (
    D,
    X,
    Y,
    Z,
    normalized_boundaries,
    q,
    r,
    u,
)


T, A, EBOX, U, V = sp.symbols(
    "T A EBOX U V", nonnegative=True
)


def choose(variable, rank: int):
    return (
        sp.prod(variable - offset for offset in range(rank))
        / sp.factorial(rank)
    )


def common_map():
    n = 24 / T
    x_lower = 5 / (n - 5)
    x_upper = 5 * (n - 3) / ((n - 7) * (n - 8))
    x_value = x_lower + A * (x_upper - x_lower)

    e_lower = (2 + x_value) / (10 + x_value)
    e_upper = (1 + 3 * x_value) / (3 * (2 + x_value))
    e_value = e_lower + EBOX * (e_upper - e_lower)
    z_value = x_value * (1 - e_value)
    return n, x_value, z_value


def endpoint_expression(
    rank: int,
    d_endpoint: str,
    q_endpoint: str,
    small_m: int | None,
):
    residual, first = normalized_boundaries()
    expression = (residual, first)[rank]
    n, x_value, z_value = common_map()
    d_value = (
        (2 + x_value) / 12
        if d_endpoint == "lower"
        else sp.Rational(1, 6) + x_value / 2
    )

    if q_endpoint == "cross":
        u_value = U / 2
        r_value = 1 - u_value
        q_value = r_value - d_value / 2
        variables = (T, A, EBOX, U)
    elif small_m is not None:
        m = sp.Integer(small_m)
        u_cap = choose(m, 3) / choose(n - 3, 4)
        u_value = U * u_cap
        r_value = 1 - u_value
        q_value = sp.S.One
        variables = (T, A, EBOX, U)
    else:
        m = 9 + V * (n - 11)
        u_cap = choose(m, 3) / choose(n - 3, 4)
        u_value = U * u_cap
        y_value = (m**2 - 10 * m + 15) / (4 * (m - 1))
        r_value = 1 - u_value
        q_value = 1 - x_value * u_value * y_value
        variables = (T, A, EBOX, U, V)

    substitutions = {
        X: x_value,
        Z: z_value,
        D: d_value,
        r: r_value,
        q: q_value,
    }
    rational = sp.together(
        expression.subs(substitutions, simultaneous=True)
    )
    numerator, denominator = sp.fraction(rational)
    numerator = sp.Poly(
        sp.expand(numerator), *variables, domain=sp.QQ
    ).as_expr()
    denominator = sp.Poly(
        sp.expand(denominator), *variables, domain=sp.QQ
    ).as_expr()

    midpoint = {
        variable: sp.Rational(1, 2) for variable in variables
    }
    if denominator.subs(midpoint) < 0:
        numerator = -numerator
        denominator = -denominator
    assert denominator.subs(midpoint) > 0
    return numerator, denominator, variables


def certify_patch(coefficients, maximum_depth):
    queue = deque([(coefficients, 0)])
    leaves = 0
    deepest = 0
    while queue:
        patch, depth = queue.popleft()
        minimum, _ = minimum_with_index(patch)
        if minimum >= 0:
            leaves += 1
            deepest = max(deepest, depth)
            continue
        if depth >= maximum_depth:
            raise AssertionError(
                f"unresolved patch at depth {depth}: {minimum}"
            )
        axis = depth % patch.ndim
        left, right = split_bernstein_midpoint(patch, axis)
        queue.append((left, depth + 1))
        queue.append((right, depth + 1))
    return leaves, deepest


def certify_expression(
    rank,
    d_endpoint,
    q_endpoint,
    small_m,
    maximum_depth,
):
    numerator, denominator, variables = endpoint_expression(
        rank, d_endpoint, q_endpoint, small_m
    )
    label = (
        f"{('R1', 'DeltaR1')[rank]} {d_endpoint}/{q_endpoint}"
        + (f"/m={small_m}" if small_m is not None else "")
    )
    denominator_degrees, denominator_coefficients = (
        tensor_bernstein_fast(denominator, variables)
    )
    denominator_minimum, _ = minimum_with_index(
        denominator_coefficients
    )
    assert denominator_minimum >= 0, (
        label,
        "denominator",
        denominator_minimum,
    )

    degrees, coefficients = tensor_bernstein_fast(
        numerator, variables
    )
    minimum, index = minimum_with_index(coefficients)
    leaves, deepest = certify_patch(coefficients, maximum_depth)
    count = leaves * coefficients.size
    print(
        f"{label}: degrees={degrees} minimum={minimum} index={index} "
        f"leaves={leaves} maximum_depth={deepest} "
        f"leaf_coefficients={count:,} "
        f"denominator_degrees={denominator_degrees} "
        f"denominator_minimum={denominator_minimum}",
        flush=True,
    )
    return count


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rank", choices=("0", "1", "both"), default="both")
    parser.add_argument(
        "--d-endpoint",
        choices=("lower", "upper", "both"),
        default="both",
    )
    parser.add_argument(
        "--q-endpoint",
        choices=("cross", "upper", "both"),
        default="both",
    )
    parser.add_argument(
        "--small-m",
        choices=("none", "all"),
        default="all",
    )
    parser.add_argument(
        "--large-m",
        choices=("yes", "no"),
        default="yes",
    )
    parser.add_argument("--maximum-depth", type=int, default=30)
    args = parser.parse_args()

    ranks = (0, 1) if args.rank == "both" else (int(args.rank),)
    d_endpoints = (
        ("lower", "upper")
        if args.d_endpoint == "both"
        else (args.d_endpoint,)
    )
    q_endpoints = (
        ("cross", "upper")
        if args.q_endpoint == "both"
        else (args.q_endpoint,)
    )

    total = 0
    for rank in ranks:
        for d_endpoint in d_endpoints:
            for q_endpoint in q_endpoints:
                if q_endpoint == "cross":
                    total += certify_expression(
                        rank,
                        d_endpoint,
                        q_endpoint,
                        None,
                        args.maximum_depth,
                    )
                    continue
                if args.small_m == "all":
                    total += certify_expression(
                        rank,
                        d_endpoint,
                        q_endpoint,
                        8,
                        args.maximum_depth,
                    )
                if args.large_m == "yes":
                    total += certify_expression(
                        rank,
                        d_endpoint,
                        q_endpoint,
                        None,
                        args.maximum_depth,
                    )
    print(
        "rank-6 terminal-bundle infinite boundary: PASS "
        f"leaf_coefficients={total:,}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
