#!/usr/bin/env python3
"""Exact theta interval for (0,0) using the marked-forest edge categories.

After deleting the marks, write their internal neighbor sets as X and Y and
the remaining vertices as Z.  Forest acyclicity leaves only these edge classes:
inside Z, X--Z, Y--Z, and (only in the nonadjacent cases) one missed
mark-connecting class.  This script parameterizes those classes directly.

Four exhaustive cases are used: adjacent; nonadjacent with disjoint neighbor
sets and no X--Y edge; the same with its unique X--Y edge; and nonadjacent with
one common neighbor.  In the last case the missed edges are the common
neighbor's edges into Z, and together with the edges inside Z they form a
forest on |Z|+1 vertices, hence total at most |Z|.

The resulting boxes retain the exact edge identities and the relevant forest
capacities.  High independent-set coefficients use the same valid union lower
bound and affine blend of multiplicity/Bonferroni uppers as the prior probes.
This is diagnostic until a fixed rational theta is replayed standalone.
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
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_low00_edge_categories_theta_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW00_EDGE_CATEGORIES_THETA_ROOT"
CELL = (0, 0)
CUTOFF = 10
CASES = (
    ("adjacent", 0, 0, 0),
    ("nonadjacent_disjoint_no_cross", 1, 0, 0),
    ("nonadjacent_disjoint_one_cross", 1, 0, 1),
    ("nonadjacent_one_common", 1, 1, -1),
)


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
    lam, mu, q0, q1, u, rho, v, t = sp.symbols(
        "lam mu q0 q1 u rho v t", nonnegative=True
    )

    case_reports = []
    for label, epsilon, intersection, cross in CASES:
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

        if intersection == 0 and cross == 1:
            # A direct X--Y edge requires both sets nonempty.  Remove one
            # vertex from each first, then distribute the other n-2 vertices.
            nb_value = n - 1 - (n - 2) * lam * mu
            nc_value = n - 1 - (n - 2) * lam * (1 - mu)
            nd_value = n - 2 - (n - 2) * lam
        elif intersection == 0:
            nb_value = n - n * lam * mu
            nc_value = n - n * lam * (1 - mu)
            nd_value = n - n * lam
        else:
            nb_value = n - 1 - (n - 1) * lam * mu
            nc_value = n - 1 - (n - 1) * lam * (1 - mu)
            nd_value = n - 1 - (n - 1) * lam

        if intersection == 1:
            # e_Z + e_missed is the edge count on Z plus its common neighbor.
            base_edges = nd_value * q0
            ed_value = base_edges * q1
            missed_value = base_edges * (1 - q1)
            box = (lam, mu, q0, q1, u, rho, v)
        else:
            ed_value = nd_value * q0
            missed_value = sp.Integer(cross)
            base_edges = ed_value + missed_value
            box = (lam, mu, q0, u, rho, v)
        # All remaining H-edges are X--Z or Y--Z.  The total edge count of H
        # is at most n; the box relaxation uses this safe endpoint.
        ea_value = base_edges + (n - base_edges) * u
        remaining_edges = ea_value - base_edges
        exz_value = remaining_edges * rho
        eyz_value = remaining_edges * (1 - rho)
        eb_value = ed_value + eyz_value
        ec_value = ed_value + exz_value
        assert sp.expand(ea_value + ed_value - eb_value - ec_value - missed_value) == 0
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
        case_reports.append({
            "case": label,
            "epsilon": epsilon,
            "neighbor_set_intersection": intersection,
            "cross_edge": cross,
            "cell": list(CELL),
            "positive_high_monomials": positive_high,
            "negative_high_monomials": negative_high,
            "bernstein_degrees": list(common_degrees),
            "bernstein_controls": int(controls_zero.size),
            **interval,
        })

    joint_lower = max(
        sp.Rational(case["interval_in_unit_segment"][0]) for case in case_reports
    )
    joint_upper = min(
        sp.Rational(case["interval_in_unit_segment"][1]) for case in case_reports
    )
    report = {
        "marker": MARKER,
        "cutoff": CUTOFF,
        "cell": list(CELL),
        "edge_identity": "e_A+e_D=e_B+e_C+e_missed",
        "cases": case_reports,
        "joint_interval_in_unit_segment": [str(joint_lower), str(joint_upper)],
        "joint_feasible": bool(
            all(case["feasible"] for case in case_reports)
            and joint_lower <= joint_upper
        ),
        "status": "safe exact edge-category affine-weight probe; no theorem asserted",
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
                "case": case["case"],
                "controls": case["bernstein_controls"],
                "degrees": case["bernstein_degrees"],
                "interval": case["interval_in_unit_segment"],
                "feasible": case["feasible"],
                "impossible": case["theta_independent_negative_coefficients"],
            }
            for case in case_reports
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
