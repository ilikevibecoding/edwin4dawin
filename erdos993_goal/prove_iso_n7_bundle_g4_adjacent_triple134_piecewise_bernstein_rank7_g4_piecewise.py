#!/usr/bin/env python3
"""Exact rank-seven g4 certificate for the adjacent marked branch.

Adjacent marks cannot occur together in an independent set, so every Z row is
zero.  They also cannot share a W-neighbour in a forest.  Their disjoint W
neighbour sets give the exact deletion-category orders below, while the marked
edge gives e(W)+|X|+|Y|<=m.  The proof couples the W rows through exact forest
edge/wedge/three-edge-subtree moment bounds and uses the shadow and triple134
bad-five floors.  A fixed exact Bernstein partition closes all four A5/B5
incidence endpoints.  Every assertion below is fail-closed.
"""

from __future__ import annotations

import gc
import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import numpy as np
import sympy as sp

from prove_iso_n7_bundle_g4_sumge2_triple134_piecewise_bernstein_rank7_g4_piecewise import (
    HERE,
    RESIDUAL_REPORT,
    RESIDUAL_SOURCE,
    choose_poly,
    forest_moment_rows,
    interval_independent_count,
    minimum,
    sha256,
    split_axis,
    tail_leaf_records,
)


DEGREES = (7, 6, 6, 6, 4, 2, 1, 1)
BASE_SOURCE = HERE / "prove_iso_n7_bundle_g4_sumge2_triple134_piecewise_bernstein_rank7_g4_piecewise.py"
BASE_REPORT = HERE / "iso_n7_bundle_g4_sumge2_triple134_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json"
MARKED_SOURCE = HERE / "derive_iso_n7_bundle_g4_marked_partition_rank7_terminal.py"
MARKED_REPORT = HERE / "iso_n7_bundle_g4_marked_partition_exact_rank7_terminal_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g4_adjacent_triple134_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json"

RESIDUAL_SOURCE_SHA = "5F3CB5E9D0ED0C6E804AEE556EC26A6F6341AADAA97841282A1AAEC5BA52121D"
RESIDUAL_REPORT_SHA = "D987050A325813DDC500CCFBCE07B78C3F5744822D70FEAE8E4F643DF0628DDB"
BASE_SOURCE_SHA = "D43947DFE700BB0286032A874A460FCCBC5E7153D59D0F6EFA697C1D84B4E556"
BASE_REPORT_SHA = "85BEB1062353078F388D785387F3A615B33E09F7D1ECDCCFCF464DB412DE70C1"
MARKED_SOURCE_SHA = "94B926738917A0AACD00294EE4E391D0003E8DE742BD248120E75349B02038B4"
MARKED_REPORT_SHA = "B8B0C129D2C6B1CD0D2E3D5899210FBCBAEB49AFE55E0DBF0BCDA86299449974"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G4_ADJACENT_TRIPLE134_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"


def dependency_audit():
    expected = {
        RESIDUAL_SOURCE: RESIDUAL_SOURCE_SHA,
        RESIDUAL_REPORT: RESIDUAL_REPORT_SHA,
        BASE_SOURCE: BASE_SOURCE_SHA,
        BASE_REPORT: BASE_REPORT_SHA,
        MARKED_SOURCE: MARKED_SOURCE_SHA,
        MARKED_REPORT: MARKED_REPORT_SHA,
    }
    for path, digest in expected.items():
        assert sha256(path) == digest
    assert json.loads(RESIDUAL_REPORT.read_text(encoding="utf-8"))["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G4_CONTAINMENT_ELIMINATION_RANK7_TERMINAL"
    )
    assert json.loads(BASE_REPORT.read_text(encoding="utf-8"))["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G4_SUMGE2_TRIPLE134_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"
    )
    marked = json.loads(MARKED_REPORT.read_text(encoding="utf-8"))
    assert marked["marker"] == "DERIVED_EXACT_ISO_N7_BUNDLE_G4_MARKED_PARTITION_RANK7_TERMINAL"
    assert marked["marked_partition"]["Zk"] == "independent k-sets containing both marks"
    return {path.name: digest for path, digest in expected.items()}


