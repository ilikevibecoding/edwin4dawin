"""Exact proof (with machine-verified identities) that ISO_2 holds for every forest.

Theorem.  For every forest F on n vertices,

    Q_2(F) = 2 p_2^2 + p_1^2 - 3 p_1 p_3 >= 0 .

Proof.  Let m = |E(F)| <= n-1 and P_2 = sum_v C(d_v, 2) (number of 2-edge paths).
Elementary counting gives

    p_1 = n,   p_2 = C(n,2) - m,   p_3 = C(n,3) - m (n-2) + P_2 ,

where the formula for p_3 uses that a 3-set of a forest spans at most two edges
(three edges on three vertices would be a triangle).  Every pair of edges counted
by P_2 is a pair of edges, so P_2 <= C(m, 2).  Hence

    Q_2(F) >= f(m) := 2 (C(n,2) - m)^2 + n^2 - 3 n ( C(n,3) - m (n-2) + C(m,2) ).

As a polynomial in m, f has leading coefficient 2 - 3n/2 < 0 for n >= 2, so f is
concave in m and its minimum on the interval [0, n-1] is attained at an endpoint:

    f(0)   = n^2 (n+1) / 2                 > 0 ,
    f(n-1) = 2 (n-1)^2 + (n-1) + 1 = 2n^2 - 3n + 2  > 0 .

(For n <= 1, p_3 = 0 and Q_2 = p_1^2 + 2 p_2^2 >= 0 trivially.)              QED

Both endpoint identities and the sign of the leading coefficient are verified
symbolically below; the counting formulas for p_2, p_3 are verified against the
exact enumeration for all forests with n <= 11 vertices.
"""

from __future__ import annotations

import sympy as sp

from indpoly import poly_mul, tree_independence_polynomial
from treegen import level_sequence_to_parents, wrom_level_sequences


def verify_identities() -> None:
    n, m = sp.symbols("n m")
    C2 = lambda k: k * (k - 1) / 2
    C3 = lambda k: k * (k - 1) * (k - 2) / 6
    f = 2 * (C2(n) - m) ** 2 + n**2 - 3 * n * (C3(n) - m * (n - 2) + C2(m))
    f = sp.expand(f)
    lead = sp.Poly(f, m).coeffs()[0]
    assert sp.simplify(lead - (2 - sp.Rational(3, 2) * n)) == 0
    f0 = sp.simplify(f.subs(m, 0))
    assert sp.simplify(f0 - n**2 * (n + 1) / 2) == 0, f0
    f1 = sp.simplify(f.subs(m, n - 1))
    assert sp.simplify(f1 - (2 * n**2 - 3 * n + 2)) == 0, f1
    print("f(m) leading coefficient in m :", lead, " (negative for n >= 2)")
    print("f(0)   =", sp.factor(f0))
    print("f(n-1) =", sp.factor(f1), " = 2n^2 - 3n + 2 > 0")


def verify_counting_formulas(nmax: int = 11) -> None:
    """p_2 = C(n,2) - m and p_3 = C(n,3) - m(n-2) + sum_v C(d_v,2) on all forests n <= nmax."""
    from itertools import combinations_with_replacement
    from math import comb

    trees = {}
    for s in range(1, nmax + 1):
        trees[s] = []
        for ls in wrom_level_sequences(s):
            par = level_sequence_to_parents(ls)
            deg = [0] * s
            for v, p in enumerate(par):
                if p >= 0:
                    deg[v] += 1
                    deg[p] += 1
            trees[s].append((tuple(tree_independence_polynomial(par)), s - 1, sum(comb(d, 2) for d in deg)))

    def forests(remaining, max_size):
        if remaining == 0:
            yield []
            return
        for s in range(min(remaining, max_size), 0, -1):
            for k in range(1, remaining // s + 1):
                for combo in combinations_with_replacement(range(len(trees[s])), k):
                    for rest in forests(remaining - k * s, s - 1):
                        yield [(s, i) for i in combo] + rest

    from counts import forest_counts

    fcounts = forest_counts(nmax)
    checked = 0
    for n in range(1, nmax + 1):
        per_n = 0
        for fo in forests(n, n):
            per_n += 1
            poly = [1]
            m = 0
            P2 = 0
            for s, i in fo:
                pl, mm, pp = trees[s][i]
                poly = poly_mul(poly, pl)
                m += mm
                P2 += pp
            p = poly + [0] * 4
            assert p[1] == n
            assert p[2] == comb(n, 2) - m
            assert p[3] == comb(n, 3) - m * (n - 2) + P2, (fo, p)
            assert P2 <= comb(m, 2)
            assert 2 * p[2] ** 2 + p[1] ** 2 - 3 * p[1] * p[3] >= 0
            checked += 1
        assert per_n == fcounts[n], f"forest enumeration incomplete at n={n}: {per_n} vs A005195 {fcounts[n]}"
    print(f"counting formulas for p_2, p_3 and P_2 <= C(m,2) verified on {checked} forests (n <= {nmax}, counts = A005195); ISO_2 >= 0 on all")


if __name__ == "__main__":
    verify_identities()
    verify_counting_formulas()
    print("ISO2_THEOREM_CHECK_PASS")
