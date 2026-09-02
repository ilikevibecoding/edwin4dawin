#!/usr/bin/env python3
"""Exact Bernstein certificates for Delta^2 through Delta^5.

This verifier first normalizes the raw Newton coefficients to the
five structural variables (n,w,x,D4,r), then maps only the four
remaining variables (n,w,x,r) to a unit box.  Clearing those four
denominators term by term avoids the expression explosion caused by
substituting all nine graph coefficients at once.
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
from verify_rank6_terminal_bundle_reduction import (
    c,
    exact_decomposition,
    h,
    newton_coefficients,
)


D4_CEILING = sp.Rational(1559, 3575)


def abstract_numerator(rank, root_endpoint, d5_endpoint, d4_endpoint):
    n, w, x, d4, r = sp.symbols("n w x d4 r", positive=True)
    c2 = (n - 1) * (n - 2) / 2
    c3 = c2 / w
    c4 = c3 / x
    c5 = (1 - d4) * c3 / x**2
    x5 = x / (1 - d4)
    if d5_endpoint == "q5":
        d5 = (2 + x5) / 12
    elif d5_endpoint == "extension":
        d5 = sp.Rational(1, 6) + x5 / 2
    else:
        raise ValueError(d5_endpoint)
    c6 = (1 - d5) * c5**2 / c4
    if root_endpoint == "upper":
        q = sp.S.One
    elif root_endpoint == "cross":
        q = r - d5 / 2
    elif root_endpoint == "zero":
        q = sp.S.Zero
    elif root_endpoint == "double":
        q = sp.Integer(2)
    else:
        raise ValueError(root_endpoint)
    mapped = (1, n, c2, c3, c4, c5, c6, r * c4, q * c5)
    raw = newton_coefficients(exact_decomposition())[rank]
    rational = sp.together(
        raw.subs(
            dict(zip((*c[:7], h[4], h[5]), mapped)),
            simultaneous=True,
        )
    )
    numerator, denominator = sp.fraction(rational)
    if d4_endpoint == "q4":
        d4_value = (2 + x) / 10
    elif d4_endpoint == "defect":
        d4_value = D4_CEILING
    elif d4_endpoint == "full":
        d4_value = d4
    else:
        raise ValueError(d4_endpoint)
    numerator = sp.expand(numerator.subs(d4, d4_value))
    denominator = sp.factor(denominator.subs(d4, d4_value))
    variables = (
        (n, w, x, r, d4)
        if d4_endpoint == "full"
        else (n, w, x, r)
    )
    return numerator, denominator, variables


def unit_maps(include_d4):
    T, W, A, R, U = sp.symbols("T W A R U", nonnegative=True)
    n_num, n_den = sp.Integer(18), T

    # Exact simplification of the path/star interval for w=c2/c3
    # after n=18/T.
    w_num = T * (18 - 4 * T + 3 * T * W)
    w_den = 2 * (6 - T) * (9 - 2 * T)

    # Exact affine interval from
    #   8w/(6-w) <= x=c3/c4 <= 4w/(3(1-w)).
    x_num = 4 * w_num * (
        6 * (w_den - w_num) + 5 * A * w_num
    )
    x_den = 3 * (6 * w_den - w_num) * (w_den - w_num)
    r_num, r_den = 1 + R, sp.Integer(2)
    maps = [
        (n_num, n_den),
        (w_num, w_den),
        (x_num, x_den),
        (r_num, r_den),
    ]
    box_variables = [T, W, A, R]
    if include_d4:
        low_num = 3575 * (2 * x_den + x_num)
        ceiling_num = 15590 * x_den
        d4_num = low_num + U * (ceiling_num - low_num)
        d4_den = 35750 * x_den
        maps.append((d4_num, d4_den))
        box_variables.append(U)
    return (
        tuple(box_variables),
        tuple(maps),
    )


def verify_unit_map_denominators():
    """Certify that every cleared map denominator has the required sign.

    The point T=0 is the compactified n=infinity boundary.  Thus the
    n-map denominator is allowed to vanish there; all denominators are
    strictly positive on the actual domain T=18/n in (0,1].
    """
    box_variables, maps = unit_maps(True)
    _, n_den = maps[0]
    w_num, w_den = maps[1]
    factors = (
        ("n", n_den),
        ("w", w_den),
        ("x-left", 6 * w_den - w_num),
        ("x-right", w_den - w_num),
        ("root", maps[3][1]),
        ("d4", maps[4][1]),
    )
    total = 0
    midpoint = {variable: sp.Rational(1, 2) for variable in box_variables}
    for label, factor in factors:
        degrees, coefficients = tensor_bernstein_fast(
            sp.expand(factor), box_variables
        )
        minimum, _ = minimum_with_index(coefficients)
        assert minimum >= 0, (label, minimum)
        assert factor.subs(midpoint) > 0, label
        total += coefficients.size
    print(
        "unit-map denominators: CERTIFIED "
        f"Bernstein_coefficients={total:,}",
        flush=True,
    )


def clear_to_unit_box(polynomial, variables):
    box_variables, maps = unit_maps(len(variables) == 5)
    terms = sp.Poly(polynomial, *variables).terms()
    maxima = [
        max(monomial[index] for monomial, _ in terms)
        for index in range(len(variables))
    ]
    total = sp.Poly(0, *box_variables, domain=sp.QQ)
    map_polynomials = [
        (
            sp.Poly(numerator, *box_variables, domain=sp.QQ),
            sp.Poly(denominator, *box_variables, domain=sp.QQ),
        )
        for numerator, denominator in maps
    ]
    cleared_powers = [
        [
            numerator**power * denominator ** (maximum - power)
            for power in range(maximum + 1)
        ]
        for maximum, (numerator, denominator) in zip(
            maxima, map_polynomials
        )
    ]
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
    return total.as_expr(), box_variables, maxima


def clear_to_unit_box_direct(polynomial, variables):
    """Substitute the four rational maps before clearing denominators.

    This route is substantially smaller for Delta^2, whose termwise
    common-denominator expansion has the largest intermediate tensor.
    """
    box_variables, maps = unit_maps(len(variables) == 5)
    substitutions = {
        variable: numerator / denominator
        for variable, (numerator, denominator) in zip(variables, maps)
    }
    rational = sp.together(
        polynomial.subs(substitutions, simultaneous=True)
    )
    numerator, denominator = sp.fraction(rational)
    midpoint = {
        variable: sp.Rational(1, 2) for variable in box_variables
    }
    if denominator.subs(midpoint) < 0:
        numerator = -numerator
        denominator = -denominator
    assert denominator.subs(midpoint) > 0
    numerator = sp.Poly(
        sp.expand(numerator), *box_variables, domain=sp.QQ
    ).as_expr()
    denominator = sp.Poly(
        sp.expand(denominator), *box_variables, domain=sp.QQ
    ).as_expr()
    denominator_degrees, denominator_coefficients = (
        tensor_bernstein_fast(denominator, box_variables)
    )
    denominator_minimum, _ = minimum_with_index(
        denominator_coefficients
    )
    assert denominator_minimum >= 0
    return (
        numerator,
        box_variables,
        None,
        denominator_degrees,
        denominator_minimum,
    )


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


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-difference", type=int, default=2)
    parser.add_argument("--max-difference", type=int, default=5)
    parser.add_argument(
        "--root-endpoint",
        choices=("upper", "cross", "both"),
        default="both",
    )
    parser.add_argument(
        "--d5-endpoint",
        choices=("q5", "extension", "both"),
        default="both",
    )
    parser.add_argument(
        "--d4-endpoint",
        choices=("q4", "defect", "full", "both"),
        default="both",
    )
    parser.add_argument("--maximum-depth", type=int, default=24)
    parser.add_argument("--initial-only", action="store_true")
    parser.add_argument(
        "--clear-method",
        choices=("auto", "term", "direct"),
        default="auto",
    )
    args = parser.parse_args()
    assert 2 <= args.min_difference <= args.max_difference <= 5
    verify_unit_map_denominators()

    roots = (
        ("upper", "cross")
        if args.root_endpoint == "both"
        else (args.root_endpoint,)
    )
    d5s = (
        ("q5", "extension")
        if args.d5_endpoint == "both"
        else (args.d5_endpoint,)
    )
    d4s = (
        ("q4", "defect")
        if args.d4_endpoint == "both"
        else (args.d4_endpoint,)
    )

    total = 0
    for rank in range(
        args.min_difference, args.max_difference + 1
    ):
        for root_endpoint in roots:
            for d5_endpoint in d5s:
                for d4_endpoint in d4s:
                    if (
                        rank == 2
                        and root_endpoint == "upper"
                        and d5_endpoint == "q5"
                        and d4_endpoint == "q4"
                    ):
                        print(
                            "Delta^2 upper/q5/q4: DEFERRED to "
                            "verify_rank6_terminal_bundle_"
                            "delta2_refined_upper.py",
                            flush=True,
                        )
                        continue
                    label = (
                        f"{root_endpoint}/{d5_endpoint}/{d4_endpoint}"
                    )
                    abstract, denominator, variables = (
                        abstract_numerator(
                            rank,
                            root_endpoint,
                            d5_endpoint,
                            d4_endpoint,
                        )
                    )
                    print(
                        f"Delta^{rank} {label}: "
                        f"abstract_terms="
                        f"{len(sp.Poly(abstract, *variables).terms())} "
                        f"denominator={denominator}",
                        flush=True,
                    )
                    clear_method = (
                        "term"
                        if args.clear_method == "auto"
                        else args.clear_method
                    )
                    if clear_method == "direct":
                        (
                            polynomial,
                            box_variables,
                            maxima,
                            denominator_degrees,
                            denominator_minimum,
                        ) = clear_to_unit_box_direct(
                            abstract, variables
                        )
                    else:
                        polynomial, box_variables, maxima = (
                            clear_to_unit_box(abstract, variables)
                        )
                        denominator_degrees = None
                        denominator_minimum = None
                    degrees, coefficients = tensor_bernstein_fast(
                        polynomial, box_variables
                    )
                    minimum, index = minimum_with_index(coefficients)
                    if args.initial_only:
                        leaves, deepest = 1, 0
                    else:
                        leaves, deepest = certify_patch(
                            coefficients, args.maximum_depth
                        )
                    count = leaves * coefficients.size
                    total += count
                    print(
                        f"Delta^{rank} {label}: maxima={maxima} "
                        f"degrees={degrees} minimum={minimum} "
                        f"index={index} leaves={leaves} "
                        f"maximum_depth={deepest} "
                        f"leaf_coefficients={count:,} "
                        f"clear_method={clear_method} "
                        f"map_denominator_degrees={denominator_degrees} "
                        f"map_denominator_minimum={denominator_minimum}",
                        flush=True,
                    )
    print(
        "rank-6 terminal-bundle Delta^2--Delta^5: PASS "
        f"leaf_coefficients={total:,}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
