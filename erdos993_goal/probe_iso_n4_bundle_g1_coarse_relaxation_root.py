#!/usr/bin/env python3
"""Probe a coarse large-order relaxation of deepest-ordinary bundle g1.

This is a route diagnostic.  It replaces every negative configuration count
by an elementary edge-subset upper bound and every positive one by zero,
then numerically minimizes the remaining polynomial over relaxed forest
degree constraints.  It does not prove positivity or negativity for forests.
"""

from __future__ import annotations

import json
from math import comb

import numpy as np
import sympy as sp
from scipy.optimize import differential_evolution


def main() -> None:
    data = json.load(open("iso_n4_bundle_g1_configuration_root_20260829.json", encoding="utf-8"))
    expression = sp.sympify(data["deepest_singleton_ordinary_form"])
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    n = names["n"]
    e = names["edge_count"]
    du, dv = names["degree_u"], names["degree_v"]
    de = names["D_edges"]
    ddu, ddv = names["D_degree_u"], names["D_degree_v"]
    adjacent = names["adjacent"]
    parent_degree, hit_u, hit_v = sp.symbols(
        "parent_degree hit_u hit_v", nonnegative=True
    )

    relaxed = expression.subs(
        {
            names["C_common_neighbor"]: 1,
            names["C_connected3_E"]: 0,
            names["C_connected3_U"]: 0,
            names["C_connected3_V"]: 0,
            names["C_connected4_E"]: e * (e - 1) * (e - 2) * (e - 3) / 24,
            names["C_stars3_E"]: e * (e - 1) * (e - 2) / 6,
            names["C_neighbor_excess_u"]: 0,
            names["C_neighbor_excess_v"]: 0,
            names["C_wedges_E"]: e * (e - 1) / 2,
            names["D_connected3_E"]: 0,
            names["D_neighbor_excess_u"]: 0,
            names["D_neighbor_excess_v"]: 0,
            names["D_wedges_E"]: de * (de - 1) / 2,
            ddu: du - hit_u,
            ddv: dv - hit_v,
            de: e - parent_degree,
        }
    )
    relaxed = relaxed.subs(
        {ddu: du - hit_u, ddv: dv - hit_v, de: e - parent_degree}
    )
    relaxed = sp.factor(relaxed)
    variables = (e, du, dv, parent_degree)

    rows = []
    for order in (9, 16, 40):
        for av in (0, 1):
            for hu in (0, 1):
                for hv in (0, 1):
                    if av + hu + hv > 2:
                        continue
                    objective_expr = relaxed.subs(
                        {n: order, adjacent: av, hit_u: hu, hit_v: hv}
                    )
                    objective = sp.lambdify(variables, objective_expr, "numpy")

                    def penalized(x):
                        ev, uv, vv, pv = x
                        penalties = 0.0
                        constraints = (
                            uv + vv - order,
                            uv + vv + pv - (order + 1),
                            hu + hv - pv,
                            av + hu - uv,
                            av + hv - vv,
                            pv - ev,
                            uv - ev,
                            vv - ev,
                        )
                        for violation in constraints:
                            if violation > 0:
                                penalties += 1e9 * violation**2
                        return float(objective(ev, uv, vv, pv)) + penalties

                    result = differential_evolution(
                        penalized,
                        bounds=((0, order - 1),) * 4,
                        seed=993 + order * 16 + av * 4 + hu * 2 + hv,
                        polish=True,
                        maxiter=180,
                        popsize=8,
                        tol=1e-8,
                    )
                    rows.append(
                        {
                            "n": order,
                            "adjacent_hit_u_hit_v": [av, hu, hv],
                            "minimum_relaxation": result.fun,
                            "point_e_du_dv_parent_degree": result.x.tolist(),
                        }
                    )
    print(json.dumps({"marker": "PROBE_ISO_N4_BUNDLE_G1_COARSE_RELAXATION", "rows": rows}, indent=2))


if __name__ == "__main__":
    main()
