#!/usr/bin/env python3
"""Blend interval for cell (0,0) with exact deletion edge accounting.

Keep the exact neighbor-set order parameterization from the structural probe.
If e_A,e_B,e_C,e_D are the edge counts of H, H-S_v, H-S_p, and
H-(S_p union S_v), then

    e_A + e_D = e_B + e_C + m.

For adjacent marks m=0.  For nonadjacent marks with disjoint neighbor sets,
m is the (zero-or-one) edge directly joining the sets.  With one common
neighbor, m is its degree into the remaining set and is at most n_D.  The
box parameterization below enforces this identity exactly while relaxing all
integrality.  Every actual marked forest maps into one of the three boxes.

As before, the two valid high-coefficient upper bounds are blended with an
unknown theta, endpoint Bernstein tensors are computed, and all exact affine
coefficient inequalities are intersected.  Diagnostic only until replayed at
a fixed rational theta in a standalone theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import (
    isolate_times_path,
    path_coefficient,
    tensor_binomial,
)
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from probe_iso_n5_g1_internal_ordinary_low01_theta_interval_root import (
    intersect_affine_controls,
    tensor_bernstein_at_degrees,
)
from prove_iso_n5_g1_internal_ordinary_diagonal2_large_order_root import (
    at,
    bonferroni_upper,
    choose_polynomial,
    multiplicity_upper,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_low00_edge_identity_theta_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW00_EDGE_IDENTITY_THETA_ROOT"
CELL = (0, 0)
CUTOFF = 10


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
    lam, mu, gamma, rho, tau, miss, v, t = sp.symbols(
        "lam mu gamma rho tau miss v t", nonnegative=True
    )

    cases = []
    for epsilon, intersection in ((0, 0), (1, 0), (1, 1)):
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

        if intersection == 0:
            nb_value = n - n * lam * mu
            nc_value = n - n * lam * (1 - mu)
            nd_value = n - n * lam
        else:
            nb_value = n - 1 - (n - 1) * lam * mu
            nc_value = n - 1 - (n - 1) * lam * (1 - mu)
            nd_value = n - 1 - (n - 1) * lam

        # E_sum=e_B+e_C is at most n_B+n_C.  The missed-edge resource m is
        # exactly zero, at most one, or at most n_D in the three cases.
        edge_sum = (nb_value + nc_value) * gamma
        if epsilon == 0:
            missed = sp.Integer(0)
            box = (lam, mu, gamma, rho, tau, v)
        elif intersection == 0:
            missed = miss
            box = (lam, mu, gamma, rho, tau, miss, v)
        else:
            missed = nd_value * miss
            box = (lam, mu, gamma, rho, tau, miss, v)
        combined = edge_sum + missed  # e_A+e_D
        ea_value = combined * tau
        ed_value = combined * (1 - tau)
        eb_value = edge_sum * rho
        ec_value = edge_sum * (1 - rho)
        normalization = {
            nb: nb_value,
            nc: nc_value,
            nd: nd_value,
            ea: ea_value,
            qa: ea_value**2 * v / 2,
            eb: eb_value,
            ec: ec_value,
            ed: ed_value,
        }
        normalized_zero = sp.expand(lower_zero.subs(normalization).subs(n, CUTOFF + t))
        normalized_one = sp.expand(lower_one.subs(normalization).subs(n, CUTOFF + t))
        endpoint_degrees = [
            tuple(sp.Poly(poly, *box).degree(variable) for variable in box)
            for poly in (normalized_zero, normalized_one)
        ]
        common_degrees = tuple(max(pair) for pair in zip(*endpoint_degrees))
        controls_zero = tensor_bernstein_at_degrees(
            normalized_zero, box, common_degrees
        )
        controls_one = tensor_bernstein_at_degrees(
            normalized_one, box, common_degrees
        )
        interval = intersect_affine_controls(controls_zero, controls_one, t)
        cases.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "neighbor_set_intersection": intersection,
            "missed_edge_bound": (
                "m=0" if epsilon == 0
                else ("0<=m<=1" if intersection == 0 else "0<=m<=n_D")
            ),
            "cell": list(CELL),
            "positive_high_monomials": positive_high,
            "negative_high_monomials": negative_high,
            "bernstein_degrees": list(common_degrees),
            "bernstein_controls": int(controls_zero.size),
            **interval,
        })

    joint_lower = max(
        sp.Rational(case["interval_in_unit_segment"][0]) for case in cases
    )
    joint_upper = min(
        sp.Rational(case["interval_in_unit_segment"][1]) for case in cases
    )
    report = {
        "marker": MARKER,
        "cutoff": CUTOFF,
        "cell": list(CELL),
        "edge_identity": "e_A+e_D=e_B+e_C+m",
        "cases": cases,
        "joint_interval_in_unit_segment": [str(joint_lower), str(joint_upper)],
        "joint_feasible": bool(
            all(case["feasible"] for case in cases) and joint_lower <= joint_upper
        ),
        "status": "safe exact edge-accounted affine-weight probe; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "joint_interval": report["joint_interval_in_unit_segment"],
        "joint_feasible": report["joint_feasible"],
        "cases": [
            {
                "geometry": case["geometry"],
                "intersection": case["neighbor_set_intersection"],
                "controls": case["bernstein_controls"],
                "degrees": case["bernstein_degrees"],
                "interval": case["interval_in_unit_segment"],
                "feasible": case["feasible"],
                "impossible": case["theta_independent_negative_coefficients"],
            }
            for case in cases
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
