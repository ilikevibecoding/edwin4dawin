#!/usr/bin/env python3
"""Independent exact audit of the pure no-parent (k=0) g1/g2 theorem.

The audit reconstructs the D=C raw rows and forest-invariant forms, compares
the two independent producer reports, checks every cone sign identity and
edgeless branch, and certifies the relaxed polynomials in a total-degree
simplex Bernstein basis with exact inversion.  It independently repeats all
147 direct marked-forest cells of orders 2..5.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n4_bundle_g12_endpoint_parent_independent_agent import (
    exact_evaluator,
    invariant_rules,
    raw_coefficients,
    simplex_bernstein,
    unlabeled_forests,
)
from derive_iso_leaf_bundle_telescope_agent import bundle_components


HERE = Path(__file__).resolve().parent
AGENT_SOURCE = HERE / "prove_iso_n4_bundle_g12_no_parent_pure_root_star_agent.py"
AGENT_REPORT = HERE / "iso_n4_bundle_g12_no_parent_pure_root_star_exact_agent_20260829.json"
ROOT_SOURCE = HERE / "prove_iso_n4_bundle_g12_no_parent_k0_root.py"
ROOT_REPORT = HERE / "iso_n4_bundle_g12_no_parent_k0_exact_root_20260829.json"
STRUCTURE = HERE / "iso_n4_bundle_no_parent_root_star_modes_exact_agent_20260829.json"
HIGH_MOTIF = HERE / "iso_n4_bundle_g1_high_motif_payment_exact_agent_20260829.json"
GENERIC_HELPER = HERE / "audit_iso_n4_bundle_g12_endpoint_parent_independent_agent.py"
OUTPUT = HERE / "iso_n4_bundle_g12_no_parent_k0_independent_audit_agent_20260829.json"
FOREST_COUNTS = {2: 2, 3: 3, 4: 6, 5: 10}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def reconstructed_forms():
    c, d, raw1, raw2 = raw_coefficients()
    rules = {
        d[row][rank]: c[row][rank]
        for row in range(4)
        for rank in range(6)
    }
    raw1 = sp.factor(raw1.subs(rules))
    raw2 = sp.factor(raw2.subs(rules))
    invariants = invariant_rules()
    g1 = sp.factor(raw1.subs(invariants))
    g2 = sp.factor(raw2.subs(invariants))
    motif_names = (
        "C_connected3_E",
        "C_connected3_U",
        "C_connected3_V",
        "C_three_edge_five",
        "C_connected4_E",
    )
    symbols = {str(symbol): symbol for symbol in g1.free_symbols}
    motif1 = sp.factor(
        sum(sp.diff(g1, symbols[name]) * symbols[name] for name in motif_names)
    )
    symbols2 = {str(symbol): symbol for symbol in g2.free_symbols}
    motif2 = sp.factor(
        sum(
            sp.diff(g2, symbols2[name]) * symbols2[name]
            for name in motif_names
            if name in symbols2
        )
    )
    return raw1, raw2, g1, g2, motif1, motif2, sp.factor(g1 - motif1), sp.factor(g2 - motif2)


def multinomial(alpha):
    value = factorial(sum(alpha))
    for part in alpha:
        value //= factorial(part)
    return value


def simplex_certificate(expression, start_n, positive_names, label):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    q = sp.symbols(f"q_{label}", nonnegative=True)
    t = sp.symbols(f"sx_{label} sy_{label} sr_{label}", nonnegative=True)
    sx, sy, sr = t
    h = 1 - sx - sy - sr
    total = sp.Integer(start_n - 2) + q
    x, y, r = total * sx, total * sy, total * sr
    rows = []
    coefficient_count = 0
    inversions = 0
    minimum = None
    for adjacent, zu, zv in itertools.product((0, 1), repeat=3):
        if adjacent and not (zu and zv):
            continue
        du, dv = zu + x, zv + y
        edges = 1 + x + y + r
        wedge_upper = du * (du - 1) / 2 + dv * (dv - 1) / 2 + r * (r + 1) / 2
        substitutions = {
            names["n"]: total + 2,
            names["edge_count"]: edges,
            names["degree_u"]: du,
            names["degree_v"]: dv,
            names["adjacent"]: adjacent,
            names["C_common_neighbor"]: 1,
            names["C_neighbor_excess_u"]: 0,
            names["C_neighbor_excess_v"]: 0,
            names["C_wedges_E"]: wedge_upper,
        }
        for name in positive_names:
            substitutions[names[name]] = 0
        lower = sp.cancel(expression.subs(substitutions))
        records = list(simplex_bernstein(lower, t))
        degrees = {degree for degree, _alpha, _coefficient in records}
        assert len(degrees) == 1
        degree = next(iter(degrees))
        reconstruction = 0
        local_minimum = None
        for _degree, alpha, coefficient in records:
            assert all(
                value >= 0
                for value in sp.Poly(sp.expand(coefficient), q).all_coeffs()
            )
            basis = multinomial(alpha) * h ** alpha[0]
            for variable, power in zip(t, alpha[1:]):
                basis *= variable**power
            reconstruction += coefficient * basis
            q0 = sp.factor(coefficient.subs(q, 0))
            local_minimum = q0 if local_minimum is None else min(local_minimum, q0)
            minimum = q0 if minimum is None else min(minimum, q0)
        assert sp.expand(reconstruction - lower) == 0
        inversions += 1
        coefficient_count += len(records)
        rows.append(
            {
                "branch_adj_zu_zv": [adjacent, zu, zv],
                "degree": degree,
                "coefficients": len(records),
                "minimum_at_threshold": str(local_minimum),
            }
        )
    return {
        "basis": "total-degree Bernstein on sum(sx,sy,sr)<=1",
        "orders": f"n>={start_n}",
        "branches": len(rows),
        "coefficients": coefficient_count,
        "exact_inversions": inversions,
        "minimum_at_threshold": str(minimum),
        "all_q_power_coefficients_nonnegative": True,
        "rows": rows,
    }


def connected_edges(graph, number):
    count = 0
    for chosen in itertools.combinations(graph.edges(), number):
        test = nx.Graph()
        test.add_edges_from(chosen)
        count += int(len(test) == number + 1 and nx.is_connected(test))
    return count


def three_edge_five(graph):
    return sum(
        len(set(itertools.chain.from_iterable(chosen))) == 5
        for chosen in itertools.combinations(graph.edges(), 3)
    )


def invariant_data(graph, u, v):
    degree = dict(graph.degree())
    neighbors = {vertex: set(graph.neighbors(vertex)) for vertex in graph}
    gu = graph.copy(); gu.remove_node(u)
    gv = graph.copy(); gv.remove_node(v)
    return {
        "n": len(graph),
        "edge_count": graph.number_of_edges(),
        "degree_u": degree[u],
        "degree_v": degree[v],
        "adjacent": int(v in neighbors[u]),
        "C_common_neighbor": len(neighbors[u] & neighbors[v]),
        "C_neighbor_excess_u": sum(degree[x] - 1 for x in neighbors[u]),
        "C_neighbor_excess_v": sum(degree[x] - 1 for x in neighbors[v]),
        "C_wedges_E": sum(comb(value, 2) for value in degree.values()),
        "C_connected3_E": connected_edges(graph, 3),
        "C_connected3_U": connected_edges(gu, 3),
        "C_connected3_V": connected_edges(gv, 3),
        "C_three_edge_five": three_edge_five(graph),
        "C_connected4_E": connected_edges(graph, 4),
    }


def direct_bundle(graph, u, v):
    support = max(graph.nodes(), default=-1) + 1
    base = graph.copy()
    base.add_node(support)
    gamma1 = sum(bundle_components(base, (u, v), support, 1, 4))
    gamma2 = sum(bundle_components(base, (u, v), support, 2, 4))
    return int(gamma1), int(gamma2 - 2 * gamma1)


def finite_census(g1, g2, residual1):
    evaluate1 = exact_evaluator(g1)
    evaluate2 = exact_evaluator(g2)
    evaluate_residual = exact_evaluator(residual1)
    total_forests = 0
    cells = 0
    minima = {"g1": None, "g2": None, "residual_g1": None}
    by_order = {}
    for order, expected in FOREST_COUNTS.items():
        forests = list(unlabeled_forests(order))
        assert len(forests) == expected
        local_cells = 0
        for graph in forests:
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(graph.nodes(), 2):
                data = invariant_data(graph, u, v)
                values = {
                    "g1": evaluate1(data),
                    "g2": evaluate2(data),
                    "residual_g1": evaluate_residual(data),
                }
                assert (values["g1"], values["g2"]) == direct_bundle(graph, u, v)
                for key, value in values.items():
                    assert value >= 0
                    record = {
                        "value": value,
                        "order": order,
                        "graph6": graph6,
                        "marks": [u, v],
                    }
                    if minima[key] is None or value < minima[key]["value"]:
                        minima[key] = record
                cells += 1
                local_cells += 1
        assert local_cells == expected * comb(order, 2)
        by_order[str(order)] = {
            "forest_types": expected,
            "marked_cells": local_cells,
        }
        total_forests += expected
    assert total_forests == 21 and cells == 147
    assert minima["g1"]["value"] == 4
    assert minima["g2"]["value"] == 22
    return {
        "orders": [2, 5],
        "forest_types": total_forests,
        "marked_cells": cells,
        "negative": 0,
        "minima": minima,
        "by_order": by_order,
        "checks": "direct bundle Gamma = independently rebuilt invariant forms",
    }


def main():
    agent = json.loads(AGENT_REPORT.read_text(encoding="utf-8"))
    root = json.loads(ROOT_REPORT.read_text(encoding="utf-8"))
    structure = json.loads(STRUCTURE.read_text(encoding="utf-8"))
    high = json.loads(HIGH_MOTIF.read_text(encoding="utf-8"))
    assert agent["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_PURE_ROOT_STAR_AGENT"
    assert root["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K0_ROOT"
    assert structure["marker"] == "PASS_EXACT_CANONICAL_NO_PARENT_ROOT_STAR_MODE_CLASSIFICATION_AGENT"
    assert high["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_HIGH_MOTIF_PAYMENT_AGENT"
    assert structure["modes"]["k0_no_protected_leaf"]["D_row_identity"] == "D=(C_E,C_U,C_V,C_W)=C"

    raw1, raw2, g1, g2, motif1, motif2, residual1, residual2 = reconstructed_forms()
    assert sp.expand(raw1 - sp.sympify(root["raw_forms"]["g1"])) == 0
    assert sp.expand(raw2 - sp.sympify(root["raw_forms"]["g2"])) == 0
    assert sp.expand(g1 - sp.sympify(root["forest_invariant_forms"]["g1"])) == 0
    assert sp.expand(g2 - sp.sympify(root["forest_invariant_forms"]["g2"])) == 0
    assert sp.expand(residual1 - sp.sympify(agent["g1"]["residual"])) == 0
    assert sp.expand(g2 - sp.sympify(agent["g2"]["form"])) == 0

    names = {str(symbol): symbol for symbol in g1.free_symbols | g2.free_symbols}
    n, e = names["n"], names["edge_count"]
    du, dv = names["degree_u"], names["degree_v"]
    adjacent = names["adjacent"]
    xu, xv = names["C_neighbor_excess_u"], names["C_neighbor_excess_v"]
    common, wedges = names["C_common_neighbor"], names["C_wedges_E"]
    re, ru, rv = names["C_connected3_E"], names["C_connected3_U"], names["C_connected3_V"]
    q35, r4 = names["C_three_edge_five"], names["C_connected4_E"]

    core = 2 * (n - 4) * re + 5 * q35 - 5 * r4
    assert sp.expand(motif1 - core - 5 * re - (5 * n - 4) * (ru + rv)) == 0
    assert motif2 == 2 * re + 5 * ru + 5 * rv

    derivatives1 = {
        "neighbor_u": sp.factor(sp.diff(residual1, xu)),
        "neighbor_v": sp.factor(sp.diff(residual1, xv)),
        "common": sp.factor(sp.diff(residual1, common)),
        "wedges": sp.factor(sp.diff(residual1, wedges)),
    }
    floor_neighbor = 6 * n**2 - 20 * n + 13
    floor_common = 5 * n**2 - 11 * n + 6
    floor_wedge = 15 * n**2 - 79 * n + 50
    wedge_bracket = -2 * derivatives1["wedges"]
    assert sp.expand(derivatives1["neighbor_u"] - floor_neighbor - 3 * (n - 1 - dv) - 2 * (n - 1 - e)) == 0
    assert sp.expand(derivatives1["neighbor_v"] - floor_neighbor - 3 * (n - 1 - du) - 2 * (n - 1 - e)) == 0
    assert sp.expand(-2 * derivatives1["common"] - floor_common - 10 * (n - 1 - e)) == 0
    assert sp.expand(wedge_bracket - floor_wedge - 6 * adjacent - 12 * (n - du - dv) - 8 * e) == 0
    m = sp.symbols("m", nonnegative=True)
    for floor in (floor_neighbor, floor_common, floor_wedge):
        assert all(
            value >= 0
            for value in sp.Poly(sp.expand(floor.subs(n, 6 + m)), m).all_coeffs()
        )

    derivatives2 = {
        name: sp.factor(sp.diff(g2, names[name]))
        for name in (
            "C_common_neighbor",
            "C_connected3_E",
            "C_connected3_U",
            "C_connected3_V",
            "C_neighbor_excess_u",
            "C_neighbor_excess_v",
            "C_wedges_E",
        )
    }
    expected2 = {
        "C_common_neighbor": -5 * n - 2,
        "C_connected3_E": 2,
        "C_connected3_U": 5,
        "C_connected3_V": 5,
        "C_neighbor_excess_u": 12 * n - 14,
        "C_neighbor_excess_v": 12 * n - 14,
        "C_wedges_E": -15 * n + 33,
    }
    assert all(sp.expand(derivatives2[key] - value) == 0 for key, value in expected2.items())

    edgeless1 = sp.factor(
        residual1.subs({symbol: 0 for symbol in residual1.free_symbols if symbol != n})
    )
    edgeless2 = sp.factor(
        g2.subs({symbol: 0 for symbol in g2.free_symbols if symbol != n})
    )
    assert edgeless1 == n * (n - 1) * (65 * n**2 - 69 * n - 26) / 24
    assert edgeless2 == n * (10 * n**2 - 11 * n - 4)
    for factor in (65 * n**2 - 69 * n - 26, 10 * n**2 - 11 * n - 4):
        assert factor.subs(n, 2) > 0
        assert sp.diff(factor, n).subs(n, 2) > 0
        assert sp.diff(factor, n, 2) > 0

    g1_certificate = simplex_certificate(residual1, 6, (), "g1")
    g2_certificate = simplex_certificate(
        g2,
        3,
        ("C_connected3_E", "C_connected3_U", "C_connected3_V"),
        "g2",
    )
    assert g1_certificate["branches"] == 5
    assert g1_certificate["coefficients"] == 100
    assert g1_certificate["exact_inversions"] == 5
    assert g1_certificate["minimum_at_threshold"] == "23"
    assert g2_certificate["branches"] == 5
    assert g2_certificate["coefficients"] == 50
    assert g2_certificate["exact_inversions"] == 5
    assert g2_certificate["minimum_at_threshold"] == "30"
    finite = finite_census(g1, g2, residual1)

    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K0_AUDIT_AGENT",
        "theorems": {
            "g1": "In every canonical pure no-parent k=0 cell, g1>=0.",
            "g2": "In every canonical pure no-parent k=0 cell, g2>=0.",
        },
        "independent_reconstruction": {
            "D_rows": "D=C",
            "raw_g1_g2_rederived": True,
            "i2_through_i5_forest_forms_rederived": True,
            "matches_agent_and_root_forms": True,
        },
        "motif_split": {
            "g1": "universal core +5R3(E)+(5n-4)(R3(U)+R3(V))",
            "g2": "2R3(E)+5R3(U)+5R3(V)",
            "universal_core_dependency": high["theorem"],
        },
        "monotonicity": {
            "g1_derivatives": {key: str(value) for key, value in derivatives1.items()},
            "g2_derivatives": {key: str(value) for key, value in derivatives2.items()},
            "g1_exact_slack_decompositions": True,
        },
        "degree_excess_cone": {
            "bound": "W<=C(d_u,2)+C(d_v,2)+C(r+1,2)",
            "proof": (
                "Total positive-degree excess is e-c; r=e-1-x-y is "
                "unselected excess plus c-1, and convex concentration gives the bound."
            ),
            "edgeless_g1": str(edgeless1),
            "edgeless_g2": str(edgeless2),
        },
        "independent_simplex_certificates": {
            "g1": g1_certificate,
            "g2": g2_certificate,
        },
        "finite_direct_census": finite,
        "dependencies": {
            path.name: sha256(path)
            for path in (
                AGENT_SOURCE,
                AGENT_REPORT,
                ROOT_SOURCE,
                ROOT_REPORT,
                STRUCTURE,
                HIGH_MOTIF,
                GENERIC_HELPER,
            )
        },
        "scope": (
            "Exact independent audit only for canonical no-parent k=0. "
            "The k=1 import and k=2 theorem are separate obligations."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
