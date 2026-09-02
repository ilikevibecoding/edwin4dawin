#!/usr/bin/env python3
"""Exact rank-seven g4 certificate for nonadjacent/common1 marks.

The two marks are nonadjacent and have exactly one common neighbour in W.
After deleting that common neighbour, their exclusive W-neighbour sets are
disjoint.  The proof uses the exact deletion-category orders, safe forest
edge-incidence intervals through rank five, and the pinned W moment and
triple-incidence certificate.  A fixed exact Bernstein partition closes all
four A5/B5 incidence endpoints.  Every assertion below is fail-closed.
"""

from __future__ import annotations

import gc
import itertools
import json
from pathlib import Path

import sympy as sp

from prove_iso_n7_bundle_g4_sumge2_triple134_piecewise_bernstein_rank7_g4_piecewise import (
    DEGREES,
    HERE,
    RESIDUAL_REPORT,
    RESIDUAL_SOURCE,
    bernstein_controls,
    choose_poly,
    forest_moment_rows,
    interval_independent_count,
    minimum,
    sha256,
    split_axis,
    triple_certificate,
)


BASE_SOURCE = HERE / "prove_iso_n7_bundle_g4_sumge2_triple134_piecewise_bernstein_rank7_g4_piecewise.py"
BASE_REPORT = HERE / "iso_n7_bundle_g4_sumge2_triple134_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g4_common1_triple134_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json"

RESIDUAL_SOURCE_SHA = "5F3CB5E9D0ED0C6E804AEE556EC26A6F6341AADAA97841282A1AAEC5BA52121D"
RESIDUAL_REPORT_SHA = "D987050A325813DDC500CCFBCE07B78C3F5744822D70FEAE8E4F643DF0628DDB"
BASE_SOURCE_SHA = "D43947DFE700BB0286032A874A460FCCBC5E7153D59D0F6EFA697C1D84B4E556"
BASE_REPORT_SHA = "85BEB1062353078F388D785387F3A615B33E09F7D1ECDCCFCF464DB412DE70C1"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G4_COMMON1_TRIPLE134_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"


def dependency_audit():
    expected = {
        RESIDUAL_SOURCE: RESIDUAL_SOURCE_SHA,
        RESIDUAL_REPORT: RESIDUAL_REPORT_SHA,
        BASE_SOURCE: BASE_SOURCE_SHA,
        BASE_REPORT: BASE_REPORT_SHA,
    }
    for path, digest in expected.items():
        assert sha256(path) == digest
    assert json.loads(RESIDUAL_REPORT.read_text(encoding="utf-8"))["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G4_CONTAINMENT_ELIMINATION_RANK7_TERMINAL"
    )
    assert json.loads(BASE_REPORT.read_text(encoding="utf-8"))["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G4_SUMGE2_TRIPLE134_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"
    )
    return {path.name: digest for path, digest in expected.items()}


