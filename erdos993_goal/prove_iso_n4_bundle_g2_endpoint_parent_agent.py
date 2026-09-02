#!/usr/bin/env python3
"""All-order exact proof of endpoint-parent g2 for a deepest bundle.

By u/v symmetry take p=u, so D=(C_U,C_U,C_W,C_W).  After exact forest
invariant reduction, every connected-three-edge and neighbor-excess term is
positive.  The common-neighbor and wedge terms are minimized at their exact
forest upper bounds.  A two-vertex degree-excess cone then reduces the full
problem to five Boolean branches on a three-simplex, certified exactly in the
tensor Bernstein basis for every n>=3.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp
import networkx as nx


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_g12_endpoint_parent_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g2_endpoint_parent_exact_agent_20260829.json"


def tensor_bernstein(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    power = dict(polynomial.terms())
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for monomial, coefficient in power.items():
            if all(j <= k for j, k in zip(monomial, index)):
                multiplier = 1
                for j, k, degree in zip(monomial, index, degrees):
                    multiplier *= sp.binomial(k, j) / sp.binomial(degree, j)
                value += coefficient * multiplier
        yield degrees, index, sp.factor(value)


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_CONFIGURATION_AGENT"
    expression = sp.sympify(dependency["forest_invariant_forms"]["g2"])
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    n, e = names["n"], names["edge_count"]
    du, dv = names["degree_u"], names["degree_v"]
    adjacent = names["adjacent"]
    common = names["C_common_neighbor"]
    wedges = names["C_wedges_E"]
    xu, xv = names["C_neighbor_excess_u"], names["C_neighbor_excess_v"]
    re, ru, rv = (
        names["C_connected3_E"],
        names["C_connected3_U"],
        names["C_connected3_V"],
    )

    derivatives = {
        "common": sp.factor(sp.diff(expression, common)),
        "connected3_E": sp.factor(sp.diff(expression, re)),
        "connected3_U": sp.factor(sp.diff(expression, ru)),
        "connected3_V": sp.factor(sp.diff(expression, rv)),
        "neighbor_u": sp.factor(sp.diff(expression, xu)),
        "neighbor_v": sp.factor(sp.diff(expression, xv)),
        "wedges": sp.factor(sp.diff(expression, wedges)),
    }
    expected = {
        "common": -5 * n - 7,
        "connected3_E": 2,
        "connected3_U": 5,
        "connected3_V": 5,
        "neighbor_u": 12 * n - 17,
        "neighbor_v": 12 * n - 14,
        "wedges": -15 * n + 33,
    }
    assert all(sp.expand(derivatives[key] - value) == 0 for key, value in expected.items())
    # All positive/negative directions above have their asserted sign at n=3
    # and become only stronger with n.
    assert expected["neighbor_u"].subs(n, 3) > 0
    assert expected["neighbor_v"].subs(n, 3) > 0
    assert expected["common"].subs(n, 3) < 0
    assert expected["wedges"].subs(n, 3) < 0

    # Edgeless forests lie outside the e-1 cone and are positive directly.
    edgeless = sp.factor(
        expression.subs({symbol: 0 for symbol in expression.free_symbols if symbol != n})
    )
    assert edgeless == 10 * n**3 - 13 * n**2 - 4 * n + 6
    assert edgeless.subs(n, 2) == 26
    assert sp.diff(edgeless, n).subs(n, 2) == 64
    assert sp.diff(edgeless, n, 2).subs(n, 2) > 0

    # For e>=1 put x=d_u-1[d_u>0], y=d_v-1[d_v>0].  If c is the
    # number of nontrivial components, total positive-degree excess is e-c.
    # Hence r=e-1-x-y is the unselected excess plus c-1, and convex
    # concentration gives W<=C(d_u,2)+C(d_v,2)+C(r+1,2).
    q = sp.symbols("q", nonnegative=True)
    box = sp.symbols("a b c", nonnegative=True)
    a, b, c = box
    total = 1 + q  # n-2 with n=3+q
    x = total * a
    y = total * (1 - a) * b
    r = total * (1 - a) * (1 - b) * c
    branch_count = 0
    coefficient_count = 0
    degree_profiles = set()
    minimum_q0 = None
    minimum_record = None
    stream = []
    for auv, zu, zv in itertools.product((0, 1), repeat=3):
        if auv and not (zu and zv):
            continue
        d_u, d_v = zu + x, zv + y
        edges = 1 + x + y + r
        wedge_upper = d_u * (d_u - 1) / 2 + d_v * (d_v - 1) / 2 + r * (r + 1) / 2
        lower = sp.cancel(
            expression.subs(
                {
                    n: total + 2,
                    e: edges,
                    du: d_u,
                    dv: d_v,
                    adjacent: auv,
                    common: 1,
                    re: 0,
                    ru: 0,
                    rv: 0,
                    xu: 0,
                    xv: 0,
                    wedges: wedge_upper,
                }
            )
        )
        branch_count += 1
        for degrees, index, coefficient in tensor_bernstein(lower, box):
            degree_profiles.add(degrees)
            qcoefficients = sp.Poly(sp.expand(coefficient), q).all_coeffs()
            assert all(value >= 0 for value in qcoefficients)
            q0 = sp.factor(coefficient.subs(q, 0))
            record = {
                "branch_adj_zu_zv": [auv, zu, zv],
                "index": list(index),
                "coefficient": str(coefficient),
            }
            stream.append(record)
            if minimum_q0 is None or q0 < minimum_q0:
                minimum_q0 = q0
                minimum_record = {**record, "q0": str(q0)}
            coefficient_count += 1
    assert branch_count == 5
    assert coefficient_count == 135
    assert degree_profiles == {(2, 2, 2)}
    assert minimum_q0 == 13
    stream_sha = hashlib.sha256(
        json.dumps(stream, separators=(",", ":"), sort_keys=True).encode()
    ).hexdigest().upper()

    # The wedge derivative reverses sign at n=2, so audit that complete
    # boundary separately rather than extending the monotone cone through it.
    order2_values = []
    for graph0 in nx.graph_atlas_g():
        if len(graph0) != 2 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        degree = dict(graph.degree())
        for u, v in itertools.permutations(graph.nodes(), 2):
            data = {
                n: 2,
                e: graph.number_of_edges(),
                du: degree[u],
                dv: degree[v],
                adjacent: int(graph.has_edge(u, v)),
                common: 0,
                re: 0,
                ru: 0,
                rv: 0,
                xu: sum(degree[x] - 1 for x in graph.neighbors(u)),
                xv: sum(degree[x] - 1 for x in graph.neighbors(v)),
                wedges: sum(value * (value - 1) // 2 for value in degree.values()),
            }
            value = sp.factor(expression.subs(data))
            assert value.is_Integer
            order2_values.append({
                "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                "parent_mark_u": u,
                "other_mark_v": v,
                "g2": int(value),
            })
    assert len(order2_values) == 4
    assert min(row["g2"] for row in order2_values) == 20
    assert all(row["g2"] >= 0 for row in order2_values)

    replay = dependency["finite_replay"]
    assert replay["cells"] == 2448
    assert replay["negative"]["g2"] == 0
    assert replay["minima"]["g2"]["value"] == 20
    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G2_ENDPOINT_PARENT_AGENT",
        "theorem": (
            "For every forest G with distinct marks u,v, if the unique parent "
            "of the canonical deepest singleton support is u or v, then g2>=0."
        ),
        "symmetry": "The certificate takes p=u; swap u and v for p=v.",
        "row_identity": dependency["endpoint_row_identity"],
        "monotone_replacements": {
            "derivatives": {key: str(value) for key, value in derivatives.items()},
            "forest_bounds": (
                "common(u,v)<=1; connected-three counts and neighbor excesses "
                "are nonnegative; wedges obey the two-vertex excess cone"
            ),
        },
        "degree_excess_cone": {
            "parameters": "x=d_u-1[d_u>0], y=d_v-1[d_v>0], r=e-1-x-y",
            "wedge_upper": "C(d_u,2)+C(d_v,2)+C(r+1,2)",
            "proof": (
                "Total positive-degree excess is e-c. Thus r is unselected "
                "excess plus c-1; convex concentration proves the upper bound."
            ),
            "edgeless_value": str(edgeless),
        },
        "all_order_certificate": {
            "orders": "n>=3",
            "branches": branch_count,
            "bernstein_coefficients": coefficient_count,
            "degree_profiles": [list(profile) for profile in sorted(degree_profiles)],
            "minimum_at_n3": str(minimum_q0),
            "minimum_record": minimum_record,
            "ordered_stream_sha256": stream_sha,
            "sign_check": "all q-power coefficients are nonnegative for q=n-3>=0",
        },
        "order2_boundary": {
            "reason_separate": "The wedge coefficient is positive at n=2.",
            "cells": order2_values,
            "minimum": min(row["g2"] for row in order2_values),
        },
        "finite_replay": replay,
        "dependency": {"report": DEPENDENCY.name, "sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper()},
        "scope": (
            "Exact theorem for canonical deepest singleton endpoint-parent g2 only. "
            "It does not prove a no-parent/root-star mode, arbitrary supports, "
            "all N4, or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
