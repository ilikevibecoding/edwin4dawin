#!/usr/bin/env python3
"""Exact certificate for Delta^6 of the terminal-broom residual."""

from __future__ import annotations

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


def symbolic_factor() -> tuple[sp.Expr, tuple[sp.Symbol, ...]]:
    n, c3, c4, c5, c6, a, b = sp.symbols(
        "n c3 c4 c5 c6 a b", positive=True
    )
    bracket = (
        56 * a * n
        + 60 * a
        - 96 * b
        + 120 * c3**2
        + (402 * n**2 - 2022 * n - 4380) * c3
        - (8 * n**2 + 1268 * n + 4492) * c4
        - (320 * n + 1596) * c5
        - 240 * c6
        + 355 * n**4
        - 1020 * n**3
        + 1995 * n**2
        + 2010 * n
        - 236
    )
    delta6 = newton_coefficients(exact_decomposition())[6]
    specialized = delta6.subs(
        {
            c[0]: 1,
            c[1]: n,
            c[2]: (n - 1) * (n - 2) / 2,
            c[3]: c3,
            c[4]: c4,
            c[5]: c5,
            c[6]: c6,
            h[4]: c4 - a,
            h[5]: c5 - b,
        },
        simultaneous=True,
    )
    assert sp.expand(
        specialized
        - sp.Rational(3, 2) * c5 * (c4 - a) * bracket
    ) == 0

    # If F=A-N[root] has m<=n-1 vertices, extension counting gives
    # 4b <= (m-3)a <= (n-4)a.  The slightly weaker n-5 endpoint is
    # valid whenever F is nonempty in the terminal configuration;
    # use the universally valid n-4 endpoint here.
    root_lower = sp.factor(
        (56 * n + 60) * a - 24 * (n - 4) * a
    )
    assert root_lower == 4 * a * (8 * n + 39)

    whole = sp.expand(
        bracket
        - (56 * a * n + 60 * a - 96 * b)
    )
    return whole, (n, c3, c4, c5, c6, a, b)


def mapped_numerator(whole, endpoint):
    del whole
    n, w, x, d4 = sp.symbols("n w x d4", positive=True)
    T, W, A = sp.symbols("T W A", nonnegative=True)
    order = 18 / T
    c2 = (order - 1) * (order - 2) / 2
    w_low = 3 / (order - 3)
    w_high = 3 * (order - 1) / (
        (order - 3) * (order - 4)
    )
    w_value = sp.factor(w_low + (w_high - w_low) * W)
    x_low = 8 * w_value / (6 - w_value)
    x_high = 4 * w_value / (3 * (1 - w_value))
    x_value = sp.factor(x_low + (x_high - x_low) * A)
    if endpoint == "q4":
        d4_value = (2 + x_value) / 10
    elif endpoint == "defect":
        d4_value = D4_CEILING
    else:
        raise ValueError(endpoint)

    # After using the Q5 upper bound on c6 and substituting
    # c3=c2/w, c4=c3/x, c5=(1-d4)c3/x^2, multiply the remaining
    # bracket by the positive factor w^2*x^3.
    linear_c3 = (
        (402 * n**2 - 2022 * n - 4380) * x**3
        - (8 * n**2 + 1268 * n + 4492) * x**2
        - (320 * n + 1576) * (1 - d4) * x
        - 200 * (1 - d4) ** 2
    )
    polynomial = (
        120 * c2**2 * x**3
        + c2 * w * linear_c3
        + (
            355 * n**4
            - 1020 * n**3
            + 1995 * n**2
            + 2010 * n
            - 236
        )
        * w**2
        * x**3
    )
    rational = sp.together(
        polynomial.subs(
            {
                n: order,
                w: w_value,
                x: x_value,
                d4: d4_value,
            },
            simultaneous=True,
        )
    )
    print(f"Delta6 {endpoint}: rational map built", flush=True)
    numerator, denominator = sp.fraction(rational)
    midpoint = {T: sp.Rational(1, 2), W: sp.Rational(1, 2), A: sp.Rational(1, 2)}
    assert denominator.subs(midpoint) > 0
    expanded = sp.expand(numerator)
    print(f"Delta6 {endpoint}: numerator expanded", flush=True)
    return expanded, (T, W, A)


def certify(polynomial, variables):
    degrees, coefficients = tensor_bernstein_fast(
        polynomial, variables
    )
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
        if depth >= 24:
            raise AssertionError(
                f"unresolved Delta6 patch at depth {depth}: {minimum}"
            )
        axis = depth % patch.ndim
        left, right = split_bernstein_midpoint(patch, axis)
        queue.append((left, depth + 1))
        queue.append((right, depth + 1))
    return degrees, coefficients.size * leaves, leaves, deepest


def main() -> int:
    whole, _ = symbolic_factor()
    total = 0
    for endpoint in ("q4", "defect"):
        polynomial, variables = mapped_numerator(whole, endpoint)
        degrees, count, leaves, deepest = certify(
            polynomial, variables
        )
        total += count
        print(
            f"Delta6 {endpoint}: degrees={degrees} "
            f"leaf_coefficients={count:,} leaves={leaves} "
            f"maximum_depth={deepest}",
            flush=True,
        )
    print(
        "rank-6 terminal-bundle Delta^6: CERTIFIED "
        f"leaf_coefficients={total:,}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
