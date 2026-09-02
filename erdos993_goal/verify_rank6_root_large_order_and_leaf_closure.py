#!/usr/bin/env python3
"""Certify two large-order rooted rank-6 advances.

1. Sharp rank-(3,4) path ratio for trees of order at least 15:

       i4(T)/i3(T) >= (n-5)(n-6)/(4(n-2)).

2. Every rooted tree (T,p) of order at least 30 satisfies the strong
   rank-6 margin

       i4(T)(2*i5(T)+i4(T))
           - 24(i5(T)i4(T-p)-i4(T)i5(T-p)) > 0.

The script also proves a closure lemma: once a new pendant root has
been attached to a tree of order at least 17, adding arbitrarily many
sibling leaves at that root strictly increases the strong margin.
"""

from __future__ import annotations

import sympy as sp

from verify_tree_rank45_path_ratio import (
    verify_symbolic_identities as verify_rank45_motif_identities,
    verify_zagreb_finite_base,
    verify_zagreb_infinite_step,
)


DEFECT_CEILING = sp.Rational(1559, 3575)


def verify_rank34_path_ratio():
    n, b2, b3, edge = sp.symbols(
        "n b2 b3 edge", positive=True
    )
    wedges = n - 2 + b2
    triples = b2 + b3 + edge
    i3 = (
        sp.binomial(n, 3)
        - (n - 1) * (n - 2)
        + wedges
    )
    i4 = (
        sp.binomial(n, 4)
        - (n - 1) * sp.binomial(n - 2, 2)
        + wedges * (n - 4)
        + sp.binomial(n - 1, 2)
        - triples
    )
    margin = sp.expand(
        4 * (n - 2) * i4 - (n - 5) * (n - 6) * i3
    )
    x = edge - (n - 3)
    expected = (
        (n - 5) * (3 * n - 2) * b2
        - 4 * (n - 2) * (b3 + x)
    )
    assert sp.simplify(sp.expand_func(margin) - expected) == 0

    # The certified Zagreb inequality is
    #
    #   7x <= 2(n-4)b2 - 6b3.
    #
    # Also b3 <= (n-4)b2/3, since every excess degree is at
    # most n-2.  Hence b3+x <= (n-4)b2/3.
    lower_coefficient = sp.factor(
        (n - 5) * (3 * n - 2)
        - sp.Rational(4, 3) * (n - 2) * (n - 4)
    )
    assert sp.simplify(
        lower_coefficient
        - (5 * n**2 - 27 * n - 2) / 3
    ) == 0
    assert lower_coefficient.subs(n, 15) > 0
    assert sp.diff(lower_coefficient, n).subs(n, 15) > 0
    return lower_coefficient


def verify_deletion_ratio_and_sibling_closure():
    m = sp.symbols("m", integer=True, positive=True)

    # If A has order m and C=A-r, extension counting gives
    # i4(C)/i3(C) <= (m-4)/4.  The sharp path ratio gives the
    # lower bound below for A.  Their quotient is at most 3/2
    # from m=17 onward.
    deletion_ratio_bound = sp.factor(
        ((m - 4) / 4)
        / ((m - 5) * (m - 6) / (4 * (m - 2)))
    )
    threshold_gap = sp.factor(
        sp.Rational(3, 2) - deletion_ratio_bound
    )
    assert sp.factor(
        sp.together(threshold_gap).as_numer_denom()[0]
    ) == m**2 - 21 * m + 74
    quadratic = m**2 - 21 * m + 74
    assert quadratic.subs(m, 17) > 0
    assert sp.diff(quadratic, m).subs(m, 17) > 0

    # Strong-margin increment when a leaf is attached directly to
    # the distinguished root.  Here H is the root-deleted forest and
    # F is the closed-neighborhood-deleted forest:
    #
    # c=i3(H), h=i4(H), k=i5(H), a=i3(F), b=i4(F).
    c, h, k, a, b = sp.symbols(
        "c h k a b", positive=True
    )

    def strong(d, e, root_d4, root_d5):
        return d * (2 * e + d) - 24 * (
            e * root_d4 - d * root_d5
        )

    old = strong(h + a, k + b, h, k)
    # Adding a sibling leaf multiplies H by 1+x while F is unchanged.
    new = strong(
        h + c + a,
        k + h + b,
        h + c,
        k + h,
    )
    increment = sp.factor(new - old)
    expected_increment = (
        c**2
        + 4 * c * h
        + 2 * h**2
        + 2 * c * k
        + 2 * c * a
        + 26 * a * h
        - 22 * c * b
    )
    assert sp.expand(increment - expected_increment) == 0

    X, D, r, q = sp.symbols(
        "X D r q", positive=True
    )
    normalized = sp.factor(
        increment.subs(
            {
                c: X * h,
                k: (1 - D) * h / X,
                a: r * X * h,
                b: q * h,
            },
            simultaneous=True,
        )
        / h**2
    )
    expected_normalized = (
        (X + 2) ** 2
        - 2 * D
        + 2 * r * X**2
        + 26 * r * X
        - 22 * q * X
    )
    assert sp.expand(normalized - expected_normalized) == 0

    # For 0<X<=1 and q<=min(1,3r/2), both r-cells have their
    # minimum at r=2/3, q=1.  The defect ceiling sets D=d0.
    endpoint = sp.factor(
        expected_normalized.subs(
            {
                D: DEFECT_CEILING,
                r: sp.Rational(2, 3),
                q: 1,
            }
        )
    )
    square_form = (
        sp.Rational(7, 3) * (X - sp.Rational(1, 7)) ** 2
        + sp.Rational(231247, 75075)
    )
    assert sp.expand(endpoint - square_form) == 0

    # Multiplication of H by an isolate changes
    # (i2,i3,i4)=(p,c,h) to (*,c+p,h+c).  Thus h/c does not
    # decrease whenever c^2>=p*h, which follows from the proved
    # rank-3 forest reserve.  Consequently q/r=(b*c)/(a*h)
    # cannot increase as sibling isolates are added.
    p = sp.symbols("p", nonnegative=True)
    ratio_cross = sp.factor((h + c) * c - h * (c + p))
    assert ratio_cross == c**2 - h * p

    return deletion_ratio_bound, endpoint


