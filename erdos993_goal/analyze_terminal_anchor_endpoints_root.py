#!/usr/bin/env python3
"""Analyze the two endpoint polynomials for terminal q3 anchor ordering.

This is a scratch/research verifier.  It reconstructs the exact rank-three
cross product, applies only the pinned Zagreb and degree-partition bounds,
and studies the two resulting endpoint polynomials on

    n >= 15,  1 <= d <= n-1,  t >= 1.
"""

from __future__ import annotations

import sympy as sp


def choose(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - index for index in range(rank)) / sp.factorial(rank)


def rank3(order: sp.Expr, edges: sp.Expr, wedges: sp.Expr,
          connected_four: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
    i3 = choose(order, 3) - edges * (order - 2) + wedges
    matchings = choose(edges, 2) - wedges
    s3 = (
        edges * choose(order - 2, 2)
        - 2 * (wedges * (order - 3) + matchings)
        + 3 * connected_four
    )
    return sp.expand(i3), sp.expand(s3)


def endpoint_polynomials() -> tuple[sp.Expr, sp.Expr, tuple[sp.Symbol, ...]]:
    n, d, t, b2, b3x, neighbor = sp.symbols(
        "n d t b2 b3x neighbor", integer=True, nonnegative=True
    )
    p = n - 2 + b2
    v4 = n - 3 + b2 + b3x

    iq, sq = rank3(n + t, n - 1, p, v4)
    pt = p + d + choose(t + 1, 2)
    v4t = v4 + choose(d, 2) + choose(t + 1, 3) + neighbor + d * t
    it, st = rank3(n + t + 1, n + t, pt, v4t)
    cross = sp.expand(st * iq - sq * it)

    # Cross decreases with B3+X and increases with the neighbour excess.
    lower = sp.expand(cross.subs({b3x: (n - 4) * b2 / 3, neighbor: 0}))
    assert sp.Poly(lower, b2).degree() == 2
    assert sp.Poly(lower, b2).LC() == -2

    low_b2 = choose(d - 1, 2)
    high_b2 = low_b2 + choose(n - d - 1, 2)
    elo = sp.factor(lower.subs(b2, low_b2))
    ehi = sp.factor(lower.subs(b2, high_b2))
    return elo, ehi, (n, d, t)


def coefficient_summary(expr: sp.Expr, variables: tuple[sp.Symbol, ...]) -> str:
    poly = sp.Poly(sp.expand(expr), *variables)
    coeffs = poly.coeffs()
    return (
        f"terms={len(coeffs)} degree={poly.total_degree()} "
        f"min_coeff={min(coeffs)} "
        f"negatives={sum(1 for c in coeffs if c.is_negative)}"
    )


def bernstein_coefficients_on_d_interval(
    expr: sp.Expr, n: sp.Symbol, d: sp.Symbol, target_degree: int | None = None
) -> list[sp.Expr]:
    """Return Bernstein coefficients after d=1+(n-2)y, y in [0,1]."""
    y = sp.symbols("y", real=True)
    power = sp.Poly(sp.expand(expr.subs(d, 1 + (n - 2) * y)), y)
    source_degree = power.degree()
    degree = source_degree if target_degree is None else target_degree
    assert degree >= source_degree
    ascending = [power.coeff_monomial(y**k) for k in range(source_degree + 1)]
    result = []
    for index in range(degree + 1):
        result.append(
            sp.factor(
                sum(
                    ascending[k]
                    * sp.binomial(index, k)
                    / sp.binomial(degree, k)
                    for k in range(min(index, source_degree) + 1)
                )
            )
        )
    return result


def main() -> None:
    elo, ehi, (n, d, t) = endpoint_polynomials()
    a, b, s, u = sp.symbols("a b s u", integer=True, nonnegative=True)

    print("Elo factor:")
    print(sp.factor(elo))
    print("Ehi factor:")
    print(sp.factor(ehi))

    for name, expr in (("lo", elo), ("hi", ehi)):
        print(name, "coefficients in s=t-1 (low to high):")
        s_coefficients = sp.Poly(
            sp.expand(expr.subs(t, s + 1)), s
        ).all_coeffs()[::-1]
        center = sp.symbols("center", integer=True)
        print(
            name,
            "s0 in center=2d-n:",
            sp.factor(sp.together(s_coefficients[0].subs(d, (n + center) / 2))),
        )
        if name == "lo":
            centered_numerator = sp.Poly(
                sp.together(s_coefficients[0].subs(d, (n + center) / 2))
                .as_numer_denom()[0],
                center,
            )
            aa = centered_numerator.coeff_monomial(center**2) - 48
            bb = centered_numerator.coeff_monomial(center)
            cc = centered_numerator.coeff_monomial(1)
            discriminant = sp.factor(bb**2 - 4 * aa * cc)
            print("lo centered quadratic A:", sp.factor(aa))
            print("lo centered quadratic discriminant:", discriminant)
            print(
                "lo negative discriminant n15 shift:",
                sp.Poly(sp.expand((-discriminant).subs(n, u + 15)), u).all_coeffs(),
            )
        for index, coefficient in enumerate(s_coefficients):
            print(f"  s^{index}:", sp.factor(coefficient))
            bernstein = bernstein_coefficients_on_d_interval(coefficient, n, d)
            for bindex, bcoefficient in enumerate(bernstein):
                shifted_n = sp.Poly(sp.expand(bcoefficient.subs(n, u + 15)), u)
                negatives = sum(
                    1 for item in shifted_n.coeffs() if item.is_negative
                )
                print(
                    f"    B{bindex}/{len(bernstein)-1}: "
                    f"n15-shift negatives={negatives} "
                    f"factor={sp.factor(bcoefficient)}"
                )
            if index == 0:
                for elevated_degree in range(len(bernstein), 13):
                    elevated = bernstein_coefficients_on_d_interval(
                        coefficient, n, d, elevated_degree
                    )
                    bad_shifted = 0
                    bad_at_15 = 0
                    for item in elevated:
                        if item.subs(n, 15) < 0:
                            bad_at_15 += 1
                        shifted = sp.Poly(sp.expand(item.subs(n, u + 15)), u)
                        if any(c.is_negative for c in shifted.coeffs()):
                            bad_shifted += 1
                    print(
                        f"    elevation degree={elevated_degree}: "
                        f"negative_at_n15={bad_at_15} "
                        f"mixed_n_shift={bad_shifted}"
                    )
        abs_expr = sp.expand(expr.subs({n: a + b + 2, d: a + 1, t: s + 1}))
        print(name, "a,b,s:", coefficient_summary(abs_expr, (a, b, s)))

        # Boundary parameterizations for a+b>=13.  These are useful for
        # finite small-a/small-b splits and for discovering monotonicity.
        for side, shifted in (
            ("small-a", abs_expr.subs(b, 13 - a + u)),
            ("small-b", abs_expr.subs(a, 13 - b + u)),
        ):
            expanded = sp.expand(shifted)
            vars_ = (a, u, s) if side == "small-a" else (b, u, s)
            print(name, side, coefficient_summary(expanded, vars_))

        # Exact forward difference in t; nonnegativity would reduce to t=1.
        dt = sp.expand(expr.subs(t, t + 1) - expr)
        dt_abs = sp.expand(dt.subs({n: a + b + 2, d: a + 1, t: s + 1}))
        print(name, "Delta_t a,b,s:", coefficient_summary(dt_abs, (a, b, s)))

    # Finite exact screening of endpoints and their t-forward differences.
    for name, expr in (("lo", elo), ("hi", ehi)):
        minimum = None
        argmin = None
        min_dt = None
        argmin_dt = None
        dt = sp.expand(expr.subs(t, t + 1) - expr)
        fn = sp.lambdify((n, d, t), expr, "math")
        fnd = sp.lambdify((n, d, t), dt, "math")
        for nv in range(15, 101):
            for dv in range(1, nv):
                for tv in range(1, 51):
                    value = fn(nv, dv, tv)
                    delta = fnd(nv, dv, tv)
                    if minimum is None or value < minimum:
                        minimum, argmin = value, (nv, dv, tv)
                    if min_dt is None or delta < min_dt:
                        min_dt, argmin_dt = delta, (nv, dv, tv)
        print(name, "grid minimum", minimum, "at", argmin)
        print(name, "Delta_t grid minimum", min_dt, "at", argmin_dt)


if __name__ == "__main__":
    main()
