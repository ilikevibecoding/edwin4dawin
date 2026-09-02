"""Symbolic discriminants of E+cF and F+cG on N=2s+5+q."""

from __future__ import annotations

import sympy as sp


t, u, c, q = sp.symbols("t u c q", nonnegative=True)


def p(M, i):
    if i < 0:
        return sp.Integer(0)
    return sp.prod(M * 2 - i - 1 - j for j in range(i)) / sp.factorial(i)


def gamma(row):
    degree = len(row) - 1
    rem = list(map(sp.expand, row))
    out = []
    for h in range(degree // 2 + 1):
        value = rem[h]
        out.append(value)
        for j in range(degree - 2 * h + 1):
            rem[h + j] = sp.expand(rem[h + j] - value * sp.binomial(degree - 2 * h, j))
    assert all(sp.expand(x) == 0 for x in rem)
    return out


def mixed(A, B, s):
    row = [A[i] * B[s - i] for i in range(s + 1)]
    sym = [sp.expand((row[i] + row[s-i]) / 2) for i in range(s + 1)]
    return sp.expand(sum(x * t**i for i, x in enumerate(gamma(sym))))


def make(s):
    N = 2 * s + 5 + q
    # Only coefficients through s are needed.
    P = [p(N, i) for i in range(s + 1)]
    C = [p(N - 1, i) for i in range(s + 1)]
    D = [p(N - 2, i) for i in range(s + 1)]
    V = [sp.expand(P[i] - C[i]) for i in range(s + 1)]
    W = [sp.expand(C[i] - D[i]) for i in range(s + 1)]
    E = sp.expand(mixed(C, C, s) + u * mixed(D, D, s))
    F = sp.expand(mixed(C, V, s) + u * mixed(D, W, s))
    G = sp.expand(mixed(V, V, s) + u * mixed(W, W, s))
    return E, F, G


def report(poly, name):
    forced = min(e[0] for e, _ in sp.Poly(poly, t).terms())
    core = sp.cancel(poly / t**forced)
    degree = sp.degree(core, t)
    if degree <= 1:
        print(name, "degree", degree, "trivial")
        return
    disc = sp.Poly(sp.discriminant(core, t), c, q, u)
    neg = [(mon, val) for mon, val in disc.terms() if val < 0]
    zero = [x for x in disc.coeffs() if x == 0]
    print(name, "degree", degree, "terms", len(disc.terms()), "negative", len(neg), "zero", len(zero))
    print("first negatives", neg[:10])


def main():
    for s in range(2, 9):
        print("s", s, flush=True)
        E, F, G = make(s)
        report(sp.expand(E + c * F), "EF")
        report(sp.expand(F + c * G), "FG")


if __name__ == "__main__":
    main()