def bernstein_controls(polynomial):
    assert tuple(polynomial.degree_list()) == DEGREES
    shape = tuple(degree + 1 for degree in DEGREES)
    controls = np.empty(shape, dtype=object)
    controls.fill(Fraction(0))
    for powers, coefficient in polynomial.terms():
        controls[powers] = Fraction(
            int(sp.numer(coefficient)), int(sp.denom(coefficient))
        )
    original_power = controls.copy()
    for axis, degree in enumerate(DEGREES[1:], start=1):
        moved = np.moveaxis(controls, axis, 0)
        source = moved.reshape((degree + 1, -1))
        target = np.empty_like(source)
        for index in range(degree + 1):
            target[index] = sum(
                source[power]
                * Fraction(math.comb(index, power), math.comb(degree, power))
                for power in range(index + 1)
            )
        controls = np.moveaxis(target.reshape(moved.shape), 0, axis)
    for q_index in range(DEGREES[0] + 1):
        controls[q_index] = controls[q_index] / math.comb(DEGREES[0], q_index)

    recovered = controls.copy()
    for q_index in range(DEGREES[0] + 1):
        recovered[q_index] *= math.comb(DEGREES[0], q_index)
    for axis in range(len(DEGREES) - 1, 0, -1):
        degree = DEGREES[axis]
        moved = np.moveaxis(recovered, axis, 0)
        source = moved.reshape((degree + 1, -1))
        target = np.empty_like(source)
        for power in range(degree + 1):
            target[power] = math.comb(degree, power) * sum(
                (-1) ** (power - index)
                * math.comb(power, index)
                * source[index]
                for index in range(power + 1)
            )
        recovered = np.moveaxis(target.reshape(moved.shape), 0, axis)
    assert all(
        recovered[index] == original_power[index] for index in np.ndindex(shape)
    )
    del recovered, original_power
    gc.collect()

    scale = math.lcm(*(value.denominator for value in controls.flat))
    integers = np.empty(shape, dtype=object)
    stream = hashlib.sha256()
    for index in np.ndindex(shape):
        value = controls[index]
        integer = value.numerator * (scale // value.denominator)
        integers[index] = integer
        stream.update(f"{index}:{integer};".encode())
    return integers, scale, stream.hexdigest().upper()


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
    edge_a_parameter, edge_b_parameter = sp.symbols(
        "edge_a_parameter edge_b_parameter"
    )
    endpoint_a5, endpoint_b5 = sp.symbols("endpoint_a5 endpoint_b5")

    # Adjacent marks cannot share a W-neighbour.  Their s exclusive neighbours
    # and the marked edge give e(W)+s<=m.
    marked_total = m * a
    x_count = marked_total * b
    y_count = marked_total * (1 - b)
    h_a = m - y_count
    h_b = m - x_count
    edge_w = (m - marked_total) * c
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
    edge_a = h_a * edge_a_parameter
    edge_b = h_b * edge_b_parameter
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
        **{symbols[f"Z{rank}"]: 0 for rank in range(2, 6)},
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

    # A4 and B4 are monotone.  A5 and B5 are separately affine, so the four
    # incidence corners exhaust their rectangular uncertainty interval.
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

    variables = (
        r, a, b, c, omega_parameter, tau_parameter,
        edge_a_parameter, edge_b_parameter,
    )
    polynomials = {}
    denominators = {}
    for label, floor in floors.items():
        boxed = sp.cancel(
            residual.subs(
                {**fixed, symbols["W5"]: choose_poly(m, 5) - floor},
                simultaneous=True,
            )
        )
        numerator, denominator = sp.fraction(boxed)
        denominator_factor = sp.factor(denominator)
        assert denominator_factor == 1
        for endpoint_a, endpoint_b in itertools.product((0, 1), repeat=2):
            key = (endpoint_a, endpoint_b, label)
            polynomial = sp.Poly(
                sp.expand(
                    numerator.subs({
                        endpoint_a5: endpoint_a,
                        endpoint_b5: endpoint_b,
                        m: r + 6,
                    })
                ),
                *variables,
            )
            assert tuple(polynomial.degree_list()) == DEGREES
            polynomials[key] = polynomial
            denominators[key] = str(denominator_factor)
            print("POLY", key, len(polynomial.terms()), flush=True)

    algebra = {
        "marked_swap_symmetry_checked": True,
        "marked_total": str(marked_total),
        "x_count": str(x_count),
        "y_count": str(y_count),
        "orders": {"A": str(h_a), "B": str(h_b)},
        "all_Z_rows": "0",
        "edge_budget": str(m - marked_total),
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
        "triple134_pointwise_values_t0_to4": [str(value) for value in pointwise_values],
    }
    return variables, polynomials, denominators, algebra


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
        records = triple_certificate(triple)
        complete = shadow_minimum >= 0 and all(int(value) >= 0 for value in records.values())
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
                "leaf_minima": records,
                "minimum_leaf_control": str(min(map(int, records.values()))),
            },
        }
        print("CERT", pair, min(map(int, records.values())), flush=True)

    assert not polynomials
    assert all(report["complete"] for report in endpoint_reports.values())
    report = {
        "marker": MARKER,
        "scope": (
            "Rank-seven g4 after the pinned D-containment/ranks8-6 lower "
            "reduction, for adjacent marks, all m>=6."
        ),
        "verdict": "complete exact all-order piecewise Bernstein certificate",
        "variable_order": [
            "q", "marked_total", "marked_split", "edge_W", "omega_W", "tau_W",
            "edge_A", "edge_B",
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
                "Adjacent marks cannot share a W-neighbour in a forest, so "
                "X=N_W(u) and Y=N_W(v) are disjoint.  The marked edge and "
                "forest edge count give e(W)+|X|+|Y|<=m."
            ),
            "Z_rows": (
                "The pinned marked partition defines Z_k as independent k-sets "
                "containing both marks; adjacency therefore gives Z_k=0 exactly."
            ),
            "category_rows": (
                "A_k=I_(k-1)(W-Y) and B_k=I_(k-1)(W-X)."
            ),
            "category_incidence_intervals": (
                "For an h-vertex forest with e edges, edge incidence gives "
                "e*C(h-2,k-2)/(k-1)<=bad_k<=e*C(h-2,k-2)."
            ),
            "category_monotonicity": (
                "The exact A4 and B4 derivatives are positive; A5 and B5 are "
                "separately affine and all four interval corners are certified."
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
                "The exact residual derivative in W bad-five is positive for "
                "actual m-vertex forests and m>=6."
            ),
            "relaxation_boundary": (
                "The edge-W box e(W)<=(m-|X|-|Y|) includes the intrinsic "
                "forest cap e(W)<=m-1 and can be larger only at invalid points; "
                "positivity is certified on the entire larger algebraic box."
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
