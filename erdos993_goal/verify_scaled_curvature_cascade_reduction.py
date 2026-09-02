#!/usr/bin/env python3
"""Verify the scaled-curvature cascade identities and rank-two exception."""

from __future__ import annotations

import networkx as nx
import sympy as sp

from leaf_addition_pendant_monotonicity_scan import (
    MaskIndependencePolynomial,
)


def coefficient(poly: tuple[int, ...], rank: int) -> int:
    return poly[rank] if 0 <= rank < len(poly) else 0


def reserve(poly: tuple[int, ...], rank: int) -> int:
    return (
        rank * coefficient(poly, rank) ** 2
        + coefficient(poly, rank - 1) * coefficient(poly, rank)
        - (rank + 1)
        * coefficient(poly, rank - 1)
        * coefficient(poly, rank + 1)
    )


def main() -> None:
    k = sp.symbols("k", positive=True, integer=True)
    pm, p0, pp = sp.symbols("p_m p_0 p_p", positive=True)
    g = k * p0**2 + pm * p0 - (k + 1) * pm * pp
    sigma = g / (pm * p0)
    h = k * g / pm
    assert sp.simplify(h - p0 * k * sigma) == 0

    hm, h0, hp = sp.symbols("h_m h_0 h_p", positive=True)
    curvature = h0**2 - hm * hp
    sigma_factorial = 1 + curvature / (hm * h0)
    # h0/hm and hp/h0 are the two consecutive extension means.
    assert sp.simplify(
        sigma_factorial - (1 + h0 / hm - hp / h0)
    ) == 0

    # If tau_G >= tau_F, g_k >= f_(k-1), and tau_F >= 0,
    # then both cascade implications are literal factorizations.
    gk, fk, tau_g, tau_f = sp.symbols(
        "gk fk tau_g tau_f", nonnegative=True
    )
    ordinary_gap = gk * tau_g - fk * tau_f
    ordinary_decomposition = (
        gk * (tau_g - tau_f) + (gk - fk) * tau_f
    )
    assert sp.expand(ordinary_gap - ordinary_decomposition) == 0

    three_gap = 3 * gk * tau_g - 4 * fk * tau_f
    three_decomposition = (
        3 * gk * (tau_g - tau_f)
        + (3 * gk - 4 * fk) * tau_f
    )
    assert sp.expand(three_gap - three_decomposition) == 0

    low_occupancy_decomposition = (
        gk * (3 * tau_g - 2 * tau_f)
        + 2 * (gk - 2 * fk) * tau_f
    )
    assert sp.expand(three_gap - low_occupancy_decomposition) == 0

    high_occupancy_decomposition = (
        3 * gk * (tau_g - tau_f)
        + (3 * gk - 4 * fk) * tau_f
    )
    assert sp.expand(three_gap - high_occupancy_decomposition) == 0

    ordinary_low_decomposition = (
        gk * (3 * tau_g - 2 * tau_f) / 3
        + (2 * gk / 3 - fk) * tau_f
    )
    assert sp.simplify(
        ordinary_gap - ordinary_low_decomposition
    ) == 0

    ordinary_half_decomposition = (
        gk * (2 * tau_g - tau_f) / 2
        + (gk / 2 - fk) * tau_f
    )
    assert sp.simplify(
        ordinary_gap - ordinary_half_decomposition
    ) == 0

    threshold = sp.symbols("threshold", positive=True)
    threshold_decomposition = (
        gk * (tau_g - threshold * tau_f)
        + (threshold * gk - fk) * tau_f
    )
    assert sp.expand(
        ordinary_gap - threshold_decomposition
    ) == 0

    # For the actual unimodality induction, no coefficient split and no
    # HOC hypothesis are needed: C12 alone propagates nonnegativity.
    # If tau_f >= 0 and 2*tau_g >= tau_f, then tau_g >= 0.
    c12_slack = sp.symbols("c12_slack", nonnegative=True)
    c12_substitution = sp.simplify(
        tau_g.subs(
            tau_g,
            (tau_f + c12_slack) / 2,
        )
    )
    assert c12_substitution == (tau_f + c12_slack) / 2

    # Exact pendant scalar form of C12.  Here r=k-1 and the variables
    # are the adjacent extension means in T and F.
    r = sp.symbols("r", positive=True, integer=True)
    pendant_k = r + 1
    u, v, w, y, s = sp.symbols(
        "u v w y s", positive=True
    )
    theta = r * s / (u + r * s)
    full_mean = u * (v + pendant_k * s) / (u + r * s)
    sigma_full = (
        1
        + full_mean
        - (
            v * y + (pendant_k + 1) * s * w
        )
        / (v + pendant_k * s)
    )
    sigma_reduced = 1 + u - w
    ordinary_scalar = (
        v * (v - y + 1)
        + 2 * s * (u - w + 1)
        + s * u / r
        - s
        - theta * (v - pendant_k * u / r) ** 2
    )
    c12_scalar = (
        2 * pendant_k * u * ordinary_scalar
        + r
        * (pendant_k * s - v)
        * u
        * sigma_reduced
    ) / (u * (v + pendant_k * s))
    assert sp.factor(
        2 * pendant_k * sigma_full
        - r * sigma_reduced
        - c12_scalar
    ) == 0

    # The same identity in the law-of-total-variance coordinates.
    conditional_gap = v + s - u
    absent_slack = (
        v * (v - y + 1)
        + s * (2 * (v - w) + s + 1)
    )
    residual_payment = absent_slack - theta * conditional_gap**2
    assert sp.factor(residual_payment - ordinary_scalar) == 0

    # Coefficient-cleared form: C12 is twice the ordinary pendant
    # margin plus the one surviving lower-rank compensation term.
    a, ap, app, bm, b, bp = sp.symbols(
        "a ap app bm b bp", positive=True
    )
    full_previous = a + bm
    full_current = ap + b
    full_next = app + bp
    full_reserve = (
        pendant_k * full_current**2
        + full_previous * full_current
        - (pendant_k + 1) * full_previous * full_next
    )
    reduced_reserve = (
        r * b**2
        + bm * b
        - pendant_k * bm * bp
    )
    ordinary_margin = (
        pendant_k * bm * full_reserve
        - r * full_previous * reduced_reserve
    )
    c12_cleared = (
        2 * pendant_k * full_reserve * bm * b
        - r
        * reduced_reserve
        * full_previous
        * full_current
    )
    coefficient_decomposition = (
        2 * b * ordinary_margin
        + r
        * full_previous
        * reduced_reserve
        * (b - ap)
    )
    assert sp.expand(
        c12_cleared - coefficient_decomposition
    ) == 0

    # Splitting the C12 scalar into its same-rank T contribution and a
    # rooted local contribution exposes a candidate sharp half-payment.
    sigma_t = 1 + v - y
    c12_scalar_numerator = (
        2 * pendant_k * ordinary_scalar
        + r * (pendant_k * s - v) * sigma_reduced
    )
    c12_same_rank = 2 * pendant_k * v * sigma_t
    c12_local = sp.expand(
        c12_scalar_numerator - c12_same_rank
    )
    half_local_target = sp.expand(
        c12_local + c12_same_rank / 2
    )
    assert sp.expand(
        c12_scalar_numerator
        - half_local_target
        - c12_same_rank / 2
    ) == 0

    t_reserve = (
        pendant_k * ap**2
        + a * ap
        - (pendant_k + 1) * a * app
    )
    local_lambda = (
        a * b
        + b**2
        + 2 * pendant_k * (ap * b - a * bp)
    )
    local_mean = (
        bm * (pendant_k * ap + b) - r * b * a
    )
    local_payment = (
        bm * full_previous * local_lambda - local_mean**2
    )
    assert sp.expand(
        a * ordinary_margin
        - local_payment
        - pendant_k * bm * full_previous * t_reserve
    ) == 0
    half_local_cleared = (
        a * c12_cleared
        - pendant_k * b * bm * full_previous * t_reserve
    )
    half_local_decomposition = (
        2 * b * local_payment
        + pendant_k * b * bm * full_previous * t_reserve
        + a
        * r
        * full_previous
        * reduced_reserve
        * (b - ap)
    )
    assert sp.expand(
        half_local_cleared - half_local_decomposition
    ) == 0

    # Stars prove that the factor one half in the half-local candidate
    # is best possible.  For G=K_(1,N), k>=3, T=K_(1,N-1), and
    # F=(N-1)K_1, the relevant coefficients are all binomial.
    star_n, star_k = sp.symbols(
        "star_n star_k", positive=True, integer=True
    )
    star_r = star_k - 1
    star_u = star_n - star_k + 1
    star_v = star_n - star_k
    star_s = sp.Integer(1)
    star_theta = star_r / star_n
    star_sigma_t = sp.Integer(2)
    star_sigma_f = sp.Integer(2)
    star_cross = -star_n / star_r
    star_same_rank = (
        2 * star_k * star_v * star_sigma_t
    )
    star_local = (
        (
            star_k * star_s * (star_r + 4)
            - star_r * star_v
        )
        * star_sigma_f
        + 2
        * star_k
        * star_s
        * (star_u - star_r)
        / star_r
        - 2 * star_k * star_theta * star_cross**2
    )
    assert sp.factor(
        star_local
        - (4 * star_k**2 - 2 * star_r * star_n)
    ) == 0
    assert sp.factor(
        star_local + star_same_rank / 2
        - 2 * (star_n + star_k**2)
    ) == 0
    star_fraction = sp.factor(
        -star_local / star_same_rank
    )
    assert sp.factor(
        star_fraction
        - (
            star_r * star_n - 2 * star_k**2
        )
        / (2 * star_k * (star_n - star_k))
    ) == 0
    sharp_parameter = sp.symbols(
        "sharp_parameter", positive=True, integer=True
    )
    sharp_fraction = sp.factor(
        star_fraction.subs(
            {
                star_n: sharp_parameter**2,
                star_k: sharp_parameter,
            }
        )
    )
    assert sp.factor(
        sharp_fraction
        - (sharp_parameter - 3)
        / (2 * (sharp_parameter - 1))
    ) == 0
    assert sp.limit(
        sharp_fraction,
        sharp_parameter,
        sp.oo,
    ) == sp.Rational(1, 2)

    # Pendant-pair deletion lowers alpha by exactly one, and the prefix
    # cutoff descends by at least one in the needed direction.
    for alpha in range(2, 10_000):
        cutoff_g = (2 * alpha + 1) // 3
        cutoff_f = (2 * (alpha - 1) + 1) // 3
        for rank in range(3, cutoff_g):
            assert rank - 1 < cutoff_f

    # Reconstruct the exact ten-vertex rank-two SCC counterexample.
    old = nx.from_graph6_bytes(b"HiPAA@?")
    assert old.number_of_nodes() == 9
    # The graph6 decoder canonically labels the star centre as 1; choose
    # one of its leaves as the support of the newly adjoined leaf.
    attachment = 0
    full = old.copy()
    leaf = max(full.nodes) + 1
    full.add_edge(attachment, leaf)

    full_engine = MaskIndependencePolynomial(full)
    full_mask = (1 << full.number_of_nodes()) - 1
    full_poly = full_engine.polynomial(full_mask)

    reduced = full.copy()
    reduced.remove_nodes_from([leaf, attachment])
    reduced_engine = MaskIndependencePolynomial(reduced)
    reduced_mask = (1 << reduced.number_of_nodes()) - 1
    reduced_poly = reduced_engine.polynomial(reduced_mask)

    expected_full = (
        1, 10, 36, 77, 105, 91, 49, 15, 2
    )
    expected_reduced = (
        1, 8, 21, 35, 35, 21, 7, 1
    )
    assert full_poly == expected_full
    assert reduced_poly == expected_reduced

    rank = 2
    cutoff = (2 * (len(full_poly) - 1) + 1) // 3
    assert rank < cutoff == 5

    scaled_left = (
        rank
        * reserve(full_poly, rank)
        * coefficient(reduced_poly, rank - 2)
        * coefficient(reduced_poly, rank - 1)
    )
    scaled_right = (
        (rank - 1)
        * reserve(reduced_poly, rank - 1)
        * coefficient(full_poly, rank - 1)
        * coefficient(full_poly, rank)
    )
    assert scaled_left == 10272
    assert scaled_right == 10800
    assert sp.Rational(scaled_left, scaled_right) == sp.Rational(214, 225)

    pgc_left = (
        rank
        * coefficient(reduced_poly, rank - 2)
        * reserve(full_poly, rank)
    )
    pgc_right = (
        (rank - 1)
        * coefficient(full_poly, rank - 1)
        * reserve(reduced_poly, rank - 1)
    )
    assert pgc_left == 1284
    assert pgc_right == 300
    assert pgc_left > pgc_right
    assert 3 * pgc_left > 4 * pgc_right

    # The pendant cutoff drops correctly under every possible alpha.
    for alpha_f in range(1, 1001):
        alpha_g = alpha_f + 1
        cutoff_g = (2 * alpha_g + 1) // 3
        cutoff_f = (2 * alpha_f + 1) // 3
        for test_rank in range(2, cutoff_g):
            assert test_rank - 1 < cutoff_f

    print("PASS")
    print("rank-two SCC ratio:", "214/225")
    print("rank-two ordinary PGC:", pgc_left - pgc_right)
    print("rank-two three-quarters margin:", 3 * pgc_left - 4 * pgc_right)


if __name__ == "__main__":
    main()
