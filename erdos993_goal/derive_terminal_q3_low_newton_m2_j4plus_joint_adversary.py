#!/usr/bin/env python3
"""Joint anchor/remainder exploration for terminal m=2, targets j>=4.

This is a derivation aid, not a theorem certificate.  It retains the A0*U2
kernel and the common rooted degree/wedge coordinates.
"""

import sympy as sp


def C(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def kappa(p: int, q: int, m: int):
    if not max(p, q) <= m <= p + q:
        return sp.Integer(0)
    return sp.factorial(m) / (
        sp.factorial(m - p)
        * sp.factorial(m - q)
        * sp.factorial(p + q - m)
    )


def bernstein_coefficients(expression, variable, left, right):
    y = sp.symbols("bernstein_y")
    power = sp.Poly(sp.expand(expression.subs(variable, left + (right - left) * y)), y)
    degree = power.degree()
    ascending = [power.coeff_monomial(y**rank) for rank in range(degree + 1)]
    return [sp.factor(sum(
        ascending[rank] * sp.binomial(index, rank) / sp.binomial(degree, rank)
        for rank in range(index + 1)
    )) for index in range(degree + 1)]


def main() -> None:
    N, j, d, beta = sp.symbols(
        "N j d beta", integer=True, nonnegative=True
    )
    W = N - 1 + beta
    a = (N**2 - 3 * N + 2 * d) / 2
    p0 = sp.expand_func(
        sp.binomial(N + 1, 3)
        - N * (N - 1)
        + W
        + N * (N - 1) / 2
    )
    p1 = (N**2 + N + 2) / 2
    p2 = N + 2
    P = [p0, p1, p2]
    e0 = (j + 2) * sp.Symbol("b", positive=True)
    b = next(symbol for symbol in e0.free_symbols if str(symbol) == "b")
    B = [
        (j + 1) * b * a - 3 * e0 * (p0 + a),
        (j + 1) * b * (a + N)
        - 3 * e0 * p1 - 3 * b * (p1 + p0 + a),
        (j + 1) * b * N
        - 3 * e0 * p2 - 6 * b * (p1 + p2),
    ]
    pq2 = sp.expand(sum(
        kappa(left, right, 2) * P[left] * B[right]
        for left in range(3) for right in range(3)
    ))

    residual = sp.factor(pq2 / b)
    r = N - j
    R2 = j / (r + 1)
    R3 = j * (j - 1) / ((r + 1) * (r + 2))
    A1bar = p0 + N + 2 + 2 * W
    A2bar = N**2 + 3 * N + 8

    # Quantitative A0 lower: its exact V slope is negative and X slope is
    # positive.  Use V<=N-2+N*beta/3 and rooted X=0.
    Vupper = N - 2 + N * beta / 3
    A0 = (
        N**5 - 4 * N**4 * d - 4 * N**4 + 8 * N**3 * W
        + 3 * N**3 * d**2 + 13 * N**3 * d + 5 * N**3
        - 18 * N**2 * Vupper - 24 * N**2 * W - 9 * N**2 * d**2
        - 11 * N**2 * d - 2 * N**2 + 54 * N * Vupper + 4 * N * W
        + 6 * N * d**2 + 2 * N * d - 36 * Vupper * d - 24 * W**2
        + 18 * W * d**2 - 6 * W * d
    ) / 12

    def joint(U0bar):
        E = (
            2 * A1bar * (1 + 2 * R2 + R3)
            + A2bar * (U0bar + 2 + 3 * R2 + R3)
        )
        return sp.factor(
            (j + 1) * (A0 * (R2 + R3) + a * E) + residual
        )

    low = joint(sp.Integer(1))
    high = joint((N - 2 * j + 1) / (j + 1))
    beta_low = C(d - 1, 2)
    beta_high = beta_low + C(N - d, 2)

    for branch_name, branch in (("low", low), ("high", high)):
        beta_poly = sp.Poly(branch, beta)
        print(branch_name, "beta degree", beta_poly.degree(), "LC", sp.factor(beta_poly.LC()))
        corners = {
            "beta_low": sp.factor(branch.subs(beta, beta_low)),
            "beta_high": sp.factor(branch.subs(beta, beta_high)),
        }
        for corner_name, corner in corners.items():
            bernstein = bernstein_coefficients(corner, d, 1, N)
            print(branch_name, corner_name, "d Bernstein", len(bernstein))

    # Exact integer-grid sanity for the reduced endpoints.
    functions = {}
    for branch_name, branch in (("low", low), ("high", high)):
        for beta_name, beta_value in (("beta_low", beta_low), ("beta_high", beta_high)):
            functions[(branch_name, beta_name)] = sp.lambdify(
                (N, j, d), branch.subs(beta, beta_value), modules="math"
            )
    failures = []
    minimum = None
    witness = None
    for local_j in range(4, 31):
        for local_N in range(max(15, local_j), 151):
            branch_name = "high" if local_N >= 3 * local_j else "low"
            for local_d in range(1, local_N + 1):
                for beta_name in ("beta_low", "beta_high"):
                    value = functions[(branch_name, beta_name)](
                        local_N, local_j, local_d
                    )
                    if minimum is None or value < minimum:
                        minimum = value
                        witness = (local_N, local_j, local_d, branch_name, beta_name)
                    if value < -1e-7:
                        failures.append((local_N, local_j, local_d, beta_name, value))
    print("GRID failures", len(failures), failures[:10], failures[-5:])
    print("GRID minimum", minimum, witness)

    # Probe coefficient cones after Bernstein reduction in d.
    k, q = sp.symbols("k q", integer=True, nonnegative=True)
    for branch_name, branch in (("low", low), ("high", high)):
        for beta_name, beta_value in (("beta_low", beta_low), ("beta_high", beta_high)):
            corner = sp.factor(branch.subs(beta, beta_value))
            bernstein = bernstein_coefficients(corner, d, 1, N)
            for index, coefficient in enumerate(bernstein):
                if branch_name == "high":
                    shifted = sp.cancel(coefficient.subs({j: 4 + k, N: 3 * (4 + k) + q}))
                    variables = (k, q)
                else:
                    # First inspect the broad N=j+r cone; interval handling
                    # for r<=2j can be added if plain coefficients fail.
                    shifted = sp.cancel(coefficient.subs({j: 4 + k, N: 4 + k + q}))
                    variables = (k, q)
                numerator, denominator = sp.fraction(shifted)
                poly = sp.Poly(sp.expand(numerator), *variables)
                negatives = [value for value in poly.coeffs() if value < 0]
                print(
                    "CONE", branch_name, beta_name, index,
                    "den", sp.factor(denominator), "terms", len(poly.terms()),
                    "min", min(poly.coeffs()), "neg", len(negatives),
                )


if __name__ == "__main__":
    main()
