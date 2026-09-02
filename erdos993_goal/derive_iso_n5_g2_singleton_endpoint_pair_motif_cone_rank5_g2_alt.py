#!/usr/bin/env python3
"""Exact pair-motif lower cone for singleton-endpoint rank-five g2.

The raw endpoint invariant is reduced using only universal forest incidence
inequalities.  Optional copies of the proved rank-three forest reserve are
split from the whole row and the both-marks-deleted row.  This file derives
the lower cone; positivity of that cone is a separate obligation.
"""

from __future__ import annotations

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    forest_independent_row,
)
from derive_iso_n5_g2_singleton_endpoint_invariant_rank5_g2_alt import (
    derive_endpoint,
)


def choose(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def q3_row(order, edges, wedges, connected3, prefix):
    row, names = forest_independent_row(prefix, order)
    rules = {
        names["edges"]: edges,
        names["wedges"]: wedges,
        names["connected_3_edges"]: connected3,
    }
    i2, i3, i4 = (sp.expand(row[k].subs(rules)) for k in (2, 3, 4))
    return sp.expand(6 * i3**2 - i2 * i3 - 8 * i2 * i4)


def derive_pair_cone(
    q3_scale=sp.Integer(0),
    q3_w_scale=sp.Integer(0),
    positive_uv=None,
):
    parent, symbols, extras = derive_endpoint(expand_e6=False)
    n = symbols["n"]
    e = symbols["edge_count"]
    du = symbols["degree_u"]
    dv = symbols["degree_v"]
    adj = symbols["adjacent"]
    common = symbols["C_common_neighbor"]
    wedges = symbols["C_wedges_E"]
    xu = symbols["C_neighbor_excess_u"]
    xv = symbols["C_neighbor_excess_v"]
    re = symbols["C_connected3_E"]
    ru = symbols["C_connected3_U"]
    rv = symbols["C_connected3_V"]
    rw = extras["C_connected3_W"]
    cE6 = extras["C_E_i6"]

    if q3_scale:
        parent = sp.expand(
            parent - q3_scale * q3_row(n, e, wedges, re, "ENDPOINT_Q3E_")
        )
    if q3_w_scale:
        mw = n - 2
        ew = e - du - dv + adj
        ww = (
            wedges - choose(du, 2) - choose(dv, 2) - xu - xv
            + adj * (du + dv - 2) + common
        )
        parent = sp.expand(
            parent - q3_w_scale * q3_row(mw, ew, ww, rw, "ENDPOINT_Q3W_")
        )

    assert sp.diff(parent, cE6) == -6
    reduced = sp.expand(parent.subs(cE6, choose(n, 6)))
    a = sp.factor(sp.diff(reduced, re))
    b = sp.factor(sp.diff(reduced, ru))
    c = sp.factor(sp.diff(reduced, rv))
    d = sp.factor(sp.diff(reduced, rw))
    k = sp.factor(sp.diff(reduced, symbols["C_three_edge_five"]))
    r4k = sp.factor(sp.diff(reduced, symbols["C_connected4_E"]))
    ku = sp.factor(sp.diff(reduced, extras["C_three_edge_five_U"]))
    r4ku = sp.factor(sp.diff(reduced, extras["C_connected4_U"]))
    kv = sp.factor(sp.diff(reduced, extras["C_three_edge_five_V"]))
    r4kv = sp.factor(sp.diff(reduced, extras["C_connected4_V"]))
    assert sp.expand(k + r4k) == 0
    assert sp.expand(ku + r4ku) == 0
    assert sp.expand(kv + r4kv) == 0

    # Q35 >= R4-S4 and 4*S4 <= (q-3)*S3 in every forest row.
    t = sp.expand(k * (e - 3) / 4)
    tu = sp.expand(ku * (e - du - 3) / 4)
    tv = sp.expand(kv * (e - dv - 3) / 4)
    weight_none = sp.factor(a + b + c + d - t - tu - tv)
    weight_u = sp.factor(a + c - t - tv)
    weight_v = sp.factor(a + b - t - tu)
    weight_both = sp.factor(a - t)

    if positive_uv is None:
        positive_uv = sp.symbols(
            "positive_degree_u_v", integer=True, nonnegative=True
        )
    m_adj = sp.expand(choose(du + dv - 2, 2) + xu + xv - (du + dv - 2))
    m_common = sp.expand(du + dv + (xu + xv) / 2 - 3)
    motif_bound = sp.expand(
        adj * m_adj
        + (1 - adj) * common * m_common
        + (1 - adj) * (1 - common) * positive_uv
    )

    high = (
        re, ru, rv, rw,
        symbols["C_three_edge_five"], symbols["C_connected4_E"],
        extras["C_three_edge_five_U"], extras["C_connected4_U"],
        extras["C_three_edge_five_V"], extras["C_connected4_V"],
    )
    low = sp.expand(reduced.subs({variable: 0 for variable in high}))
    cone = sp.expand(low + weight_both * motif_bound)
    names = {
        "n": n,
        "edge_count": e,
        "degree_u": du,
        "degree_v": dv,
        "adjacent": adj,
        "C_common_neighbor": common,
        "C_wedges_E": wedges,
        "C_neighbor_excess_u": xu,
        "C_neighbor_excess_v": xv,
        "positive_degree_u_v": positive_uv,
        "q3_scale": sp.sympify(q3_scale),
        "q3_w_scale": sp.sympify(q3_w_scale),
        "R3_coefficients": (a, b, c, d),
        "Q35_coefficients": (k, ku, kv),
        "weight_none": weight_none,
        "weight_u": weight_u,
        "weight_v": weight_v,
        "weight_both": weight_both,
        "pair_motif_bound": motif_bound,
    }
    return cone, names


def main():
    for scale in (sp.Rational(3, 4), sp.Integer(1)):
        cone, names = derive_pair_cone(scale, sp.Rational(3, 4))
        print("SCALE", scale)
        for key in (
            "R3_coefficients", "Q35_coefficients", "weight_none",
            "weight_u", "weight_v", "weight_both",
        ):
            print(key, names[key])
        variables = sorted(cone.free_symbols, key=str)
        print("TERMS", len(sp.Poly(cone, *variables).terms()))
        for key in ("C_wedges_E", "C_neighbor_excess_u", "C_neighbor_excess_v"):
            variable = names[key]
            print("CURV", key, sp.factor(sp.diff(cone, variable, 2)))


if __name__ == "__main__":
    main()
