#!/usr/bin/env python3
"""Independent exact audit of the deepest-ordinary bundle-g2 theorem.

The audit rederives g2 from Gamma_2-2 Gamma_1 without importing the root
coefficient producer, independently rebuilds the configuration form, checks
every inequality used in the n>=8 proof, and repeats the complete n=3..7
forest coverage with a brute-force independence-polynomial evaluator.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
ROOT_SOURCE = HERE / "prove_iso_n4_bundle_g2_deepest_ordinary_root.py"
ROOT_REPORT = HERE / "iso_n4_bundle_g2_deepest_ordinary_exact_root_20260829.json"
CONFIG_SOURCE = HERE / "derive_iso_n4_bundle_g2_configuration_root.py"
CONFIG_REPORT = HERE / "iso_n4_bundle_g2_configuration_root_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g2_deepest_ordinary_independent_audit_agent_20260829.json"
POLY_CACHE: dict[tuple, tuple[int, ...]] = {}


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def nested(rows, rank):
    e, u, v, w = rows
    r = rank
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def convolve_isolates(rows, number, maximum):
    return tuple(
        tuple(
            sp.expand(
                sum(comb(number, shift) * at(row, rank - shift) for shift in range(rank + 1))
            )
            for rank in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(rows, drows):
    return tuple(
        tuple(sp.expand(at(row, rank) + at(drow, rank - 1)) for rank in range(len(row)))
        for row, drow in zip(rows, drows)
    )


def independent_raw_g2():
    crows = tuple(tuple(sp.symbols(f"c{name}0:6")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:6")) for name in "EUVW")
    t0 = add_xd(crows, drows)
    t1 = add_xd(convolve_isolates(crows, 1, 5), drows)
    t2 = add_xd(convolve_isolates(crows, 2, 5), drows)
    lower0 = nested(crows, 3)
    lower1 = nested(convolve_isolates(crows, 1, 4), 3)
    # Gamma_2-2 Gamma_1, independently expanded from the definition.
    return sp.expand(
        nested(t2, 4)
        - 2 * nested(t1, 4)
        + nested(t0, 4)
        + lower0
        - lower1
    )


def c2(x):
    x = sp.sympify(x)
    return sp.expand(x * (x - 1) / sp.Integer(2))


def c3(x):
    x = sp.sympify(x)
    return sp.expand(x * (x - 1) * (x - 2) / sp.Integer(6))


def c4(x):
    x = sp.sympify(x)
    return sp.expand(x * (x - 1) * (x - 2) * (x - 3) / sp.Integer(24))


def i2(order, edges):
    return sp.expand(c2(order) - edges)


def i3(order, edges, wedges):
    return sp.expand(c3(order) - edges * (order - 2) + wedges)


def i4(order, edges, wedges, connected3):
    return sp.expand(
        c4(order)
        - edges * c2(order - 2)
        + wedges * (order - 4)
        + c2(edges)
        - connected3
    )


def independent_configuration_form(raw):
    n, e, du, dv, a = sp.symbols("n edge_count degree_u degree_v adjacent")
    common = sp.symbols("C_common_neighbor")
    re, ru, rv = sp.symbols("C_connected3_E C_connected3_U C_connected3_V")
    xu, xv = sp.symbols("C_neighbor_excess_u C_neighbor_excess_v")
    wedges = sp.symbols("C_wedges_E")
    de, ddu, ddv = sp.symbols("D_edges D_degree_u D_degree_v")
    dxu, dxv, d_wedges = sp.symbols(
        "D_neighbor_excess_u D_neighbor_excess_v D_wedges_E"
    )

    cue = e - du
    cve = e - dv
    cwe = e - du - dv + a
    cuw = wedges - c2(du) - xu
    cvw = wedges - c2(dv) - xv
    cww = (
        wedges
        - c2(du)
        - c2(dv)
        - xu
        - xv
        + a * (du + dv - 2)
        + common
    )
    duw = d_wedges - c2(ddu) - dxu
    dvw = d_wedges - c2(ddv) - dxv
    q = n - 1
    substitution = {
        **{sp.symbols(f"c{name}0"): 1 for name in "EUVW"},
        **{sp.symbols(f"d{name}0"): 1 for name in "EUVW"},
        sp.symbols("cE1"): n,
        sp.symbols("cU1"): n - 1,
        sp.symbols("cV1"): n - 1,
        sp.symbols("cW1"): n - 2,
        sp.symbols("dE1"): q,
        sp.symbols("dU1"): q - 1,
        sp.symbols("dV1"): q - 1,
        sp.symbols("dW1"): q - 2,
        sp.symbols("cE2"): i2(n, e),
        sp.symbols("cU2"): i2(n - 1, cue),
        sp.symbols("cV2"): i2(n - 1, cve),
        sp.symbols("cW2"): i2(n - 2, cwe),
        sp.symbols("cE3"): i3(n, e, wedges),
        sp.symbols("cU3"): i3(n - 1, cue, cuw),
        sp.symbols("cV3"): i3(n - 1, cve, cvw),
        sp.symbols("cW3"): i3(n - 2, cwe, cww),
        sp.symbols("cE4"): i4(n, e, wedges, re),
        sp.symbols("cU4"): i4(n - 1, cue, cuw, ru),
        sp.symbols("cV4"): i4(n - 1, cve, cvw, rv),
        sp.symbols("dE2"): i2(q, de),
        sp.symbols("dU2"): i2(q - 1, de - ddu),
        sp.symbols("dV2"): i2(q - 1, de - ddv),
        sp.symbols("dW2"): i2(q - 2, de - ddu - ddv + a),
        sp.symbols("dE3"): i3(q, de, d_wedges),
        sp.symbols("dU3"): i3(q - 1, de - ddu, duw),
        sp.symbols("dV3"): i3(q - 1, de - ddv, dvw),
    }
    return sp.factor(raw.subs(substitution))


def symbolic_inequality_audit(expression):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    n = names["n"]
    common = names["C_common_neighbor"]
    re, ru, rv = (names[f"C_connected3_{row}"] for row in "EUV")
    xu, xv = names["C_neighbor_excess_u"], names["C_neighbor_excess_v"]
    wedges = names["C_wedges_E"]
    ddu, ddv = names["D_degree_u"], names["D_degree_v"]
    de = names["D_edges"]
    dxu, dxv = names["D_neighbor_excess_u"], names["D_neighbor_excess_v"]
    d_wedges = names["D_wedges_E"]
    a = names["adjacent"]
    du, dv, edges = names["degree_u"], names["degree_v"], names["edge_count"]
    degree_sum = du + dv
    numerator = sp.expand(2 * expression)

    adjacency = sp.expand(
        a * (12 * n**2 + 4 * n - (10 * n + 4) * degree_sum - 4 * edges)
    )
    degree = sp.expand(
        (12 * n - 24) * (du**2 + dv**2)
        + 12 * du * dv
        + (2 * edges - 15 * n**2 + 37 * n + 8) * degree_sum
    )
    edge_wedge = sp.expand(
        (70 - 30 * n) * wedges
        - 4 * edges**2
        + 10 * edges * n**2
        - 66 * edges * n
        + 60 * edges
    )
    d_degree = sp.expand(5 * (ddu**2 + ddv**2) + (19 - 4 * n) * (ddu + ddv))
    d_edge_wedge = sp.expand(-(8 * n + 24) * de - 4 * d_wedges)
    positive = sp.expand(
        4 * re + 10 * ru + 10 * rv
        + (24 * n - 38) * (xu + xv) + 10 * (dxu + dxv)
    )
    base = 20 * n**3 - 30 * n**2 - 28 * n + 16
    grouped = sp.expand(
        -(10 * n + 4) * common
        + positive + adjacency + degree + edge_wedge + d_degree + d_edge_wedge + base
    )
    assert sp.expand(numerator - grouped) == 0

    degree_square = sp.expand((12 * n - 24) * (du**2 + dv**2) + 12 * du * dv)
    assert sp.expand(
        degree_square
        - (6 * n - 9) * degree_sum**2
        - (6 * n - 15) * (du - dv) ** 2
    ) == 0
    derivative_at_n = sp.expand(
        2 * (6 * n - 9) * n + 2 * edges - 15 * n**2 + 37 * n + 8
    )
    derivative_upper = sp.expand(derivative_at_n.subs(edges, n - 1))
    assert derivative_upper == -3 * n**2 + 21 * n + 6
    assert derivative_upper.subs(n, 8) == -18
    assert sp.diff(derivative_upper, n).subs(n, 8) < 0

    degree_endpoint = sp.expand(-9 * n**3 + 28 * n**2 + 8 * n + 2 * n * edges)
    assert sp.expand(
        (6 * n - 9) * degree_sum**2
        + (2 * edges - 15 * n**2 + 37 * n + 8) * degree_sum
        - degree_endpoint
        - (n - degree_sum)
        * (-(6 * n - 9) * degree_sum + 9 * n**2 - 28 * n - 2 * edges - 8)
    ) == 0

    edge_floor = sp.expand(
        (70 - 30 * n) * edges * (edges - 1) / 2
        - 4 * edges**2 + 10 * edges * n**2 - 64 * edges * n + 60 * edges
    )
    edge_endpoint = sp.expand(-(n - 1) * (5 * n**2 + 3 * n + 6))
    edge_multiplier = sp.expand(
        15 * edges * n - 31 * edges + 5 * n**2 + 3 * n + 6
    )
    assert sp.expand(
        edge_floor - edge_endpoint - (n - 1 - edges) * edge_multiplier
    ) == 0
    assert edge_multiplier.subs({n: 8, edges: 0}) > 0
    # Coefficients of e and the constant term are positive for n>=8.
    assert sp.Poly(edge_multiplier.subs(n, sp.Symbol("y", nonnegative=True) + 8), edges).coeff_monomial(edges) > 0

    d_degree_floor = -(4 * n - 19) ** 2 / 10
    assert sp.expand(
        d_degree - d_degree_floor
        - sp.Rational(5, 2) * (ddu - ddv) ** 2
        - (5 * (ddu + ddv) - 4 * n + 19) ** 2 / 10
    ) == 0
    d_edge_floor = -10 * n**2 + 2 * n + 36
    assert sp.expand(
        (-(8 * n + 24) * (n - 2) - 4 * c2(n - 2)) - d_edge_floor
    ) == 0

    adjacency_lower = sp.expand(
        12 * n**2 + 4 * n - (10 * n + 4) * n - 4 * (n - 1)
    )
    assert adjacency_lower == 2 * n**2 - 4 * n + 4

    lower = sp.factor(
        base
        + (-9 * n**3 + 28 * n**2 + 8 * n)
        + edge_endpoint + d_degree_floor + d_edge_floor - (10 * n + 4)
    )
    expected = (60 * n**3 - 116 * n**2 - 158 * n + 179) / 10
    assert sp.expand(lower - expected) == 0
    y = sp.symbols("y", nonnegative=True)
    shifted = sp.expand((10 * expected).subs(n, y + 8))
    assert shifted == 60 * y**3 + 1324 * y**2 + 9506 * y + 22211

    return {
        "configuration_grouping_replayed": True,
        "forest_facts_checked": [
            "adjacent implies degree_u+degree_v<=n; edge_count<=n-1",
            "common-neighbor count<=1 in a forest",
            "wedge_sum<=binom(edge_count,2)",
            "D has n-1 vertices, so D_edges<=n-2 and D_wedges<=binom(D_edges,2)",
        ],
        "degree_derivative_upper_n_ge_8": str(derivative_upper),
        "degree_derivative_at_n8": str(derivative_upper.subs(n, 8)),
        "edge_endpoint_multiplier": str(edge_multiplier),
        "adjacency_lower": str(adjacency_lower),
        "total_lower_for_2g2": str(expected),
        "shifted_positive_polynomial": str(shifted),
    }


def independent_poly_bruteforce(graph):
    key = (
        tuple(sorted(int(vertex) for vertex in graph)),
        tuple(sorted((min(int(a), int(b)), max(int(a), int(b))) for a, b in graph.edges())),
    )
    if key in POLY_CACHE:
        return POLY_CACHE[key]
    vertices = tuple(graph)
    values = [0] * (len(vertices) + 1)
    for mask in range(1 << len(vertices)):
        chosen = {vertices[index] for index in range(len(vertices)) if mask & (1 << index)}
        if all(not (a in chosen and b in chosen) for a, b in graph.edges()):
            values[len(chosen)] += 1
    while len(values) > 1 and values[-1] == 0:
        values.pop()
    result = tuple(values)
    POLY_CACHE[key] = result
    return result


def minor_rows_numeric(graph, marks):
    u, v = marks
    out = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        row = independent_poly_bruteforce(reduced)
        out.append(tuple(row) + (0,) * max(0, 6 - len(row)))
    return tuple(out)


def direct_numeric_g2(graph, u, v, parent):
    dgraph = graph.copy()
    dgraph.remove_node(parent)
    crows = minor_rows_numeric(graph, (u, v))
    drows = minor_rows_numeric(dgraph, (u, v))
    t0 = add_xd(crows, drows)
    t1 = add_xd(convolve_isolates(crows, 1, 5), drows)
    t2 = add_xd(convolve_isolates(crows, 2, 5), drows)
    gamma1 = int(nested(t1, 4) - nested(t0, 4) - nested(crows, 3))
    gamma2 = int(
        nested(t2, 4) - nested(t0, 4)
        - nested(crows, 3) - nested(convolve_isolates(crows, 1, 4), 3)
    )
    return gamma2 - 2 * gamma1, [0, gamma1, gamma2]


def connected3(graph):
    count = 0
    for chosen in itertools.combinations(tuple(graph.edges()), 3):
        vertices = set(itertools.chain.from_iterable(chosen))
        if len(vertices) == 4:
            test = nx.Graph()
            test.add_edges_from(chosen)
            count += int(nx.is_connected(test))
    return count


def wedges(graph):
    return sum(comb(degree, 2) for _, degree in graph.degree())


def neighbor_excess(graph, vertex):
    return sum(graph.degree(neighbor) - 1 for neighbor in graph.neighbors(vertex))


def exact_evaluator(expression):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    names = tuple(map(str, symbols))
    polynomial = sp.Poly(sp.expand(2 * expression), *symbols)
    terms = [(monomial, int(coefficient)) for monomial, coefficient in polynomial.terms()]
    assert all(coefficient.q == 1 for coefficient in polynomial.coeffs())

    def evaluate(values):
        vector = tuple(values[name] for name in names)
        numerator = 0
        for monomial, coefficient in terms:
            term = coefficient
            for base, exponent in zip(vector, monomial):
                if exponent:
                    term *= base**exponent
            numerator += term
        assert numerator % 2 == 0
        return numerator // 2

    return evaluate


def finite_audit(expression):
    evaluate_expression = exact_evaluator(expression)
    cells = 0
    minimum = None
    by_order = {}
    i4_checks = 0
    for order in range(3, 8):
        local = 0
        for graph0 in nx.graph_atlas_g():
            if len(graph0) != order or not nx.is_forest(graph0):
                continue
            graph = nx.convert_node_labels_to_integers(graph0)
            polynomial = independent_poly_bruteforce(graph)
            invariant_i4 = i4(order, graph.number_of_edges(), wedges(graph), connected3(graph))
            if at(polynomial, 4) != invariant_i4:
                raise AssertionError(
                    {
                        "i4_order": order,
                        "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                        "direct_i4": at(polynomial, 4),
                        "invariant_i4": invariant_i4,
                        "edges": graph.number_of_edges(),
                        "wedges": wedges(graph),
                        "connected3": connected3(graph),
                    }
                )
            i4_checks += 1
            for u, v in itertools.combinations(graph, 2):
                for parent in graph:
                    if parent in (u, v):
                        continue
                    dgraph = graph.copy()
                    dgraph.remove_node(parent)
                    gu = graph.copy(); gu.remove_node(u)
                    gv = graph.copy(); gv.remove_node(v)
                    value, gamma = direct_numeric_g2(graph, u, v, parent)
                    data = {
                        "n": order,
                        "C_common_neighbor": len(set(graph.neighbors(u)) & set(graph.neighbors(v))),
                        "C_connected3_E": connected3(graph),
                        "C_connected3_U": connected3(gu),
                        "C_connected3_V": connected3(gv),
                        "C_neighbor_excess_u": neighbor_excess(graph, u),
                        "C_neighbor_excess_v": neighbor_excess(graph, v),
                        "C_wedges_E": wedges(graph),
                        "D_degree_u": dgraph.degree(u),
                        "D_degree_v": dgraph.degree(v),
                        "D_edges": dgraph.number_of_edges(),
                        "D_neighbor_excess_u": neighbor_excess(dgraph, u),
                        "D_neighbor_excess_v": neighbor_excess(dgraph, v),
                        "D_wedges_E": wedges(dgraph),
                        "adjacent": int(graph.has_edge(u, v)),
                        "degree_u": graph.degree(u),
                        "degree_v": graph.degree(v),
                        "edge_count": graph.number_of_edges(),
                    }
                    invariant = evaluate_expression(data)
                    if value != invariant or value < 0:
                        raise AssertionError(
                            {
                                "order": order,
                                "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                                "u": u,
                                "v": v,
                                "parent": parent,
                                "direct": value,
                                "invariant": invariant,
                                "data": data,
                            }
                        )
                    record = {
                        "g2": value,
                        "order_G": order,
                        "G_graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                        "marks": [u, v],
                        "parent": parent,
                        "Gamma_0_to_2": gamma,
                    }
                    if minimum is None or value < minimum["g2"]:
                        minimum = record
                    cells += 1
                    local += 1
        by_order[str(order)] = local
    assert cells == 5466 and minimum is not None and minimum["g2"] == 58
    return {
        "orders_G": [3, 7],
        "marked_parent_cells": cells,
        "by_order": by_order,
        "minimum": minimum,
        "independent_i4_formula_graph_checks": i4_checks,
        "coverage": "all graph-atlas forests of orders 3..7; every unordered mark pair and distinct parent",
        "independence_polynomials": "brute-force subset enumeration independent of root forest DP",
    }


def main():
    root_report = json.loads(ROOT_REPORT.read_text(encoding="utf-8"))
    config_report = json.loads(CONFIG_REPORT.read_text(encoding="utf-8"))
    assert root_report["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G2_DEEPEST_ORDINARY"
    assert config_report["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_G2_CONFIGURATION_FORM"

    raw = independent_raw_g2()
    expression = independent_configuration_form(raw)
    recorded = sp.sympify(config_report["deepest_singleton_ordinary"]["form"])
    assert sp.expand(expression - recorded) == 0
    inequality = symbolic_inequality_audit(expression)
    census = finite_audit(expression)

    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G2_DEEPEST_ORDINARY_AUDIT",
        "verdict": "the exact deepest-ordinary g2 theorem and its stated scope pass",
        "configuration_audit": {
            "raw_g2_rederived_as": "Gamma_2-2*Gamma_1 from the closed N4/N3 formulas",
            "exact_match_to_dependency_form": True,
            "i2_i3_i4_formulas_independently_substituted": True,
        },
        "large_order_audit": inequality,
        "finite_coverage_audit": census,
        "scope": (
            "Independent audit of g2 only for a singleton deepest parent distinct "
            "from both marks. It does not prove g1, marked-parent endpoints, "
            "arbitrary support neighborhoods, all N4, or Erdos Problem 993."
        ),
        "audited_hashes": {
            ROOT_SOURCE.name: hashlib.sha256(ROOT_SOURCE.read_bytes()).hexdigest().upper(),
            ROOT_REPORT.name: hashlib.sha256(ROOT_REPORT.read_bytes()).hexdigest().upper(),
            CONFIG_SOURCE.name: hashlib.sha256(CONFIG_SOURCE.read_bytes()).hexdigest().upper(),
            CONFIG_REPORT.name: hashlib.sha256(CONFIG_REPORT.read_bytes()).hexdigest().upper(),
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
