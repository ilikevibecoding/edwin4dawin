#!/usr/bin/env python3
"""Prove rank-four bundle coefficients g1,g2 in the pure root-star mode.

The canonical deepest unmarked support has no parent and neither protected
mark is a leaf neighbour of it.  With C the support-deleted four-minor tuple,
the support-included branch has the same tuple D=C.  The proof derives both
binomial coefficients exactly, pays the connected high motifs, and proves the
remaining two-mark polynomial by a degree-excess cone plus exact Bernstein
certificates.  The small complement is replayed directly on every forest.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent import (
    independent_poly_bruteforce,
    independent_raw_g2,
)
from derive_iso_leaf_bundle_telescope_agent import bundle_components
from derive_iso_n4_bundle_g1_deepest_configuration_agent import raw_g1
from derive_iso_n4_bundle_g12_endpoint_parent_agent import invariant_substitution


HERE = Path(__file__).resolve().parent
CLASSIFICATION = HERE / "iso_n4_bundle_no_parent_root_star_modes_exact_agent_20260829.json"
HIGH_MOTIF = HERE / "iso_n4_bundle_g1_high_motif_payment_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g12_no_parent_k0_exact_root_20260829.json"
FOREST_COUNTS = {2: 2, 3: 3, 4: 6, 5: 10}


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


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


def exact_evaluator(expression):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    names = tuple(map(str, symbols))
    polynomial = sp.Poly(sp.expand(expression), *symbols)
    denominator = 1
    for coefficient in polynomial.coeffs():
        denominator = sp.ilcm(denominator, int(coefficient.q))
    terms = tuple(
        (monomial, int(coefficient * denominator))
        for monomial, coefficient in polynomial.terms()
    )

    def evaluate(data):
        vector = tuple(data[name] for name in names)
        numerator = 0
        for monomial, coefficient in terms:
            value = coefficient
            for base, exponent in zip(vector, monomial):
                if exponent:
                    value *= base**exponent
            numerator += value
        assert numerator % denominator == 0
        return numerator // denominator

    return evaluate


def unlabeled_forests(order):
    tree_types = []
    for size in range(1, order + 1):
        trees = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for tree in trees:
            tree_types.append((size, nx.convert_node_labels_to_integers(tree)))

    def extend(remaining, start, chosen):
        if remaining == 0:
            yield nx.disjoint_union_all([tree_types[index][1] for index in chosen])
            return
        for index in range(start, len(tree_types)):
            size = tree_types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def connected_edges(graph, count):
    answer = 0
    for chosen in itertools.combinations(graph.edges(), count):
        test = nx.Graph()
        test.add_edges_from(chosen)
        answer += int(len(test) == count + 1 and nx.is_connected(test))
    return answer


def three_edge_five(graph):
    answer = 0
    for chosen in itertools.combinations(graph.edges(), 3):
        vertices = set(itertools.chain.from_iterable(chosen))
        answer += int(len(vertices) == 5)
    return answer


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


def direct_bundle_values(graph, u, v):
    support = max(graph.nodes(), default=-1) + 1
    base = graph.copy()
    base.add_node(support)
    gamma1 = sum(bundle_components(base, (u, v), support, 1, 4))
    gamma2 = sum(bundle_components(base, (u, v), support, 2, 4))
    return gamma1, gamma2 - 2 * gamma1


def main():
    classification = json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    high = json.loads(HIGH_MOTIF.read_text(encoding="utf-8"))
    assert classification["marker"] == "PASS_EXACT_CANONICAL_NO_PARENT_ROOT_STAR_MODE_CLASSIFICATION_AGENT"
    assert classification["modes"]["k0_no_protected_leaf"]["D_row_identity"] == "D=(C_E,C_U,C_V,C_W)=C"
    assert high["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_HIGH_MOTIF_PAYMENT_AGENT"

    row_rules = {
        sp.Symbol(f"d{name}{rank}"): sp.Symbol(f"c{name}{rank}")
        for name in "EUVW"
        for rank in range(6)
    }
    invariant_rules, motif_symbols = invariant_substitution()
    raw1 = sp.factor(raw_g1().subs(row_rules))
    raw2 = sp.factor(independent_raw_g2().subs(row_rules))
    g1 = sp.factor(raw1.subs(invariant_rules))
    g2 = sp.factor(raw2.subs(invariant_rules))
    motif1 = sp.factor(sum(sp.diff(g1, symbol) * symbol for symbol in motif_symbols))
    motif2 = sp.factor(sum(sp.diff(g2, symbol) * symbol for symbol in motif_symbols))
    residual1 = sp.factor(g1 - motif1)
    residual2 = sp.factor(g2 - motif2)
    names1 = {str(symbol): symbol for symbol in residual1.free_symbols}
    names2 = {str(symbol): symbol for symbol in g2.free_symbols}

    n, e = names1["n"], names1["edge_count"]
    du, dv = names1["degree_u"], names1["degree_v"]
    adjacent = names1["adjacent"]
    xu, xv = names1["C_neighbor_excess_u"], names1["C_neighbor_excess_v"]
    common, wedges = names1["C_common_neighbor"], names1["C_wedges_E"]

    # The g1 high motifs are the universal core from the existing incidence
    # theorem plus manifestly nonnegative deletion counts.
    motif_names = {str(symbol): symbol for symbol in motif1.free_symbols}
    re = motif_names["C_connected3_E"]
    ru = motif_names["C_connected3_U"]
    rv = motif_names["C_connected3_V"]
    q35 = motif_names["C_three_edge_five"]
    r4 = motif_names["C_connected4_E"]
    core = 2 * (n - 4) * re + 5 * q35 - 5 * r4
    assert sp.expand(motif1 - core - 5 * re - (5 * n - 4) * (ru + rv)) == 0

    derivatives1 = {
        "neighbor_u": sp.factor(sp.diff(residual1, xu)),
        "neighbor_v": sp.factor(sp.diff(residual1, xv)),
        "common": sp.factor(sp.diff(residual1, common)),
        "wedges": sp.factor(sp.diff(residual1, wedges)),
    }
    assert sp.expand(derivatives1["neighbor_u"] - (-3 * dv - 2 * e + 6 * n**2 - 15 * n + 8)) == 0
    assert sp.expand(derivatives1["neighbor_v"] - (-3 * du - 2 * e + 6 * n**2 - 15 * n + 8)) == 0
    assert sp.expand(derivatives1["common"] + (-10 * e + 5 * n**2 - n - 4) / 2) == 0
    wedge_bracket = sp.factor(-2 * derivatives1["wedges"])
    assert sp.expand(wedge_bracket - (6 * adjacent - 12 * du - 12 * dv + 8 * e + 15 * n**2 - 67 * n + 50)) == 0

    # Exact decompositions into nonnegative forest slack variables establish
    # every monotonicity direction used for n>=6.
    xu_floor = 6 * n**2 - 20 * n + 13
    common_floor = 5 * n**2 - 11 * n + 6
    wedge_floor = 15 * n**2 - 79 * n + 50
    assert sp.expand(derivatives1["neighbor_u"] - xu_floor - 3 * (n - 1 - dv) - 2 * (n - 1 - e)) == 0
    assert sp.expand(derivatives1["neighbor_v"] - xu_floor - 3 * (n - 1 - du) - 2 * (n - 1 - e)) == 0
    assert sp.expand(-2 * derivatives1["common"] - common_floor - 10 * (n - 1 - e)) == 0
    assert sp.expand(wedge_bracket - wedge_floor - 6 * adjacent - 12 * (n - du - dv) - 8 * e) == 0
    qsign = sp.symbols("qsign", nonnegative=True)
    for floor in (xu_floor, common_floor, wedge_floor):
        assert all(value >= 0 for value in sp.Poly(sp.expand(floor.subs(n, qsign + 6)), qsign).all_coeffs())

    # Edgeless branches lie outside e-1 parameterization.
    edgeless1 = sp.factor(residual1.subs({symbol: 0 for symbol in residual1.free_symbols if symbol != n}))
    edgeless2 = sp.factor(residual2.subs({symbol: 0 for symbol in residual2.free_symbols if symbol != n}))
    assert sp.expand(edgeless1 - n * (65 * n**3 - 134 * n**2 + 43 * n + 26) / 24) == 0
    assert sp.expand(edgeless2 - n * (10 * n**2 - 11 * n - 4)) == 0
    assert edgeless1.subs(n, 2) > 0 and edgeless2.subs(n, 2) > 0
    edgeless1_factor = 65 * n**2 - 69 * n - 26
    edgeless2_factor = 10 * n**2 - 11 * n - 4
    assert edgeless1_factor.subs(n, 2) > 0
    assert edgeless2_factor.subs(n, 2) > 0
    assert sp.diff(edgeless1_factor, n).subs(n, 2) > 0
    assert sp.diff(edgeless2_factor, n).subs(n, 2) > 0
    assert sp.diff(edgeless1_factor, n, 2) > 0
    assert sp.diff(edgeless2_factor, n, 2) > 0

    def cone_certificate(expression, start_n, positive_symbols, label):
        local = {str(symbol): symbol for symbol in expression.free_symbols}
        q = sp.symbols(f"q_{label}", nonnegative=True)
        box = sp.symbols(f"a_{label} b_{label} c_{label}", nonnegative=True)
        a, b, c = box
        total = sp.Integer(start_n - 2) + q
        x = total * a
        y = total * (1 - a) * b
        r = total * (1 - a) * (1 - b) * c
        branches = 0
        coefficient_count = 0
        profiles = set()
        minimum = None
        stream = []
        for auv, zu, zv in itertools.product((0, 1), repeat=3):
            if auv and not (zu and zv):
                continue
            d_u, d_v = zu + x, zv + y
            edge_count = 1 + x + y + r
            wedge_upper = d_u * (d_u - 1) / 2 + d_v * (d_v - 1) / 2 + r * (r + 1) / 2
            substitutions = {
                local["n"]: total + 2,
                local["edge_count"]: edge_count,
                local["degree_u"]: d_u,
                local["degree_v"]: d_v,
                local["adjacent"]: auv,
                local["C_common_neighbor"]: 1,
                local["C_neighbor_excess_u"]: 0,
                local["C_neighbor_excess_v"]: 0,
                local["C_wedges_E"]: wedge_upper,
            }
            for symbol_name in positive_symbols:
                substitutions[local[symbol_name]] = 0
            lower = sp.cancel(expression.subs(substitutions))
            branches += 1
            for degrees, index, coefficient in tensor_bernstein(lower, box):
                profiles.add(degrees)
                q_coefficients = sp.Poly(sp.expand(coefficient), q).all_coeffs()
                assert all(value >= 0 for value in q_coefficients)
                at_zero = sp.factor(coefficient.subs(q, 0))
                minimum = at_zero if minimum is None else min(minimum, at_zero)
                stream.append({
                    "branch_adj_zu_zv": [auv, zu, zv],
                    "index": list(index),
                    "coefficient": str(coefficient),
                })
                coefficient_count += 1
        assert branches == 5 and minimum > 0
        return {
            "orders": f"n>={start_n}",
            "branches": branches,
            "degree_profiles": [list(profile) for profile in sorted(profiles)],
            "bernstein_coefficients": coefficient_count,
            "minimum_at_threshold": str(minimum),
            "ordered_stream_sha256": hashlib.sha256(
                json.dumps(stream, separators=(",", ":"), sort_keys=True).encode()
            ).hexdigest().upper(),
            "sign_check": f"all q-power coefficients nonnegative for q=n-{start_n}>=0",
        }

    certificate1 = cone_certificate(residual1, 6, (), "g1")

    # g2 has positive connected-three and neighbor-excess coefficients and
    # negative common/wedge coefficients from n>=3 onward.
    derivatives2 = {
        key: sp.factor(sp.diff(g2, names2[key]))
        for key in (
            "C_common_neighbor", "C_connected3_E", "C_connected3_U",
            "C_connected3_V", "C_neighbor_excess_u",
            "C_neighbor_excess_v", "C_wedges_E",
        )
    }
    expected2 = {
        "C_common_neighbor": -5 * names2["n"] - 2,
        "C_connected3_E": 2,
        "C_connected3_U": 5,
        "C_connected3_V": 5,
        "C_neighbor_excess_u": 12 * names2["n"] - 14,
        "C_neighbor_excess_v": 12 * names2["n"] - 14,
        "C_wedges_E": -15 * names2["n"] + 33,
    }
    assert all(sp.expand(derivatives2[key] - value) == 0 for key, value in expected2.items())
    certificate2 = cone_certificate(
        g2,
        3,
        ("C_connected3_E", "C_connected3_U", "C_connected3_V"),
        "g2",
    )

    evaluate1 = exact_evaluator(g1)
    evaluate2 = exact_evaluator(g2)
    evaluate_residual1 = exact_evaluator(residual1)
    total_forests = 0
    total_cells = 0
    minima = {"g1": None, "g2": None, "residual_g1": None}
    negative = {key: 0 for key in minima}
    by_order = {}
    for order, expected_count in FOREST_COUNTS.items():
        forests = list(unlabeled_forests(order))
        assert len(forests) == expected_count
        local_cells = 0
        for graph in forests:
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(graph.nodes(), 2):
                data = invariant_data(graph, u, v)
                values = {
                    "g1": evaluate1(data),
                    "g2": evaluate2(data),
                    "residual_g1": evaluate_residual1(data),
                }
                assert (values["g1"], values["g2"]) == direct_bundle_values(graph, u, v)
                for key, value in values.items():
                    negative[key] += int(value < 0)
                    record = {"value": value, "order": order, "graph6": graph6, "marks": [u, v]}
                    if minima[key] is None or value < minima[key]["value"]:
                        minima[key] = record
                total_cells += 1
                local_cells += 1
        assert local_cells == expected_count * comb(order, 2)
        by_order[str(order)] = {"forest_types": expected_count, "marked_cells": local_cells}
        total_forests += expected_count
    assert all(value == 0 for value in negative.values())

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_K0_ROOT",
        "theorem": (
            "For every canonical no-parent root-star cell with no protected "
            "marked leaf at its support, g1>=0 and g2>=0."
        ),
        "row_identity": "D=C",
        "raw_forms": {"g1": str(raw1), "g2": str(raw2)},
        "forest_invariant_forms": {"g1": str(g1), "g2": str(g2)},
        "high_motif_payment": {
            "g1": str(motif1),
            "decomposition": "universal core +5R3(E)+(5n-4)(R3(U)+R3(V))",
            "g2": str(motif2),
        },
        "monotonicity": {
            "g1_derivatives": {key: str(value) for key, value in derivatives1.items()},
            "g2_derivatives": {key: str(value) for key, value in derivatives2.items()},
            "forest_facts": (
                "e<=n-1, d_u+d_v<=n, common(u,v)<=1, and all connected-"
                "three/neighbor-excess counts are nonnegative"
            ),
        },
        "degree_excess_cone": {
            "parameters": "x=d_u-1[d_u>0], y=d_v-1[d_v>0], r=e-1-x-y",
            "wedge_upper": "C(d_u,2)+C(d_v,2)+C(r+1,2)",
            "proof": (
                "Total positive-degree excess is e-c for c nontrivial "
                "components; r is unselected excess plus c-1, and convex "
                "concentration proves the wedge upper bound."
            ),
            "edgeless": {"g1": str(edgeless1), "g2": str(edgeless2)},
        },
        "certificates": {"g1": certificate1, "g2": certificate2},
        "finite_direct_census": {
            "orders": [2, 5],
            "unlabeled_forests": total_forests,
            "marked_cells": total_cells,
            "negative": negative,
            "minimum": minima,
            "by_order": by_order,
            "checks": "direct bundle components = exact forest-invariant forms",
        },
        "scope": (
            "Exact theorem for the k=0 canonical no-parent root-star mode only. "
            "It does not by itself cover k=1/k=2, arbitrary supports, later FML "
            "ranks, all N4, or Erdos Problem 993."
        ),
        "dependencies": {
            CLASSIFICATION.name: hashlib.sha256(CLASSIFICATION.read_bytes()).hexdigest().upper(),
            HIGH_MOTIF.name: hashlib.sha256(HIGH_MOTIF.read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
