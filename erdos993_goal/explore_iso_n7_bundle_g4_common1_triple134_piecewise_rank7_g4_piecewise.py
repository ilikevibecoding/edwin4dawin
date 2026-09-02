#!/usr/bin/env python3
"""Exact broad coupled-moment probe for rank-seven g4 common1 geometry."""

from __future__ import annotations

import gc
import itertools
import json

import sympy as sp

from prove_iso_n7_bundle_g4_sumge2_triple134_piecewise_bernstein_rank7_g4_piecewise import (
    DEGREES,
    RESIDUAL_REPORT,
    bernstein_controls,
    choose_poly,
    forest_moment_rows,
    interval_independent_count,
    minimum,
    split_axis,
    tail_leaf_records,
)


def build_polynomials():
    upstream = json.loads(RESIDUAL_REPORT.read_text(encoding="utf-8"))
    names = ["n", *[f"{family}{rank}" for family in "WABZ" for rank in range(2, 6)]]
    symbols = {name: sp.Symbol(name) for name in names}
    residual = sp.sympify(upstream["residual_expression"], locals=symbols)
    m, r = sp.symbols("m r")
    a, b, c, omega_parameter, tau_parameter = sp.symbols(
        "a b c omega_parameter tau_parameter"
    )
    edge_a_parameter, edge_b_parameter, edge_z_parameter = sp.symbols(
        "edge_a_parameter edge_b_parameter edge_z_parameter"
    )
    endpoint_a5, endpoint_b5 = sp.symbols("endpoint_a5 endpoint_b5")

    # One common W-neighbour plus t exclusive neighbours split between marks.
    exclusive_total = (m - 1) * a
    x_exclusive = exclusive_total * b
    y_exclusive = exclusive_total * (1 - b)
    h_a = m - 1 - y_exclusive
    h_b = m - 1 - x_exclusive
    h_z = m - 1 - exclusive_total
    edge_w = h_z * c
    omega_w, tau_w, rows_w, bad4_w = forest_moment_rows(
        m, edge_w, omega_parameter, tau_parameter
    )
    incidence_1 = edge_w * choose_poly(m - 2, 3)
    incidence_2 = (
        omega_w * choose_poly(m - 3, 2)
        + (choose_poly(edge_w, 2) - omega_w) * (m - 4)
    )
    incidence_3_lower = tau_w * (m - 7) + omega_w * (edge_w - 2)
    floors = {
        "shadow": (m - 4) * bad4_w / 5,
        "triple134": (
            incidence_1 - incidence_2
            + sp.Rational(3, 4) * incidence_3_lower
        ),
    }
    edge_a, edge_b, edge_z = (
        h_a * edge_a_parameter,
        h_b * edge_b_parameter,
        h_z * edge_z_parameter,
    )
    fixed = {
        symbols["n"]: m + 2,
        symbols["A2"]: h_a,
        symbols["A3"]: choose_poly(h_a, 2) - edge_a,
        symbols["A4"]: interval_independent_count(h_a, edge_a, 3, 1),
        symbols["A5"]: interval_independent_count(h_a, edge_a, 4, endpoint_a5),
        symbols["B2"]: h_b,
        symbols["B3"]: choose_poly(h_b, 2) - edge_b,
        symbols["B4"]: interval_independent_count(h_b, edge_b, 3, 1),
        symbols["B5"]: interval_independent_count(h_b, edge_b, 4, endpoint_b5),
        symbols["Z2"]: 1,
        symbols["Z3"]: h_z,
        symbols["Z4"]: choose_poly(h_z, 2) - edge_z,
        symbols["Z5"]: interval_independent_count(h_z, edge_z, 3, 1),
        symbols["W2"]: rows_w[2],
        symbols["W3"]: rows_w[3],
        symbols["W4"]: rows_w[4],
    }
    variables = (
        r, a, b, c, omega_parameter, tau_parameter,
        edge_a_parameter, edge_b_parameter, edge_z_parameter,
    )
    polynomials = {}
    for label, floor in floors.items():
        boxed = sp.cancel(
            residual.subs(
                {**fixed, symbols["W5"]: choose_poly(m, 5) - floor},
                simultaneous=True,
            )
        )
        numerator, denominator = sp.fraction(boxed)
        assert sp.cancel(sp.factor(denominator) / m**4).is_Rational
        for endpoint_a, endpoint_b in itertools.product((0, 1), repeat=2):
            key = (endpoint_a, endpoint_b, label)
            polynomial = sp.Poly(
                sp.expand(numerator.subs({
                    endpoint_a5: endpoint_a,
                    endpoint_b5: endpoint_b,
                    m: r + 6,
                })),
                *variables,
            )
            print("POLY", key, polynomial.degree_list(), len(polynomial.terms()), flush=True)
            polynomials[key] = polynomial
    return polynomials


def triple_certificate(controls):
    discarded, q_right = split_axis(controls, 0)
    del discarded, controls
    c_left, c_right = split_axis(q_right, 3)
    del q_right
    q_left, tail = split_axis(c_right, 0)
    del c_right
    records = {
        "qR/cL": str(minimum(c_left)),
        "qR/cR/qL": str(minimum(q_left)),
        **tail_leaf_records(tail),
    }
    del c_left, q_left
    gc.collect()
    return records


def main():
    polynomials = build_polynomials()
    report = {}
    for pair in itertools.product((0, 1), repeat=2):
        shadow, shadow_scale, shadow_digest = bernstein_controls(
            polynomials.pop((*pair, "shadow"))
        )
        q_left, discarded = split_axis(shadow, 0)
        shadow_minimum = minimum(q_left)
        del shadow, q_left, discarded
        gc.collect()
        triple, triple_scale, triple_digest = bernstein_controls(
            polynomials.pop((*pair, "triple134"))
        )
        records = triple_certificate(triple)
        complete = shadow_minimum >= 0 and all(int(value) >= 0 for value in records.values())
        report[str(pair)] = {
            "complete": complete,
            "shadow_minimum": str(shadow_minimum),
            "shadow_scale": shadow_scale,
            "shadow_digest": shadow_digest,
            "triple_minimum": str(min(map(int, records.values()))),
            "triple_scale": triple_scale,
            "triple_digest": triple_digest,
            "triple_leaf_minima": records,
        }
        print("CERT", pair, complete, shadow_minimum, min(map(int, records.values())), flush=True)
    print(json.dumps(report, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
