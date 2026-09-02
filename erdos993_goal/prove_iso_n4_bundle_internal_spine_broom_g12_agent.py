#!/usr/bin/env python3
"""Fail-closed theorem for rank-four g1,g2 in the internal-spine broom mode.

This proves the complete canonical internal protected-spine mode after the
deepest-eligible refinement: the child side is a one-ended broom B_(ell,k),
not necessarily a bare path.  Both p!=v and p=v are treated.  The proof uses
the universal high-motif containment payment and exact forest degree-excess,
stick-breaking Bernstein, and integer Newton certificates for the residual.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_leaf_bundle_telescope_agent import aggregate_vector


HERE = Path(__file__).resolve().parent
CONFIG = HERE / "iso_n4_bundle_internal_spine_broom_configuration_exact_agent_20260829.json"
HIGH = HERE / "iso_n4_bundle_g1_high_motif_payment_exact_agent_20260829.json"
OBSTRUCTION = HERE / "iso_n4_bundle_canonical_mode_exhaustiveness_obstruction_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_internal_spine_broom_g12_exact_agent_20260829.json"

EXPECTED = {
    CONFIG.name: "74A25AEA9F6902C6010524A23F8575847D6F030C3AFBC38C8B2BF5C8CA707754",
    HIGH.name: "40B28EFE5DD51C230F1442553274986D9EA402F71B6CD182F6109DCA926D2D0D",
    OBSTRUCTION.name: "260D0EED8DA5417FBADC045E27495D3E84BD57C3EDBA9E6AD2ED391912B3F5AB",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def c2(value):
    return sp.expand(value * (value - 1) / 2)


def tensor_bernstein(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(max(0, polynomial.degree(variable)) for variable in variables)
    power = dict(polynomial.terms())
    records = []
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = sp.Integer(0)
        for monomial, coefficient in power.items():
            if all(power_index <= bernstein_index for power_index, bernstein_index in zip(monomial, index)):
                multiplier = sp.Integer(1)
                for power_index, bernstein_index, degree in zip(monomial, index, degrees):
                    multiplier *= (
                        sp.binomial(bernstein_index, power_index)
                        / sp.binomial(degree, power_index)
                    )
                value += coefficient * multiplier
        records.append((index, sp.expand(value)))
    reconstruction = sp.Integer(0)
    for index, coefficient in records:
        basis = sp.Integer(1)
        for variable, degree, position in zip(variables, degrees, index):
            basis *= sp.binomial(degree, position) * variable ** position * (1 - variable) ** (degree - position)
        reconstruction += coefficient * basis
    assert sp.expand(reconstruction - expression) == 0
    return degrees, records


def newton_coefficients(expression, variables):
    current = {(): sp.expand(expression)}
    for variable in variables:
        following = {}
        for prefix, value in current.items():
            degree = max(0, sp.Poly(value, variable).degree())
            evaluations = [sp.expand(value.subs(variable, integer)) for integer in range(degree + 1)]
            coefficients = []
            while evaluations:
                coefficients.append(sp.expand(evaluations[0]))
                evaluations = [
                    sp.expand(evaluations[index + 1] - evaluations[index])
                    for index in range(len(evaluations) - 1)
                ]
            for index, coefficient in enumerate(coefficients):
                if coefficient != 0:
                    following[prefix + (index,)] = coefficient
        current = following
    reconstruction = sp.Integer(0)
    for index, coefficient in current.items():
        basis = sp.Integer(1)
        for variable, position in zip(variables, index):
            basis *= sp.binomial(variable, position)
        reconstruction += coefficient * basis
    assert sp.expand(sp.expand_func(reconstruction) - expression) == 0
    return current


def nonnegative_newton(expression, variables, label):
    coefficients = newton_coefficients(expression, variables)
    values = list(coefficients.values())
    assert values and all(not value.free_symbols and value >= 0 for value in values), (label, coefficients)
    stream = [f"{','.join(map(str, index))}:{value}" for index, value in sorted(coefficients.items())]
    return {
        "label": label,
        "coefficients": len(values),
        "minimum": str(min(values)),
        "ordered_stream_sha256": hashlib.sha256("\n".join(stream).encode()).hexdigest().upper(),
    }, coefficients


def shifted(expression, ell_value, m_start):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, q, k = sp.symbols("t q k", integer=True, nonnegative=True)
    substitutions = {}
    variables = []
    if "m" in names:
        substitutions[names["m"]] = m_start + t
        variables.append(t)
    if "ell" in names:
        substitutions[names["ell"]] = ell_value + q
        variables.append(q)
    if "k" in names:
        substitutions[names["k"]] = k
        variables.append(k)
    return sp.expand(expression.subs(substitutions)), tuple(variables)


def monotonicity_certificate(expression, ell_value, m_start, label, endpoint=False):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    m = names["m"]
    edges = names["F_edges"]
    checks = []

    def certify(form, suffix):
        shifted_form, variables = shifted(sp.expand(form), ell_value, m_start)
        certificate, _ = nonnegative_newton(shifted_form, variables, label + "_" + suffix)
        checks.append(certificate)

    if not endpoint:
        xp = names["F_neighbor_excess_p"]
        derivative = sp.diff(expression, xp)
        assert sp.diff(derivative, xp) == 0
        certify(derivative, "neighbor_excess_p_positive")
        common = names["F_common_neighbor"]
        derivative = sp.diff(expression, common)
        assert sp.diff(derivative, common) == 0
        certify(-derivative, "common_neighbor_negative")

    xv = names["F_neighbor_excess_v"]
    derivative = sp.diff(expression, xv)
    assert sp.diff(derivative, xv) == 0
    # Every forest satisfies e<=m-1; the only e dependence here is decreasing.
    if edges in derivative.free_symbols:
        assert sp.diff(derivative, edges) == -2
        derivative = derivative.subs(edges, m - 1)
    certify(derivative, "neighbor_excess_v_positive")

    wedges = names["F_wedges_E"]
    minus_derivative = -sp.diff(expression, wedges)
    assert sp.diff(minus_derivative, wedges) == 0
    degree_v = names["F_degree_v"]
    # -d/dW=-6d_v+4e+rest >= -2e+rest >= -2(m-1)+rest.
    degree_slope = sp.diff(minus_derivative, degree_v)
    edge_slope = sp.diff(minus_derivative, edges)
    assert (degree_slope, edge_slope) in ((sp.Integer(-6), sp.Integer(4)), (sp.Integer(0), sp.Integer(0)))
    floor = (
        minus_derivative.subs({degree_v: m - 1, edges: m - 1})
        if degree_slope == -6 else minus_derivative
    )
    certify(floor, "wedges_negative")
    return {"label": label, "checks": checks}


def cone_certificate(expression, ell_value, m_start, label, endpoint=False):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, q, k = sp.symbols("t q k", integer=True, nonnegative=True)
    m = m_start + t
    ell = ell_value + q if "ell" in names else ell_value
    total = m - 2
    variables = sp.symbols("a b", nonnegative=True) if endpoint else sp.symbols("a b c", nonnegative=True)
    a, b = variables[:2]
    c = variables[2] if not endpoint else None
    branch_records = []
    global_stream = []
    global_minimum = None
    bernstein_count = newton_count = 0
    if endpoint:
        branches = [(zv,) for zv in (0, 1)]
    else:
        branches = [
            (adjacent, zp, zv)
            for adjacent, zp, zv in itertools.product((0, 1), repeat=3)
            if not adjacent or (zp and zv)
        ]
    for branch in branches:
        if endpoint:
            (zv,) = branch
            y = total * a
            r = total * (1 - a) * b
            degree_v = zv + y
            edges = 1 + y + r
            wedge_upper = c2(degree_v) + c2(r + 1)
            substitutions = {
                names["m"]: m,
                names["F_edges"]: edges,
                names["F_degree_v"]: degree_v,
                names["F_neighbor_excess_v"]: 0,
                names["F_wedges_E"]: wedge_upper,
                names["k"]: k,
            }
        else:
            adjacent, zp, zv = branch
            x = total * a
            y = total * (1 - a) * b
            r = total * (1 - a) * (1 - b) * c
            degree_p, degree_v = zp + x, zv + y
            edges = 1 + x + y + r
            wedge_upper = c2(degree_p) + c2(degree_v) + c2(r + 1)
            substitutions = {
                names["m"]: m,
                names["F_edges"]: edges,
                names["F_degree_p"]: degree_p,
                names["F_degree_v"]: degree_v,
                names["F_adjacent"]: adjacent,
                names["F_common_neighbor"]: zp * zv,
                names["F_neighbor_excess_p"]: 0,
                names["F_neighbor_excess_v"]: 0,
                names["F_wedges_E"]: wedge_upper,
                names["k"]: k,
            }
        if "ell" in names:
            substitutions[names["ell"]] = ell
        lower = sp.expand(expression.subs(substitutions))
        degrees, bernstein = tensor_bernstein(lower, variables)
        outer = (t, q, k) if "ell" in names else (t, k)
        branch_minimum = None
        branch_newton = 0
        for index, coefficient in bernstein:
            newton = newton_coefficients(coefficient, outer)
            values = list(newton.values())
            assert values and all(not value.free_symbols and value >= 0 for value in values), (
                label, branch, index, newton
            )
            local_minimum = min(values)
            branch_minimum = local_minimum if branch_minimum is None else min(branch_minimum, local_minimum)
            global_minimum = local_minimum if global_minimum is None else min(global_minimum, local_minimum)
            for outer_index, value in sorted(newton.items()):
                global_stream.append(
                    f"{branch}|{index}|{outer_index}|{value}"
                )
            branch_newton += len(values)
        bernstein_count += len(bernstein)
        newton_count += branch_newton
        branch_records.append({
            "branch": list(branch), "degrees": list(degrees),
            "bernstein_coefficients": len(bernstein),
            "newton_coefficients": branch_newton,
            "minimum": str(branch_minimum),
        })
    return {
        "label": label,
        "ell": f">={ell_value}" if "ell" in names else ell_value,
        "m": f">={m_start}",
        "branches": branch_records,
        "bernstein_coefficients": bernstein_count,
        "newton_coefficients": newton_count,
        "minimum": str(global_minimum),
        "ordered_stream_sha256": hashlib.sha256("\n".join(global_stream).encode()).hexdigest().upper(),
    }


def endpoint_edgeless(expression, ell_value, label):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, q, k = sp.symbols("t q k", integer=True, nonnegative=True)
    substitutions = {
        names["m"]: 1 + t,
        names["F_edges"]: 0,
        names["F_degree_v"]: 0,
        names["F_neighbor_excess_v"]: 0,
        names["F_wedges_E"]: 0,
        names["k"]: k,
    }
    variables = [t]
    if "ell" in names:
        substitutions[names["ell"]] = ell_value + q
        variables.append(q)
    variables.append(k)
    value = sp.expand(expression.subs(substitutions))
    certificate, _ = nonnegative_newton(value, tuple(variables), label)
    certificate.update({"ell": f">={ell_value}" if "ell" in names else ell_value, "m": ">=1, e=0"})
    return certificate


def unlabeled_forests(order):
    if order == 1:
        return [nx.empty_graph(1)]
    tree_types = []
    for size in range(1, order + 1):
        trees = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for tree in trees:
            tree_types.append((size, nx.convert_node_labels_to_integers(tree)))
    answer = []

    def extend(remaining, start, chosen):
        if remaining == 0:
            answer.append(nx.disjoint_union_all([tree_types[index][1] for index in chosen]))
            return
        for index in range(start, len(tree_types)):
            size = tree_types[index][0]
            if size > remaining:
                break
            extend(remaining - size, index, (*chosen, index))

    extend(order, 0, ())
    return answer


def connected_edges(graph, count):
    answer = 0
    for chosen in itertools.combinations(graph.edges(), count):
        test = nx.Graph(); test.add_edges_from(chosen)
        answer += int(len(test) == count + 1 and nx.is_connected(test))
    return answer


def three_edge_five(graph):
    return sum(
        len(set(itertools.chain.from_iterable(chosen))) == 5
        for chosen in itertools.combinations(graph.edges(), 3)
    )


def invariant_data(graph, p, v, endpoint=False):
    degree = dict(graph.degree())
    gv = graph.copy(); gv.remove_node(v)
    data = {
        "m": len(graph), "F_edges": graph.number_of_edges(),
        "F_degree_v": degree[v],
        "F_neighbor_excess_v": sum(degree[x] - 1 for x in graph.neighbors(v)),
        "F_wedges_E": sum(comb(value, 2) for value in degree.values()),
        "F_connected3_E": connected_edges(graph, 3),
        "F_connected3_V": connected_edges(gv, 3),
        "F_three_edge_five": three_edge_five(graph),
        "F_connected4_E": connected_edges(graph, 4),
    }
    if endpoint:
        return data
    gp = graph.copy(); gp.remove_node(p)
    data.update({
        "F_degree_p": degree[p], "F_adjacent": int(graph.has_edge(p, v)),
        "F_common_neighbor": len(set(graph.neighbors(p)) & set(graph.neighbors(v))),
        "F_neighbor_excess_p": sum(degree[x] - 1 for x in graph.neighbors(p)),
        "F_connected3_P": connected_edges(gp, 3),
    })
    return data


def substitute_data(expression, data):
    return sp.expand(expression.subs({symbol: data[str(symbol)] for symbol in expression.free_symbols if str(symbol) in data}))


def direct_values(forest, ell, collisions, p, v):
    forest = nx.convert_node_labels_to_integers(forest)
    order = len(forest)
    path = list(range(order, order + ell))
    support = order + ell
    leaves = list(range(support + 1, support + 1 + collisions))
    base = forest.copy(); base.add_nodes_from((*path, support, *leaves))
    base.add_edges_from(zip(path, path[1:]))
    base.add_edge(support, path[0]); base.add_edge(support, p)
    u = path[-1]
    base.add_edges_from((u, leaf) for leaf in leaves)
    gamma1 = aggregate_vector(base, (u, v), support, 1)[4]
    gamma2 = aggregate_vector(base, (u, v), support, 2)[4]
    return gamma1, gamma2 - 2 * gamma1


def finite_exceptions(config):
    cases = ((1, 2), (1, 3), (2, 2))
    records = []
    minima = {"p_distinct_v": {"g1": None, "g2": None}, "p_equals_v": {"g1": None, "g2": None}}
    counts = {"p_distinct_v": 0, "p_equals_v": 0}
    newton_total = 0
    stream = []
    for ell, order in cases:
        forests = unlabeled_forests(order)
        two_expressions = tuple(
            sp.sympify(config["p_distinct_v"]["small"][str(ell)][coefficient]["form"])
            for coefficient in ("g1", "g2")
        )
        end_expressions = tuple(
            sp.sympify(config["p_equals_v"]["small"][str(ell)][coefficient]["form"])
            for coefficient in ("g1", "g2")
        )
        for forest in forests:
            graph6 = nx.to_graph6_bytes(forest, header=False).decode().strip()
            for p, v in itertools.permutations(forest.nodes(), 2):
                if not nx.has_path(forest, p, v):
                    continue
                data = invariant_data(forest, p, v, endpoint=False)
                polynomials = tuple(substitute_data(expression, data) for expression in two_expressions)
                for coefficient_name, polynomial in zip(("g1", "g2"), polynomials):
                    k = next(symbol for symbol in polynomial.free_symbols if str(symbol) == "k")
                    certificate = newton_coefficients(polynomial, (k,))
                    values = list(certificate.values())
                    assert values and all(not value.free_symbols and value >= 0 for value in values)
                    newton_total += len(values)
                    stream.extend(f"two|{ell}|{graph6}|{p}|{v}|{coefficient_name}|{index}|{value}" for index, value in certificate.items())
                    origin = int(polynomial.subs(k, 0))
                    old = minima["p_distinct_v"][coefficient_name]
                    minima["p_distinct_v"][coefficient_name] = origin if old is None else min(old, origin)
                degree = max(sp.Poly(polynomial, k).degree() for polynomial in polynomials)
                for collision in range(degree + 1):
                    configured = tuple(int(polynomial.subs(k, collision)) for polynomial in polynomials)
                    assert configured == direct_values(forest, ell, collision, p, v)
                records.append(("two", ell, graph6, p, v))
                counts["p_distinct_v"] += 1

            if forest.number_of_edges() == 0:
                continue
            for v in forest.nodes():
                data = invariant_data(forest, v, v, endpoint=True)
                polynomials = tuple(substitute_data(expression, data) for expression in end_expressions)
                for coefficient_name, polynomial in zip(("g1", "g2"), polynomials):
                    k = next(symbol for symbol in polynomial.free_symbols if str(symbol) == "k")
                    certificate = newton_coefficients(polynomial, (k,))
                    values = list(certificate.values())
                    assert values and all(not value.free_symbols and value >= 0 for value in values)
                    newton_total += len(values)
                    stream.extend(f"end|{ell}|{graph6}|{v}|{coefficient_name}|{index}|{value}" for index, value in certificate.items())
                    origin = int(polynomial.subs(k, 0))
                    old = minima["p_equals_v"][coefficient_name]
                    minima["p_equals_v"][coefficient_name] = origin if old is None else min(old, origin)
                degree = max(sp.Poly(polynomial, k).degree() for polynomial in polynomials)
                for collision in range(degree + 1):
                    configured = tuple(int(polynomial.subs(k, collision)) for polynomial in polynomials)
                    assert configured == direct_values(forest, ell, collision, v, v)
                records.append(("end", ell, graph6, v))
                counts["p_equals_v"] += 1
    assert counts == {"p_distinct_v": 12, "p_equals_v": 10}, counts
    return {
        "cases": [list(case) for case in cases],
        "cells": counts,
        "newton_coefficients": newton_total,
        "minima_at_k0": minima,
        "ordered_stream_sha256": hashlib.sha256("\n".join(stream).encode()).hexdigest().upper(),
        "direct_cross_check": (
            "Every configuration polynomial was checked against the defining Gamma "
            "coefficients for k=0 through its exact polynomial degree."
        ),
        "record_sha256": hashlib.sha256(json.dumps(records, separators=(",", ":")).encode()).hexdigest().upper(),
    }


def motif_assertions(config, endpoint=False):
    branch = config["p_equals_v" if endpoint else "p_distinct_v"]
    cases = [(None, branch["tail"])] + [(ell, branch["small"][str(ell)]) for ell in range(1, 6)]
    for ell_value, case in cases:
        g1, g2 = sp.sympify(case["motif_g1"]), sp.sympify(case["motif_g2"])
        symbols = {name: sp.Symbol(name) for name in (
            "m", "ell", "k", "F_connected3_E", "F_connected3_P",
            "F_connected3_V", "F_three_edge_five", "F_connected4_E"
        )}
        length = symbols["ell"] if ell_value is None else sp.Integer(ell_value)
        expected1 = (7 * (symbols["m"] + symbols["k"] + length) - 12) * symbols["F_connected3_E"]
        expected1 += (5 * (symbols["m"] + symbols["k"] + length) + (1 if endpoint else -4)) * symbols["F_connected3_V"]
        expected1 += 5 * symbols["F_three_edge_five"] - 5 * symbols["F_connected4_E"]
        if not endpoint:
            expected1 += 5 * symbols["F_connected3_P"]
        expected2 = 7 * symbols["F_connected3_E"] + 5 * symbols["F_connected3_V"]
        assert sp.expand(g1 - expected1) == 0
        assert sp.expand(g2 - expected2) == 0


def main():
    for path, expected in ((CONFIG, EXPECTED[CONFIG.name]), (HIGH, EXPECTED[HIGH.name]), (OBSTRUCTION, EXPECTED[OBSTRUCTION.name])):
        assert sha256(path) == expected, (path, sha256(path), expected)
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    high = json.loads(HIGH.read_text(encoding="utf-8"))
    obstruction = json.loads(OBSTRUCTION.read_text(encoding="utf-8"))
    assert config["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_BROOM_CONFIGURATION_AGENT"
    assert high["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_HIGH_MOTIF_PAYMENT_AGENT"
    assert high["theorem"].startswith("For every forest G on n vertices, 2(n-4)R3(G)+5Q35(G)-5R4(G)")
    assert obstruction["marker"] == "EXACT_OBSTRUCTION_CANONICAL_RANK4_BUNDLE_MODE_EXHAUSTIVENESS_AGENT"
    motif_assertions(config, endpoint=False)
    motif_assertions(config, endpoint=True)

    thresholds = {1: 4, 2: 3, 3: 2, 4: 2, 5: 2}
    cone = {"p_distinct_v": [], "p_equals_v": []}
    monotonicity = {"p_distinct_v": [], "p_equals_v": []}
    edgeless = []
    for branch, endpoint in (("p_distinct_v", False), ("p_equals_v", True)):
        cases = [("tail", config[branch]["tail"], 6, 2)] + [
            (f"ell{ell}", config[branch]["small"][str(ell)], ell, thresholds[ell])
            for ell in range(1, 6)
        ]
        for case_name, case, ell_value, m_start in cases:
            for coefficient in ("g1", "g2"):
                expression = sp.sympify(case[f"residual_{coefficient}"])
                label = f"{branch}_{case_name}_{coefficient}"
                monotonicity[branch].append(
                    monotonicity_certificate(expression, ell_value, m_start, label, endpoint=endpoint)
                )
                cone[branch].append(
                    cone_certificate(expression, ell_value, m_start, label, endpoint=endpoint)
                )
                if endpoint:
                    edgeless.append(endpoint_edgeless(expression, ell_value, label + "_edgeless"))

    exceptions = finite_exceptions(config)
    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_BROOM_G12_AGENT",
        "theorem": (
            "For every canonical rank-four deepest ordinary sibling bundle whose "
            "support lies internally on the protected u-v spine, the binomial "
            "coefficients g1 and g2 are nonnegative. This includes every broom "
            "length ell>=1, every collision-leaf count k>=0 at marked u, and both "
            "p!=v and endpoint collision p=v."
        ),
        "structural_exhaustion": {
            "statement": (
                "Root the marked component at v. Below an internal deepest eligible "
                "support s, the unique branch containing u is a path from a=N(s) "
                "to u, with only arbitrary leaves directly supported by marked u."
            ),
            "proof": (
                "Any off-path branch at an unmarked path vertex has an unmarked "
                "terminal leaf whose support is unmarked, producing a deeper eligible "
                "support. Any branch below u of depth at least two has the same "
                "property. The only protected terminals not causing this contradiction "
                "are leaves adjacent directly to marked u. Hence the child side is "
                "exactly B_(ell,k). The parent-side neighbor is either p!=v or p=v; "
                "these two branches are exhaustive."
            ),
            "parameters": "ell>=1, k>=0; p and v lie in the same parent-side component when p!=v",
        },
        "configuration": config["structural_rows"],
        "motif_payment": {
            "universal_core": high["theorem"],
            "p_distinct_v_decomposition": (
                "[2(m-4)R3+5Q35-5R4]+(7ell+7k+5m-4)R3"
                "+5R3(F-p)+(5ell+5k+5m-4)R3(F-v)"
            ),
            "p_equals_v_decomposition": (
                "[2(m-4)R3+5Q35-5R4]+(7ell+7k+5m-4)R3"
                "+(5ell+5k+5m+1)R3(F-v)"
            ),
            "g2": "7R3(F)+5R3(F-v)>=0",
        },
        "forest_cone": {
            "degree_excess_bound": (
                "For e>0, total nonisolated degree excess is at most e-1. "
                "After reserving x=d_p-z_p and y=d_v-z_v, convexity gives "
                "W<=C(d_p,2)+C(d_v,2)+C(r+1,2), r=e-1-x-y. "
                "For p=v omit the p term and use r=e-1-y."
            ),
            "common_neighbor": "A forest has at most one common neighbor, so common(p,v)<=z_p z_v.",
            "stick_breaking": (
                "x=(m-2)a, y=(m-2)(1-a)b, r=(m-2)(1-a)(1-b)c "
                "(endpoint: y=(m-2)a,r=(m-2)(1-a)b), with each box variable in [0,1]."
            ),
            "basis": (
                "Every continuous box branch is reconstructed exactly in the tensor "
                "Bernstein basis; every unbounded integer coefficient is reconstructed "
                "exactly in the Newton basis C(t,i)C(q,j)C(k,h)."
            ),
        },
        "monotonicity": monotonicity,
        "cone_certificates": cone,
        "endpoint_edgeless": edgeless,
        "finite_exception_certificates": exceptions,
        "coverage": {
            "tail": "ell>=6, k>=0; m>=2 for e>0",
            "small": "ell=1..5 exact truncated rows, k>=0",
            "thresholds": thresholds,
            "exceptions": "(ell,m)=(1,2),(1,3),(2,2), universally in k via exact Newton certificates",
            "endpoint_edgeless": "all ell>=1, k>=0, m>=1",
        },
        "dependencies": {
            CONFIG.name: {"sha256": sha256(CONFIG), "source_sha256": config["source_sha256"], "marker": config["marker"]},
            HIGH.name: {"sha256": sha256(HIGH), "source_sha256": high["source_sha256"], "marker": high["marker"]},
            OBSTRUCTION.name: {"sha256": sha256(OBSTRUCTION), "source_sha256": obstruction["source_sha256"], "marker": obstruction["marker"]},
        },
        "scope_guard": (
            "This is exactly the internal protected-spine ordinary-bundle mode. "
            "It does not by itself assert the already separate off-spine singleton, "
            "no-parent, endpoint marked-leaf, higher-rank, or full Erdos-993 theorems."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    compact = {
        "marker": report["marker"],
        "cone": {
            branch: {
                "certificates": len(values),
                "bernstein_coefficients": sum(value["bernstein_coefficients"] for value in values),
                "newton_coefficients": sum(value["newton_coefficients"] for value in values),
                "minimum": min(int(value["minimum"]) for value in values),
            }
            for branch, values in cone.items()
        },
        "finite_exceptions": exceptions,
        "report_sha256_lf": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }
    print(json.dumps(compact, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
