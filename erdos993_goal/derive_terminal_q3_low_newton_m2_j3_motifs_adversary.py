#!/usr/bin/env python3
"""Exact motif-coordinate derivation of the j=3, m=2 terminal margin.

This is an independent derivation aid, not a theorem certificate.  The goal is
to expose which rooted tree statistics survive the exact cancellations.
"""

import sympy as sp


def C(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def independent3(vertices, edges, wedges):
    return C(vertices, 3) - edges * (vertices - 2) + wedges


def independent4(vertices, edges, wedges, connected4):
    return (
        C(vertices, 4)
        - edges * C(vertices - 2, 2)
        + wedges * (vertices - 4)
        + C(edges, 2)
        - connected4
    )


def oneedge3(vertices, edges, wedges):
    return edges * (vertices - 2) - 2 * wedges


def oneedge4(vertices, edges, wedges, connected4):
    matchings = C(edges, 2) - wedges
    return (
        edges * C(vertices - 2, 2)
        - 2 * (wedges * (vertices - 3) + matchings)
        + 3 * connected4
    )


def kappa(p: int, q: int, m: int):
    if not max(p, q) <= m <= p + q:
        return sp.Integer(0)
    return sp.factorial(m) / (
        sp.factorial(m - p)
        * sp.factorial(m - q)
        * sp.factorial(p + q - m)
    )


def product_coefficient(left, right, degree: int):
    return sp.expand(sum(
        kappa(p, q, degree) * left[p] * right[q]
        for p in range(len(left)) for q in range(len(right))
        if max(p, q) <= degree <= p + q
    ))


def bernstein_coefficients(expression, variable, left, right, degree=None):
    y = sp.symbols("bernstein_y")
    power = sp.Poly(sp.expand(expression.subs(variable, left + (right - left) * y)), y)
    source_degree = power.degree()
    target_degree = source_degree if degree is None else degree
    ascending = [power.coeff_monomial(y**k) for k in range(source_degree + 1)]
    return [sp.factor(sum(
        ascending[k] * sp.binomial(index, k) / sp.binomial(target_degree, k)
        for k in range(min(index, source_degree) + 1)
    )) for index in range(target_degree + 1)]


def main() -> None:
    N, d, W, V, X, B, Y = sp.symbols(
        "N d W V X B Y", integer=True, nonnegative=True
    )

    # Whole tree G has N+1 vertices and N edges.
    i2G = C(N + 1, 2) - N
    i3G = independent3(N + 1, N, W)
    i4G = independent4(N + 1, N, W, V)
    p0 = sp.expand(i3G + i2G)
    p1 = (N**2 + N + 2) / 2
    p2 = N + 2
    P = [p0, p1, p2]

    r3G = oneedge3(N + 1, N, W)
    r4G = oneedge4(N + 1, N, W, V)
    R = [sp.expand(r4G + r3G), sp.expand(r3G + N), N]

    # Delete the marked root.  X is its neighbor excess, B the sum of
    # binom(deg(v)-1,2) over its neighbors, and Y the distance-two excess.
    EF = N - d
    WF = W - C(d, 2) - X
    root_connected4 = C(d, 3) + B + (d - 1) * X + Y
    VF = V - root_connected4
    a = sp.expand(C(N, 2) - EF)
    b = sp.expand(independent3(N, EF, WF))
    z2 = sp.expand(oneedge3(N, EF, WF))
    z3 = sp.expand(oneedge4(N, EF, WF, VF))

    # Delete the closed neighborhood.  Its wedge count records the reductions
    # at distance two exactly.
    NH = N - d
    EH = N - d - X
    WH = W - C(d, 2) - B - X - Y
    h2 = sp.expand(C(NH, 2) - EH)
    h3 = sp.expand(independent3(NH, EH, WH))
    c0 = sp.expand(a + z2 + h2)
    e0 = sp.expand(b + z3 + h3)
    c = [c0, a]
    e = [e0, b]

    U = [sp.expand(i4G + i3G), p0, p1]
    A = [
        sp.expand(product_coefficient(P, c, degree) - a * R[degree])
        for degree in range(3)
    ]
    Q = [
        sp.expand(
            4 * b * ((c[degree] if degree < len(c) else 0) + R[degree])
            - 3 * product_coefficient([P[k] + (a if k == 0 else 0) for k in range(3)], e, degree)
        )
        for degree in range(3)
    ]
    delta2 = sp.factor(
        4 * a * product_coefficient(A, U, 2)
        + a * product_coefficient(P, Q, 2)
    )

    print("p0", sp.factor(p0))
    print("a", sp.factor(a))
    print("b", sp.factor(b))
    print("c0", sp.factor(c0))
    print("e0", sp.factor(e0))
    print("A0", sp.factor(A[0]))
    print("A1", sp.factor(A[1]))
    print("A2", sp.factor(A[2]))
    print("delta2 free symbols", sorted(str(symbol) for symbol in delta2.free_symbols))
    for variable in (V, Y, B, X, W):
        print(f"delta2 slope {variable}", sp.factor(sp.diff(delta2, variable)))
        print(f"delta2 degree {variable}", sp.Poly(delta2, variable).degree())
    print("delta2/a")
    print(sp.factor(delta2 / a))

    # First exact lower-reduction candidate.  The global tree inequalities are
    # W=N-1+beta, 0<=beta, and
    # V<=N-2+beta+(N-3)beta/3=N-2+N*beta/3.
    beta = sp.symbols("beta", integer=True, nonnegative=True)
    Vupper = N - 2 + N * beta / 3
    lower = sp.factor(delta2.subs({W: N - 1 + beta, V: Vupper, B: 0, Y: 0}) / a)
    print("LOWER degree X", sp.Poly(lower, X).degree(), "LC", sp.factor(sp.Poly(lower, X).LC()))
    x_endpoints = {
        "zero": sp.factor(lower.subs(X, 0)),
        "max": sp.factor(lower.subs(X, N - d)),
    }
    beta_low = C(d - 1, 2)
    beta_high = beta_low + C(N - d, 2)
    for x_name, endpoint in x_endpoints.items():
        poly_beta = sp.Poly(endpoint, beta)
        print("LOWER", x_name, "degree beta", poly_beta.degree(), "LC", sp.factor(poly_beta.LC()))
        for beta_name, beta_value in (("low", beta_low), ("high", beta_high)):
            corner = sp.factor(endpoint.subs(beta, beta_value))
            print("CORNER", x_name, beta_name, corner)
            rshift = sp.symbols("rshift", integer=True, nonnegative=True)
            bernstein = bernstein_coefficients(corner, d, 1, N)
            signs = []
            for index, coefficient in enumerate(bernstein):
                shifted = sp.Poly(sp.cancel(coefficient.subs(N, 15 + rshift)), rshift)
                signs.append(all(value >= 0 for value in shifted.all_coeffs()))
                if not signs[-1]:
                    print(
                        "BERNSTEIN-FAIL", x_name, beta_name, index,
                        sp.factor(coefficient), shifted.all_coeffs(),
                    )
            print("BERNSTEIN", x_name, beta_name, signs)


if __name__ == "__main__":
    main()
