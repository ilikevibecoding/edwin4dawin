#!/usr/bin/env python3
"""Exact rank-seven g4 certificate for nonadjacent/common0/sum>=2.

The marked-neighbour sets X=N_W(u) and Y=N_W(v) are disjoint and have total
size s>=2.  The proof retains the exact deletion-category orders, uses safe
forest edge-incidence intervals for their ranks through five, and couples the
W rows through exact edge/wedge/three-edge-subtree moment boxes.

The key new bad-five floor uses the first three edge-incidence moments.  If a
bad five-set spans t=1,...,4 forest edges, then

    t - C(t,2) + 3 C(t,3)/4 <= 1.

The third incidence moment is bounded below by

    tau (m-7) + Omega (e-2),

which follows by classifying three-edge forests and using that the number of
K_1,3 edge triples is at most tau.  A fixed exact Bernstein partition then
closes every endpoint.  Every assertion below is fail-closed.
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


HERE = Path(__file__).resolve().parent
RESIDUAL_SOURCE = HERE / "probe_iso_n7_bundle_g4_containment_elimination_rank7_terminal.py"
RESIDUAL_REPORT = HERE / "iso_n7_bundle_g4_containment_elimination_probe_rank7_terminal_20260831.json"
SUM0_SOURCE = HERE / "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py"
SUM0_REPORT = HERE / "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json"
SUM1_SOURCE = HERE / "prove_iso_n7_bundle_g4_sum1_coupled_moment_bernstein_rank7_g4_piecewise.py"
SUM1_REPORT = HERE / "iso_n7_bundle_g4_sum1_coupled_moment_bernstein_exact_rank7_g4_piecewise_20260831.json"

RESIDUAL_SOURCE_SHA = "5F3CB5E9D0ED0C6E804AEE556EC26A6F6341AADAA97841282A1AAEC5BA52121D"
RESIDUAL_REPORT_SHA = "D987050A325813DDC500CCFBCE07B78C3F5744822D70FEAE8E4F643DF0628DDB"
SUM0_SOURCE_SHA = "24E9538B8DA863D884BA2522E6D10316181F21206BE53A5C472D80C9DCE62FB5"
SUM0_REPORT_SHA = "E602040E714BF069F56DFB6C2BE94728595B087C530FF77371777662550E99C1"
SUM1_SOURCE_SHA = "501E9E7F12781A5A3B2F821C78A8B251EC7A39EC72D47E0522AFE466AF7C136B"
SUM1_REPORT_SHA = "7A3969BBCA7B945D72E33BB8A036F3C6747CEA960BA76CF1C51FD81A5C92844C"

OUTPUT = HERE / "iso_n7_bundle_g4_sumge2_triple134_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G4_SUMGE2_TRIPLE134_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"
DEGREES = (11, 6, 6, 6, 4, 2, 1, 1, 1)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(h, k):
    return sp.prod(h - offset for offset in range(k)) / sp.factorial(k)


def forest_moment_rows(order, edges, wedge_parameter, subtree_parameter):
    omega_lower = 2 * edges**2 / order - edges
    omega_upper = edges**2 / 2
    omega = omega_lower + wedge_parameter * (omega_upper - omega_lower)
    tau_lower = sp.cancel(2 * omega * (omega - edges) / (3 * edges))
    tau_upper = omega * edges / 2
    tau = sp.cancel(tau_lower + subtree_parameter * (tau_upper - tau_lower))
    bad4 = (
        edges * choose_poly(order - 2, 2)
        - omega * (order - 4)
        - edges * (edges - 1) / 2
        + tau
    )
    rows = {
        2: choose_poly(order, 2) - edges,
        3: choose_poly(order, 3) - edges * (order - 2) + omega,
        4: choose_poly(order, 4) - bad4,
    }
    return omega, tau, rows, bad4


def interval_independent_count(order, edges, rank, endpoint):
    incidence = edges * choose_poly(order - 2, rank - 2)
    bad_lower = incidence / (rank - 1)
    bad = bad_lower + endpoint * (incidence - bad_lower)
    return sp.expand(choose_poly(order, rank) - bad)


def dependency_audit():
    expected = {
        RESIDUAL_SOURCE: RESIDUAL_SOURCE_SHA,
        RESIDUAL_REPORT: RESIDUAL_REPORT_SHA,
        SUM0_SOURCE: SUM0_SOURCE_SHA,
        SUM0_REPORT: SUM0_REPORT_SHA,
        SUM1_SOURCE: SUM1_SOURCE_SHA,
        SUM1_REPORT: SUM1_REPORT_SHA,
    }
    for path, digest in expected.items():
        assert sha256(path) == digest
    assert json.loads(RESIDUAL_REPORT.read_text(encoding="utf-8"))["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G4_CONTAINMENT_ELIMINATION_RANK7_TERMINAL"
    )
    assert json.loads(SUM0_REPORT.read_text(encoding="utf-8"))["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G4_SUM0_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"
    )
    assert json.loads(SUM1_REPORT.read_text(encoding="utf-8"))["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G4_SUM1_COUPLED_MOMENT_BERNSTEIN_RANK7_G4_PIECEWISE"
    )
    return {path.name: digest for path, digest in expected.items()}


def build_polynomials():
    upstream = json.loads(RESIDUAL_REPORT.read_text(encoding="utf-8"))
    names = ["n", *[f"{family}{rank}" for family in "WABZ" for rank in range(2, 6)]]
    symbols = {name: sp.Symbol(name) for name in names}
    residual = sp.sympify(upstream["residual_expression"], locals=symbols)
    n = symbols["n"]
    W = {rank: symbols[f"W{rank}"] for rank in range(2, 6)}

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

    total = 2 + (m - 2) * a
    x_count = total * b
    y_count = total * (1 - b)
    h_a, h_b, h_z = m - y_count, m - x_count, m - total
    edge_w = (m + 1 - total) * c
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

    # Direct finite audit of the pointwise polynomial behind triple134.
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
        symbols["A5"]: interval_independent_count(
            h_a, edge_a, 4, endpoint_a5
        ),
        symbols["B2"]: h_b,
        symbols["B3"]: choose_poly(h_b, 2) - edge_b,
        symbols["B4"]: interval_independent_count(h_b, edge_b, 3, 1),
        symbols["B5"]: interval_independent_count(
            h_b, edge_b, 4, endpoint_b5
        ),
        symbols["Z2"]: 1,
        symbols["Z3"]: h_z,
        symbols["Z4"]: choose_poly(h_z, 2) - edge_z,
        symbols["Z5"]: interval_independent_count(h_z, edge_z, 3, 1),
        symbols["W2"]: rows_w[2],
        symbols["W3"]: rows_w[3],
        symbols["W4"]: rows_w[4],
    }

    # The W bad-five derivative is positive throughout the branch.
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

    # The three monotone category rows are fixed at their lower independent
    # endpoints.  A5 and B5 remain affine and are exhausted at four corners.
    derivative_a4 = sp.factor(sp.diff(residual, symbols["A4"]))
    expected_a4 = (
        2 * symbols["B2"] + 24 * symbols["B3"] + 20 * symbols["B4"]
        + 61 * symbols["W2"] + 52 * symbols["W3"] + 20 * symbols["W4"]
        + 22 * n - 45
    )
    assert sp.expand(derivative_a4 - expected_a4) == 0
    assert sp.expand(
        sp.diff(residual, symbols["B4"])
        - expected_a4.subs(
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
    ) == 0
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
                symbols["W3"]: (
                    choose_poly(m, 3) - (m - 1) * (m - 2)
                ),
            }
        )
    )
    assert sp.expand(
        z5_floor_numerator
        - (142 * m**3 - 1218 * m**2 + 2837 * m - 1083)
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
                {
                    **category_shift,
                    symbols["W5"]: choose_poly(m, 5) - floor,
                },
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
        "total_marked_neighbours": str(total),
        "x_count": str(x_count),
        "y_count": str(y_count),
        "orders": {"A": str(h_a), "B": str(h_b), "Z": str(h_z)},
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
        "Z5_derivative": str(derivative_z5),
        "Z5_positive_floor_numerator": str(z5_floor_numerator),
        "triple134_pointwise_values_t0_to4": [str(value) for value in pointwise_values],
    }
    return variables, polynomials, denominators, algebra


def bernstein_controls(polynomial):
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
        recovered[q_index] = recovered[q_index] * math.comb(DEGREES[0], q_index)
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


def minimum(array):
    return min(int(value) for value in array.flat)


def split_axis(array, axis):
    degree = array.shape[axis] - 1
    moved = np.moveaxis(array, axis, 0)
    source = moved.reshape((degree + 1, -1))
    left = np.empty_like(source)
    right = np.empty_like(source)
    for index in range(degree + 1):
        left[index] = (1 << (degree - index)) * sum(
            math.comb(index, power) * source[power]
            for power in range(index + 1)
        )
        right[index] = (1 << index) * sum(
            math.comb(degree - index, power - index) * source[power]
            for power in range(index, degree + 1)
        )
    return (
        np.moveaxis(left.reshape(moved.shape), 0, axis),
        np.moveaxis(right.reshape(moved.shape), 0, axis),
    )


def tail_leaf_records(array, path=()):
    if not path:
        left, right = split_axis(array, 1)
        del array
        return {
            **tail_leaf_records(left, ("aL",)),
            **tail_leaf_records(right, ("aR",)),
        }
    if path == ("aL",):
        left, right = split_axis(array, 4)
        del array
        return {
            **tail_leaf_records(left, (*path, "omegaL")),
            **tail_leaf_records(right, (*path, "omegaR")),
        }
    if path in (("aL", "omegaL"), ("aL", "omegaR"), ("aR",)):
        left_b, right_b = split_axis(array, 2)
        del array
        records = {}
        for b_label, b_array in (("bL", left_b), ("bR", right_b)):
            left_q, right_q = split_axis(b_array, 0)
            del b_array
            records["/".join((*path, b_label, "qL"))] = str(minimum(left_q))
            records["/".join((*path, b_label, "qR"))] = str(minimum(right_q))
            del left_q, right_q
        gc.collect()
        return records
    raise AssertionError(path)


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

    assert all(report["complete"] for report in endpoint_reports.values())
    report = {
        "marker": MARKER,
        "scope": (
            "Rank-seven g4 after the pinned D-containment/ranks8-6 lower "
            "reduction, for nonadjacent marks with no common W-neighbour and "
            "at least two total marked-to-W edges, all m>=6."
        ),
        "verdict": "complete exact all-order piecewise Bernstein certificate",
        "variable_order": [
            "q", "marked_total", "marked_split", "edge_W", "omega_W", "tau_W",
            "edge_A", "edge_B", "edge_Z",
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
                "X=N_W(u), Y=N_W(v) are disjoint, s=|X|+|Y|>=2, and "
                "e(W)+s<=m+1 because the marked ambient graph is a forest."
            ),
            "category_rows": (
                "A_k=I_(k-1)(W-Y), B_k=I_(k-1)(W-X), "
                "Z_k=I_(k-2)(W-X-Y)."
            ),
            "category_incidence_intervals": (
                "For an h-vertex forest with e edges, edge incidence gives "
                "e*C(h-2,k-2)/(k-1)<=bad_k<=e*C(h-2,k-2)."
            ),
            "category_monotonicity": (
                "The exact A4, B4, and Z5 derivatives are positive; A5 and "
                "B5 are affine and all four interval corners are certified."
            ),
            "forest_moment_box": (
                "2e^2/m-e<=Omega<=e^2/2 and "
                "2Omega(Omega-e)/(3e)<=tau<=Omega*e/2.  The lower tau bound "
                "follows from sum C(d,3)>=2Omega(Omega-e)/(3e)."
            ),
            "shadow_floor": (
                "(m-4)B4<=5B5 by counting bad four-sets inside bad five-sets."
            ),
            "triple_incidence_identity": (
                "If sigma counts K_1,3 edge triples, S3=tau(m-6)+Omega(e-2)-sigma; "
                "sigma<=tau gives S3>=tau(m-7)+Omega(e-2)."
            ),
            "triple134_floor": (
                "For t=0,...,4, t-C(t,2)+3C(t,3)/4 has values "
                "0,1,1,3/4,1, so B5>=S1-S2+3S3/4."
            ),
            "bad5_monotonicity": (
                "42*dR/dB5 is the positive cubic floor plus nonnegative "
                "category terms, (308n+910)(W2-C(m-1,2)), and "
                "84(C(m,3)-W3)."
            ),
            "pointwise_max": (
                "Both shadow and triple134 are valid B5 lower bounds and the "
                "residual increases with B5, so the true residual dominates "
                "their pointwise maximum."
            ),
        },
        "dependencies_sha256": dependencies,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(MARKER)


if __name__ == "__main__":
    main()
