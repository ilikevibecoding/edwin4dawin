#!/usr/bin/env python3
"""Exact certificate for the rank-seven g4 one-neighbour marked geometry.

The branch has nonadjacent marks, no common neighbour, and exactly one marked
neighbour in W.  If a is that neighbour and H=W-a, the exact category rows are

  A_k=W_(k-1), B_k=H_(k-1), Z_k=H_(k-2).

The script places W and H in simultaneous exact forest moment boxes, retaining
the valid deletion coupling e(H)<=e(W), and proves an exact Bernstein
pointwise-max certificate. Every assertion is fail-closed.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

import numpy as np
import sympy as sp

from prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise import (
    audit_five_vertex_forest_inequality,
)


HERE = Path(__file__).resolve().parent
RESIDUAL_REPORT = HERE / "iso_n7_bundle_g4_containment_elimination_probe_rank7_terminal_20260831.json"
RESIDUAL_SOURCE = HERE / "probe_iso_n7_bundle_g4_containment_elimination_rank7_terminal.py"
SUM0_SOURCE = HERE / "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py"
SUM0_REPORT = HERE / "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json"
RESIDUAL_SOURCE_SHA = "5F3CB5E9D0ED0C6E804AEE556EC26A6F6341AADAA97841282A1AAEC5BA52121D"
RESIDUAL_REPORT_SHA = "D987050A325813DDC500CCFBCE07B78C3F5744822D70FEAE8E4F643DF0628DDB"
SUM0_SOURCE_SHA = "24E9538B8DA863D884BA2522E6D10316181F21206BE53A5C472D80C9DCE62FB5"
SUM0_REPORT_SHA = "E602040E714BF069F56DFB6C2BE94728595B087C530FF77371777662550E99C1"
OUTPUT = HERE / "iso_n7_bundle_g4_sum1_coupled_moment_bernstein_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G4_SUM1_COUPLED_MOMENT_BERNSTEIN_RANK7_G4_PIECEWISE"


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
    return omega, tau, {
        2: choose_poly(order, 2) - edges,
        3: choose_poly(order, 3) - edges * (order - 2) + omega,
        4: choose_poly(order, 4) - bad4,
    }, bad4


def build_polynomials():
    assert sha256(RESIDUAL_SOURCE) == RESIDUAL_SOURCE_SHA
    assert sha256(RESIDUAL_REPORT) == RESIDUAL_REPORT_SHA
    assert sha256(SUM0_SOURCE) == SUM0_SOURCE_SHA
    assert sha256(SUM0_REPORT) == SUM0_REPORT_SHA
    upstream = json.loads(RESIDUAL_REPORT.read_text(encoding="utf-8"))
    assert upstream["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G4_CONTAINMENT_ELIMINATION_RANK7_TERMINAL"
    )
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
    x, y, z, deletion, yh, zh, p5 = sp.symbols("x y z deletion yh zh p5")
    h = m - 1
    edge_w = (m - 1) * x
    omega_w, tau_w, rows_w, bad4_w = forest_moment_rows(m, edge_w, y, z)
    incidence_w = edge_w * choose_poly(m - 2, 3)
    joint_w = omega_w * choose_poly(m - 3, 2)
    floors_w = {
        "incidence": incidence_w / 4,
        "shadow": (m - 4) * bad4_w / 5,
        "strong": (
            (m - 4) * bad4_w - 2 * incidence_w
            + sp.Rational(5, 6) * joint_w
        ),
    }

    edge_h = edge_w * deletion
    omega_h, tau_h, rows_h, _bad4_h = forest_moment_rows(h, edge_h, yh, zh)
    category_shift = {
        n: m + 2,
        symbols["A2"]: m,
        symbols["A3"]: W[2],
        symbols["A4"]: W[3],
        symbols["A5"]: W[4],
        symbols["B2"]: m - 1,
        symbols["B3"]: rows_h[2],
        symbols["B4"]: rows_h[3],
        symbols["B5"]: rows_h[4],
        symbols["Z2"]: 1,
        symbols["Z3"]: m - 1,
        symbols["Z4"]: rows_h[2],
        symbols["Z5"]: rows_h[3],
    }
    shifted_residual = sp.factor(residual.subs(category_shift))
    bad5_derivative = sp.factor(-sp.diff(shifted_residual, W[5]))
    H2 = rows_h[2]
    derivative_numerator = sp.factor(42 * bad5_derivative)
    derivative_floor = 175 * m**3 + 1465 * m**2 + 1483 * m + 1453
    derivative_decomposition = (
        756 * H2
        + (308 * m + 2282) * (W[2] - choose_poly(m - 1, 2))
        + 84 * (choose_poly(m, 3) - W[3])
    )
    assert sp.expand(
        derivative_numerator - derivative_floor - derivative_decomposition
    ) == 0
    assert all(
        coefficient > 0
        for coefficient in sp.Poly(
            derivative_floor.subs(m, sp.Symbol("tail") + 6), sp.Symbol("tail")
        ).all_coeffs()
    )
    w_rows = {W[2]: rows_w[2], W[3]: rows_w[3], W[4]: rows_w[4]}

    numerators = {}
    denominators = {}
    for label, floor in floors_w.items():
        bad5 = floor + p5 * (incidence_w - floor)
        boxed = sp.cancel(
            shifted_residual.subs(
                {**w_rows, W[5]: choose_poly(m, 5) - bad5}, simultaneous=True
            )
        )
        numerator, denominator = sp.fraction(boxed)
        for endpoint in (0, 1):
            key = (label, endpoint)
            numerators[key] = sp.expand(numerator.subs({p5: endpoint, m: r + 6}))
            denominators[key] = sp.factor(denominator.subs(m, r + 6))
    assert all(
        sp.expand(numerators[("incidence", 1)] - numerators[(label, 1)]) == 0
        for label in floors_w
    )
    variables = (r, x, y, z, deletion, yh, zh)
    return variables, numerators, denominators, {
        "edge_w": str(edge_w),
        "omega_w": str(omega_w),
        "tau_w": str(tau_w),
        "edge_h": str(edge_h),
        "omega_h": str(omega_h),
        "tau_h": str(tau_h),
        "deletion_coupling": "e(H)=deletion*e(W), 0<=deletion<=1",
        "marked_swap_symmetry_checked": True,
        "bad5_derivative": str(bad5_derivative),
        "bad5_derivative_positive_floor": str(derivative_floor / 42),
    }


DEGREES = (11, 6, 4, 2, 3, 2, 1)


def bernstein_controls(polynomial, variables):
    """Dense exact q-compactified tensor Bernstein controls."""
    poly = sp.Poly(polynomial, *variables)
    assert tuple(poly.degree_list()) == DEGREES
    shape = tuple(degree + 1 for degree in DEGREES)
    controls = np.empty(shape, dtype=object)
    controls.fill(Fraction(0))
    for powers, coefficient in poly.terms():
        controls[powers] = Fraction(int(sp.numer(coefficient)), int(sp.denom(coefficient)))
    original_power = controls.copy()

    # Ordinary power-to-Bernstein conversion on every unit-cube axis except q.
    for axis, degree in enumerate(DEGREES[1:], start=1):
        moved = np.moveaxis(controls, axis, 0)
        source = moved.reshape((degree + 1, -1))
        target = np.empty_like(source)
        for index in range(degree + 1):
            target[index] = [
                sum(
                    source[power, column]
                    * Fraction(math.comb(index, power), math.comb(degree, power))
                    for power in range(index + 1)
                )
                for column in range(source.shape[1])
            ]
        controls = np.moveaxis(target.reshape(moved.shape), 0, axis)

    # If r=q/(1-q), multiplying by (1-q)^11 turns r^j into the jth
    # degree-11 q-Bernstein basis function divided by C(11,j).
    for q_index in range(DEGREES[0] + 1):
        controls[q_index] = controls[q_index] / math.comb(DEGREES[0], q_index)

    # Exact inverse conversion back to the original r/x/... power tensor.
    recovered = controls.copy()
    for q_index in range(DEGREES[0] + 1):
        recovered[q_index] = recovered[q_index] * math.comb(DEGREES[0], q_index)
    for axis in range(len(DEGREES) - 1, 0, -1):
        degree = DEGREES[axis]
        moved = np.moveaxis(recovered, axis, 0)
        source = moved.reshape((degree + 1, -1))
        target = np.empty_like(source)
        for power in range(degree + 1):
            target[power] = [
                math.comb(degree, power)
                * sum(
                    (-1) ** (power - index)
                    * math.comb(power, index)
                    * source[index, column]
                    for index in range(power + 1)
                )
                for column in range(source.shape[1])
            ]
        recovered = np.moveaxis(target.reshape(moved.shape), 0, axis)
    assert all(
        recovered[index] == original_power[index] for index in np.ndindex(shape)
    )

    scale = 1
    for value in controls.flat:
        scale = math.lcm(scale, value.denominator)
    integers = np.empty(shape, dtype=object)
    stream = hashlib.sha256()
    for index in np.ndindex(shape):
        value = controls[index]
        integers[index] = value.numerator * (scale // value.denominator)
        stream.update(f"{index}:{integers[index]};".encode())
    return integers, scale, stream.hexdigest().upper()


def minimum(controls):
    return min(int(value) for value in controls.flat)


def normalize_scale(controls):
    common = 0
    for value in controls.flat:
        common = math.gcd(common, abs(int(value)))
        if common == 1:
            return controls
    return controls // common if common > 1 else controls


def split_axis(controls, axis):
    degree = controls.shape[axis] - 1
    moved = np.moveaxis(controls, axis, 0)
    source = moved.reshape((degree + 1, -1))
    left = np.empty_like(source)
    right = np.empty_like(source)
    for index in range(degree + 1):
        left[index] = [
            (1 << (degree - index))
            * sum(math.comb(index, j) * source[j, column] for j in range(index + 1))
            for column in range(source.shape[1])
        ]
        right[index] = [
            (1 << index)
            * sum(
                math.comb(degree - index, j - index) * source[j, column]
                for j in range(index, degree + 1)
            )
            for column in range(source.shape[1])
        ]
    return (
        np.moveaxis(left.reshape(moved.shape), 0, axis),
        np.moveaxis(right.reshape(moved.shape), 0, axis),
    )


def exact_cover(initial, require_any, node_limit=200000, depth_limit=180):
    stack = [(initial, (0,) * len(DEGREES), "")]
    nodes = leaves = 0
    maximum_depth = 0
    split_counts = [0] * len(DEGREES)
    leaf_records = []
    while stack:
        arrays, levels, address = stack.pop()
        nodes += 1
        minima = [minimum(array) for array in arrays]
        passing = [index for index, value in enumerate(minima) if value >= 0]
        accepted = bool(passing) if require_any else len(passing) == len(arrays)
        if accepted:
            leaves += 1
            leaf_records.append({
                "address": address or "ROOT",
                "levels": list(levels),
                "passing": passing,
                "minima": [str(value) for value in minima],
            })
            continue
        if nodes >= node_limit or sum(levels) >= depth_limit:
            return {
                "complete": False,
                "nodes": nodes,
                "leaves": leaves,
                "maximum_depth": maximum_depth,
                "split_counts": split_counts,
                "failure": {
                    "address": address,
                    "levels": list(levels),
                    "minimum_signs": [-1 if value < 0 else 0 for value in minima],
                    "remaining": len(stack),
                },
                "leaf_records": leaf_records,
            }
        axis = max(
            range(len(DEGREES)),
            key=lambda candidate: DEGREES[candidate] / (1 << levels[candidate]),
        )
        split_counts[axis] += 1
        children = [[], []]
        for array in arrays:
            left, right = split_axis(array, axis)
            children[0].append(normalize_scale(left))
            children[1].append(normalize_scale(right))
        next_levels = list(levels)
        next_levels[axis] += 1
        next_levels = tuple(next_levels)
        maximum_depth = max(maximum_depth, sum(next_levels))
        stack.append((children[1], next_levels, address + f"{axis}R"))
        stack.append((children[0], next_levels, address + f"{axis}L"))
        if nodes % 1000 == 0:
            print("COVER", nodes, leaves, len(stack), maximum_depth, split_counts, flush=True)
    return {
        "complete": True,
        "nodes": nodes,
        "leaves": leaves,
        "maximum_depth": maximum_depth,
        "split_counts": split_counts,
        "failure": None,
        "leaf_records": leaf_records,
    }


def main():
    local_forest_audit = audit_five_vertex_forest_inequality()
    variables, numerators, denominators, algebra = build_polynomials()
    summaries = {}
    for key, polynomial in numerators.items():
        poly = sp.Poly(polynomial, *variables)
        summaries[str(key)] = {
            "terms": len(poly.terms()),
            "degrees": list(poly.degree_list()),
            "denominator": str(denominators[key]),
        }
        print(key, summaries[str(key)], flush=True)
    labels = ("incidence", "shadow", "strong")
    controls = {}
    scales = {}
    control_digests = {}
    for key in [(label, 0) for label in labels] + [("incidence", 1)]:
        controls[key], scales[key], control_digests[key] = bernstein_controls(
            numerators[key], variables
        )
        print(
            "INITIAL", key, "minimum", minimum(controls[key]),
            "negative", sum(int(value) < 0 for value in controls[key].flat),
            flush=True,
        )
    p1_cover = exact_cover([controls[("incidence", 1)]], require_any=False)
    print("P1", json.dumps(p1_cover, sort_keys=True), flush=True)
    p0_cover = exact_cover(
        [controls[(label, 0)] for label in labels], require_any=True
    )
    print("P0", json.dumps(p0_cover, sort_keys=True), flush=True)
    assert p1_cover["complete"] and p1_cover["failure"] is None
    assert p0_cover["complete"] and p0_cover["failure"] is None
    report = {
        "marker": MARKER,
        "algebra": algebra,
        "polynomial_summaries": summaries,
        "degrees": list(DEGREES),
        "variable_order": ["q", "edge_W", "omega_W", "tau_W", "edge_H_ratio", "omega_H", "tau_H"],
        "candidate_order": list(labels),
        "control_scales": {str(key): value for key, value in scales.items()},
        "control_stream_sha256": {
            str(key): value for key, value in control_digests.items()
        },
        "exact_power_inversion": True,
        "local_five_vertex_forest_audit": local_forest_audit,
        "inequality_audit": {
            "exact_categories": (
                "For the orientation with N_W(u)={a}, N_W(v)=empty: "
                "A_k=W_(k-1), B_k=I_(k-1)(W-a), Z_k=I_(k-2)(W-a). "
                "A/B symmetry covers the reverse orientation."
            ),
            "deletion_edge_coupling": "H=W-a implies 0<=e(H)<=e(W)",
            "forest_moment_box": (
                "For both W and H: 2e^2/h-e<=Omega<=C(e,2)<=e^2/2 and "
                "2Omega(Omega-e)/(3e)<=tau<=Omega*e/2"
            ),
            "H2_nonnegative_on_box": (
                "H2=C(m-1,2)-e(H)>=(m-1)(m-4)/2 for m>=6"
            ),
            "W2_floor": "W2>=C(m-1,2)",
            "W3_cap": "W3<=C(m,3), since Omega<=e^2/2<=e(m-2)",
            "bad5_monotonicity": (
                "42*dR/dB5 equals the positive cubic floor plus "
                "756H2+(308m+2282)(W2-C(m-1,2))+84(C(m,3)-W3)"
            ),
            "bad5_floors_and_upper": (
                "The same three audited W floors I5/4, (m-4)B4/5, and "
                "(m-4)B4-2I5+(5/6)J5 apply, with B5<=I5."
            ),
            "pointwise_max": (
                "At p5=0 the true residual is the pointwise maximum of the three "
                "floor residuals; at p5=1 they agree. Affinity in p5 closes the interval."
            ),
        },
        "p1_cover": p1_cover,
        "p0_cover": p0_cover,
        "verdict": "complete exact all-order Bernstein certificate on the sum-one face",
        "scope": (
            "Rank-seven g4 after the pinned D-containment/ranks8-6 lower reduction, "
            "for nonadjacent marks with no common W-neighbour and exactly one total "
            "marked-to-W edge, all m>=6."
        ),
        "dependencies_sha256": {
            RESIDUAL_SOURCE.name: RESIDUAL_SOURCE_SHA,
            RESIDUAL_REPORT.name: RESIDUAL_REPORT_SHA,
            SUM0_SOURCE.name: SUM0_SOURCE_SHA,
            SUM0_REPORT.name: SUM0_REPORT_SHA,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(MARKER)


if __name__ == "__main__":
    main()
