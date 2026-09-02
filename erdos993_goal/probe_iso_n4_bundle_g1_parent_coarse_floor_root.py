#!/usr/bin/env python3
"""Probe a first large-order floor for the parent-rooted g1 residual.

The exact residual has positive coefficients on all three neighbour-excess
variables and negative coefficients on the three common-neighbour variables
for n>=3.  It also has a negative wedge coefficient for n>=5.  This script
makes those monotone replacements and tests the resulting deliberately loose
degree/edge relaxation.  It is a route diagnostic, not a proof.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import differential_evolution


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_g1_parent_residual_root_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_parent_coarse_floor_probe_root_20260829.json"


def main() -> None:
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL"
    expression = sp.sympify(dependency["rooted_residual"])
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    n, e = names["n"], names["edge_count"]
    du, dv, dp = names["degree_u"], names["degree_v"], names["degree_p"]
    a = names["adjacent"]
    apu, apv = names["adjacent_pu"], names["adjacent_pv"]

    monotone = sp.expand(
        expression.subs(
            {
                names["C_neighbor_excess_u"]: 0,
                names["C_neighbor_excess_v"]: 0,
                names["neighbor_excess_p"]: 0,
                names["C_common_neighbor"]: 1,
                names["common_neighbor_pu"]: 1,
                names["common_neighbor_pv"]: 1,
                names["C_wedges_E"]: e * (e - 1) / 2,
            }
        )
    )
    variables = (e, du, dv, dp)
    rows = []
    refined_rows = []
    for order in (8, 12, 20, 40, 80, 160):
        best = None
        for av in (0, 1):
            for puv in (0, 1):
                for pvv in (0, 1):
                    # Three vertices cannot span a triangle in a forest.
                    if av + puv + pvv == 3:
                        continue
                    objective_expression = monotone.subs(
                        {n: order, a: av, apu: puv, apv: pvv}
                    )
                    objective = sp.lambdify(variables, objective_expression, "numpy")

                    def penalized(vector):
                        edge_count, degree_u, degree_v, degree_p = vector
                        penalty = 0.0
                        # Necessary forest constraints only.  Their looseness is
                        # intentional: failure here merely requests a sharper cone.
                        violations = (
                            degree_u - edge_count,
                            degree_v - edge_count,
                            degree_p - edge_count,
                            av + puv - degree_u,
                            av + pvv - degree_v,
                            puv + pvv - degree_p,
                            degree_u + degree_v - order,
                            degree_u + degree_p - order,
                            degree_v + degree_p - order,
                        )
                        for violation in violations:
                            if violation > 0:
                                penalty += 1e12 * violation**2
                        return float(objective(*vector)) + penalty

                    result = differential_evolution(
                        penalized,
                        bounds=((0, order - 1),) * 4,
                        seed=993000 + order * 16 + av * 4 + puv * 2 + pvv,
                        maxiter=250,
                        popsize=10,
                        polish=True,
                        tol=1e-10,
                    )
                    record = {
                        "n": order,
                        "adjacent_uv_pu_pv": [av, puv, pvv],
                        "minimum_relaxation": result.fun,
                        "point_e_du_dv_dp": result.x.tolist(),
                    }
                    if best is None or record["minimum_relaxation"] < best["minimum_relaxation"]:
                        best = record
        rows.append(best)

        # Refine only the wedge replacement by using degree excess.  In a
        # nonempty forest, sum_{d(v)>0}(d(v)-1) <= e-1 and
        # S=sum C(d(v),2).  After fixing whether u,v,p have positive degree,
        # convexity gives
        #
        # S <= sum C(d_mark,2) + C(M+1,2),
        # M=e-1-sum_mark(d_mark-1).
        refined_best = None
        for av in (0, 1):
            for puv in (0, 1):
                for pvv in (0, 1):
                    if av + puv + pvv == 3:
                        continue
                    for zu in (0, 1):
                        for zv in (0, 1):
                            for zp in (0, 1):
                                if av and not (zu and zv):
                                    continue
                                if puv and not (zu and zp):
                                    continue
                                if pvv and not (zv and zp):
                                    continue
                                remainder = (
                                    e
                                    - 1
                                    - (du - zu)
                                    - (dv - zv)
                                    - (dp - zp)
                                )
                                wedge_upper = (
                                    du * (du - 1) / 2
                                    + dv * (dv - 1) / 2
                                    + dp * (dp - 1) / 2
                                    + remainder * (remainder + 1) / 2
                                )
                                refined_expression = expression.subs(
                                    {
                                        names["C_neighbor_excess_u"]: 0,
                                        names["C_neighbor_excess_v"]: 0,
                                        names["neighbor_excess_p"]: 0,
                                        names["C_common_neighbor"]: 1,
                                        names["common_neighbor_pu"]: 1,
                                        names["common_neighbor_pv"]: 1,
                                        names["C_wedges_E"]: wedge_upper,
                                    }
                                ).subs({n: order, a: av, apu: puv, apv: pvv})
                                objective = sp.lambdify(
                                    variables, refined_expression, "numpy"
                                )

                                def refined_penalized(vector):
                                    edge_count, degree_u, degree_v, degree_p = vector
                                    current_remainder = (
                                        edge_count
                                        - 1
                                        - (degree_u - zu)
                                        - (degree_v - zv)
                                        - (degree_p - zp)
                                    )
                                    penalty = 0.0
                                    violations = (
                                        degree_u - edge_count,
                                        degree_v - edge_count,
                                        degree_p - edge_count,
                                        av + puv - degree_u,
                                        av + pvv - degree_v,
                                        puv + pvv - degree_p,
                                        degree_u + degree_v - order,
                                        degree_u + degree_p - order,
                                        degree_v + degree_p - order,
                                        -current_remainder,
                                        (1 if zu else 0) - degree_u,
                                        degree_u - (order - 1 if zu else 0),
                                        (1 if zv else 0) - degree_v,
                                        degree_v - (order - 1 if zv else 0),
                                        (1 if zp else 0) - degree_p,
                                        degree_p - (order - 1 if zp else 0),
                                    )
                                    for violation in violations:
                                        if violation > 0:
                                            penalty += 1e12 * violation**2
                                    return float(objective(*vector)) + penalty

                                result = differential_evolution(
                                    refined_penalized,
                                    bounds=((1, order - 1), (0, order - 1), (0, order - 1), (0, order - 1)),
                                    seed=(
                                        1993000
                                        + order * 128
                                        + av * 64
                                        + puv * 32
                                        + pvv * 16
                                        + zu * 4
                                        + zv * 2
                                        + zp
                                    ),
                                    maxiter=180,
                                    popsize=8,
                                    polish=True,
                                    tol=1e-9,
                                )
                                record = {
                                    "n": order,
                                    "adjacent_uv_pu_pv": [av, puv, pvv],
                                    "positive_degree_u_v_p": [zu, zv, zp],
                                    "minimum_relaxation": result.fun,
                                    "point_e_du_dv_dp": result.x.tolist(),
                                }
                                if (
                                    refined_best is None
                                    or record["minimum_relaxation"]
                                    < refined_best["minimum_relaxation"]
                                ):
                                    refined_best = record
        refined_rows.append(refined_best)

    report = {
        "marker": "PROBE_ISO_N4_BUNDLE_G1_PARENT_COARSE_FLOOR",
        "monotone_replacements": (
            "drop positive neighbor-excess terms; maximize each common-neighbor "
            "count at one; maximize wedges at C(e,2)"
        ),
        "rows": rows,
        "degree_excess_refined_rows": refined_rows,
        "interpretation": (
            "Nonnegative rows would only motivate an exact box proof. Negative rows "
            "refute this coarse relaxation, not g1 or FML."
        ),
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