def build_polynomials():
    upstream = json.loads(RESIDUAL_REPORT.read_text(encoding="utf-8"))
    names = ["n", *[f"{family}{rank}" for family in "WABZ" for rank in range(2, 6)]]
    symbols = {name: sp.Symbol(name) for name in names}
    residual = sp.sympify(upstream["residual_expression"], locals=symbols)
    n = symbols["n"]

    marked_swap = {}
    for rank in range(2, 6):
        marked_swap[symbols[f"A{rank}"]] = symbols[f"B{rank}"]
        marked_swap[symbols[f"B{rank}"]] = symbols[f"A{rank}"]
    assert sp.expand(residual.subs(marked_swap, simultaneous=True) - residual) == 0

    m, r = sp.symbols("m r")
    a, b, c, omega_parameter, tau_parameter = sp.symbols(
        "a b c omega_parameter tau_parameter"
    )
    edge_a_parameter, edge_b_parameter, edge_z_parameter = sp.symbols(
        "edge_a_parameter edge_b_parameter edge_z_parameter"
    )
    endpoint_a5, endpoint_b5 = sp.symbols("endpoint_a5 endpoint_b5")

    # The common W-neighbour contributes one vertex to each marked
    # neighbourhood.  The remaining t exclusive neighbours are split X/Y.
    exclusive_total = (m - 1) * a
    x_exclusive = exclusive_total * b
    y_exclusive = exclusive_total * (1 - b)
    h_a = m - 1 - y_exclusive
    h_b = m - 1 - x_exclusive
    h_z = m - 1 - exclusive_total

    # A forest on W union {u,v} has e(W)+t+2 <= m+1, hence e(W)<=m-1-t.
    edge_budget = m - 1 - exclusive_total
    assert sp.expand(edge_budget - h_z) == 0
    edge_w = edge_budget * c
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

    pointwise_values = [
        sp.Rational(t) - choose_poly(t, 2) + sp.Rational(3, 4) * choose_poly(t, 3)
        for t in range(5)
    ]
    assert pointwise_values == [0, 1, 1, sp.Rational(3, 4), 1]
    assert all(value <= 1 for value in pointwise_values)

    edge_a, edge_b, edge_z = (
        h_a * edge_a_parameter,
        h_b * edge_b_parameter,
        h_z * edge_z_parameter,
    )
    category_shift = {
        n: m + 2,
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

    # Exact monotonicity audit for replacing W bad-five by either lower floor.
    bad5_derivative = sp.factor(-sp.diff(residual, symbols["W5"]))
    derivative_numerator = sp.expand(42 * bad5_derivative.subs(n, m + 2))
    derivative_floor = 175 * m**3 + 723 * m**2 - 1737 * m + 2209
    derivative_decomposition = (
        (182 * (m + 2) + 1498) * symbols["A2"]
        + 756 * symbols["A3"]
        + (182 * (m + 2) + 1498) * symbols["B2"]
        + 756 * symbols["B3"]
        + (56 * (m + 2) + 994) * symbols["Z2"]
        + 756 * symbols["Z3"]
        + (308 * (m + 2) + 910)
          * (symbols["W2"] - choose_poly(m - 1, 2))
        + 84 * (choose_poly(m, 3) - symbols["W3"])
    )
    assert sp.expand(
        derivative_numerator - derivative_floor - derivative_decomposition
    ) == 0
    tail = sp.Symbol("tail")
    assert all(
        coefficient > 0
        for coefficient in sp.Poly(
            sp.expand(derivative_floor.subs(m, tail + 6)), tail
        ).all_coeffs()
    )

    # A4, B4, and Z5 are monotone; A5/B5 are separately affine, so the
    # four incidence corners exhaust their rectangular uncertainty interval.
    derivative_a4 = sp.factor(sp.diff(residual, symbols["A4"]))
    expected_a4 = (
        2 * symbols["B2"] + 24 * symbols["B3"] + 20 * symbols["B4"]
        + 61 * symbols["W2"] + 52 * symbols["W3"] + 20 * symbols["W4"]
        + 22 * n - 45
    )
    assert sp.expand(derivative_a4 - expected_a4) == 0
    expected_b4 = expected_a4.subs(
        {
            symbols["A2"]: symbols["B2"],
            symbols["A3"]: symbols["B3"],
            symbols["A4"]: symbols["B4"],
            symbols["B2"]: symbols["A2"],
            symbols["B3"]: symbols["A3"],
            symbols["B4"]: symbols["A4"],
        },
        simultaneous=True,
    )
    assert sp.expand(sp.diff(residual, symbols["B4"]) - expected_b4) == 0
    assert sp.diff(residual, symbols["A5"], 2) == 0
    assert sp.diff(residual, symbols["B5"], 2) == 0

    derivative_z5 = sp.factor(sp.diff(residual, symbols["Z5"]))
    expected_z5 = (
        1440 * symbols["W2"] + 1200 * symbols["W3"]
        - 58 * n**3 + 210 * n**2 + 853 * n - 2205
    ) / 60
    assert sp.expand(derivative_z5 - expected_z5) == 0
    z5_floor_numerator = sp.expand(
        (60 * expected_z5).subs(
            {
                n: m + 2,
                symbols["W2"]: choose_poly(m - 1, 2),
                symbols["W3"]: choose_poly(m, 3) - (m - 1) * (m - 2),
            }
        )
    )
    assert sp.expand(
        z5_floor_numerator - (142 * m**3 - 1218 * m**2 + 2837 * m - 1083)
    ) == 0
    assert all(
        coefficient > 0
        for coefficient in sp.Poly(
            sp.expand(z5_floor_numerator.subs(m, tail + 6)), tail
        ).all_coeffs()
    )

    variables = (
        r, a, b, c, omega_parameter, tau_parameter,
        edge_a_parameter, edge_b_parameter, edge_z_parameter,
    )
    polynomials = {}
    denominators = {}
    for label, floor in floors.items():
        boxed = sp.cancel(
            residual.subs(
                {**category_shift, symbols["W5"]: choose_poly(m, 5) - floor},
                simultaneous=True,
            )
        )
        numerator, denominator = sp.fraction(boxed)
        denominator_factor = sp.cancel(sp.factor(denominator) / m**4)
        assert denominator_factor.is_Rational and denominator_factor > 0
        for endpoint_a, endpoint_b in itertools.product((0, 1), repeat=2):
            key = (endpoint_a, endpoint_b, label)
            polynomial = sp.Poly(
                sp.expand(
                    numerator.subs(
                        {
                            endpoint_a5: endpoint_a,
                            endpoint_b5: endpoint_b,
                            m: r + 6,
                        }
                    )
                ),
                *variables,
            )
            assert tuple(polynomial.degree_list()) == DEGREES
            polynomials[key] = polynomial
            denominators[key] = str(sp.factor(denominator.subs(m, r + 6)))
            print("POLY", key, len(polynomial.terms()), flush=True)

    algebra = {
        "marked_swap_symmetry_checked": True,
        "exclusive_total": str(exclusive_total),
        "x_exclusive": str(x_exclusive),
        "y_exclusive": str(y_exclusive),
        "orders": {"A": str(h_a), "B": str(h_b), "Z": str(h_z)},
        "edge_budget": str(edge_budget),
        "edge_W": str(edge_w),
        "omega_W": str(omega_w),
        "tau_W": str(tau_w),
        "bad4_W": str(bad4_w),
        "incidence_1": str(incidence_1),
        "incidence_2": str(incidence_2),
        "incidence_3_lower": str(incidence_3_lower),
        "shadow_floor": str(floors["shadow"]),
        "triple134_floor": str(floors["triple134"]),
        "bad5_derivative": str(bad5_derivative),
        "bad5_derivative_floor": str(derivative_floor / 42),
        "A4_derivative": str(derivative_a4),
        "B4_derivative": str(expected_b4),
        "Z5_derivative": str(derivative_z5),
        "Z5_positive_floor_numerator": str(z5_floor_numerator),
        "triple134_pointwise_values_t0_to4": [str(value) for value in pointwise_values],
    }
    return variables, polynomials, denominators, algebra


def main():
    dependencies = dependency_audit()
    variables, polynomials, denominators, algebra = build_polynomials()
    pairs = tuple(itertools.product((0, 1), repeat=2))
    endpoint_reports = {}
    polynomial_summaries = {}

    for key, polynomial in polynomials.items():
        polynomial_summaries[str(key)] = {
            "terms": len(polynomial.terms()),
            "degrees": list(polynomial.degree_list()),
            "denominator": denominators[key],
        }

    for pair in pairs:
        shadow_key = (*pair, "shadow")
        print("CONTROLS", shadow_key, flush=True)
        shadow, shadow_scale, shadow_digest = bernstein_controls(
            polynomials.pop(shadow_key)
        )
        q_left, discarded = split_axis(shadow, 0)
        shadow_minimum = minimum(q_left)
        del shadow, q_left, discarded
        gc.collect()

        triple_key = (*pair, "triple134")
        print("CONTROLS", triple_key, flush=True)
        triple, triple_scale, triple_digest = bernstein_controls(
            polynomials.pop(triple_key)
        )
        triple_records = triple_certificate(triple)
        complete = shadow_minimum >= 0 and all(
            int(value) >= 0 for value in triple_records.values()
        )
        assert complete
        endpoint_reports[str(pair)] = {
            "complete": True,
            "shadow": {
                "control_scale": shadow_scale,
                "control_stream_sha256": shadow_digest,
                "qL_minimum": str(shadow_minimum),
            },
            "triple134": {
                "control_scale": triple_scale,
                "control_stream_sha256": triple_digest,
                "leaf_minima": triple_records,
                "minimum_leaf_control": str(min(map(int, triple_records.values()))),
            },
        }
        print("CERT", pair, min(map(int, triple_records.values())), flush=True)

    assert not polynomials
    assert all(report["complete"] for report in endpoint_reports.values())
    report = {
        "marker": MARKER,
        "scope": (
            "Rank-seven g4 after the pinned D-containment/ranks8-6 lower "
            "reduction, for nonadjacent marks with exactly one common "
            "W-neighbour, all m>=6."
        ),
        "verdict": "complete exact all-order piecewise Bernstein certificate",
        "variable_order": [
            "q", "exclusive_marked_total", "exclusive_marked_split", "edge_W",
            "omega_W", "tau_W", "edge_A", "edge_B", "edge_Z",
        ],
        "degrees": list(DEGREES),
        "exact_power_inversion": True,
        "algebra": algebra,
        "polynomial_summaries": polynomial_summaries,
        "piecewise_tree": {
            "shadow": "qL",
            "triple134_middle": ["qR/cL", "qR/cR/qL"],
            "triple134_tail": (
                "On qR/cR/qR split a; on aL split omega; then split b in "
                "each of aL/omegaL, aL/omegaR, and aR; finally split q."
            ),
            "triple134_tail_leaf_count": 12,
        },
        "endpoint_order": "(A5 incidence endpoint, B5 incidence endpoint)",
        "endpoint_reports": endpoint_reports,
        "inequality_audit": {
            "marked_geometry": (
                "The marks are nonadjacent and share one W-neighbour.  Their "
                "exclusive sets X,Y are disjoint; t=|X|+|Y|, and "
                "e(W)+t<=m-1 by the forest edge count."
            ),
            "category_rows": (
                "A_k=I_(k-1)(W-N_W(v)), B_k=I_(k-1)(W-N_W(u)), and "
                "Z_k=I_(k-2)(W-(N_W(u) union N_W(v)))."
            ),
            "category_orders": (
                "|A-base|=m-1-|Y|, |B-base|=m-1-|X|, and "
                "|Z-base|=m-1-t."
            ),
            "category_incidence_intervals": (
                "For an h-vertex forest with e edges, edge incidence gives "
                "e*C(h-2,k-2)/(k-1)<=bad_k<=e*C(h-2,k-2)."
            ),
            "category_monotonicity": (
                "The exact A4, B4, and Z5 derivatives are positive; A5 and "
                "B5 are separately affine and all four interval corners are certified."
            ),
            "forest_moment_box": (
                "2e^2/m-e<=Omega<=e^2/2 and "
                "2Omega(Omega-e)/(3e)<=tau<=Omega*e/2."
            ),
            "shadow_floor": (
                "(m-4)B4<=5B5 by counting bad four-sets inside bad five-sets."
            ),
            "triple_incidence_identity": (
                "If sigma counts K_1,3 edge triples, "
                "S3=tau(m-6)+Omega(e-2)-sigma and sigma<=tau."
            ),
            "triple134_floor": (
                "For t=0,...,4, t-C(t,2)+3C(t,3)/4 has values "
                "0,1,1,3/4,1, so B5>=S1-S2+3S3/4."
            ),
            "bad5_monotonicity": (
                "The exact residual derivative in W bad-five is positive for m>=6."
            ),
            "pointwise_max": (
                "Both shadow and triple134 are valid bad-five lower bounds; "
                "the exact piecewise tree certifies their pointwise maximum."
            ),
        },
        "dependencies_sha256": dependencies,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(MARKER)


if __name__ == "__main__":
    main()
