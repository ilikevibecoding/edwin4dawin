#!/usr/bin/env python3
"""Symbolic verification of the pendant GSB cascade reduction."""

import sympy as sp


def main() -> None:
    k = sp.symbols("k", integer=True, positive=True)
    # Coefficients of the old forest T and F=T-p around the target ranks.
    am1, a0, a1 = sp.symbols("a_km1 a_k a_kp1", positive=True)
    bm2, bm1, b0 = sp.symbols("b_km2 b_km1 b_k", positive=True)

    # G=T+leaf has coefficients g_j=a_j+b_{j-1}.
    gm1 = am1 + bm2
    g0 = a0 + bm1
    g1 = a1 + b0

    def gsb_reserve(previous, current, following, rank):
        return (
            rank * current**2
            + previous * current
            - (rank + 1) * previous * following
        )

    g_new = gsb_reserve(gm1, g0, g1, k)

    # F's reserve at rank k-1 uses b_{k-2}, b_{k-1}, b_k.
    g_f = gsb_reserve(bm2, bm1, b0, k - 1)

    # Variance-form slacks at uniform ranks k-1 in G and k-2 in F.
    s_new = k * g_new / gm1**2
    s_f = (k - 1) * g_f / bm2**2
    w = am1 / gm1

    rooted_mixture_reserve = sp.factor(
        (s_new - (1 - w) * s_f) / w
    )
    expected = sp.factor(
        k * g_new / (am1 * gm1)
        - (k - 1) * g_f / (am1 * bm2)
    )
    assert sp.factor(rooted_mixture_reserve - expected) == 0

    cascade_difference = sp.factor(
        k * g_new / gm1 - (k - 1) * g_f / bm2
    )
    assert sp.factor(rooted_mixture_reserve - cascade_difference / am1) == 0

    # Clearing positive denominators gives the exact integer certificate.
    cleared = sp.factor(
        rooted_mixture_reserve * am1 * bm2 * gm1
    )
    assert sp.factor(
        cleared
        - (
            k * bm2 * g_new
            - (k - 1) * gm1 * g_f
        )
    ) == 0

    # A sharper exact decomposition isolates a four-ratio local payment.
    # Here G_k(T) is the same-rank GSB reserve of the leaf-deleted
    # forest.  If both it and `payment` are nonnegative, the cascade
    # follows immediately.
    g_t = gsb_reserve(am1, a0, a1, k)
    local_reserve = (
        am1 * bm1
        + bm1**2
        + 2 * k * (a0 * bm1 - am1 * b0)
    )
    between_mean = (
        bm2 * (k * a0 + bm1)
        - (k - 1) * bm1 * am1
    )
    payment = (
        local_reserve * bm2 * (am1 + bm2)
        - between_mean**2
    )
    assert sp.factor(
        am1 * cleared
        - payment
        - k * bm2 * gm1 * g_t
    ) == 0

    # Terminal degree-two specialization.  If the attachment vertex is
    # a leaf of T, write T=R+x(R-q), so F=R.  The local reserve then
    # consists of an elementary positive part plus one rooted
    # cross-determinant.
    Bm, B0, Bp = sp.symbols("B_km2 B_km1 B_k", positive=True)
    Cm, C0 = sp.symbols("C_km2 C_km1", positive=True)
    terminal_a = B0 + Cm
    terminal_ap = Bp + C0
    terminal_cross = B0 * C0 - Bp * Cm
    terminal_local_reserve = sp.factor(
        terminal_a * B0
        + B0**2
        + 2 * k * (terminal_ap * B0 - terminal_a * Bp)
    )
    assert sp.factor(
        terminal_local_reserve
        - (2 * B0**2 + B0 * Cm + 2 * k * terminal_cross)
    ) == 0
    terminal_mean_numerator = (
        Bm * (k * terminal_ap + B0)
        - (k - 1) * B0 * terminal_a
    )
    terminal_payment = (
        Bm * (terminal_a + Bm) * terminal_local_reserve
        - terminal_mean_numerator**2
    )
    assert sp.factor(
        payment.subs(
            {
                am1: terminal_a,
                a0: terminal_ap,
                bm2: Bm,
                bm1: B0,
                b0: Bp,
            }
        )
        - terminal_payment
    ) == 0

    # Normalize the terminal identity by B_r.  It depends only on the
    # same-rank GSB reserve of R and the rooted cross-determinant.
    r = k - 1
    m_ratio = Bm / B0
    c_ratio = Cm / B0
    delta_ratio = terminal_cross / B0**2
    g_ratio = gsb_reserve(Bm, B0, Bp, r) / B0**2
    terminal_a_ratio = 2 + c_ratio + k * delta_ratio
    assert sp.factor(
        terminal_local_reserve / B0**2
        - (2 + c_ratio + 2 * k * delta_ratio)
    ) == 0
    assert sp.factor(
        terminal_mean_numerator / B0**2
        - (
            m_ratio * terminal_a_ratio
            - (1 + c_ratio) * g_ratio
        )
    ) == 0

    # The revised dimensionless split implies a factor-three terminal
    # payment.  On x<=1 the linear envelope gives a factor-four bound;
    # on x>=1 the hyperbolic envelope is tangent to the factor-three
    # boundary at x=3/2.
    split_x = sp.symbols("split_x", positive=True)
    assert sp.factor(
        sp.Rational(1, 4)
        - (4 * split_x - 1) * (1 - split_x) ** 2
    ) == sp.factor(
        (2 * split_x - 1) ** 2 * (5 - 4 * split_x) / 4
    )
    assert sp.factor(
        sp.Rational(1, 3)
        - (
            12 / split_x - sp.Rational(20, 3)
        )
        * (split_x - 1) ** 2
    ) == sp.factor(
        (2 * split_x - 3) ** 2
        * (5 * split_x - 4)
        / (3 * split_x)
    )

    # Check the cutoff arithmetic in all three residue classes.  If
    # alpha(G)=beta+1 and k<L(G), then k-1<L(F).
    for residue in range(3):
        q = sp.symbols("q", integer=True, nonnegative=True)
        beta = 3 * q + residue
        l_f = (2 * beta + 1) // 3
        l_g = (2 * (beta + 1) + 1) // 3
        assert sp.simplify((l_g - 2) < l_f) is sp.true

    print("PASS")
    print("RMR = H_k(G)-H_(k-1)(F), divided by a_(k-1)(T)")
    print(
        "cleared cascade:",
        "k*b[k-2]*G_k(G) >= (k-1)*g[k-1]*G_(k-1)(F)",
    )
    print(
        "local payment identity:",
        "a[k-1]*cascade = payment"
        " + k*b[k-2]*g[k-1]*G_k(T)",
    )
    print(
        "terminal reserve:",
        "Lambda = 2*B[r]^2 + B[r]*C[r-1]"
        " + 2*(r+1)*(B[r]*C[r]-B[r+1]*C[r-1])",
    )
    print(
        "normalized terminal square:",
        "M/B[r]^2 = m*(2+c+(r+1)*delta) - (1+c)*g",
    )


if __name__ == "__main__":
    main()
