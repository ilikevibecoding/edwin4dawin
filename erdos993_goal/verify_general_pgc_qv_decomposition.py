#!/usr/bin/env python3
"""Verify the uniform pendant-PGC decomposition symbolically.

For P=(1+x)B+xC and k>=2, the prefix pendant-cascade margin
H_k(P)-H_{k-1}(B) splits into the forest reserve Q_k(P), the
manifest deletion term c_{k-1}, and one two-row residual V_k(B).
"""

from __future__ import annotations

import sympy as sp


def H(j: sp.Expr, r_prev: sp.Expr, r: sp.Expr, r_next: sp.Expr) -> sp.Expr:
    return (
        j**2 * (r**2 - r_prev * r_next) / r_prev
        + j * (r - r_next)
    )


def main() -> int:
    k = sp.symbols("k", integer=True, positive=True)
    bm2, bm1, b0, bp1, cm1 = sp.symbols(
        "b_(k-2) b_(k-1) b_k b_(k+1) c_(k-1)", nonzero=True
    )

    # Only p_(k-1),p_k,p_(k+1) enter H_k.  The pendant identity gives
    # p_k=b_k+b_(k-1)+c_(k-1).  The neighbouring p-values remain free.
    pm1, pp1 = sp.symbols("p_(k-1) p_(k+1)", nonzero=True)
    p0 = b0 + bm1 + cm1

    qk = 2 * k * p0**2 - pm1 * p0 - 2 * (k + 1) * pm1 * pp1
    vk = (
        (k + 2) * bm2 * bm1
        + k * (2 * k + 1) * bm2 * b0
        - 2 * (k - 1) ** 2 * bm1**2
    )

    lhs = H(k, pm1, p0, pp1) - H(k - 1, bm2, bm1, b0)
    rhs = k * qk / (2 * pm1) + 3 * k * cm1 / 2 + vk / (2 * bm2)
    assert sp.factor(lhs - rhs) == 0

    # The residual also has a normalized extension-mean form.
    mu_prev, mu = sp.symbols("mu_(k-2) mu_(k-1)")
    normalized = sp.factor(vk / (bm2 * bm1))
    normalized_mu = sp.factor(
        normalized.subs(
            {
                b0: mu * bm1 / k,
                bm1: mu_prev * bm2 / (k - 1),
            },
            simultaneous=False,
        )
    )
    # Substitute the remaining bm1/bm2 occurrence after the simultaneous
    # symbolic reduction, then compare with the claimed affine mean gap.
    normalized_mu = sp.factor(
        normalized_mu.subs(bm1, mu_prev * bm2 / (k - 1))
    )
    target_mu = (k + 2) + (2 * k + 1) * mu - 2 * (k - 1) * mu_prev
    assert sp.factor(normalized_mu - target_mu) == 0

    # Recover the published rank-five, rank-six, and rank-seven residuals.
    expected = {
        5: 7 * bm2 * bm1 + 55 * bm2 * b0 - 32 * bm1**2,
        6: 8 * bm2 * bm1 + 78 * bm2 * b0 - 50 * bm1**2,
        7: 9 * bm2 * bm1 + 105 * bm2 * b0 - 72 * bm1**2,
    }
    for rank, polynomial in expected.items():
        assert sp.expand(vk.subs(k, rank) - polynomial) == 0

    # Uniform high-extension regime for V_k.  The forest two-extension lemma
    # gives mu_(k-1) >= mu_(k-2)-3+2/mu_(k-2) once mu_(k-2)>=2.
    u = sp.symbols("u", positive=True)
    transfer_lower = sp.factor(
        (k + 2) + (2 * k + 1) * (u - 3 + 2 / u) - 2 * (k - 1) * u
    )
    assert sp.factor(
        transfer_lower - (3 * u - (5 * k + 1) + (4 * k + 2) / u)
    ) == 0
    # The sign is the sign of an upward quadratic after multiplying by u.
    # Its simple rational endpoint improves the old threshold by 2/3.
    sign_polynomial = sp.factor(u * transfer_lower)
    assert sp.expand(
        sign_polynomial - (3 * u**2 - (5 * k + 1) * u + 4 * k + 2)
    ) == 0
    threshold = (5 * k - 1) / 3
    assert sp.factor(
        sign_polynomial.subs(u, threshold) - 2 * (k + 4) / 3
    ) == 0
    vertex = (5 * k + 1) / 6
    assert sp.factor(threshold - vertex - (5 * k - 3) / 6) == 0
    # At and to the right of threshold, P_k is increasing for k>=2.
    derivative_at_threshold = sp.factor(
        sp.diff(sign_polynomial, u).subs(u, threshold)
    )
    assert sp.expand(derivative_at_threshold - (5 * k - 3)) == 0
    discriminant = sp.factor(sp.discriminant(sign_polynomial, u))
    assert discriminant == 25 * k**2 - 38 * k - 23

    print("PASS_EXACT_GENERAL_PGC_QV_DECOMPOSITION")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
