#!/usr/bin/env python3
"""Exact certificate for Delta^7 of the rank-7 terminal-broom residual.

The raw coefficient factors as a nonnegative prefactor times a bracket.
Rooted extension counting removes its only rooted term.  The proved
rank-4, rank-5, and rank-6 reserves then monotonically send c5,c6,c7 to
their sharp reserve endpoints.  A three-variable Bernstein certificate
checks the remaining (n,c3,c4) domain for every n>=15.
"""

from __future__ import annotations

from collections import deque

import sympy as sp

from explore_rank4_three_halves_grouped import (
    minimum_with_index,
    split_bernstein_midpoint,
    tensor_bernstein_fast,
)
from verify_rank7_terminal_broom_high_differences import (
    a,
    b,
    c,
    exact_factors,
    n,
    specialized_coefficients,
)


def reduced_bracket():
    coefficients = specialized_coefficients()
    exact_factors(coefficients)
    raw = sp.factor(
        -2 * coefficients[7] / (7 * c[6] * (a - c[5]))
    )
    expected = (
        32 * a * n
        + 34 * a
        - 56 * b
        + 658 * c[3] ** 2
        + 168 * c[3] * c[4]
        + (1141 * n**2 - 4725 * n - 4676) * c[3]
        - (28 * n**2 + 3234 * n + 8204) * c[4]
        - (84 * n**2 + 1548 * n + 5052) * c[5]
        - (312 * n + 1392) * c[6]
        - 168 * c[7]
        + 665 * n**4
        - 2380 * n**3
        + 4725 * n**2
        - 686 * n
        + 882
    )
    assert sp.expand(raw - expected) == 0

    # If J=A-N[root] has m<=n-1 vertices, then
    # 5b <= (m-4)a <= (n-5)a.  Hence the rooted part is at least
    # (104n+450)a/5 and may be discarded.
    root_lower = sp.factor(32 * a * n + 34 * a - sp.Rational(56, 5) * (n - 5) * a)
    assert sp.expand(root_lower - sp.Rational(2, 5) * (52 * n + 225) * a) == 0
    whole = sp.expand(expected - (32 * a * n + 34 * a - 56 * b))

    c3, c4, c5, c6, c7 = c[3:8]
    c7_upper = (12 * c6**2 - c5 * c6) / (14 * c5)
    after7 = sp.factor(whole.subs(c7, c7_upper))
    derivative6 = sp.factor(sp.diff(after7, c6))
    assert sp.together(
        derivative6 + 12 * (26 * c5 * n + 115 * c5 + 24 * c6) / c5
    ) == 0

    c6_upper = (10 * c5**2 - c4 * c5) / (12 * c4)
    after6 = sp.factor(after7.subs(c6, c6_upper))
    derivative5 = sp.factor(sp.diff(after6, c5))
    expected_derivative5 = -2 * (
        42 * c4**2 * n**2
        + 761 * c4**2 * n
        + 2469 * c4**2
        + 260 * c4 * c5 * n
        + 1130 * c4 * c5
        + 150 * c5**2
    ) / c4**2
    assert sp.expand(derivative5 - expected_derivative5) == 0

    c5_upper = (8 * c4**2 - c3 * c4) / (10 * c3)
    endpoint = sp.factor(after6.subs(c5, c5_upper))
    return endpoint, (n, c3, c4), derivative6, derivative5


def mapped_numerator(endpoint):
    n0, c3, c4 = sp.symbols("n c3 c4", positive=True)
    # Rebind by position because imported symbols carry assumptions.
    endpoint = endpoint.subs({n: n0, c[3]: c3, c[4]: c4}, simultaneous=True)
    T, W, A = sp.symbols("T W A", nonnegative=True)
    order = sp.Rational(15, 1) / T
    c2 = (order - 1) * (order - 2) / 2
    w_low = 3 / (order - 3)
    w_high = 3 * (order - 1) / ((order - 3) * (order - 4))
    w_value = sp.factor(w_low + (w_high - w_low) * W)
    x_low = 8 * w_value / (6 - w_value)
    x_high = 4 * w_value / (3 * (1 - w_value))
    x_value = sp.factor(x_low + (x_high - x_low) * A)

    rational = sp.together(
        endpoint.subs(
            {
                n0: order,
                c3: c2 / w_value,
                c4: c2 / (w_value * x_value),
            },
            simultaneous=True,
        )
    )
    numerator, denominator = sp.fraction(rational)
    midpoint = {T: sp.Rational(1, 2), W: sp.Rational(1, 2), A: sp.Rational(1, 2)}
    if denominator.subs(midpoint) < 0:
        numerator, denominator = -numerator, -denominator
    assert denominator.subs(midpoint) > 0
    numerator = sp.expand(numerator)
    denominator = sp.expand(denominator)
    denominator_degrees, denominator_coefficients = tensor_bernstein_fast(
        denominator, (T, W, A)
    )
    denominator_minimum, _ = minimum_with_index(denominator_coefficients)
    assert denominator_minimum >= 0
    return numerator, (T, W, A), denominator_degrees, denominator_minimum


def certify(polynomial, variables):
    degrees, coefficients = tensor_bernstein_fast(polynomial, variables)
    queue = deque([(coefficients, 0)])
    leaves = 0
    deepest = 0
    worst = None
    while queue:
        patch, depth = queue.popleft()
        minimum, index = minimum_with_index(patch)
        if worst is None or minimum < worst[0]:
            worst = (minimum, index, depth)
        if minimum >= 0:
            leaves += 1
            deepest = max(deepest, depth)
            continue
        if depth >= 36:
            raise AssertionError(
                f"unresolved Delta7 patch at depth {depth}: {minimum}, index={index}"
            )
        axis = depth % patch.ndim
        left, right = split_bernstein_midpoint(patch, axis)
        queue.append((left, depth + 1))
        queue.append((right, depth + 1))
    return degrees, coefficients.size, leaves, deepest, worst


def main() -> int:
    endpoint, _, derivative6, derivative5 = reduced_bracket()
    numerator, variables, denominator_degrees, denominator_minimum = mapped_numerator(endpoint)
    degrees, initial_count, leaves, deepest, worst = certify(numerator, variables)
    print("rank-7 terminal-broom Delta^7: CERTIFIED for n>=15")
    print("d_after_Q6/d_c6 =", derivative6)
    print("d_after_Q5/d_c5 =", derivative5)
    print(
        f"numerator_degrees={degrees} initial_coefficients={initial_count:,} "
        f"leaves={leaves} maximum_depth={deepest} worst_initial_or_child={worst}"
    )
    print(
        f"denominator_degrees={denominator_degrees} "
        f"denominator_Bernstein_minimum={denominator_minimum}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
