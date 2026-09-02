#!/usr/bin/env python3
"""Exact all-parent proof for internal-ordinary low cells (0,1) and (1,0).

For every parent forest of order n>=10, both marked-vertex geometries are
covered.  Rank 2 and the A-row rank 3 coefficient are replaced by their exact
edge/wedge formulas.  Each remaining high-rank coefficient occurs linearly.

* With positive scalar coefficient we use the edge-union lower bound
      i_r >= C(n,r) - e C(n-2,r-2).
* With negative scalar coefficient we use a convex blend of two valid upper
  bounds: the edge-multiplicity bound and two-term Bonferroni bound.

The fixed exact weights are 3/4 for cell (0,1), selected inside its certified
interval [24/35,46/55], and 1/2 for cell (1,0).  After the safe substitutions,
all coefficients in t=n-10 of every tensor-Bernstein control on the loose
normalized forest-statistics box are nonnegative.
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
from explore_rank4_three_halves_grouped import tensor_bernstein_fast
from prove_iso_n5_g1_internal_ordinary_diagonal2_large_order_root import (
    at,
    bonferroni_upper,
    choose_polynomial,
    multiplicity_upper,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_low_off_origin_large_order_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW_OFF_ORIGIN_LARGE_ORDER_ROOT"
CUTOFF = 10
CELL_WEIGHTS = {
    (0, 1): sp.Rational(3, 4),
    (1, 0): sp.Rational(1, 2),
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
    total_controls = 0
    total_power_coefficients = 0
    global_positive_minimum = None
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
        cell_rows = []
        for index, theta in CELL_WEIGHTS.items():
            exact = sp.Poly(
                sp.expand(newton_cells[index].subs(partition_rules).subs(low_rules)),
                *variables,
            )
            lower = sp.Integer(0)
            positive_high = negative_high = 0
            for powers, coefficient in exact.terms():
                high_powers = powers[len(base_variables):]
                assert sum(high_powers) <= 1
                term = coefficient
                for variable, power in zip(base_variables, powers[:len(base_variables)]):
                    term *= variable**power
                if any(high_powers):
                    variable = remaining_variables[high_powers.index(1)]
                    order, edges, rank = remaining[variable]
                    if coefficient > 0:
                        positive_high += 1
                        bound = sp.expand(
                            choose_polynomial(order, rank)
                            - edges * choose_polynomial(order - 2, rank - 2)
                        )
                    else:
                        negative_high += 1
                        wedges = qa if order == n else edges * (edges - 1) / 2
                        bound = sp.expand(
                            theta * multiplicity_upper(order, edges, rank)
                            + (1 - theta)
                            * bonferroni_upper(order, edges, wedges, rank)
                        )
                    term *= bound
                lower += term

            normalized = sp.expand(lower.subs({
                nb: n * x,
                nc: n * y,
                nd: n * z,
                ea: n * u,
                qa: n**2 * u**2 * v / 2,
                eb: n * x * s,
                ec: n * y * w,
                ed: n * z * r,
            }).subs(n, CUTOFF + t))
            box = (
                (x, y, u, v, s, w)
                if epsilon == 0
                else (x, y, z, u, v, s, w, r)
            )
            bernstein_degrees, controls = tensor_bernstein_fast(normalized, box)
            power_coefficients = [
                coefficient
                for value in controls.flat
                for coefficient in sp.Poly(value, t).all_coeffs()
            ]
            negatives = [value for value in power_coefficients if value < 0]
            assert not negatives
            positives = [value for value in power_coefficients if value > 0]
            positive_minimum = min(positives) if positives else None
            if positive_minimum is not None:
                global_positive_minimum = (
                    positive_minimum
                    if global_positive_minimum is None
                    else min(global_positive_minimum, positive_minimum)
                )
            total_controls += int(controls.size)
            total_power_coefficients += len(power_coefficients)
            cell_rows.append({
                "cell": list(index),
                "theta": str(theta),
                "positive_high_monomials": positive_high,
                "negative_high_monomials": negative_high,
                "bernstein_degrees": list(bernstein_degrees),
                "bernstein_controls": int(controls.size),
                "power_coefficients": len(power_coefficients),
                "negative_power_coefficients": 0,
                "minimum_power_coefficient": str(min(power_coefficients)),
                "minimum_positive_power_coefficient": str(positive_minimum),
                "all_nonnegative": True,
            })
        faces.append({
            "epsilon": epsilon,
            "geometry": "adjacent" if epsilon == 0 else "nonadjacent",
            "cells": cell_rows,
        })

    report = {
        "marker": MARKER,
        "theorem": (
            "For every parent forest of order n>=10 and both marked-vertex "
            "geometries, the internal-spine/broom-ordinary g1 Newton cells "
            "(h,k)=(0,1),(1,0) are nonnegative for ell=8+h."
        ),
        "cutoff": CUTOFF,
        "cell_weights": {
            f"{index[0]},{index[1]}": str(theta)
            for index, theta in CELL_WEIGHTS.items()
        },
        "positive_bound": "edge-union lower bound",
        "negative_bound": "convex blend of multiplicity and Bonferroni uppers",
        "faces": faces,
        "total_bernstein_controls": total_controls,
        "total_power_coefficients": total_power_coefficients,
        "negative_power_coefficients": 0,
        "global_minimum_positive_power_coefficient": str(global_positive_minimum),
        "status": "exact all-parent large-order theorem",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "total_controls": total_controls,
        "total_power_coefficients": total_power_coefficients,
        "negative_power_coefficients": 0,
        "global_minimum_positive_power_coefficient": str(global_positive_minimum),
        "faces": [
            {
                "geometry": face["geometry"],
                "cells": [
                    {
                        "cell": cell["cell"],
                        "theta": cell["theta"],
                        "controls": cell["bernstein_controls"],
                        "minimum": cell["minimum_power_coefficient"],
                    }
                    for cell in face["cells"]
                ],
            }
            for face in faces
        ],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
