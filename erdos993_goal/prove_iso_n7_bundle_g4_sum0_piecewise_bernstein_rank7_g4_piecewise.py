#!/usr/bin/env python3
"""Exact Bernstein certificate for the rank-seven g4 sum-zero face.

It reconstructs the three rigorous B5-floor residuals from the pinned
exact-shift report, independently checks the exact shift and the local
five-vertex inequality, compacts
the unbounded order variable m>=6 to q in [0,1], and tries to cover the cube
by exact dyadic Bernstein boxes. A box is accepted at p5=0 when at least one
of the three floor residuals has nonnegative Bernstein controls; this is
sufficient because the true residual is their pointwise maximum.  The common
p5=1 endpoint is checked separately.  Every assertion is fail-closed.
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


HERE = Path(__file__).resolve().parent
UPSTREAM_SOURCE = HERE / "probe_iso_n7_bundle_g4_sum0_exact_shift_rank7_terminal.py"
UPSTREAM = HERE / "iso_n7_bundle_g4_sum0_exact_shift_probe_rank7_terminal_20260831.json"
CONTAINMENT_SOURCE = HERE / "probe_iso_n7_bundle_g4_containment_elimination_rank7_terminal.py"
CONTAINMENT_REPORT = HERE / "iso_n7_bundle_g4_containment_elimination_probe_rank7_terminal_20260831.json"
UPSTREAM_SOURCE_SHA = "155B8AAC7EB7A4D2CC1D044A2DDEB4A336AECF6C3B0BE4428DE6D6B47E9CF330"
UPSTREAM_SHA = "13E5737999DA794E00CDF8DDF193D7AF6346FA7B620BFEC72C942AA009E43099"
CONTAINMENT_SOURCE_SHA = "5F3CB5E9D0ED0C6E804AEE556EC26A6F6341AADAA97841282A1AAEC5BA52121D"
CONTAINMENT_REPORT_SHA = "D987050A325813DDC500CCFBCE07B78C3F5744822D70FEAE8E4F643DF0628DDB"
OUTPUT = HERE / "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G4_SUM0_PIECEWISE_BERNSTEIN_RANK7_G4_PIECEWISE"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(h, k):
    return sp.prod(h - offset for offset in range(k)) / sp.factorial(k)


def audit_five_vertex_forest_inequality():
    """Exhaust the local inequality behind the strongest B5 floor."""
    vertices = range(5)
    possible_edges = tuple(itertools.combinations(vertices, 2))
    tested_forests = 0
    minimum_slack = None
    stream = hashlib.sha256()
    for mask in range(1 << len(possible_edges)):
        edges = [
            edge for index, edge in enumerate(possible_edges) if mask & (1 << index)
        ]
        parent = list(vertices)

        def find(value):
            while parent[value] != value:
                parent[value] = parent[parent[value]]
                value = parent[value]
            return value

        is_forest = True
        for left, right in edges:
            root_left, root_right = find(left), find(right)
            if root_left == root_right:
                is_forest = False
                break
            parent[root_left] = root_right
        if not is_forest:
            continue
        tested_forests += 1
        degrees = [0] * 5
        for left, right in edges:
            degrees[left] += 1
            degrees[right] += 1
        omega = sum(degree * (degree - 1) // 2 for degree in degrees)
        bad4 = 0
        for omitted in vertices:
            if any(left != omitted and right != omitted for left, right in edges):
                bad4 += 1
        bad5 = int(bool(edges))
        # Six times b - 2r + (5/6)omega <= six times 1_bad.
        slack = 6 * bad5 - (6 * bad4 - 12 * len(edges) + 5 * omega)
        assert slack >= 0
        minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
        stream.update(f"{mask}:{len(edges)}:{omega}:{bad4}:{bad5}:{slack};".encode())
    assert tested_forests == 291
    assert minimum_slack == 0
    return {
        "labeled_five_vertex_forests": tested_forests,
        "minimum_integer_slack": minimum_slack,
        "row_stream_sha256": stream.hexdigest().upper(),
        "inequality": "b4-2*edges+(5/6)*omega <= indicator(edges>0)",
    }


def build_polynomials():
    assert sha256(UPSTREAM_SOURCE) == UPSTREAM_SOURCE_SHA
    assert sha256(UPSTREAM) == UPSTREAM_SHA
    assert sha256(CONTAINMENT_SOURCE) == CONTAINMENT_SOURCE_SHA
    assert sha256(CONTAINMENT_REPORT) == CONTAINMENT_REPORT_SHA
    report = json.loads(UPSTREAM.read_text(encoding="utf-8"))
    assert report["marker"] == "PROBE_ISO_N7_BUNDLE_G4_SUM0_EXACT_SHIFT_RANK7_TERMINAL"
    names = ["n", *[f"W{rank}" for rank in range(2, 6)]]
    symbols = {name: sp.Symbol(name) for name in names}
    residual = sp.sympify(report["exact_shift_residual"], locals=symbols)
    n = symbols["n"]
    W = {rank: symbols[f"W{rank}"] for rank in range(2, 6)}

    # Independently reconstruct the category shift from the pinned containment
    # residual instead of trusting the downstream expression string alone.
    containment = json.loads(CONTAINMENT_REPORT.read_text(encoding="utf-8"))
    assert containment["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G4_CONTAINMENT_ELIMINATION_RANK7_TERMINAL"
    )
    category_names = [
        "n", *[f"{family}{rank}" for family in "WABZ" for rank in range(2, 6)]
    ]
    category_symbols = {name: sp.Symbol(name) for name in category_names}
    containment_residual = sp.sympify(
        containment["residual_expression"], locals=category_symbols
    )
    category_shift = {}
    for rank in range(2, 6):
        previous = category_symbols["n"] - 2 if rank == 2 else category_symbols[f"W{rank - 1}"]
        category_shift[category_symbols[f"A{rank}"]] = previous
        category_shift[category_symbols[f"B{rank}"]] = previous
    category_shift.update({
        category_symbols["Z2"]: 1,
        category_symbols["Z3"]: category_symbols["n"] - 2,
        category_symbols["Z4"]: category_symbols["W2"],
        category_symbols["Z5"]: category_symbols["W3"],
    })
    independently_shifted = sp.factor(containment_residual.subs(category_shift))
    comparison_locals = {name: symbols[name] for name in names}
    independently_shifted = sp.sympify(
        str(independently_shifted), locals=comparison_locals
    )
    assert sp.expand(independently_shifted - residual) == 0

    m, e, omega, tau, b5 = sp.symbols("m e omega tau b5")
    x, y, z, p5, r = sp.symbols("x y z p5 r")
    bad4 = (
        e * choose_poly(m - 2, 2)
        - omega * (m - 4)
        - e * (e - 1) / 2
        + tau
    )
    exact_rows = {
        n: m + 2,
        W[2]: choose_poly(m, 2) - e,
        W[3]: choose_poly(m, 3) - e * (m - 2) + omega,
        W[4]: choose_poly(m, 4) - bad4,
        W[5]: choose_poly(m, 5) - b5,
    }
    raw = sp.factor(residual.subs(exact_rows))
    derivative = sp.factor(sp.diff(raw, b5))
    derivative_numerator = sp.factor(42 * derivative)
    assert sp.Poly(derivative_numerator, b5).degree() == 0
    omega_cap = e * (e - 1) / 2
    after_omega_cap = sp.factor(derivative_numerator.subs(omega, omega_cap))
    assert sp.expand(
        derivative_numerator - after_omega_cap - 84 * (omega_cap - omega)
    ) == 0
    at_edge_cap = sp.factor(after_omega_cap.subs(e, m - 1))
    assert at_edge_cap == 175 * m**3 + 1885 * m**2 + 405 * m + 4911
    assert sp.factor(after_omega_cap - at_edge_cap).subs(e, m - 1) == 0
    edge_quotient = sp.factor((after_omega_cap - at_edge_cap) / (m - 1 - e))
    assert all(
        coefficient >= 0
        for coefficient in sp.Poly(
            edge_quotient.subs(m, sp.Symbol("s") + 6), e, sp.Symbol("s")
        ).coeffs()
    )
    incidence = e * choose_poly(m - 2, 3)
    joint = omega * choose_poly(m - 3, 2)
    floors = {
        "incidence": incidence / 4,
        "shadow": (m - 4) * bad4 / 5,
        "strong": (m - 4) * bad4 - 2 * incidence + sp.Rational(5, 6) * joint,
    }

    edge = (m - 1) * x
    omega_lower = 2 * edge**2 / m - edge
    omega_upper = edge**2 / 2
    omega_box = omega_lower + y * (omega_upper - omega_lower)
    # Every connected three-edge subtree contains, in particular, every
    # three-edge star.  Put a_v=d_v-1 on nonisolated vertices.  In a forest,
    # S1=sum a_v=e-c_+<=e, while sum a_v^2=2*omega-S1.  Cauchy therefore gives
    #   6*sum_v C(d_v,3)=sum a_v^3-S1
    #     >= (2*omega-S1)^2/S1-S1
    #      = 4*omega^2/S1-4*omega
    #     >= 4*omega^2/e-4*omega.
    # Hence tau>=2*omega(omega-e)/(3e).  The expression can be negative and is
    # then merely a harmless weaker floor.  The previously audited incidence
    # bound tau<=omega*e/2 supplies the upper endpoint.
    tau_lower_box = sp.cancel(2 * omega_box * (omega_box - edge) / (3 * edge))
    tau_upper_box = omega_box * edge / 2
    tau_box = sp.cancel(tau_lower_box + z * (tau_upper_box - tau_lower_box))
    geometry = {e: edge, omega: omega_box, tau: tau_box}

    numerators = {}
    for label, floor in floors.items():
        b5_box = floor + p5 * (incidence - floor)
        boxed = sp.cancel(raw.subs(b5, b5_box).subs(geometry, simultaneous=True))
        numerator, denominator = sp.fraction(boxed)
        assert sp.factor(denominator) == 5040 * m**4
        numerators[(label, 0)] = sp.expand(numerator.subs({p5: 0, m: r + 6}))
        numerators[(label, 1)] = sp.expand(numerator.subs({p5: 1, m: r + 6}))
    assert all(
        sp.expand(numerators[("incidence", 1)] - numerators[(label, 1)]) == 0
        for label in floors
    )
    return (r, x, y, z), numerators, {
        "raw_residual": str(raw),
        "bad4": str(bad4),
        "incidence": str(incidence),
        "joint": str(joint),
        "floors": {label: str(value) for label, value in floors.items()},
        "geometry": {str(key): str(value) for key, value in geometry.items()},
        "exact_shift_independently_reconstructed": True,
        "b5_derivative": str(derivative),
        "b5_derivative_edge_omega_cap": str(at_edge_cap / 42),
    }


DEGREES = (11, 6, 4, 2)


def bernstein_controls(polynomial, variables):
    """Integer-scaled q/x/y/z Bernstein controls.

    For r=q/(1-q), multiplication by (1-q)^11 sends the coefficient of r^j
    to the q-Bernstein control divided by C(11,j).  The other three axes use
    the standard power-to-Bernstein transform.
    """
    poly = sp.Poly(polynomial, *variables)
    power = {powers: coefficient for powers, coefficient in poly.terms()}
    rationals = {}
    denominators = []
    for indices in itertools.product(*[range(degree + 1) for degree in DEGREES]):
        q_index, *cube_indices = indices
        value = sp.Rational(0)
        for cube_powers in itertools.product(
            *[range(index + 1) for index in cube_indices]
        ):
            coefficient = power.get((q_index, *cube_powers), 0)
            if coefficient:
                value += coefficient * sp.prod(
                    sp.binomial(index, power_value) / sp.binomial(degree, power_value)
                    for index, power_value, degree in zip(
                        cube_indices, cube_powers, DEGREES[1:]
                    )
                )
        value /= sp.binomial(DEGREES[0], q_index)
        rational = Fraction(int(sp.numer(value)), int(sp.denom(value)))
        rationals[indices] = rational
        denominators.append(rational.denominator)
    scale = 1
    for denominator in denominators:
        scale = math.lcm(scale, denominator)
    controls = np.empty(tuple(degree + 1 for degree in DEGREES), dtype=object)
    for indices, rational in rationals.items():
        controls[indices] = rational.numerator * (scale // rational.denominator)
    return controls, scale


def split_axis(controls, axis):
    """Exact midpoint de Casteljau split with a common positive integer scale."""
    degree = controls.shape[axis] - 1
    moved = np.moveaxis(controls, axis, 0)
    flattened = moved.reshape((degree + 1, -1))
    left = np.empty_like(flattened)
    right = np.empty_like(flattened)
    for index in range(degree + 1):
        left[index] = [
            (1 << (degree - index))
            * sum(math.comb(index, j) * flattened[j, column] for j in range(index + 1))
            for column in range(flattened.shape[1])
        ]
        right[index] = [
            (1 << index)
            * sum(
                math.comb(degree - index, j - index) * flattened[j, column]
                for j in range(index, degree + 1)
            )
            for column in range(flattened.shape[1])
        ]
    return (
        np.moveaxis(left.reshape(moved.shape), 0, axis),
        np.moveaxis(right.reshape(moved.shape), 0, axis),
    )


def minimum(controls):
    return min(int(value) for value in controls.flat)


def normalize_scale(controls):
    """Remove the irrelevant common positive integer scale after a split."""
    common = 0
    for value in controls.flat:
        common = math.gcd(common, abs(int(value)))
        if common == 1:
            return controls
    if common > 1:
        return controls // common
    return controls


def exact_cover(initial, require_any, node_limit, depth_limit=160):
    """Adaptive exact dyadic cover; returns a deterministic audit summary."""
    stack = [(initial, (0, 0, 0, 0), "")]
    nodes = leaves = 0
    maximum_total_depth = 0
    split_counts = [0, 0, 0, 0]
    leaf_digest = hashlib.sha256()
    leaf_certificates = []
    failure = None
    while stack:
        arrays, levels, address = stack.pop()
        nodes += 1
        minima = [minimum(array) for array in arrays]
        passing = [index for index, value in enumerate(minima) if value >= 0]
        accepted = bool(passing) if require_any else len(passing) == len(arrays)
        if accepted:
            leaves += 1
            leaf_digest.update(f"{address}:{passing};".encode())
            leaf_certificates.append({
                "address": address or "ROOT",
                "levels_q_x_y_z": list(levels),
                "passing_control_nets": passing,
                "scaled_control_minima": [str(value) for value in minima],
            })
            continue
        if nodes >= node_limit or sum(levels) >= depth_limit:
            failure = {
                "address": address,
                "levels": list(levels),
                "minimum_signs": [-1 if value < 0 else 0 for value in minima],
                "remaining_stack": len(stack),
            }
            break

        # Split the axis with the largest unresolved Bernstein resolution.
        # Ties are deterministic in q,x,y,z order.
        axis = max(
            range(4),
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
        maximum_total_depth = max(maximum_total_depth, sum(next_levels))
        # Push right first so the replay visits the left child first.
        stack.append((children[1], next_levels, address + f"{axis}R"))
        stack.append((children[0], next_levels, address + f"{axis}L"))
        if nodes % 10000 == 0:
            print(
                "COVER_PROGRESS",
                nodes,
                leaves,
                len(stack),
                maximum_total_depth,
                split_counts,
                flush=True,
            )
    return {
        "complete": failure is None,
        "nodes": nodes,
        "leaves": leaves,
        "maximum_total_depth": maximum_total_depth,
        "split_counts_q_x_y_z": split_counts,
        "leaf_stream_sha256": leaf_digest.hexdigest().upper(),
        "leaf_certificates": leaf_certificates,
        "failure": failure,
    }


def main():
    local_forest_audit = audit_five_vertex_forest_inequality()
    variables, numerators, algebra = build_polynomials()
    controls = {}
    scales = {}
    for key, polynomial in numerators.items():
        controls[key], scales[key] = bernstein_controls(polynomial, variables)
        print(
            "INITIAL",
            key,
            "minimum",
            minimum(controls[key]),
            "negative",
            sum(int(value) < 0 for value in controls[key].flat),
            flush=True,
        )

    labels = ("incidence", "shadow", "strong")
    p1_cover = exact_cover([controls[("incidence", 1)]], require_any=False, node_limit=300000)
    print("P1_COVER", json.dumps(p1_cover, sort_keys=True), flush=True)
    p0_cover = exact_cover(
        [controls[(label, 0)] for label in labels],
        require_any=True,
        node_limit=1000000,
    )
    print("P0_COVER", json.dumps(p0_cover, sort_keys=True), flush=True)
    assert p1_cover["complete"] and p1_cover["failure"] is None
    assert p0_cover["complete"] and p0_cover["failure"] is None

    report = {
        "marker": MARKER,
        "parameter_domain": {
            "m": "integer m>=6, compactified by r=m-6=q/(1-q)",
            "q_x_y_z_p5": "unit cube",
            "positive_denominator": "5040*m^4",
        },
        "algebra": algebra,
        "degrees_q_x_y_z": list(DEGREES),
        "candidate_order": ["incidence", "shadow", "strong"],
        "initial_control_scales": {str(key): value for key, value in scales.items()},
        "local_five_vertex_forest_audit": local_forest_audit,
        "inequality_audit": {
            "edge_range": "0<=e<=m-1 for a forest on m vertices",
            "omega_range": "2e^2/m-e <= omega <= C(e,2) <= e^2/2",
            "tau_lower": (
                "tau>=sum_v C(d_v,3)>=2*omega*(omega-e)/(3e); "
                "e=0 is the separate zero case"
            ),
            "tau_upper": "2*tau<=omega*(e-2)<=omega*e",
            "B5_incidence_floor": "B5>=I5/4 because a five-vertex forest has at most four edges",
            "B5_shadow_floor": "5*B5>=(m-4)*B4 by four-to-five-set incidence",
            "B5_strong_floor": (
                "B5>=(m-4)B4-2I5+(5/6)J5 by the exhaustively checked local inequality"
            ),
            "B5_upper": "B5<=I5 because every bad five-set contains an edge",
            "pointwise_max": (
                "The residual is increasing affine in B5. At p5=0 the true floor is "
                "the pointwise maximum of the three floor residuals; at p5=1 all agree. "
                "The true residual is the affine interpolation of these two nonnegative endpoints."
            ),
        },
        "p5_endpoint_1_common_cover": p1_cover,
        "p5_endpoint_0_pointwise_max_cover": p0_cover,
        "verdict": "complete exact all-order Bernstein certificate on the stated sum-zero face",
        "scope": (
            "Rank-seven g4 after the pinned valid D-containment and ranks 8/7/6 "
            "elimination, when the marks are nonadjacent and have no neighbours in W."
        ),
        "dependencies_sha256": {
            UPSTREAM_SOURCE.name: UPSTREAM_SOURCE_SHA,
            UPSTREAM.name: UPSTREAM_SHA,
            CONTAINMENT_SOURCE.name: CONTAINMENT_SOURCE_SHA,
            CONTAINMENT_REPORT.name: CONTAINMENT_REPORT_SHA,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(
        json.dumps(
            {
                "marker": MARKER,
                "p1_complete": p1_cover["complete"],
                "p0_complete": p0_cover["complete"],
                "source_sha256": report["source_sha256"],
                "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
            },
            indent=2,
            sort_keys=True,
        ),
        flush=True,
    )
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
