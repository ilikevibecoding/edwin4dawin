#!/usr/bin/env python3
"""Exact refined certificate for the sole loose Delta^2 endpoint.

The coarse endpoint h5/c5=1 with h4/c4 free contains a false negative.
Put F=A-N[q], m=|F|, u=i3(F)/c4, and Y=i4(F)/i3(F).  Then

    h4/c4 = 1-u,   h5/c5 = 1-(c4/c5)uY.

For m<=8 we use Y>=0 and a path-minimality relaxation.  For m>=9,
the forest ratio lower bound implies the uniform estimate

    Y >= 3/16,

while u<=C(n-2,3)/C(n-3,4).  These two relaxations eliminate m
entirely from the exact certificate.

This replaces only the upper/q5/q4 cell of the coarse Delta^2 cone.
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
from verify_rank6_terminal_bundle_delta2to5 import (
    abstract_numerator,
    unit_maps,
)


n, w, x = sp.symbols("n w x", positive=True)
T, W, A, U = sp.symbols("T W A U", nonnegative=True)


def choose(variable, rank: int):
    return (
        sp.prod(variable - offset for offset in range(rank))
        / sp.factorial(rank)
    )


def general_abstract_numerator():
    p0, d0, variables0 = abstract_numerator(
        2, "zero", "q5", "q4"
    )
    p1, d1, variables1 = abstract_numerator(
        2, "upper", "q5", "q4"
    )
    p2, d2, variables2 = abstract_numerator(
        2, "double", "q5", "q4"
    )
    assert d0 == d1 == d2
    assert variables0 == variables1 == variables2
    qq = sp.symbols("qq", positive=True)
    quadratic = sp.expand((p2 - 2 * p1 + p0) / 2)
    linear = sp.expand(p1 - p0 - quadratic)
    numerator = sp.expand(p0 + linear * qq + quadratic * qq**2)
    variables = (*variables0, qq)
    return (
        sp.Poly(
            sp.expand(numerator), *variables, domain=sp.QQ
        ).as_expr(),
        variables,
    )


def rooted_abstract_numerator():
    polynomial, variables = general_abstract_numerator()
    rr, qq = variables[-2:]
    uu, zz = sp.symbols("uu zz", nonnegative=True)
    x5 = 10 * x / (8 - x)
    rational = sp.together(
        polynomial.subs(
            {rr: 1 - uu, qq: 1 - x5 * zz},
            simultaneous=True,
        )
    )
    numerator, denominator = sp.fraction(rational)
    assert sp.factor(denominator - 50 * (x - 8) ** 2) == 0
    rooted_variables = (n, w, x, uu, zz)
    return (
        sp.Poly(
            sp.expand(numerator),
            *rooted_variables,
            domain=sp.QQ,
        ).as_expr(),
        rooted_variables,
    )


def clear_rational_maps(polynomial, variables, values, box_variables):
    terms = sp.Poly(polynomial, *variables, domain=sp.QQ).terms()
    maxima = [
        max(monomial[index] for monomial, _ in terms)
        for index in range(len(variables))
    ]
    midpoint = {
        variable: sp.Rational(1, 2)
        for variable in box_variables
    }
    map_polynomials = []
    denominators = []
    for value in values:
        numerator, denominator = sp.fraction(sp.cancel(value))
        if denominator.subs(midpoint) < 0:
            numerator = -numerator
            denominator = -denominator
        assert denominator.subs(midpoint) > 0
        numerator = sp.Poly(
            sp.expand(numerator), *box_variables, domain=sp.QQ
        )
        denominator = sp.Poly(
            sp.expand(denominator), *box_variables, domain=sp.QQ
        )
        map_polynomials.append((numerator, denominator))
        denominators.append(denominator.as_expr())

    cleared_powers = [
        [
            numerator**power * denominator ** (maximum - power)
            for power in range(maximum + 1)
        ]
        for maximum, (numerator, denominator) in zip(
            maxima, map_polynomials
        )
    ]
    total = sp.Poly(0, *box_variables, domain=sp.QQ)
    prefix_cache = {}
    for monomial, coefficient in terms:
        prefix = tuple(monomial[:-1])
        term = prefix_cache.get(prefix)
        if term is None:
            term = sp.Poly(1, *box_variables, domain=sp.QQ)
            for index, power in enumerate(prefix):
                term *= cleared_powers[index][power]
            prefix_cache[prefix] = term
        term = term * cleared_powers[-1][monomial[-1]]
        term *= coefficient
        total += term
    return total.as_expr(), tuple(denominators), maxima


def abstract_expression(regime: str):
    _, base_maps = unit_maps(False)
    n_value = base_maps[0][0] / base_maps[0][1]
    w_value = base_maps[1][0] / base_maps[1][1]
    x_value = base_maps[2][0] / base_maps[2][1]
    c2_value = (n_value - 1) * (n_value - 2) / 2
    c4_value = c2_value / (w_value * x_value)

    if regime == "small":
        box_variables = (T, W, A, U)
        coarse, _, coarse_variables = abstract_numerator(
            2, "upper", "q5", "q4"
        )
        assert tuple(str(variable) for variable in coarse_variables) == (
            "n",
            "w",
            "x",
            "r",
        )
        # Coefficientwise path minimality gives
        # c4>=C(n-3,4), so this is a convenient common relaxation.
        r_value = (
            1
            - U * choose(8, 3) / choose(n_value - 3, 4)
        )
        values = (n_value, w_value, x_value, r_value)
        numerator, denominators, maxima = clear_rational_maps(
            coarse, coarse_variables, values, box_variables
        )
    elif regime == "large":
        box_variables = (T, W, A, U)
        coarse, coarse_variables = rooted_abstract_numerator()
        u_value = (
            U
            * choose(n_value - 2, 3)
            / choose(n_value - 3, 4)
        )
        z_value = sp.Rational(3, 16) * u_value
        values = (
            n_value,
            w_value,
            x_value,
            u_value,
            z_value,
        )
        numerator, denominators, maxima = clear_rational_maps(
            coarse, coarse_variables, values, box_variables
        )
    else:
        raise ValueError(regime)

    print(
        f"Delta^2 refined {regime}: rational maps cleared "
        f"maxima={maxima}",
        flush=True,
    )
    return numerator, denominators, box_variables


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


def certify(regime, maximum_depth):
    numerator, denominators, variables = abstract_expression(regime)
    denominator_data = []
    for denominator in denominators:
        denominator_degrees, denominator_coefficients = (
            tensor_bernstein_fast(denominator, variables)
        )
        denominator_minimum, _ = minimum_with_index(
            denominator_coefficients
        )
        assert denominator_minimum >= 0
        denominator_data.append(
            (denominator_degrees, denominator_minimum)
        )

    degrees, coefficients = tensor_bernstein_fast(
        numerator, variables
    )
    minimum, index = minimum_with_index(coefficients)
    leaves, deepest = certify_patch(coefficients, maximum_depth)
    count = leaves * coefficients.size
    print(
        f"Delta^2 refined upper/q5/q4/{regime}: "
        f"degrees={degrees} minimum={minimum} index={index} "
        f"leaves={leaves} maximum_depth={deepest} "
        f"leaf_coefficients={count:,} "
        f"map_denominators={denominator_data}",
        flush=True,
    )
    return count


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--regime",
        choices=("small", "large", "both"),
        default="both",
    )
    parser.add_argument("--maximum-depth", type=int, default=30)
    args = parser.parse_args()
    regimes = (
        ("small", "large")
        if args.regime == "both"
        else (args.regime,)
    )
    total = sum(
        certify(regime, args.maximum_depth)
        for regime in regimes
    )
    print(
        "rank-6 terminal-bundle refined Delta^2 upper endpoint: PASS "
        f"leaf_coefficients={total:,}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
