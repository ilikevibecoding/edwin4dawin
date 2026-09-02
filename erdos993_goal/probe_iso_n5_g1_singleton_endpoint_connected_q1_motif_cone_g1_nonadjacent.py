#!/usr/bin/env python3
"""Exact cone probe for the one-selected-root connected endpoint residual.

For q=1, put T=G-u and let r be the sole neighbor of u.  The four rows are
I(T), I(T-r), I(T-v), I(T-r-v).  We expand the corrected endpoint residual
in exact forest motifs, retain deletion-aware R3/R4 reserves, and test the
remaining large-order polynomial on a direct cube.

This remains a probe until a PASS report and the finite/geometry wrapper are
written.
"""
from __future__ import annotations

import sympy as sp

from audit_iso_n4_bundle_g12_endpoint_parent_independent_g1_bernstein import (
    choose,
    i2,
    i3,
    i4,
    i5,
)
from derive_iso_n5_g1_singleton_endpoint_corrected_residual_g1_nonadjacent import block
from prove_iso_n5_g1_singleton_endpoint_u_leaf_adjacent_all_order_g1_nonadjacent import n4_deleted
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    tensor_bernstein_sparse,
)


def lower_expression():
    n, e, du, dv, adjacent = sp.symbols("n e du dv adjacent")
    common, re, ru, rv, q35, r4, xu, xv, wedges = sp.symbols(
        "common re ru rv q35 r4 xu xv wedges"
    )
    eu, ev = e - du, e - dv
    ew = e - du - dv + adjacent
    wu = wedges - choose(du, 2) - xu
    wv = wedges - choose(dv, 2) - xv
    ww = (
        wedges
        - choose(du, 2)
        - choose(dv, 2)
        - xu
        - xv
        + adjacent * (du + dv - 2)
        + common
    )
    a = (
        1, n, i2(n, e), i3(n, e, wedges), i4(n, e, wedges, re),
        i5(n, e, wedges, re, q35, r4),
    )
    c = (
        1, n - 1, i2(n - 1, eu), i3(n - 1, eu, wu),
        i4(n - 1, eu, wu, ru), 0,
    )
    b = (
        1, n - 1, i2(n - 1, ev), i3(n - 1, ev, wv),
        i4(n - 1, ev, wv, rv), 0,
    )
    d = (1, n - 2, i2(n - 2, ew), i3(n - 2, ew, ww), 0, 0)
    residual = sp.expand(n4_deleted(a, b) + block(c, b) + block(a, d))

    # Standard five-vertex-tree containment payment, followed by
    # R3(T-r)<=R3(T), leaves these positive coefficients.
    coeff_re = (6 * (e - dv) + 3 * n**2 - 23 * n + 22) / 2
    coeff_rv = (-10 * e + 5 * n**2 - 3 * n - 2) / 2

    nonhigh = residual.subs({re: 0, ru: 0, rv: 0, q35: 0, r4: 0})
    # For n>=8 the xu coefficient is nonpositive and common coefficient is
    # nonnegative, so xu=e-du and common=0 are the lower endpoints.
    nonhigh = nonhigh.subs({xu: e - du, common: 0})

    # Exact star-moment reserve S3(H)>=2W(W-e+1)/(3(e-1)).
    s3 = 2 * wedges * (wedges - e + 1) / (3 * (e - 1))
    s3_v = 2 * wv * (wv - ev + 1) / (3 * (ev - 1))

    # A global polynomial R4 floor.  If x=2W/(e-1), then max degree is at
    # least x.  The polynomial x^3(x-3)/108 is <=0 for x<=3 and is at most
    # C(x,4) for x>=3, hence it is always a valid lower bound for R4.
    degree_floor = 2 * wedges / (e - 1)
    r4_floor = degree_floor**3 * (degree_floor - 3) / 108

    lower = sp.together(
        nonhigh
        + coeff_re * s3
        + (n - 1) * choose(du, 3)
        + coeff_rv * s3_v
        + 3 * (n - 1) * r4_floor
    )
    return (n, e, du, dv, adjacent, xv, wedges), lower


def main():
    (n, e, du, dv, adjacent, xv, wedges), lower = lower_expression()
    t, E, Y, X, V, Z = sp.symbols("t E Y X V Z", nonnegative=True)
    cutoff = 13
    nn = cutoff + t
    ev = 2 + (nn - 4) * E
    y = (nn - 2 - ev) * Y
    x = ev * X
    ee = 1 + ev + y
    duu = 1 + x
    dvv = 1 + y
    xvv = ev * V
    wvv = choose(ev, 2) * Z
    ww = choose(dvv, 2) + xvv + wvv

    for av in (0, 1):
        expression = lower.subs({
            n: nn, e: ee, du: duu, dv: dvv, adjacent: av,
            xv: xvv, wedges: ww,
        })
        numerator, denominator = sp.fraction(sp.factor(expression))
        polynomial = sp.Poly(numerator, t, E, Y, X, V, Z)
        print(
            "POWER", av, "den", sp.factor(denominator),
            "terms", len(polynomial.terms()), flush=True,
        )
        degrees, rows = tensor_bernstein_sparse(polynomial, 5)
        negative = total = 0
        minimum = None
        witness = None
        for row_index, row in enumerate(rows):
            # No simplex remains: every retained key is just a t power.
            assert all(len(key) == 1 for key in row)
            for key, coefficient in row.items():
                value = sp.cancel(coefficient)
                total += 1
                if minimum is None or value < minimum:
                    minimum = value
                    witness = (row_index, key, value)
                negative += 1 if value < 0 else 0
        print(
            "CONE", av, "degrees", degrees, "rows", len(rows),
            "coefficients", total, "negative", negative,
            "minimum", minimum, "witness", witness, flush=True,
        )


if __name__ == "__main__":
    main()
