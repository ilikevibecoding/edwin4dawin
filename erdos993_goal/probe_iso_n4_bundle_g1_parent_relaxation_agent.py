#!/usr/bin/env python3
"""Test a parent-coupled large-order relaxation for deepest-ordinary g1.

The script substitutes D=G-p at the level of edges, marked degrees, and
wedges before applying motif caps.  A negative relaxed tuple is an exact
obstruction to this proposed proof route, not a counterexample to g1.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
ROOT_REPORT = HERE / "iso_n4_bundle_g1_configuration_root_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_parent_relaxation_probe_agent_20260829.json"


def build_relaxation():
    report = json.loads(ROOT_REPORT.read_text(encoding="utf-8"))
    expression = 24 * sp.sympify(report["deepest_singleton_ordinary_form"])
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    n = names["n"]
    edges = names["edge_count"]
    du, dv = names["degree_u"], names["degree_v"]
    adjacent = names["adjacent"]
    de = names["D_edges"]
    ddu, ddv = names["D_degree_u"], names["D_degree_v"]
    parent_degree = sp.Symbol("parent_degree", integer=True, nonnegative=True)
    parent_u = sp.Symbol("parent_adjacent_u", integer=True, nonnegative=True)
    parent_v = sp.Symbol("parent_adjacent_v", integer=True, nonnegative=True)

    # For n>=9 all discarded configuration coefficients below are
    # nonnegative.  The common-neighbour coefficient is negative, while the
    # star/connected-four coefficients are both -120.
    substitution = {
        names["C_connected3_E"]: 0,
        names["C_connected3_U"]: 0,
        names["C_connected3_V"]: 0,
        names["D_connected3_E"]: 0,
        names["C_neighbor_excess_u"]: 0,
        names["C_neighbor_excess_v"]: 0,
        names["D_neighbor_excess_u"]: 0,
        names["D_neighbor_excess_v"]: 0,
        names["C_common_neighbor"]: 1,
        names["C_stars3_E"]: sp.binomial(edges, 3),
        names["C_connected4_E"]: sp.binomial(edges, 4),
        # Combine the two negative wedge coefficients first.  Exact parent
        # deletion gives S(D)=S(G)-C(dp,2)-x_p with x_p>=0.
        names["C_wedges_E"]: sp.binomial(edges, 2),
        names["D_wedges_E"]: sp.binomial(edges, 2) - sp.binomial(parent_degree, 2),
        de: edges - parent_degree,
        ddu: du - parent_u,
        ddv: dv - parent_v,
    }
    relaxed = sp.factor(sp.expand_func(expression.subs(substitution)))
    return relaxed, (n, edges, du, dv, adjacent, parent_degree, parent_u, parent_v)


def grid_probe(relaxed, variables, maximum_order=36):
    n, edges, du, dv, adjacent, dp, pu, pv = variables
    evaluate = sp.lambdify(variables, relaxed, "math")
    minimum = None
    negatives = 0
    checks = 0
    first_negative = None
    by_order = {}
    for order in range(9, maximum_order + 1):
        local_minimum = None
        local_checks = 0
        for edge_count in range(order):
            for a in (0, 1):
                for degree_u in range(a, edge_count + 1):
                    for degree_v in range(a, edge_count + 1):
                        if degree_u + degree_v - a > edge_count:
                            continue
                        for b_u in (0, 1):
                            if b_u > degree_u:
                                continue
                            for b_v in (0, 1):
                                if b_v > degree_v or (a and b_u and b_v):
                                    continue
                                for parent_degree in range(b_u + b_v, edge_count + 1):
                                    # Count the union of edges incident to
                                    # p,u,v.  It cannot exceed all edges.
                                    if (
                                        parent_degree
                                        + degree_u
                                        + degree_v
                                        - a
                                        - b_u
                                        - b_v
                                        > edge_count
                                    ):
                                        continue
                                    value = int(
                                        evaluate(
                                            order,
                                            edge_count,
                                            degree_u,
                                            degree_v,
                                            a,
                                            parent_degree,
                                            b_u,
                                            b_v,
                                        )
                                    )
                                    row = {
                                        "value_24g1_floor": value,
                                        "n": order,
                                        "edge_count": edge_count,
                                        "degree_u": degree_u,
                                        "degree_v": degree_v,
                                        "adjacent": a,
                                        "parent_degree": parent_degree,
                                        "parent_adjacent_u": b_u,
                                        "parent_adjacent_v": b_v,
                                    }
                                    if minimum is None or value < minimum["value_24g1_floor"]:
                                        minimum = row
                                    if local_minimum is None or value < local_minimum:
                                        local_minimum = value
                                    if value < 0:
                                        negatives += 1
                                        if first_negative is None:
                                            first_negative = row
                                    checks += 1
                                    local_checks += 1
        by_order[str(order)] = {
            "checks": local_checks,
            "minimum_24g1_floor": local_minimum,
        }
    return {
        "orders": [9, maximum_order],
        "checks": checks,
        "negatives": negatives,
        "minimum": minimum,
        "first_negative": first_negative,
        "by_order": by_order,
        "domain": (
            "integer forest-necessary edge-incidence relaxation: e<=n-1; "
            "du+dv-a<=e; dp+du+dv-a-pu-pv<=e; Boolean adjacency data; "
            "triangle exclusion a*pu*pv=0"
        ),
    }


def main():
    relaxed, variables = build_relaxation()
    probe = grid_probe(relaxed, variables)
    marker = (
        "PASS_FINITE_PARENT_COUPLED_G1_RELAXATION_PROBE_AGENT"
        if probe["negatives"] == 0
        else "FREEZE_EXACT_PARENT_COUPLED_G1_RELAXATION_OBSTRUCTION_AGENT"
    )
    report = {
        "marker": marker,
        "relaxed_24g1": str(relaxed),
        "probe": probe,
        "scope": (
            "A finite integer test of a rigorously lower-bounding relaxation "
            "for n>=9. No finite pass is an all-order proof. A negative row "
            "refutes only this relaxation, not the genuine forest g1 claim."
        ),
        "dependency": {
            ROOT_REPORT.name: hashlib.sha256(ROOT_REPORT.read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(marker)
    print("CHECKS", probe["checks"], "NEGATIVES", probe["negatives"])
    print("MINIMUM", json.dumps(probe["minimum"], sort_keys=True))
    print("FIRST_NEGATIVE", json.dumps(probe["first_negative"], sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())


if __name__ == "__main__":
    main()
