#!/usr/bin/env python3
"""Exact broad-cone certificate for Delta^1 through Delta^4.

These four low isolate-payment differences are nonnegative under only
the rank-3 reserve, the two-step factorial drop, and the elementary
rank-1 reserve.  The sharper rank-2 curvature cone is needed beginning
with Delta^5 and is handled by the companion verifier.
"""

from __future__ import annotations

from collections import deque

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank5_isolate_payment_monotonicity import (
    parameter_data,
    raw_forward_differences,
    remove_nonnegative_monomial_factor,
    verify_q_concavity,
)


def cleared_numerator(raw, coefficient_variables, box_variables):
    X, _, _, W, V, Z = box_variables
    terms = sp.Poly(raw, *coefficient_variables).terms()
    powers = []
    for monomial, _ in terms:
        a0, a1, a2, _, a4, a5, _, ak = monomial
        powers.append(
            (
                a4 + 2 * a5 + ak,
                2 * a0 + a1,
                a0 + a1 + a2,
            )
        )
    maxima = tuple(
        max(item[index] for item in powers)
        for index in range(3)
    )
    numerator = sp.S.Zero
    D, r, q = sp.symbols("D r q", real=True)
    for (monomial, coefficient), exponents in zip(terms, powers):
        a0, a1, a2, _, _, a5, ah, ak = monomial
        px, px4, px8 = exponents
        term = coefficient
        term *= (12 * X**3 * W * V**2 * Z) ** a0
        term *= (12 * X**2 * W * V) ** a1
        term *= (6 * X * W) ** a2
        term *= (1 - D) ** a5
        term *= r**ah * q**ak
        term *= X ** (maxima[0] - px)
        term *= (X + 4) ** (maxima[1] - px4)
        term *= (X + 8) ** (maxima[2] - px8)
        numerator += term
    return sp.expand(numerator), (D, r, q)


def certify_patch(coefficients, degrees):
    queue = deque([(coefficients, 0)])
    leaves = 0
    maximum_depth = 0
    axis_order = (0, 3, 4, 5, 1, 2)
    while queue:
        patch, depth = queue.popleft()
        minimum, index = minimum_with_index(patch)
        if minimum >= 0:
            leaves += 1
            maximum_depth = max(maximum_depth, depth)
            continue
        if depth >= 30:
            raise AssertionError(
                f"unresolved minimum={minimum} index={index} "
                f"depth={depth}"
            )
        axis = axis_order[depth % len(axis_order)]
        left, right = split_bernstein_midpoint(patch, axis)
        queue.append((left, depth + 1))
        queue.append((right, depth + 1))
    return leaves, maximum_depth


def main() -> int:
    differences, coefficient_variables = raw_forward_differences()
    verify_q_concavity(differences, coefficient_variables)
    box_variables, normalized_variables, _, q_regions = parameter_data(13)
    D_target, r_target, q_target = normalized_variables
    total = 0
    for order, raw in enumerate(differences[:4], start=1):
        common, (D, r, q) = cleared_numerator(
            raw, coefficient_variables, box_variables
        )
        order_total = 0
        for name, r_value, d_value, q_value in q_regions:
            endpoint = common.xreplace(
                {
                    D: d_value,
                    r: r_value,
                    q: q_value,
                }
            )
            # The q-region expressions use the distinct normalized
            # symbols returned by parameter_data.
            endpoint = endpoint.xreplace(
                {
                    D_target: d_value,
                    r_target: r_value,
                    q_target: q_value,
                }
            )
            residual, monomial = remove_nonnegative_monomial_factor(
                sp.expand(endpoint), box_variables
            )
            degrees, coefficients = tensor_bernstein_fast(
                residual, box_variables
            )
            leaves, maximum_depth = certify_patch(
                coefficients, degrees
            )
            count = leaves * coefficients.size
            order_total += count
            print(
                f"Delta^{order} {name}: degrees={degrees} "
                f"leaf_coefficients={count:,} leaves={leaves} "
                f"maximum_depth={maximum_depth} "
                f"monomial_factor={monomial}",
                flush=True,
            )
        total += order_total
        print(
            f"Delta^{order}: PASS leaf_coefficients={order_total:,}",
            flush=True,
        )
    print(
        "rank-5 low isolate differences: PASS "
        f"leaf_coefficients={total:,}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
