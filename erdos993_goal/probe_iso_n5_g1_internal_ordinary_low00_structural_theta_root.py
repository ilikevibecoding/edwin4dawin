#!/usr/bin/env python3
"""Exact blend interval for cell (0,0) with marked-deletion sizes enforced.

Let H=F-{p,v}, A=I(H), B=I(H-S_v), C=I(H-S_p), and
D=I(H-(S_p union S_v)), where S_p,S_v are the neighbors of the two marks
inside H.  In a forest their intersection has size zero when p,v are adjacent
and size j in {0,1} otherwise.  This gives the exact order parameterization

  j=0: nb=n-n*lambda*mu, nc=n-n*lambda*(1-mu), nd=n-n*lambda;
  j=1: nb=n-1-(n-1)*lambda*mu,
       nc=n-1-(n-1)*lambda*(1-mu), nd=n-1-(n-1)*lambda.

The remaining forest statistics are safely relaxed to boxes.  As in the prior
low-cell probe, every exact Bernstein inequality is affine in the convex blend
weight theta, so their rational feasible intervals can be intersected exactly.
This is diagnostic until a fixed-weight standalone theorem is replayed.
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
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_low00_structural_theta_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW00_STRUCTURAL_THETA_ROOT"
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
    lam, mu, u, v, s, w, r, t = sp.symbols(
        "lam mu u v s w r t", nonnegative=True
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
        normalization = {
            nb: nb_value,
            nc: nc_value,
            nd: nd_value,
            ea: n * u,
            qa: n**2 * u**2 * v / 2,
            eb: nb_value * s,
            ec: nc_value * w,
            ed: nd_value * r,
        }
        normalized_zero = sp.expand(lower_zero.subs(normalization).subs(n, CUTOFF + t))
        normalized_one = sp.expand(lower_one.subs(normalization).subs(n, CUTOFF + t))
        box = (lam, mu, u, v, s, w) if epsilon == 0 else (lam, mu, u, v, s, w, r)
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
        "structural_parameterization": {
            "intersection_zero": (
                "nb=n-n*lam*mu, nc=n-n*lam*(1-mu), nd=n-n*lam"
            ),
            "intersection_one": (
                "nb=n-1-(n-1)*lam*mu, nc=n-1-(n-1)*lam*(1-mu), "
                "nd=n-1-(n-1)*lam"
            ),
        },
        "cases": cases,
        "joint_interval_in_unit_segment": [str(joint_lower), str(joint_upper)],
        "joint_feasible": bool(
            all(case["feasible"] for case in cases) and joint_lower <= joint_upper
        ),
        "status": "safe exact structural affine-weight probe; no theorem asserted",
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
