#!/usr/bin/env python3
"""Independent exact audit of endpoint-parent bundle coefficients g1 and g2.

No producer proof functions are imported.  The audit independently rebuilds
the nested four-minor functional, the endpoint row collapse, the forest
configuration formulas through independent five-sets, the high-motif split,
the two-vertex degree-excess cone, and both Bernstein certificates.  Every
simplex Bernstein conversion is inverted symbolically.  A separate complete
unlabeled-forest census through order nine compares direct independence
polynomials with both reconstructed configuration forms.

Scope: canonical deepest singleton support with its unique parent equal to
one of the two marks.  The no-parent/root case and arbitrary supports remain
outside this theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
CONFIG_REPORT = HERE / "iso_n4_bundle_g12_endpoint_parent_exact_agent_20260829.json"
G1_REPORT = HERE / "iso_n4_bundle_g1_endpoint_parent_exact_agent_20260829.json"
G2_REPORT = HERE / "iso_n4_bundle_g2_endpoint_parent_exact_agent_20260829.json"
HIGH_MOTIF_REPORT = HERE / "iso_n4_bundle_g1_high_motif_payment_exact_agent_20260829.json"
Q35_REPORT = HERE / "iso_n4_bundle_g1_i5_root_configuration_equivalence_audit_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g12_endpoint_parent_independent_audit_g1_bernstein_20260829.json"

FOREST_COUNTS = {2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37, 8: 76, 9: 153}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row: tuple[sp.Expr, ...], rank: int) -> sp.Expr:
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def nested(rows: tuple[tuple[sp.Expr, ...], ...], rank: int) -> sp.Expr:
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


def convolve_isolates(
    rows: tuple[tuple[sp.Expr, ...], ...], number: int, maximum: int
) -> tuple[tuple[sp.Expr, ...], ...]:
    return tuple(
        tuple(
            sp.expand(
                sum(comb(number, j) * at(row, rank - j) for j in range(number + 1))
            )
            for rank in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(
    crows: tuple[tuple[sp.Expr, ...], ...],
    drows: tuple[tuple[sp.Expr, ...], ...],
) -> tuple[tuple[sp.Expr, ...], ...]:
    return tuple(
        tuple(at(crow, rank) + at(drow, rank - 1) for rank in range(6))
        for crow, drow in zip(crows, drows)
    )


def raw_endpoint_forms():
    crows = tuple(tuple(sp.symbols(f"c{name}0:6")) for name in "EUVW")
    e, u, v, w = crows
    drows_u = (u, u, w, w)
    drows_v = (v, w, v, w)

    def coefficients(drows):
        t0 = add_xd(crows, drows)
        t1 = add_xd(convolve_isolates(crows, 1, 5), drows)
        t2 = add_xd(convolve_isolates(crows, 2, 5), drows)
        gamma1 = sp.expand(nested(t1, 4) - nested(t0, 4) - nested(crows, 3))
        gamma2 = sp.expand(
            nested(t2, 4)
            - nested(t0, 4)
            - nested(crows, 3)
            - nested(convolve_isolates(crows, 1, 4), 3)
        )
        return sp.factor(gamma1), sp.factor(gamma2 - 2 * gamma1)

    g1_u, g2_u = coefficients(drows_u)
    g1_v, g2_v = coefficients(drows_v)
    swap = {}
    for rank in range(6):
        swap[sp.Symbol(f"cU{rank}")] = sp.Symbol(f"cV{rank}")
        swap[sp.Symbol(f"cV{rank}")] = sp.Symbol(f"cU{rank}")
    assert sp.expand(g1_v - g1_u.xreplace(swap)) == 0
    assert sp.expand(g2_v - g2_u.xreplace(swap)) == 0
    return (g1_u, g2_u), (g1_v, g2_v)


def choose(value: sp.Expr, rank: int) -> sp.Expr:
    result = sp.Integer(1)
    for offset in range(rank):
        result *= value - offset
    return sp.expand(result / factorial(rank))


def i2(n, edges):
    return sp.expand(choose(n, 2) - edges)


def i3(n, edges, wedges):
    return sp.expand(choose(n, 3) - edges * (n - 2) + wedges)


def i4(n, edges, wedges, connected3):
    return sp.expand(
        choose(n, 4)
        - edges * choose(n - 2, 2)
        + choose(edges, 2)
        + wedges * (n - 4)
        - connected3
    )


def i5(n, edges, wedges, connected3, q35, connected4):
    return sp.expand(
        choose(n, 5)
        - edges * choose(n - 2, 3)
        + choose(edges, 2) * (n - 4)
        + wedges * choose(n - 4, 2)
        - connected3 * (n - 4)
        - q35
        + connected4
    )


def invariant_forms(raw_g1: sp.Expr, raw_g2: sp.Expr):
    n, edges, du, dv, adjacent = sp.symbols(
        "n edge_count degree_u degree_v adjacent"
    )
    common = sp.Symbol("C_common_neighbor")
    re, ru, rv = sp.symbols("C_connected3_E C_connected3_U C_connected3_V")
    q35, r4 = sp.symbols("C_three_edge_five C_connected4_E")
    xu, xv, wedges = sp.symbols(
        "C_neighbor_excess_u C_neighbor_excess_v C_wedges_E"
    )
    eu, ev = edges - du, edges - dv
    ew = edges - du - dv + adjacent
    wu = wedges - choose(du, 2) - xu
    wv = wedges - choose(dv, 2) - xv
    ww = (
        wedges
        - choose(du, 2)
        - choose(dv, 2)
        - xu
        - xv
        + adjacent * (du + dv - 2)
        + common
    )
    rules = {
        **{sp.Symbol(f"c{name}0"): 1 for name in "EUVW"},
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
        sp.Symbol("cE2"): i2(n, edges),
        sp.Symbol("cU2"): i2(n - 1, eu),
        sp.Symbol("cV2"): i2(n - 1, ev),
        sp.Symbol("cW2"): i2(n - 2, ew),
        sp.Symbol("cE3"): i3(n, edges, wedges),
        sp.Symbol("cU3"): i3(n - 1, eu, wu),
        sp.Symbol("cV3"): i3(n - 1, ev, wv),
        sp.Symbol("cW3"): i3(n - 2, ew, ww),
        sp.Symbol("cE4"): i4(n, edges, wedges, re),
        sp.Symbol("cU4"): i4(n - 1, eu, wu, ru),
        sp.Symbol("cV4"): i4(n - 1, ev, wv, rv),
        sp.Symbol("cE5"): i5(n, edges, wedges, re, q35, r4),
    }
    g1 = sp.factor(raw_g1.subs(rules))
    g2 = sp.factor(raw_g2.subs(rules))
    motif_symbols = (re, ru, rv, q35, r4)
    motif = sp.factor(sum(sp.diff(g1, symbol) * symbol for symbol in motif_symbols))
    residual = sp.factor(g1 - motif)
    return g1, g2, motif, residual


def parse_with_symbols(text: str, expression: sp.Expr) -> sp.Expr:
    return sp.sympify(text, locals={str(symbol): symbol for symbol in expression.free_symbols})


def falling(value: int, degree: int) -> int:
    return factorial(value) // factorial(value - degree)


def compositions(total: int, parts: int):
    if parts == 1:
        yield (total,)
        return
    for first in range(total + 1):
        for tail in compositions(total - first, parts - 1):
            yield (first, *tail)


def simplex_coefficients(expression, variables, degree):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    power = dict(polynomial.terms())
    assert max(sum(monomial) for monomial in power) <= degree
    for alpha in compositions(degree, len(variables) + 1):
        selected = alpha[1:]
        value = 0
        for beta, coefficient in power.items():
            if all(b <= a for b, a in zip(beta, selected)):
                multiplier = sp.Integer(1)
                for a, b in zip(selected, beta):
                    multiplier *= falling(a, b)
                multiplier /= falling(degree, sum(beta))
                value += coefficient * multiplier
        yield alpha, sp.factor(value)


def reconstruct_simplex(coefficients, variables, degree):
    unused = 1 - sum(variables)
    answer = 0
    for alpha, coefficient in coefficients:
        multinomial = factorial(degree)
        for entry in alpha:
            multinomial //= factorial(entry)
        term = multinomial * unused ** alpha[0]
        for variable, exponent in zip(variables, alpha[1:]):
            term *= variable**exponent
        answer += coefficient * term
    return sp.expand(answer)


def nonnegative_power(expression, variable):
    return all(
        coefficient >= 0
        for coefficient in sp.Poly(sp.expand(expression), variable).all_coeffs()
    )


def feasible_branches():
    for adjacent, zu, zv in itertools.product((0, 1), repeat=3):
        if adjacent and not (zu and zv):
            continue
        yield adjacent, zu, zv


def monotonicity_checks(g1_residual: sp.Expr, g2: sp.Expr):
    one = {str(symbol): symbol for symbol in g1_residual.free_symbols}
    n, edges = one["n"], one["edge_count"]
    du, dv = one["degree_u"], one["degree_v"]
    adjacent = one["adjacent"]
    xu, xv = one["C_neighbor_excess_u"], one["C_neighbor_excess_v"]
    common, wedges = one["C_common_neighbor"], one["C_wedges_E"]
    d1 = {
        "neighbor_u": sp.factor(sp.diff(g1_residual, xu)),
        "neighbor_v": sp.factor(sp.diff(g1_residual, xv)),
        "common": sp.factor(sp.diff(g1_residual, common)),
        "wedges": sp.factor(sp.diff(g1_residual, wedges)),
    }
    expected1 = {
        "neighbor_u": -3 * dv - 2 * edges + 6 * n**2 - 13 * n - 10,
        "neighbor_v": -3 * du - 2 * edges + 6 * n**2 - 15 * n + 8,
        "common": -(-10 * edges + 5 * n**2 + 9 * n - 12) / 2,
        "wedges": -(
            6 * adjacent
            - 12 * du
            - 12 * dv
            + 8 * edges
            + 15 * n**2
            - 67 * n
            + 30
        ) / 2,
    }
    assert all(sp.expand(d1[key] - value) == 0 for key, value in expected1.items())
    m = sp.symbols("m", nonnegative=True)
    floors1 = {
        "neighbor_u": (6 * n**2 - 18 * n - 5).subs(n, 10 + m),
        "neighbor_v": (6 * n**2 - 20 * n + 13).subs(n, 10 + m),
        "negative_twice_common": (5 * n**2 - n - 2).subs(n, 10 + m),
        "negative_twice_wedges": (15 * n**2 - 79 * n + 30).subs(n, 10 + m),
    }
    assert all(nonnegative_power(value, m) for value in floors1.values())

    two = {str(symbol): symbol for symbol in g2.free_symbols}
    n2 = two["n"]
    d2 = {
        "common": sp.factor(sp.diff(g2, two["C_common_neighbor"])),
        "connected3_E": sp.factor(sp.diff(g2, two["C_connected3_E"])),
        "connected3_U": sp.factor(sp.diff(g2, two["C_connected3_U"])),
        "connected3_V": sp.factor(sp.diff(g2, two["C_connected3_V"])),
        "neighbor_u": sp.factor(sp.diff(g2, two["C_neighbor_excess_u"])),
        "neighbor_v": sp.factor(sp.diff(g2, two["C_neighbor_excess_v"])),
        "wedges": sp.factor(sp.diff(g2, two["C_wedges_E"])),
    }
    expected2 = {
        "common": -5 * n2 - 7,
        "connected3_E": sp.Integer(2),
        "connected3_U": sp.Integer(5),
        "connected3_V": sp.Integer(5),
        "neighbor_u": 12 * n2 - 17,
        "neighbor_v": 12 * n2 - 14,
        "wedges": -15 * n2 + 33,
    }
    assert all(sp.expand(d2[key] - value) == 0 for key, value in expected2.items())
    assert all(
        value.subs(n2, 3) > 0
        for key, value in expected2.items()
        if key not in ("common", "wedges")
    )
    assert expected2["common"].subs(n2, 3) < 0
    assert expected2["wedges"].subs(n2, 3) < 0
    return {
        "g1_exact_derivatives": {key: str(value) for key, value in d1.items()},
        "g1_n10_plus_m_floors": {key: str(sp.expand(value)) for key, value in floors1.items()},
        "g2_exact_derivatives": {key: str(value) for key, value in d2.items()},
    }


def lower_expression(expression, names, branch, n_value, x, y, r, is_g2=False):
    adjacent, zu, zv = branch
    du, dv = zu + x, zv + y
    edges = 1 + x + y + r
    wedge_upper = choose(du, 2) + choose(dv, 2) + choose(r + 1, 2)
    rules = {
        names["n"]: n_value,
        names["edge_count"]: edges,
        names["degree_u"]: du,
        names["degree_v"]: dv,
        names["adjacent"]: adjacent,
        names["C_common_neighbor"]: 1,
        names["C_neighbor_excess_u"]: 0,
        names["C_neighbor_excess_v"]: 0,
        names["C_wedges_E"]: wedge_upper,
    }
    if is_g2:
        for key in ("C_connected3_E", "C_connected3_U", "C_connected3_V"):
            rules[names[key]] = 0
    return sp.cancel(expression.subs(rules))


def bernstein_certificate(expression, cutoff: int, is_g2: bool):
    q = sp.symbols("q", nonnegative=True)
    variables = sp.symbols("s_x s_y s_r", nonnegative=True)
    sx, sy, sr = variables
    total = sp.Integer(cutoff - 2) + q
    x, y, r = total * sx, total * sy, total * sr
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    rows = []
    count = 0
    minimum = None
    minimum_record = None
    for branch in feasible_branches():
        polynomial = lower_expression(
            expression, names, branch, cutoff + q, x, y, r, is_g2=is_g2
        )
        # The direct simplex is x+y+r<=n-2.  Unlike stick breaking, no
        # triangular change of variables is used.
        degree = max(sum(monomial) for monomial in sp.Poly(polynomial, *variables).monoms())
        coefficients = list(simplex_coefficients(polynomial, variables, degree))
        assert sp.expand(reconstruct_simplex(coefficients, variables, degree) - polynomial) == 0
        local_minimum = None
        for alpha, coefficient in coefficients:
            assert nonnegative_power(coefficient, q)
            at_zero = sp.factor(coefficient.subs(q, 0))
            record = {
                "branch_adj_zu_zv": list(branch),
                "alpha_h_x_y_r": list(alpha),
                "coefficient": str(coefficient),
            }
            if local_minimum is None or at_zero < local_minimum:
                local_minimum = at_zero
            if minimum is None or at_zero < minimum:
                minimum = at_zero
                minimum_record = {**record, "value_at_cutoff": str(at_zero)}
            count += 1
        rows.append(
            {
                "branch_adj_zu_zv": list(branch),
                "simplex_degree": degree,
                "coefficient_count": len(coefficients),
                "minimum_at_cutoff": str(local_minimum),
            }
        )
    assert len(rows) == 5
    return {
        "orders": f"n>={cutoff}",
        "basis": "total-degree Bernstein basis on the three-simplex",
        "branches": len(rows),
        "coefficients": count,
        "exact_inversions": len(rows),
        "all_coefficients_power_nonnegative_in_q": True,
        "q_definition": f"q=n-{cutoff}",
        "minimum_at_cutoff": str(minimum),
        "minimum_record": minimum_record,
        "rows": rows,
    }


def unlabeled_forests(order: int):
    types = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining, start, chosen):
        if remaining == 0:
            yield nx.disjoint_union_all([types[index][1] for index in chosen])
            return
        for index in range(start, len(types)):
            size = types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def independence_polynomial(graph: nx.Graph, removed=frozenset()):
    active = [vertex for vertex in graph if vertex not in removed]
    answer = [0] * (len(graph) + 1)
    for mask in range(1 << len(active)):
        chosen = [active[index] for index in range(len(active)) if mask & (1 << index)]
        if all(not graph.has_edge(left, right) for left, right in itertools.combinations(chosen, 2)):
            answer[len(chosen)] += 1
    return tuple(answer)


def direct_endpoint(polynomials, u, v):
    crows = (
        polynomials[frozenset()],
        polynomials[frozenset((u,))],
        polynomials[frozenset((v,))],
        polynomials[frozenset((u, v))],
    )
    drows = (crows[1], crows[1], crows[3], crows[3])
    t0 = add_xd(crows, drows)
    t1 = add_xd(convolve_isolates(crows, 1, 5), drows)
    t2 = add_xd(convolve_isolates(crows, 2, 5), drows)
    gamma1 = nested(t1, 4) - nested(t0, 4) - nested(crows, 3)
    gamma2 = (
        nested(t2, 4)
        - nested(t0, 4)
        - nested(crows, 3)
        - nested(convolve_isolates(crows, 1, 4), 3)
    )
    return int(gamma1), int(gamma2 - 2 * gamma1)


def connected_edge_subsets(graph, count):
    answer = 0
    for chosen in itertools.combinations(tuple(graph.edges()), count):
        test = nx.Graph()
        test.add_edges_from(chosen)
        answer += int(len(test) == count + 1 and nx.is_connected(test))
    return answer


def q35_count(graph):
    return sum(
        int(len(set(itertools.chain.from_iterable(chosen))) == 5)
        for chosen in itertools.combinations(tuple(graph.edges()), 3)
    )


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

    def evaluate(values):
        vector = tuple(values[name] for name in names)
        numerator = 0
        for monomial, coefficient in terms:
            term = coefficient
            for base, exponent in zip(vector, monomial):
                if exponent:
                    term *= base**exponent
            numerator += term
        assert numerator % denominator == 0
        return numerator // denominator

    return evaluate


def invariant_data(graph, u, v):
    degree = dict(graph.degree())
    neighbors = {vertex: set(graph.neighbors(vertex)) for vertex in graph}
    gu = graph.copy()
    gu.remove_node(u)
    gv = graph.copy()
    gv.remove_node(v)
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
        "C_connected3_E": connected_edge_subsets(graph, 3),
        "C_connected3_U": connected_edge_subsets(gu, 3),
        "C_connected3_V": connected_edge_subsets(gv, 3),
        "C_three_edge_five": q35_count(graph),
        "C_connected4_E": connected_edge_subsets(graph, 4),
    }


def finite_census(g1, g2, motif, residual):
    evaluate_g1 = exact_evaluator(g1)
    evaluate_g2 = exact_evaluator(g2)
    evaluate_motif = exact_evaluator(motif)
    evaluate_residual = exact_evaluator(residual)
    total_forests = 0
    total_cells = 0
    minima = {key: None for key in ("g1", "g2", "motif", "residual")}
    by_order = {}
    for order, expected in FOREST_COUNTS.items():
        forests = list(unlabeled_forests(order))
        assert len(forests) == expected
        local_cells = 0
        for graph in forests:
            polynomials = {frozenset(): independence_polynomial(graph)}
            for vertex in graph:
                polynomials[frozenset((vertex,))] = independence_polynomial(
                    graph, frozenset((vertex,))
                )
            for u, v in itertools.combinations(graph.nodes(), 2):
                polynomials[frozenset((u, v))] = independence_polynomial(
                    graph, frozenset((u, v))
                )
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.permutations(graph.nodes(), 2):
                data = invariant_data(graph, u, v)
                direct1, direct2 = direct_endpoint(polynomials, u, v)
                values = {
                    "g1": evaluate_g1(data),
                    "g2": evaluate_g2(data),
                    "motif": evaluate_motif(data),
                    "residual": evaluate_residual(data),
                }
                assert direct1 == values["g1"]
                assert direct2 == values["g2"]
                assert values["g1"] == values["motif"] + values["residual"]
                assert all(value >= 0 for value in values.values())
                for key, value in values.items():
                    record = {
                        "value": value,
                        "order": order,
                        "graph6": graph6,
                        "parent_mark_u": u,
                        "other_mark_v": v,
                    }
                    if minima[key] is None or value < minima[key]["value"]:
                        minima[key] = record
                total_cells += 1
                local_cells += 1
        assert local_cells == expected * order * (order - 1)
        by_order[str(order)] = {
            "forest_types": len(forests),
            "ordered_endpoint_cells": local_cells,
        }
        total_forests += len(forests)
        print(json.dumps({"order": order, **by_order[str(order)]}, sort_keys=True), flush=True)
    return {
        "orders": [2, 9],
        "forest_types": total_forests,
        "ordered_endpoint_cells": total_cells,
        "direct_polynomial_cross_checks": total_cells,
        "negative": 0,
        "minima": minima,
        "by_order": by_order,
    }


def main():
    config = json.loads(CONFIG_REPORT.read_text(encoding="utf-8"))
    producer_g1 = json.loads(G1_REPORT.read_text(encoding="utf-8"))
    producer_g2 = json.loads(G2_REPORT.read_text(encoding="utf-8"))
    high = json.loads(HIGH_MOTIF_REPORT.read_text(encoding="utf-8"))
    q35_audit = json.loads(Q35_REPORT.read_text(encoding="utf-8"))
    assert config["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_CONFIGURATION_AGENT"
    assert producer_g1["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_ENDPOINT_PARENT_AGENT"
    assert producer_g2["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G2_ENDPOINT_PARENT_AGENT"
    assert high["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_HIGH_MOTIF_PAYMENT_AGENT"
    assert q35_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G1_I5_ROOT_CONFIGURATION_EQUIVALENCE_AUDIT_AGENT"

    (raw_g1, raw_g2), _other_endpoint = raw_endpoint_forms()
    raw_locals = {str(symbol): symbol for symbol in raw_g1.free_symbols | raw_g2.free_symbols}
    assert sp.expand(raw_g1 - sp.sympify(config["raw_forms"]["g1"], locals=raw_locals)) == 0
    assert sp.expand(raw_g2 - sp.sympify(config["raw_forms"]["g2"], locals=raw_locals)) == 0
    g1, g2, motif, residual = invariant_forms(raw_g1, raw_g2)
    assert sp.expand(g1 - parse_with_symbols(config["forest_invariant_forms"]["g1"], g1)) == 0
    assert sp.expand(g2 - parse_with_symbols(config["forest_invariant_forms"]["g2"], g2)) == 0
    assert sp.expand(motif - parse_with_symbols(config["g1_high_motif_part"], motif)) == 0
    assert sp.expand(residual - parse_with_symbols(config["g1_residual_without_high_motifs"], residual)) == 0

    names = {str(symbol): symbol for symbol in motif.free_symbols}
    n = names["n"]
    core = (
        2 * (n - 4) * names["C_connected3_E"]
        + 5 * names["C_three_edge_five"]
        - 5 * names["C_connected4_E"]
    )
    extras = (5 * n + 1) * names["C_connected3_U"] + (5 * n - 4) * names["C_connected3_V"]
    assert sp.expand(motif - core - extras) == 0

    monotonicity = monotonicity_checks(residual, g2)
    g1_certificate = bernstein_certificate(residual, 10, is_g2=False)
    g2_certificate = bernstein_certificate(g2, 3, is_g2=True)

    residual_names = {str(symbol): symbol for symbol in residual.free_symbols}
    nr = residual_names["n"]
    edgeless_g1 = sp.factor(
        residual.subs({symbol: 0 for symbol in residual.free_symbols if symbol != nr})
    )
    expected1 = (nr - 1) * (65 * nr**3 - 101 * nr**2 - 82 * nr + 144) / 24
    assert sp.expand(edgeless_g1 - expected1) == 0
    g2_names = {str(symbol): symbol for symbol in g2.free_symbols}
    n2 = g2_names["n"]
    edgeless_g2 = sp.factor(
        g2.subs({symbol: 0 for symbol in g2.free_symbols if symbol != n2})
    )
    assert sp.expand(edgeless_g2 - (10 * n2**3 - 13 * n2**2 - 4 * n2 + 6)) == 0
    for value, variable in ((65 * nr**3 - 101 * nr**2 - 82 * nr + 144, nr), (edgeless_g2, n2)):
        assert value.subs(variable, 3) > 0
        assert sp.diff(value, variable).subs(variable, 3) > 0
        assert sp.diff(value, variable, 2).subs(variable, 3) > 0

    census = finite_census(g1, g2, motif, residual)
    assert census["forest_types"] == 307
    assert census["ordered_endpoint_cells"] == 17720
    # Order two is algebraically admissible: G only needs the two distinct
    # marks because the parent is one of them.  It is outside both producer
    # finite ranges and must be retained as an explicit finite branch.
    assert census["minima"]["g1"]["value"] == 2
    assert census["minima"]["g2"]["value"] == 20
    assert census["minima"]["residual"]["value"] == 2

    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_G1_G2_AUDIT_G1_BERNSTEIN",
        "theorems": {
            "g1": (
                "For every forest G with distinct marks u,v, if the unique "
                "parent of a canonical deepest singleton support is u or v, g1>=0; "
                "the admissible order-two core is checked separately."
            ),
            "g2": (
                "For every forest G with distinct marks u,v, if the unique "
                "parent of a canonical deepest singleton support is u or v, g2>=0; "
                "the admissible order-two core is checked separately."
            ),
        },
        "independent_reconstruction": {
            "endpoint_u_rows": "D=(C_U,C_U,C_W,C_W)",
            "endpoint_v_rows": "D=(C_V,C_W,C_V,C_W)",
            "row_proof": (
                "For p=u, D=G-u. Deleting the already absent u changes nothing, "
                "while deleting v gives G-{u,v}; the p=v identity is symmetric."
            ),
            "raw_Gamma1_and_Gamma2_reconstructed": True,
            "forest_i2_through_i5_configuration_reconstructed": True,
            "p_v_equals_p_u_after_exact_mark_swap": True,
            "matches_configuration_report": True,
        },
        "high_motif_payment": {
            "decomposition": (
                "2(n-4)R3+5Q35-5R4+(5n+1)R3(G-u)+(5n-4)R3(G-v)"
            ),
            "proof": (
                "The universal containment count gives the first three terms "
                ">=3R4; the two deletion terms are nonnegative for n>=2."
            ),
            "q35_identity": q35_audit["q35_identity"]["formula"],
        },
        "monotonicity": monotonicity,
        "degree_excess_cone": {
            "parameters": "x=d_u-1[d_u>0], y=d_v-1[d_v>0], r=e-1-x-y",
            "proof": (
                "If c is the number of nontrivial components, total degree "
                "excess is e-c. Thus r is unselected excess plus c-1. Convex "
                "concentration proves W<=C(d_u,2)+C(d_v,2)+C(r+1,2)."
            ),
            "common_neighbor_cap": "at most one in a forest",
            "edgeless_g1_residual": str(edgeless_g1),
            "edgeless_g2": str(edgeless_g2),
        },
        "g1_large_order_certificate": g1_certificate,
        "g2_all_order_certificate": g2_certificate,
        "finite_census": census,
        "conclusion": (
            "The endpoint-parent cells are now independently proved for both "
            "g1 and g2. Combined with the prior p-distinct theorem, all canonical "
            "deepest singleton-parent placements are covered."
        ),
        "scope": (
            "Exact only for canonical deepest singleton-parent g1 and g2. The "
            "root/no-parent case, non-singleton or noncanonical supports, all g1/g2 "
            "bundle cells, rank-four FML, all N4, and Erdos Problem 993 remain open."
        ),
        "dependencies": {
            path.name: sha256(path)
            for path in (CONFIG_REPORT, G1_REPORT, G2_REPORT, HIGH_MOTIF_REPORT, Q35_REPORT)
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "g1": {key: value for key, value in g1_certificate.items() if key != "rows"},
        "g2": {key: value for key, value in g2_certificate.items() if key != "rows"},
        "finite": {key: value for key, value in census.items() if key != "by_order"},
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
