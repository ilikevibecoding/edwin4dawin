#!/usr/bin/env python3
"""Exact symbolic derivation for the unresolved terminal m=3, j=3 cell.

This is a derivation aid, not a theorem certificate.
"""

import sympy as sp


def kappa(p: int, q: int, m: int) -> sp.Integer:
    if not max(p, q) <= m <= p + q:
        return sp.Integer(0)
    return sp.factorial(m) // (
        sp.factorial(m - p) * sp.factorial(m - q) * sp.factorial(p + q - m)
    )


def product(left, right):
    out = [sp.Integer(0)] * (len(left) + len(right) - 1)
    for p, x in enumerate(left):
        for q, y in enumerate(right):
            for m in range(max(p, q), p + q + 1):
                out[m] += kappa(p, q, m) * x * y
    return [sp.expand(value) for value in out]


def add(left, right, scale=1):
    out = [sp.Integer(0)] * max(len(left), len(right))
    for index, value in enumerate(left):
        out[index] += value
    for index, value in enumerate(right):
        out[index] += scale * value
    return [sp.expand(value) for value in out]


def scale(row, factor):
    return [sp.expand(factor * value) for value in row]


def main():
    N, a, b, c0, e0, p0, r0, r1, u0, x = sp.symbols(
        "N a b c0 e0 p0 r0 r1 u0 x", nonnegative=True
    )
    p1 = (N**2 + N + 2) / 2
    p2 = N + 2
    P = [p0, p1, p2, sp.Integer(1)]
    R = [r0, r1, N]
    c = [c0, a]
    e = [e0, b]
    U = [u0, p0, p1, p2, sp.Integer(1)]
    A = add(product(P, c), scale(R, a), scale=-1)
    Q = add(scale(add(c, R), 4 * b), scale(product(add(P, [a]), e), 3), scale=-1)
    delta = add(scale(product(A, U), 4 * a), scale(product(P, Q), a))

    print("A0..A3")
    for index in range(4):
        print(index, sp.factor(A[index]))
    print("Q0..Q3")
    for index in range(4):
        print(index, sp.factor(Q[index]))
    print("delta3 factored")
    print(sp.factor(delta[3]))
    print("delta3 collected e0,c0,r0,r1,u0,p0")
    print(sp.collect(sp.expand(delta[3]), [e0, c0, r0, r1, u0, p0]))

    # Reconstruct the correlated lower route independently.
    q_lower = [
        4 * b * c0 - 3 * e0 * (p0 + a),
        4 * b * (a + N) - 3 * e0 * p1 - 3 * b * (p0 + a + p1),
        4 * b * N - 3 * e0 * p2 - 6 * b * (p1 + p2),
        -3 * (e0 + 3 * b * (p2 + 1)),
    ]
    pq3_lower = product(P, q_lower)[3]
    pq3_before_p0 = sp.expand(pq3_lower.subs({
        c0: a * (1 + x),
        e0: sp.Rational(4, 3) * b * (1 + x),
    }))
    print("pq3 p0 slope / b")
    print(sp.factor(sp.diff(pq3_before_p0, p0) / b))
    pq3_correlated = sp.expand(pq3_before_p0.subs(
        p0, N * (N - 1) * (N + 1) / 6
    ))
    p0_lower = (N - 1) * (N**2 - 2 * N + 6) / 6
    A1bar = p0_lower + N + 2 + x * p1
    A2bar = N**2 + 3 * N + 8 + x * p2
    A3bar = 3 * N + 10 + x
    shadow2 = 3 / (N - 2)
    shadow3 = 6 / ((N - 2) * (N - 1))
    E = sp.expand(
        A1bar * (3 * shadow2 + 3 * shadow3)
        + A2bar * (3 + 6 * shadow2 + 3 * shadow3)
        + A3bar * (4 + 3 * shadow2 + shadow3)
    )
    normalized_before_a = sp.expand(4 * a * E + pq3_correlated / b)
    print("normalized a slope")
    print(sp.factor(sp.diff(normalized_before_a, a)))
    normalized_lower = sp.factor(
        normalized_before_a.subs(
            a, (N - 1) * (N - 2) / 2
        )
    )
    expected_lower = (
        9 * N**4
        + 10 * N**3 * x
        - 89 * N**3
        - 96 * N**2 * x
        - 393 * N**2
        - 658 * N * x
        - 2359 * N
        - 1008 * x
        - 3708
    ) / 6
    print("correlated lower error")
    print(sp.factor(normalized_lower - expected_lower))
    print("correlated lower")
    print(normalized_lower)


if __name__ == "__main__":
    main()
