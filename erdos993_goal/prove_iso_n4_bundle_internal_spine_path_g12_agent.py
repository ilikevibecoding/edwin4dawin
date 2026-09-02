#!/usr/bin/env python3
"""Prove rank-four g1,g2 for every canonical internal-spine sibling bundle.

The marked component is rooted at v.  A deepest eligible support s on the
u-v connector has a bare child path P_ell ending at u.  This proof treats
both parent cases: p distinct from v, and the endpoint collision p=v.
Path lengths ell=1..5 use exact truncated rows; ell>=6 uses the polynomial
path tail.  Every large branch is certified in an exact Bernstein basis and
the finitely excluded tiny F orders are replayed directly.
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
CONFIG_TWO = HERE / "iso_n4_bundle_internal_spine_path_configuration_exact_agent_20260829.json"
CONFIG_END = HERE / "iso_n4_bundle_internal_spine_endpoint_parent_configuration_exact_agent_20260829.json"
HIGH = HERE / "iso_n4_bundle_g1_high_motif_payment_exact_agent_20260829.json"
OBSTRUCTION = HERE / "iso_n4_bundle_canonical_mode_exhaustiveness_obstruction_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_internal_spine_path_g12_exact_agent_20260829.json"
FOREST_COUNTS = {1: 1, 2: 2, 3: 3}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def tensor_bernstein(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(max(0, polynomial.degree(variable)) for variable in variables)
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


def reconstruct_bernstein(records, variables, degrees):
    result = 0
    for index, coefficient in records:
        term = coefficient
        for variable, degree, position in zip(variables, degrees, index):
            term *= (
                sp.binomial(degree, position)
                * variable**position
                * (1 - variable) ** (degree - position)
            )
        result += term
    return sp.expand(result)


def power_nonnegative(expression, variables):
    return all(
        coefficient >= 0
        for coefficient in sp.Poly(sp.expand(expression), *variables).coeffs()
    )


def shifted_value(expression, names, ell_value, m_start, t, q):
    substitutions = {names["m"]: m_start + t}
    if "ell" in names:
        substitutions[names["ell"]] = ell_value + q
    return sp.factor(expression.subs(substitutions))


def audit_two_mark_monotonicity(expression, ell_value, m_start, label):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, q = sp.symbols("t q", nonnegative=True)
    outer = (t, q) if "ell" in names else (t,)
    derivatives = {
        key: sp.factor(sp.diff(expression, names[key]))
        for key in (
            "F_neighbor_excess_p", "F_neighbor_excess_v",
            "F_common_neighbor", "F_wedges_E",
        )
    }
    xp_floor = shifted_value(
        derivatives["F_neighbor_excess_p"], names, ell_value, m_start, t, q
    )
    xv_floor = shifted_value(
        derivatives["F_neighbor_excess_v"].subs(
            names["F_edges"], names["m"] - 1
        ),
        names,
        ell_value,
        m_start,
        t,
        q,
    )
    common_floor = shifted_value(
        -derivatives["F_common_neighbor"], names, ell_value, m_start, t, q
    )
    wedge_floor = shifted_value(
        (-derivatives["F_wedges_E"]).subs({
            names["F_degree_v"]: names["m"] - 1,
            names["F_edges"]: 0,
        }),
        names,
        ell_value,
        m_start,
        t,
        q,
    )
    floors = {
        "neighbor_excess_p": xp_floor,
        "neighbor_excess_v": xv_floor,
        "negated_common": common_floor,
        "negated_wedge": wedge_floor,
    }
    assert all(power_nonnegative(value, outer) for value in floors.values())
    assert all(value.subs({t: 0, q: 0}) >= 0 for value in floors.values())
    return {"label": label, **{key: str(value) for key, value in floors.items()}}


def audit_endpoint_monotonicity(expression, ell_value, m_start, label):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, q = sp.symbols("t q", nonnegative=True)
    outer = (t, q) if "ell" in names else (t,)
    excess = sp.diff(expression, names["F_neighbor_excess_v"])
    wedge = sp.diff(expression, names["F_wedges_E"])
    excess_floor = shifted_value(
        excess.subs(names["F_edges"], names["m"] - 1),
        names,
        ell_value,
        m_start,
        t,
        q,
    )
    wedge_floor = shifted_value(
        (-wedge).subs({
            names["F_degree_v"]: names["m"] - 1,
            names["F_edges"]: 0,
        }),
        names,
        ell_value,
        m_start,
        t,
        q,
    )
    assert power_nonnegative(excess_floor, outer)
    assert power_nonnegative(wedge_floor, outer)
    assert excess_floor.subs({t: 0, q: 0}) >= 0
    assert wedge_floor.subs({t: 0, q: 0}) >= 0
    return {
        "label": label,
        "neighbor_excess": str(excess_floor),
        "negated_wedge": str(wedge_floor),
    }


def certify_two_mark(expression, ell_value, m_start, label):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, q = sp.symbols("t q", nonnegative=True)
    a, b, c = sp.symbols("a b c", nonnegative=True)
    box = (a, b, c)
    m = m_start + t
    ell = ell_value + q if "ell" in names else ell_value
    total = m - 2
    stream = []
    profiles = set()
    minimum = None
    minimum_witness = None
    branch_count = 0
    for adjacent, zp, zv in itertools.product((0, 1), repeat=3):
        if adjacent and not (zp and zv):
            continue
        x = total * a
        y = total * (1 - a) * b
        r = total * (1 - a) * (1 - b) * c
        dp, dv = zp + x, zv + y
        edges = 1 + x + y + r
        wedge_upper = dp * (dp - 1) / 2 + dv * (dv - 1) / 2 + r * (r + 1) / 2
        substitutions = {
            names["m"]: m,
            names["F_edges"]: edges,
            names["F_degree_p"]: dp,
            names["F_degree_v"]: dv,
            names["F_adjacent"]: adjacent,
            names["F_common_neighbor"]: zp * zv,
            names["F_neighbor_excess_p"]: 0,
            names["F_neighbor_excess_v"]: 0,
            names["F_wedges_E"]: wedge_upper,
        }
        if "ell" in names:
            substitutions[names["ell"]] = ell
        lower = sp.factor(expression.subs(substitutions))
        records = []
        branch = [adjacent, zp, zv]
        degrees = None
        for degrees, index, coefficient in tensor_bernstein(lower, box):
            outer = (t, q) if "ell" in names else (t,)
            assert power_nonnegative(coefficient, outer)
            origin = sp.factor(coefficient.subs({t: 0, q: 0}))
            record = {
                "branch_adj_zp_zv": branch,
                "index": list(index),
                "coefficient": str(coefficient),
            }
            if minimum is None or origin < minimum:
                minimum = origin
                minimum_witness = record
            stream.append(record)
            records.append((index, coefficient))
            profiles.add(degrees)
        assert sp.expand(reconstruct_bernstein(records, box, degrees) - lower) == 0
        branch_count += 1
    expected_count = 320 if label.endswith("g1") else 135
    assert branch_count == 5 and len(stream) == expected_count and minimum > 0
    return {
        "label": label,
        "ell": f">={ell_value}" if "ell" in names else ell_value,
        "m": f">={m_start}",
        "branches": branch_count,
        "degree_profiles": [list(profile) for profile in sorted(profiles)],
        "coefficients": len(stream),
        "minimum_at_origin": str(minimum),
        "minimum_witness": minimum_witness,
        "ordered_stream_sha256": hashlib.sha256(
            json.dumps(stream, separators=(",", ":"), sort_keys=True).encode()
        ).hexdigest().upper(),
    }


def certify_endpoint(expression, ell_value, m_start, label):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, q = sp.symbols("t q", nonnegative=True)
    a, b = sp.symbols("a b", nonnegative=True)
    box = (a, b)
    m = m_start + t
    ell = ell_value + q if "ell" in names else ell_value
    total = m - 2
    stream = []
    profiles = set()
    minimum = None
    minimum_witness = None
    for zv in (0, 1):
        y = total * a
        r = total * (1 - a) * b
        degree = zv + y
        edges = 1 + y + r
        wedge_upper = degree * (degree - 1) / 2 + r * (r + 1) / 2
        substitutions = {
            names["m"]: m,
            names["F_edges"]: edges,
            names["F_degree_v"]: degree,
            names["F_neighbor_excess_v"]: 0,
            names["F_wedges_E"]: wedge_upper,
        }
        if "ell" in names:
            substitutions[names["ell"]] = ell
        lower = sp.factor(expression.subs(substitutions))
        records = []
        degrees = None
        for degrees, index, coefficient in tensor_bernstein(lower, box):
            outer = (t, q) if "ell" in names else (t,)
            assert power_nonnegative(coefficient, outer)
            origin = sp.factor(coefficient.subs({t: 0, q: 0}))
            record = {"branch_zv": zv, "index": list(index), "coefficient": str(coefficient)}
            if minimum is None or origin < minimum:
                minimum = origin
                minimum_witness = record
            stream.append(record)
            records.append((index, coefficient))
            profiles.add(degrees)
        assert sp.expand(reconstruct_bernstein(records, box, degrees) - lower) == 0
    expected_count = 32 if label.endswith("g1") else 18
    assert len(stream) == expected_count and minimum > 0
    return {
        "label": label,
        "ell": f">={ell_value}" if "ell" in names else ell_value,
        "m": f">={m_start}, F has an edge",
        "branches": 2,
        "degree_profiles": [list(profile) for profile in sorted(profiles)],
        "coefficients": len(stream),
        "minimum_at_origin": str(minimum),
        "minimum_witness": minimum_witness,
        "ordered_stream_sha256": hashlib.sha256(
            json.dumps(stream, separators=(",", ":"), sort_keys=True).encode()
        ).hexdigest().upper(),
    }


def certify_endpoint_edgeless(expression, ell_value, label):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    t, q = sp.symbols("t q", nonnegative=True)
    substitutions = {
        names["m"]: t + 1,
        names["F_edges"]: 0,
        names["F_degree_v"]: 0,
        names["F_neighbor_excess_v"]: 0,
        names["F_wedges_E"]: 0,
    }
    if "ell" in names:
        substitutions[names["ell"]] = ell_value + q
    value = sp.factor(expression.subs(substitutions))
    outer = (t, q) if "ell" in names else (t,)
    assert power_nonnegative(value, outer)
    assert value.subs({t: 0, q: 0}) > 0
    return {
        "label": label,
        "ell": f">={ell_value}" if "ell" in names else ell_value,
        "m": ">=1, F edgeless",
        "form": str(value),
        "minimum_at_origin": str(value.subs({t: 0, q: 0})),
    }


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


def two_mark_data(graph, p, v):
    degree = dict(graph.degree())
    gp = graph.copy(); gp.remove_node(p)
    gv = graph.copy(); gv.remove_node(v)
    return {
        "m": len(graph),
        "F_edges": graph.number_of_edges(),
        "F_degree_p": degree[p],
        "F_degree_v": degree[v],
        "F_adjacent": int(graph.has_edge(p, v)),
        "F_common_neighbor": len(set(graph.neighbors(p)) & set(graph.neighbors(v))),
        "F_neighbor_excess_p": sum(degree[x] - 1 for x in graph.neighbors(p)),
        "F_neighbor_excess_v": sum(degree[x] - 1 for x in graph.neighbors(v)),
        "F_wedges_E": sum(comb(value, 2) for value in degree.values()),
        "F_connected3_E": connected_edges(graph, 3),
        "F_connected3_P": connected_edges(gp, 3),
        "F_connected3_V": connected_edges(gv, 3),
        "F_three_edge_five": three_edge_five(graph),
        "F_connected4_E": connected_edges(graph, 4),
    }


def endpoint_data(graph, v):
    degree = dict(graph.degree())
    gv = graph.copy(); gv.remove_node(v)
    return {
        "m": len(graph),
        "F_edges": graph.number_of_edges(),
        "F_degree_v": degree[v],
        "F_neighbor_excess_v": sum(degree[x] - 1 for x in graph.neighbors(v)),
        "F_wedges_E": sum(comb(value, 2) for value in degree.values()),
        "F_connected3_E": connected_edges(graph, 3),
        "F_connected3_V": connected_edges(gv, 3),
        "F_three_edge_five": three_edge_five(graph),
        "F_connected4_E": connected_edges(graph, 4),
    }


def exact_evaluator(expression):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *symbols)
    denominator = 1
    for coefficient in polynomial.coeffs():
        denominator = sp.ilcm(denominator, int(coefficient.q))
    terms = tuple((powers, int(coefficient * denominator)) for powers, coefficient in polynomial.terms())

    def evaluate(data):
        value = 0
        for powers, coefficient in terms:
            term = coefficient
            for symbol, power in zip(symbols, powers):
                if power:
                    term *= data[str(symbol)] ** power
            value += term
        assert value % denominator == 0
        return value // denominator

    return evaluate


def direct_values(forest, ell, p, v):
    forest = nx.convert_node_labels_to_integers(forest)
    m = len(forest)
    path = list(range(m, m + ell))
    support = m + ell
    base = forest.copy()
    base.add_nodes_from((*path, support))
    base.add_edges_from(zip(path, path[1:]))
    base.add_edge(support, path[0])
    base.add_edge(support, p)
    u = path[-1]
    gamma1 = aggregate_vector(base, (u, v), support, 1)[4]
    gamma2 = aggregate_vector(base, (u, v), support, 2)[4]
    return gamma1, gamma2 - 2 * gamma1


def finite_exceptions(config_two, config_end):
    records = {"p_distinct": [], "p_equals_v": []}
    minima = {"p_distinct": {"g1": None, "g2": None}, "p_equals_v": {"g1": None, "g2": None}}
    for ell, order in ((1, 2), (1, 3), (2, 2)):
        expressions = (
            sp.sympify(config_two["small_lengths"][str(ell)]["g1"]["form"]),
            sp.sympify(config_two["small_lengths"][str(ell)]["g2"]["form"]),
        )
        evaluators = tuple(map(exact_evaluator, expressions))
        for forest in unlabeled_forests(order):
            graph6 = nx.to_graph6_bytes(forest, header=False).decode().strip()
            for p, v in itertools.permutations(forest.nodes(), 2):
                data = two_mark_data(forest, p, v)
                configured = tuple(evaluator(data) for evaluator in evaluators)
                direct = direct_values(forest, ell, p, v)
                assert configured == direct and min(configured) >= 0
                record = {"ell": ell, "m": order, "graph6": graph6, "p": p, "v": v, "g1": configured[0], "g2": configured[1]}
                records["p_distinct"].append(record)
                for key, value in zip(("g1", "g2"), configured):
                    if minima["p_distinct"][key] is None or value < minima["p_distinct"][key]:
                        minima["p_distinct"][key] = value

        expressions = (
            sp.sympify(config_end["small_lengths"][str(ell)]["g1"]["form"]),
            sp.sympify(config_end["small_lengths"][str(ell)]["g2"]["form"]),
        )
        evaluators = tuple(map(exact_evaluator, expressions))
        for forest in unlabeled_forests(order):
            graph6 = nx.to_graph6_bytes(forest, header=False).decode().strip()
            for v in forest.nodes():
                data = endpoint_data(forest, v)
                configured = tuple(evaluator(data) for evaluator in evaluators)
                direct = direct_values(forest, ell, v, v)
                assert configured == direct and min(configured) >= 0
                record = {"ell": ell, "m": order, "graph6": graph6, "v": v, "g1": configured[0], "g2": configured[1]}
                records["p_equals_v"].append(record)
                for key, value in zip(("g1", "g2"), configured):
                    if minima["p_equals_v"][key] is None or value < minima["p_equals_v"][key]:
                        minima["p_equals_v"][key] = value
    assert len(records["p_distinct"]) == 26
    assert len(records["p_equals_v"]) == 17
    return {
        "p_distinct_cells": len(records["p_distinct"]),
        "p_equals_v_cells": len(records["p_equals_v"]),
        "minima": minima,
        "ordered_records_sha256": hashlib.sha256(
            json.dumps(records, separators=(",", ":"), sort_keys=True).encode()
        ).hexdigest().upper(),
        "checks": "forest-invariant forms = direct defining Gamma coefficients",
    }


def assert_motif(config, endpoint=False):
    cases = [(None, config["motifs_tail"] if endpoint else config["high_motif_parts_general"])]
    cases.extend((ell, {
        "g1": config["small_lengths"][str(ell)]["motif_g1"],
        "g2": config["small_lengths"][str(ell)]["motif_g2"],
    }) for ell in range(1, 6))
    for ell_value, forms in cases:
        g1, g2 = sp.sympify(forms["g1"]), sp.sympify(forms["g2"])
        names = {str(symbol): symbol for symbol in g1.free_symbols | g2.free_symbols}
        m = names["m"]
        ell = names["ell"] if ell_value is None else sp.Integer(ell_value)
        re = names["F_connected3_E"]
        rv = names["F_connected3_V"]
        q35, r4 = names["F_three_edge_five"], names["F_connected4_E"]
        expected1 = (7 * (m + ell) - 12) * re + (5 * (m + ell) + (1 if endpoint else -4)) * rv + 5 * q35 - 5 * r4
        if not endpoint:
            expected1 += 5 * names["F_connected3_P"]
        expected2 = 7 * re + 5 * rv
        assert sp.expand(g1 - expected1) == 0
        assert sp.expand(g2 - expected2) == 0


def main():
    config_two = json.loads(CONFIG_TWO.read_text(encoding="utf-8"))
    config_end = json.loads(CONFIG_END.read_text(encoding="utf-8"))
    high = json.loads(HIGH.read_text(encoding="utf-8"))
    obstruction = json.loads(OBSTRUCTION.read_text(encoding="utf-8"))
    assert config_two["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_PATH_CONFIGURATION_AGENT"
    assert config_end["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_ENDPOINT_PARENT_CONFIGURATION_AGENT"
    assert high["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_HIGH_MOTIF_PAYMENT_AGENT"
    assert obstruction["marker"] == "EXACT_OBSTRUCTION_CANONICAL_RANK4_BUNDLE_MODE_EXHAUSTIVENESS_AGENT"
    assert_motif(config_two, endpoint=False)
    assert_motif(config_end, endpoint=True)

    two_cases = [
        ("tail", sp.sympify(config_two["residuals_general"]["g1"]), sp.sympify(config_two["residuals_general"]["g2"]), 6, 2),
        *[(f"ell{ell}", sp.sympify(config_two["small_lengths"][str(ell)]["residual_g1"]), sp.sympify(config_two["small_lengths"][str(ell)]["residual_g2"]), ell, {1: 4, 2: 3}.get(ell, 2)) for ell in range(1, 6)],
    ]
    end_cases = [
        ("tail", sp.sympify(config_end["residuals_tail"]["g1"]), sp.sympify(config_end["residuals_tail"]["g2"]), 6, 2),
        *[(f"ell{ell}", sp.sympify(config_end["small_lengths"][str(ell)]["residual_g1"]), sp.sympify(config_end["small_lengths"][str(ell)]["residual_g2"]), ell, {1: 4, 2: 3, 3: 2}.get(ell, 2)) for ell in range(1, 6)],
    ]

    two_certificates = []
    two_monotonicity = []
    for name, g1, g2, ell, m_start in two_cases:
        for coefficient, expression in (("g1", g1), ("g2", g2)):
            label = f"{name}_{coefficient}"
            two_monotonicity.append(audit_two_mark_monotonicity(expression, ell, m_start, label))
            two_certificates.append(certify_two_mark(expression, ell, m_start, label))

    endpoint_certificates = []
    endpoint_monotonicity = []
    endpoint_edgeless = []
    for name, g1, g2, ell, m_start in end_cases:
        for coefficient, expression in (("g1", g1), ("g2", g2)):
            label = f"{name}_{coefficient}"
            endpoint_monotonicity.append(audit_endpoint_monotonicity(expression, ell, m_start, label))
            endpoint_certificates.append(certify_endpoint(expression, ell, m_start, label))
            endpoint_edgeless.append(certify_endpoint_edgeless(expression, ell, f"{label}_edgeless"))

    finite = finite_exceptions(config_two, config_end)
    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_INTERNAL_SPINE_PATH_G12_AGENT",
        "theorem": (
            "For every canonical rank-four deepest sibling bundle whose support "
            "lies internally on the protected u-v connector, g1>=0 and g2>=0, "
            "for every bare-path length ell>=1 and whether p is distinct from v "
            "or equals v."
        ),
        "structural_exhaustion": (
            "Root the marked component at v. The unique child side of an internal "
            "connector support contains u. Deepest eligibility forces this side "
            "to be a bare path P_ell: any off-path unmarked branch would contain "
            "a deeper eligible support. The only parent alternatives are p!=v "
            "and the endpoint p=v. Thus the two row configurations are exhaustive."
        ),
        "path_partition": {
            "tail": "ell>=6 polynomial coefficients",
            "small": "ell=1,2,3,4,5 exact truncated path rows",
        },
        "high_motif_payment": {
            "dependency_marker": high["marker"],
            "p_distinct_decomposition": (
                "[2(m-4)R3+5Q35-5R4]+(5m+7ell-4)R3+5R3(F-p)"
                "+(5m+5ell-4)R3(F-v)"
            ),
            "p_equals_v_decomposition": (
                "[2(m-4)R3+5Q35-5R4]+(5m+7ell-4)R3"
                "+(5m+5ell+1)R3(F-v)"
            ),
            "g2": "7R3(F)+5R3(F-v)>=0",
        },
        "forest_cone": {
            "two_mark": (
                "For e>=1 set x=d_p-z_p,y=d_v-z_v,r=e-1-x-y. Then "
                "x,y,r>=0, x+y+r<=m-2, common<=z_p z_v, and "
                "W<=C(d_p,2)+C(d_v,2)+C(r+1,2)."
            ),
            "endpoint": (
                "For e>=1 set y=d_v-z_v,r=e-1-y. Then y,r>=0, "
                "y+r<=m-2 and W<=C(d_v,2)+C(r+1,2)."
            ),
        },
        "p_distinct": {
            "monotonicity": two_monotonicity,
            "bernstein_certificates": two_certificates,
        },
        "p_equals_v": {
            "monotonicity": endpoint_monotonicity,
            "bernstein_certificates_nonempty_F": endpoint_certificates,
            "edgeless_F": endpoint_edgeless,
        },
        "finite_exceptions": finite,
        "scope": (
            "Exact theorem only for canonical internal protected-spine rank-four "
            "bundle coefficients g1 and g2. Existing off-spine singleton and "
            "no-parent modes are separate dependencies. This does not prove all "
            "N4, higher-rank gaps, or Erdos Problem 993."
        ),
        "dependencies": {
            path.name: sha256(path)
            for path in (CONFIG_TWO, CONFIG_END, HIGH, OBSTRUCTION)
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "theorem": report["theorem"],
        "p_distinct_certificates": [
            {key: value[key] for key in ("label", "ell", "m", "coefficients", "minimum_at_origin")}
            for value in two_certificates
        ],
        "p_equals_v_certificates": [
            {key: value[key] for key in ("label", "ell", "m", "coefficients", "minimum_at_origin")}
            for value in endpoint_certificates
        ],
        "finite_exceptions": finite,
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
