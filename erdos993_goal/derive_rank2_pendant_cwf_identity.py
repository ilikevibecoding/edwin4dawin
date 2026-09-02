#!/usr/bin/env python3
"""Derive the symbolic rank-2 pendant-hub CWF identity."""

import sympy as sp


R, Q, z, b3, d3, beta = sp.symbols(
    "R Q z b3 d3 beta", nonnegative=True
)
N = Q + z
b = [
    sp.Integer(1),
    N,
    sp.expand(N * (N - 1) / 2 - z),
    b3,
]
d = [sp.Integer(0), sp.Integer(1), z, d3]
a = [sp.expand(b[i] + d[i]) for i in range(4)]
k = [
    sp.Integer(1),
    R,
    R * (R - 1) / 2,
    R * (R - 1) * (R - 2) / 6,
]


def c(p, i):
    return p[i] if 0 <= i < len(p) else sp.Integer(0)


def conv(p, q):
    out = [sp.Integer(0)] * (len(p) + len(q) - 1)
    for i, x in enumerate(p):
        for j, y in enumerate(q):
            out[i + j] += x * y
    return list(map(sp.expand, out))


def ft(p):
    return [sp.factorial(i) * value for i, value in enumerate(p)]


def minor(p, m, n):
    return sp.expand(c(p, m) * c(p, n) - c(p, m + 1) * c(p, n - 1))


def mixed(p, q, m, n):
    return sp.expand(
        c(p, m) * c(q, n)
        + c(q, m) * c(p, n)
        - c(p, m + 1) * c(q, n - 1)
        - c(q, m + 1) * c(p, n - 1)
    )


p = conv(k, a)
qnew = [sp.Integer(0), *b]
fp, fq = ft(p), ft(qnew)
fb, fd, fa = ft(b), ft(d), ft(a)
target = sp.expand(
    (R - 1) * minor(fp, 2, 2)
    + (R + 1) * mixed(fp, fq, 2, 2)
)
wmd21 = sp.expand(minor(fa, 2, 1) - minor(fd, 2, 1))
wmd22 = sp.expand(minor(fa, 2, 2) - minor(fd, 2, 2))
cwf21 = sp.expand((Q - 2) * minor(fb, 2, 1) + Q * mixed(fb, fd, 2, 1))

# The LP grid reveals the exact cancellation relation
# gamma + (Q-2) beta = R^2+1.
gamma = R**2 + 1 - (Q - 2) * beta
residual = sp.factor(
    target - (R - 1) * wmd22 - beta * cwf21 - gamma * wmd21
)

print("gamma =", gamma)
print("residual =")
print(residual)
print("\nresidual at beta=(R-1)/2 =")
half_residual = sp.factor(residual.subs(beta, (R - 1) / 2))
print(half_residual)
rr, qq = sp.symbols("rr qq", nonnegative=True)
print("\nshifted R=rr+2, Q=qq+2:")
print(sp.Poly(sp.expand(half_residual.subs({R: rr + 2, Q: qq + 2})), rr, qq, z))
print(
    "shifted gamma =",
    sp.expand(gamma.subs({R: rr + 2, Q: qq + 2, beta: (rr + 1) / 2})),
)
print("\nresidual at gamma=0 =")
print(sp.factor(residual.subs(beta, (R**2 + 1) / (Q - 2))))

wedge = sp.Symbol("wedge", nonnegative=True)
b3_forest = sp.expand(
    N * (N - 1) * (N - 2) / 6 - z * (N - 2) + wedge
)
forest_beta = R * (R + 1) / Q
forest_residual = sp.factor(
    (
        target
        - (R - 1) * wmd22
        - forest_beta * cwf21
    ).subs(b3, b3_forest)
)
print("\nforest-moment identity beta=R(R+1)/Q:")
print(forest_residual)
print("\nQ times forest residual, shifted R=rr+2,Q=qq+2:")
print(
    sp.Poly(
        sp.expand(
            (Q * forest_residual).subs({R: rr + 2, Q: qq + 2})
        ),
        rr,
        qq,
        z,
        wedge,
    )
)

t = sp.Symbol("t", nonnegative=True)
threshold_q = (t + 2 * R * (R + 1)) / (R - 1)
large_q_numerator = sp.factor(
    (R - 1) ** 3
    * (Q * forest_residual).subs(Q, threshold_q)
)
print("\nlarge-Q regime, t=(R-1)Q-2R(R+1), shifted R=rr+2:")
print(
    sp.Poly(
        sp.expand(large_q_numerator.subs(R, rr + 2)),
        rr,
        t,
        z,
        wedge,
    )
)
