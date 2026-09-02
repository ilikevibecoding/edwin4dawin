#!/usr/bin/env python3
"""Solve the exact blend-weight interval for the internal-ordinary (0,1) cell.

Positive high-rank forest coefficients use the edge-union lower bound.  Negative
high-rank coefficients use a convex blend of the two valid upper bounds used by
the diagonal-2 proof.  Since every high coefficient occurs linearly, the lower
bound and every tensor-Bernstein control are affine in the blend weight.  We
evaluate the two endpoints and intersect all exact affine inequalities.

This is a diagnostic probe only; a successful interval is not promoted until a
fixed rational weight is replayed by a standalone theorem script.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from explore_rank4_three_halves_grouped import tensor_bernstein_fast
from prove_iso_n5_g1_internal_ordinary_diagonal2_large_order_root import (
    at,
    bonferroni_upper,
    choose_polynomial,
    multiplicity_upper,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_low01_theta_interval_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW01_THETA_INTERVAL_ROOT"
CELL = (0, 1)
CUTOFF = 10


def tensor_bernstein_at_degrees(poly, variables, degrees):
    """Return tensor Bernstein controls elevated to prescribed degrees."""
    expanded = sp.Poly(sp.expand(poly), *variables)
    assert all(
        expanded.degree(variable) <= degree
        for variable, degree in zip(variables, degrees)
    )
    shape = tuple(degree + 1 for degree in degrees)
    coefficients = np.empty(shape, dtype=object)
    coefficients.fill(sp.S.Zero)
    for monomial, coefficient in expanded.terms():
        coefficients[monomial] = coefficient
    for axis, degree in enumerate(degrees):
        moved = np.moveaxis(coefficients, axis, 0)
        transformed = np.empty_like(moved)
        for index in range(degree + 1):
            value = np.empty(moved.shape[1:], dtype=object)
            value.fill(sp.S.Zero)
            for exponent in range(index + 1):
                value += moved[exponent] * sp.Rational(
                    sp.binomial(index, exponent),
                    sp.binomial(degree, exponent),
                )
            transformed[index] = value
        coefficients = np.moveaxis(transformed, 0, axis)
    return coefficients


def intersect_affine_controls(controls_zero, controls_one, t):
    """Intersect c(0)+theta*(c(1)-c(0))>=0 coefficientwise."""
    assert controls_zero.shape == controls_one.shape
    lower = sp.Rational(0)
    upper = sp.Rational(1)
    impossible = []
    active_lower = []
    active_upper = []
    coefficient_count = 0
    for position, (value_zero, value_one) in enumerate(
        zip(controls_zero.flat, controls_one.flat)
    ):
        poly_zero = sp.Poly(value_zero, t)
        poly_one = sp.Poly(value_one, t)
        degree = max(poly_zero.degree(), poly_one.degree())
        for power in range(degree, -1, -1):
            coefficient_count += 1
            intercept = poly_zero.coeff_monomial(t**power)
            endpoint_one = poly_one.coeff_monomial(t**power)
            slope = endpoint_one - intercept
            if slope > 0:
                candidate = -intercept / slope
                if candidate > lower:
                    lower = candidate
                    active_lower = [[position, power, str(intercept), str(slope)]]
                elif candidate == lower:
                    active_lower.append([position, power, str(intercept), str(slope)])
            elif slope < 0:
                candidate = -intercept / slope
                if candidate < upper:
                    upper = candidate
                    active_upper = [[position, power, str(intercept), str(slope)]]
                elif candidate == upper:
                    active_upper.append([position, power, str(intercept), str(slope)])
            elif intercept < 0:
                impossible.append([position, power, str(intercept)])
    feasible = not impossible and lower <= upper and upper >= 0 and lower <= 1
    clipped_lower = max(sp.Rational(0), lower)
    clipped_upper = min(sp.Rational(1), upper)
    return {
        "raw_interval": [str(lower), str(upper)],
        "interval_in_unit_segment": [str(clipped_lower), str(clipped_upper)],
        "feasible": bool(feasible and clipped_lower <= clipped_upper),
        "coefficient_inequalities": coefficient_count,
        "theta_independent_negative_coefficients": len(impossible),
        "first_impossible": impossible[:12],
        "active_lower_constraints": active_lower[:12],
        "active_upper_constraints": active_upper[:12],
    }


def main() -> None:
    expression, rows = ordinary_expression()
    h, k = sp.symbols("h k", integer=True, nonnegative=True)
    ell = 8 + h
    child_rules = {}
    for rank in range(1, 7):
        u_value = isolate_times_path(k, ell - 1, rank)
        x_value = sp.expand(u_value + path_coefficient(ell - 2, rank - 1))
        z_value = isolate_times_path(k, ell - 2, rank)
        y_value = sp.expand(z_value + path_coefficient(ell - 3, rank - 1))
        child_rules.update({
            rows["X"][rank]: x_value,
            rows["U"][rank]: u_value,
            rows["Y"][rank]: y_value,
            rows["Z"][rank]: z_value,
        })
    degrees, newton_cells = tensor_binomial(
        sp.expand(expression.subs(child_rules)), (h, k)
    )
    assert degrees == (6, 6)

    a = (sp.Integer(1), *sp.symbols("a1:7"))
    b = (sp.Integer(1), *sp.symbols("b1:6"))
    c = (sp.Integer(1), *sp.symbols("c1:6"))
    d = (sp.Integer(1), *sp.symbols("d1:5"))
    n, nb, nc, nd = sp.symbols("n nb nc nd", nonnegative=True)
    ea, qa, eb, ec, ed = sp.symbols("ea qa eb ec ed", nonnegative=True)
    low_rules = {
        a[1]: n,
        a[2]: n * (n - 1) / 2 - ea,
        a[3]: n * (n - 1) * (n - 2) / 6 - (n - 2) * ea + qa,
        b[1]: nb,
        b[2]: nb * (nb - 1) / 2 - eb,
        c[1]: nc,
        c[2]: nc * (nc - 1) / 2 - ec,
        d[1]: nd,
        d[2]: nd * (nd - 1) / 2 - ed,
    }
    edge_by_row = {a: ea, b: eb, c: ec, d: ed}
    remaining = {}
    for row, order, start in ((a, n, 4), (b, nb, 3), (c, nc, 3), (d, nd, 3)):
        for rank in range(start, len(row)):
            remaining[row[rank]] = (order, edge_by_row[row], rank)
    remaining_variables = tuple(remaining)
    base_variables = (n, nb, nc, nd, ea, qa, eb, ec, ed)
    variables = (*base_variables, *remaining_variables)
    x, y, z, u, v, s, w, r, t = sp.symbols(
        "x y z u v s w r t", nonnegative=True
    )

    faces = []
    for epsilon in (0, 1):
        partition_rules = {}
        for rank in range(1, 7):
            partition_rules.update({
                rows["W"][rank]: at(a, rank),
                rows["P"][rank]: at(a, rank) + at(b, rank - 1),
                rows["V"][rank]: at(a, rank) + at(c, rank - 1),
                rows["E"][rank]: (
                    at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
                    + epsilon * at(d, rank - 2)
                ),
            })
        exact = sp.Poly(
            sp.expand(newton_cells[CELL].subs(partition_rules).subs(low_rules)),
            *variables,
        )
        lower_zero = sp.Integer(0)
        lower_one = sp.Integer(0)
        positive_high = negative_high = 0
        for powers, coefficient in exact.terms():
            high_powers = powers[len(base_variables):]
            assert sum(high_powers) <= 1
            common = coefficient
            for variable, power in zip(base_variables, powers[:len(base_variables)]):
                common *= variable**power
            if not any(high_powers):
                lower_zero += common
                lower_one += common
                continue
            variable = remaining_variables[high_powers.index(1)]
            order, edges, rank = remaining[variable]
            if coefficient > 0:
                positive_high += 1
                bound = sp.expand(
                    choose_polynomial(order, rank)
                    - edges * choose_polynomial(order - 2, rank - 2)
                )
                lower_zero += common * bound
                lower_one += common * bound
            else:
                negative_high += 1
                wedges = qa if order == n else edges * (edges - 1) / 2
                lower_zero += common * bonferroni_upper(order, edges, wedges, rank)
                lower_one += common * multiplicity_upper(order, edges, rank)

        normalization = {
            nb: n * x,
            nc: n * y,
            nd: n * z,
            ea: n * u,
            qa: n**2 * u**2 * v / 2,
            eb: n * x * s,
            ec: n * y * w,
            ed: n * z * r,
        }
        normalized_zero = sp.expand(lower_zero.subs(normalization).subs(n, CUTOFF + t))
        normalized_one = sp.expand(lower_one.subs(normalization).subs(n, CUTOFF + t))
        box = (
            (x, y, u, v, s, w)
            if epsilon == 0
            else (x, y, z, u, v, s, w, r)
        )
        endpoint_degrees = [
            tuple(sp.Poly(poly, *box).degree(variable) for variable in box)
            for poly in (normalized_zero, normalized_one)
        ]
        common_degrees = tuple(
            max(pair) for pair in zip(*endpoint_degrees)
        )
        controls_zero = tensor_bernstein_at_degrees(
            normalized_zero, box, common_degrees
        )
        controls_one = tensor_bernstein_at_degrees(
            normalized_one, box, common_degrees
        )
        interval = intersect_affine_controls(controls_zero, controls_one, t)
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "cell": list(CELL),
            "positive_high_monomials": positive_high,
            "negative_high_monomials": negative_high,
            "bernstein_degrees": list(common_degrees),
            "bernstein_controls": int(controls_zero.size),
            **interval,
        })

    report = {
        "marker": MARKER,
        "cutoff": CUTOFF,
        "cell": list(CELL),
        "faces": faces,
        "joint_interval_in_unit_segment": [
            str(max(sp.Rational(face["interval_in_unit_segment"][0]) for face in faces)),
            str(min(sp.Rational(face["interval_in_unit_segment"][1]) for face in faces)),
        ],
        "joint_feasible": bool(
            all(face["feasible"] for face in faces)
            and max(sp.Rational(face["interval_in_unit_segment"][0]) for face in faces)
            <= min(sp.Rational(face["interval_in_unit_segment"][1]) for face in faces)
        ),
        "status": "safe exact affine-weight interval probe; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "joint_interval": report["joint_interval_in_unit_segment"],
        "joint_feasible": report["joint_feasible"],
        "faces": [
            {
                "geometry": face["geometry"],
                "controls": face["bernstein_controls"],
                "interval": face["interval_in_unit_segment"],
                "feasible": face["feasible"],
                "impossible": face["theta_independent_negative_coefficients"],
            }
            for face in faces
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
