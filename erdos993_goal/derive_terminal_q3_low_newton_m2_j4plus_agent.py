#!/usr/bin/env python3
"""Symbolic search for an exact m=2 certificate at target j>=4.

This is a derivation aid, not a theorem certificate.
"""

import sympy as sp


def kappa(p: int, q: int, m: int) -> sp.Integer:
    if not max(p, q) <= m <= p + q:
        return sp.Integer(0)
    return sp.factorial(m) // (
        sp.factorial(m - p)
        * sp.factorial(m - q)
        * sp.factorial(p + q - m)
    )


def coefficient_positive(poly: sp.Expr, *variables: sp.Symbol) -> bool:
    return all(value >= 0 for value in sp.Poly(sp.expand(poly), *variables).coeffs())


def main() -> None:
    N, j, a, b, e0, W = sp.symbols(
        "N j a b e0 W", integer=True, nonnegative=True
    )
    p0 = sp.expand(sp.expand_func(
        sp.binomial(N + 1, 3)
        - N * (N - 1)
        + W
        + N * (N - 1) / 2
    ))
    p1 = (N**2 + N + 2) / 2
    p2 = N + 2
    P = [p0, p1, p2]

    # Retain c0>=a and the exact tree values R1=N^2-2W, R2=N.
    Q = [
        (j + 1) * b * a - 3 * e0 * (p0 + a),
        (j + 1) * b * (a + N**2 - 2 * W)
        - 3 * e0 * p1
        - 3 * b * (p0 + a + p1),
        (j + 1) * b * N
        - 3 * e0 * p2
        - 6 * b * (p1 + p2),
    ]
    pq2 = sp.expand(sum(
        kappa(p, q, 2) * P[p] * Q[q]
        for p in range(3) for q in range(3)
    ))
    remainder = sp.expand(pq2.subs(e0, (j + 2) * b) / b)

    # Quantitative anchor floors.  The W-correlated first floor follows from
    # A1/a >= p0+2p1-(N^2-2W).
    A1 = sp.expand(p0 + N + 2 + 2 * W)
    A2 = N**2 + 3 * N + 8
    r = sp.symbols("r", integer=True, nonnegative=True)
    S1 = j / (r + 1)  # f_(j-1)/f_j
    S2 = j * (j - 1) / ((r + 1) * (r + 2))  # f_(j-2)/f_j

    # Kernels retained from [A U]_2.  Additive shadows give
    # U1/b >= 1+S1 and U2/b >= S1+S2.  The rooted coupled extension floor
    # gives U0/b >= (N-2j+3)/(j+1), while U0/b>=1 is always available.
    def gap(u0: sp.Expr) -> sp.Expr:
        E = sp.expand(
            2 * A1 * (1 + 2 * S1 + S2)
            + A2 * (u0 + 2 + 3 * S1 + S2)
        )
        return sp.factor((j + 1) * a * E + remainder)

    pair_floor = (N - 1) * (N - 2) / 2
    W_lo = N - 1
    W_hi = N * (N - 1) / 2
    u0_ext = (N - 2 * j + 3) / (j + 1)

    # Analyze both regions where the max lower bound for U0 is realized.
    for name, candidate in (("trivial", sp.Integer(1)), ("extension", u0_ext)):
        expression = sp.factor(gap(candidate).subs(a, pair_floor).subs(N, j + r))
        slope = sp.factor(sp.diff(expression, W))
        print(name, "W-slope:", slope)
        for endpoint_name, endpoint in (("low", W_lo), ("high", W_hi)):
            endpoint_expr = sp.factor(expression.subs(W, endpoint.subs(N, j + r)))
            numerator, denominator = sp.together(endpoint_expr).as_numer_denom()
            print(name, endpoint_name, "denominator:", sp.factor(denominator))
            k, q = sp.symbols("k q", integer=True, nonnegative=True)
            # high-r cone and exact r strips for N>=14, j>=4.
            high = sp.expand(numerator.subs({j: 4 + k, r: 11 + q}))
            high_poly = sp.Poly(high, k, q)
            high_negative = [
                (monomial, value)
                for monomial, value in high_poly.terms()
                if value < 0
            ]
            print(name, endpoint_name, "high coefficient-positive:", not high_negative)
            print(name, endpoint_name, "high negative terms:", high_negative[:12])
            failures = []
            for rv in range(11):
                minimum_k = max(0, 10 - rv)
                strip = sp.expand(numerator.subs({r: rv, j: 4 + minimum_k + q}))
                if not coefficient_positive(strip, q):
                    failures.append((rv, minimum_k, sp.factor(strip)))
            print(name, endpoint_name, "strip failures:", len(failures))
            for failure in failures[:3]:
                print("  ", failure)

    # Keep h_j/b=y.  Rooted incidence gives z_j/b<=j-1+y, hence
    # e0/b<=j+2y.  The coupled extension floor then gives
    # U0/b >= (N-2j+3+(j-1)y)/(j+1); the trivial floor is 1+y.
    y = sp.symbols("y", nonnegative=True)
    corr_remainder = sp.expand(pq2.subs(e0, (j + 2 * y) * b) / b)

    def corr_gap(u0: sp.Expr) -> sp.Expr:
        E = sp.expand(
            2 * A1 * (1 + 2 * S1 + S2)
            + A2 * (u0 + 2 + 3 * S1 + S2)
        )
        return sp.factor((j + 1) * a * E + corr_remainder)

    corr_candidates = (
        ("corr-trivial", 1 + y),
        ("corr-extension", (N - 2 * j + 3 + (j - 1) * y) / (j + 1)),
    )
    for name, candidate in corr_candidates:
        raw = corr_gap(candidate)
        a_slope = sp.factor(sp.diff(raw, a).subs(N, j + r))
        print(name, "a-slope:", a_slope)
        expression = sp.factor(raw.subs(a, pair_floor).subs(N, j + r))
        for y_value in (0, 1):
            y_expression = sp.factor(expression.subs(y, y_value))
            for endpoint_name, endpoint in (("low", W_lo), ("high", W_hi)):
                endpoint_expr = sp.factor(
                    y_expression.subs(W, endpoint.subs(N, j + r))
                )
                numerator, denominator = sp.together(endpoint_expr).as_numer_denom()
                k, q = sp.symbols("k q", integer=True, nonnegative=True)
                high = sp.Poly(
                    sp.expand(numerator.subs({j: 4 + k, r: 11 + q})),
                    k,
                    q,
                )
                negative_terms = [
                    (monomial, value)
                    for monomial, value in high.terms()
                    if value < 0
                ]
                failures = []
                for rv in range(11):
                    minimum_k = max(0, 11 - rv)
                    strip = sp.Poly(
                        sp.expand(numerator.subs({
                            r: rv,
                            j: 4 + minimum_k + q,
                        })),
                        q,
                    )
                    if any(value < 0 for value in strip.coeffs()):
                        failures.append((rv, minimum_k, sp.factor(strip.as_expr())))
                print(
                    name,
                    "y", y_value,
                    endpoint_name,
                    "den", sp.factor(denominator),
                    "high-neg", negative_terms[:6],
                    "strip-failures", failures[:2],
                )

    # If y>0, ordinary lower shadows inside H (which has at most N-1
    # vertices) give h_(j-1)/b >= j*y/(N-j).  This term occurs once in U0
    # and once in U1, hence contributes (2*A1+3*A2) times that ratio.
    h1_ratio = j * y / r
    extension_u0 = (N - 2 * j + 3 + (j - 1) * y) / (j + 1)
    shadow_E = sp.expand(
        2 * A1 * (1 + 2 * S1 + S2 + h1_ratio)
        + A2 * (extension_u0 + 2 + 3 * S1 + S2 + 3 * h1_ratio)
    )
    shadow_raw = sp.factor((j + 1) * a * shadow_E + corr_remainder)
    shadow_expression = sp.factor(
        shadow_raw.subs(a, pair_floor).subs(N, j + r)
    )
    for y_value in (0, 1):
        y_expression = sp.factor(shadow_expression.subs(y, y_value))
        for endpoint_name, endpoint in (("low", W_lo), ("high", W_hi)):
            endpoint_expr = sp.factor(
                y_expression.subs(W, endpoint.subs(N, j + r))
            )
            numerator, denominator = sp.together(endpoint_expr).as_numer_denom()
            k, q = sp.symbols("k q", integer=True, nonnegative=True)
            high = sp.Poly(
                sp.expand(numerator.subs({j: 4 + k, r: 11 + q})),
                k,
                q,
            )
            negative_terms = [
                (monomial, value)
                for monomial, value in high.terms()
                if value < 0
            ]
            failures = []
            for rv in range(1, 11):
                minimum_k = max(0, 11 - rv)
                strip = sp.Poly(
                    sp.expand(numerator.subs({
                        r: rv,
                        j: 4 + minimum_k + q,
                    })),
                    q,
                )
                if any(value < 0 for value in strip.coeffs()):
                    failures.append((rv, minimum_k, sp.factor(strip.as_expr())))
            print(
                "corr-extension-hshadow",
                "y", y_value,
                endpoint_name,
                "den", sp.factor(denominator),
                "high-neg", negative_terms[:6],
                "strip-failures", failures[:2],
            )


if __name__ == "__main__":
    main()