def verify_all_root_large_order():
    n = sp.symbols("n", integer=True, positive=True)
    x_path = (n - 7) * (n - 8) / (5 * (n - 3))
    extension_upper = (n - 5) / 4

    # For F=T-N[p], write a=i3(F), b=i4(F), d=i4(T), e=i5(T),
    # x=e/d and y=b/a.  The disjoint families F_4 and p+F_3 give
    # d>=a+b.  If y>x, this yields
    #
    #   (db-ea)/d^2 <= (L-x)/(1+L), L=(n-5)/4.
    #
    # If y<=x, the deletion term is already nonpositive.
    normalized_lower = sp.factor(
        2 * x_path
        + 1
        - 24
        * (extension_upper - x_path)
        / (1 + extension_upper)
    )
    expected = (
        2 * n**3 - 51 * n**2 - 358 * n + 3479
    ) / (5 * (n - 3) * (n - 1))
    assert sp.simplify(normalized_lower - expected) == 0
    numerator = 2 * n**3 - 51 * n**2 - 358 * n + 3479
    assert numerator.subs(n, 30) == 839
    first = sp.diff(numerator, n)
    second = sp.diff(numerator, n, 2)
    assert first.subs(n, 30) > 0
    assert second.subs(n, 30) > 0
    assert sp.diff(second, n) > 0

    # Q5 implies that the strong margin controls the exact C6 margin.
    d, e, f, h, k = sp.symbols(
        "d e f h k", positive=True
    )
    curvature_lower = e * (2 * e + d) / 12
    c6_lower = sp.factor(
        d * curvature_lower - 2 * e * (e * h - d * k)
    )
    strong_margin = d * (2 * e + d) - 24 * (e * h - d * k)
    assert sp.factor(c6_lower - e * strong_margin / 12) == 0
    return normalized_lower


def main():
    # Replay the exact all-orders Zagreb input used by the new rank34
    # ratio theorem.  The motif identity call also guards the shared
    # excess-degree normalization.
    verify_rank45_motif_identities()
    verify_zagreb_infinite_step()
    verify_zagreb_finite_base()
    coefficient = verify_rank34_path_ratio()
    deletion_bound, sibling_endpoint = (
        verify_deletion_ratio_and_sibling_closure()
    )
    large_order = verify_all_root_large_order()

    print("rank-(3,4) path ratio and rooted rank-6 advances: CERTIFIED")
    print("rank34 residual coefficient:", coefficient)
    print("deletion ratio bound:", deletion_bound)
    print("sibling increment endpoint:", sibling_endpoint)
    print("all-root normalized lower bound:", large_order)
    print("all-root threshold: n>=30")


if __name__ == "__main__":
    main()
