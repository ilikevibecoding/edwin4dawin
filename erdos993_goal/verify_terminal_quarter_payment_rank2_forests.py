#!/usr/bin/env python3
"""Exact certificate for terminal quarter-payment at r=1 and r=2.

For a rooted forest (R,q), put B=I(R), C=I(R-q), and attach the
two-vertex path q-p-l.  The terminal local-payment notation is

    a = B_r + C_{r-1}
    a+ = B_{r+1} + C_r
    Lambda = a B_r + B_r^2 + 2(r+1)(a+ B_r-a B_{r+1})
    M = B_{r-1}((r+1)a+ + B_r) - r B_r a.

This script proves

    4 M^2 <= B_{r-1}(a+B_{r-1}) Lambda

for every forest at r=1 and r=2 (whenever the coefficients exist).
"""

from __future__ import annotations

import sympy as sp


def assert_nonnegative_power_coefficients(
    expression: sp.Expr,
    variables: tuple[sp.Symbol, ...],
) -> int:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    assert polynomial.as_expr() != 0
    assert all(coefficient >= 0 for _, coefficient in polynomial.terms())
    return len(polynomial.terms())


def shifted_check(
    expression: sp.Expr,
    variables: tuple[sp.Symbol, ...],
    roots: tuple[tuple[int, ...], ...],
) -> int:
    count = 0
    for root in roots:
        shifted = sp.expand(
            expression.subs(
                {
                    variable: variable + offset
                    for variable, offset in zip(variables, root)
                },
                simultaneous=True,
            )
        )
        count += assert_nonnegative_power_coefficients(shifted, variables)
    return count


def quarter_gap(
    r: int,
    b_previous: sp.Expr,
    b_current: sp.Expr,
    b_next: sp.Expr,
    c_previous: sp.Expr,
    c_current: sp.Expr,
) -> sp.Expr:
    k = r + 1
    a = b_current + c_previous
    a_next = b_next + c_current
    local_reserve = (
        a * b_current
        + b_current**2
        + 2 * k * (a_next * b_current - a * b_next)
    )
    mean_numerator = (
        b_previous * (k * a_next + b_current)
        - r * b_current * a
    )
    return sp.expand(
        b_previous * (a + b_previous) * local_reserve
        - 4 * mean_numerator**2
    )


def main() -> None:
    n, m, d, z = sp.symbols(
        "n m d Z", integer=True, nonnegative=True
    )

    # Rank r=1.  A forest has m edges with 0 <= m <= n-1.
    q1 = quarter_gap(
        1,
        1,
        n,
        n * (n - 1) / 2 - m,
        1,
        n - 1,
    )
    assert sp.factor(sp.diff(q1, m, 2)) == -32
    y = sp.symbols("y", integer=True, nonnegative=True)
    rank1_checks = 0
    for endpoint in (0, n - 1):
        rank1_checks += assert_nonnegative_power_coefficients(
            sp.expand(q1.subs({m: endpoint, n: y + 1})),
            (y,),
        )

    # Rank r=2.  For a forest,
    #   B2 = C(n,2)-m,
    #   B3 = C(n,3)-m(n-2)+Z,
    # where Z=sum_v C(deg(v),2).  Deleting a root of degree d gives
    #   C1=n-1, C2=C(n-1,2)-(m-d).
    b2 = n * (n - 1) / 2 - m
    b3 = n * (n - 1) * (n - 2) / 6 - m * (n - 2) + z
    c1 = n - 1
    c2 = (n - 1) * (n - 2) / 2 - (m - d)
    q2 = quarter_gap(2, n, b2, b3, c1, c2)

    # Q is separately concave in the root degree d and the adjacent-edge
    # count Z.  Therefore its minimum on the feasible rectangle occurs
    # at a corner.
    assert sp.factor(sp.diff(q2, d, 2)) == -72 * n**2
    assert sp.factor(sp.diff(q2, z, 2)) == -72 * n**2

    # The elementary forest bounds are
    #   0 <= d <= m,
    #   max(0,2m-n) <= Z <= C(m,2).
    # The lower bound follows termwise from C(deg(v),2)>=deg(v)-1;
    # the upper bound counts adjacent pairs among all pairs of edges.
    slack, components, excess = sp.symbols(
        "s c t", integer=True, nonnegative=True
    )
    coefficient_checks = 0

    # Region 2m <= n: n=2m+s and Z_min=0.  The condition n>=5 is the
    # union of the four integer orthants below.
    low_roots = ((0, 5), (1, 3), (2, 1), (3, 0))
    for d_endpoint in (0, m):
        low = sp.expand(
            q2.subs(
                {z: 0, d: d_endpoint, n: 2 * m + slack},
                simultaneous=True,
            )
        )
        coefficient_checks += shifted_check(
            low, (m, slack), low_roots
        )

    # Region 2m >= n: write n=m+c, m=c+t.  Then n=2c+t,
    # Z_min=2m-n=t, c>=1, and n>=5.
    high_roots = ((1, 3), (2, 1), (3, 0))
    for d_endpoint in (0, components + excess):
        high = sp.expand(
            q2.subs(
                {
                    n: 2 * components + excess,
                    m: components + excess,
                    z: excess,
                    d: d_endpoint,
                },
                simultaneous=True,
            )
        )
        coefficient_checks += shifted_check(
            high, (components, excess), high_roots
        )

    # The common upper endpoint is Z=C(m,2), with n=m+c, c>=1.
    # Again n>=5 is a finite union of integer orthants.
    upper_roots = ((0, 5), (1, 4), (2, 3), (3, 2), (4, 1))
    for d_endpoint in (0, m):
        upper = sp.expand(
            q2.subs(
                {
                    n: m + components,
                    z: m * (m - 1) / 2,
                    d: d_endpoint,
                },
                simultaneous=True,
            )
        )
        coefficient_checks += shifted_check(
            upper, (m, components), upper_roots
        )

    print("PASS")
    print(f"rank-1 power coefficients checked: {rank1_checks}")
    print(f"rank-2 shifted power coefficients checked: {coefficient_checks}")
    print("terminal quarter-payment proved for r=1,2")


if __name__ == "__main__":
    main()
