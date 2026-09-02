#!/usr/bin/env python3
"""Independent audit of endpoint-parent g1 and g2.

This audit rederives both raw binomial coefficients, verifies the endpoint
row collapse for p=u and p=v, reconstructs the forest-invariant forms, and
uses a total-degree simplex Bernstein basis (not the producer's tensor
stick-breaking basis).  It also independently regenerates the finite g1
forest census through order nine.
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
CONFIG = HERE / "iso_n4_bundle_g12_endpoint_parent_exact_agent_20260829.json"
G1_REPORT = HERE / "iso_n4_bundle_g1_endpoint_parent_exact_agent_20260829.json"
G2_REPORT = HERE / "iso_n4_bundle_g2_endpoint_parent_exact_agent_20260829.json"
HIGH_MOTIF = HERE / "iso_n4_bundle_g1_high_motif_payment_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g12_endpoint_parent_independent_audit_agent_20260829.json"
FOREST_COUNTS = {2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37, 8: 76, 9: 153}


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


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


def convolve(rows, isolates, maximum):
    return tuple(
        tuple(
            sp.expand(
                sum(comb(isolates, shift) * at(row, rank - shift) for shift in range(rank + 1))
            )
            for rank in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(rows, drows):
    return tuple(
        tuple(at(row, rank) + at(drow, rank - 1) for rank in range(6))
        for row, drow in zip(rows, drows)
    )


def raw_coefficients():
    c = tuple(tuple(sp.symbols(f"c{name}0:6")) for name in "EUVW")
    d = tuple(tuple(sp.symbols(f"d{name}0:6")) for name in "EUVW")
    t0 = add_xd(c, d)
    t1 = add_xd(convolve(c, 1, 5), d)
    t2 = add_xd(convolve(c, 2, 5), d)
    g1 = sp.expand(nested(t1, 4) - nested(t0, 4) - nested(c, 3))
    g2 = sp.expand(
        nested(t2, 4)
        - 2 * nested(t1, 4)
        + nested(t0, 4)
        + nested(c, 3)
        - nested(convolve(c, 1, 4), 3)
    )
    return c, d, g1, g2


def choose(value, rank):
    return sp.expand(sp.prod(value - offset for offset in range(rank)) / factorial(rank))


def i2(n, e):
    return sp.expand(choose(n, 2) - e)


def i3(n, e, wedges):
    return sp.expand(choose(n, 3) - e * (n - 2) + wedges)


def i4(n, e, wedges, r3):
    return sp.expand(choose(n, 4) - e * choose(n - 2, 2) + wedges * (n - 4) + choose(e, 2) - r3)


def i5(n, e, wedges, r3, q35, r4):
    return sp.expand(
        choose(n, 5)
        - e * choose(n - 2, 3)
        + choose(e, 2) * (n - 4)
        + wedges * choose(n - 4, 2)
        - r3 * (n - 4)
        - q35
        + r4
    )


def invariant_rules():
    n, e, du, dv, adjacent = sp.symbols("n edge_count degree_u degree_v adjacent")
    common = sp.symbols("C_common_neighbor")
    re, ru, rv = sp.symbols("C_connected3_E C_connected3_U C_connected3_V")
    q35, r4 = sp.symbols("C_three_edge_five C_connected4_E")
    xu, xv, wedges = sp.symbols("C_neighbor_excess_u C_neighbor_excess_v C_wedges_E")
    cue, cve = e - du, e - dv
    cwe = e - du - dv + adjacent
    cuw = wedges - choose(du, 2) - xu
    cvw = wedges - choose(dv, 2) - xv
    cww = wedges - choose(du, 2) - choose(dv, 2) - xu - xv + adjacent * (du + dv - 2) + common
    rules = {
        **{sp.Symbol(f"c{name}0"): 1 for name in "EUVW"},
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
        sp.Symbol("cE2"): i2(n, e),
        sp.Symbol("cU2"): i2(n - 1, cue),
        sp.Symbol("cV2"): i2(n - 1, cve),
        sp.Symbol("cW2"): i2(n - 2, cwe),
        sp.Symbol("cE3"): i3(n, e, wedges),
        sp.Symbol("cU3"): i3(n - 1, cue, cuw),
        sp.Symbol("cV3"): i3(n - 1, cve, cvw),
        sp.Symbol("cW3"): i3(n - 2, cwe, cww),
        sp.Symbol("cE4"): i4(n, e, wedges, re),
        sp.Symbol("cU4"): i4(n - 1, cue, cuw, ru),
        sp.Symbol("cV4"): i4(n - 1, cve, cvw, rv),
        sp.Symbol("cE5"): i5(n, e, wedges, re, q35, r4),
    }
    return rules


def endpoint_reconstruction():
    c, d, raw_g1, raw_g2 = raw_coefficients()
    pu = {}
    pv = {}
    for rank in range(6):
        pu.update({d[0][rank]: c[1][rank], d[1][rank]: c[1][rank], d[2][rank]: c[3][rank], d[3][rank]: c[3][rank]})
        pv.update({d[0][rank]: c[2][rank], d[1][rank]: c[3][rank], d[2][rank]: c[2][rank], d[3][rank]: c[3][rank]})
    pu_g1, pu_g2 = sp.expand(raw_g1.subs(pu)), sp.expand(raw_g2.subs(pu))
    pv_g1, pv_g2 = sp.expand(raw_g1.subs(pv)), sp.expand(raw_g2.subs(pv))
    swap = {}
    for rank in range(6):
        swap[c[1][rank]] = c[2][rank]
        swap[c[2][rank]] = c[1][rank]
    assert sp.expand(pv_g1 - pu_g1.xreplace(swap)) == 0
    assert sp.expand(pv_g2 - pu_g2.xreplace(swap)) == 0
    rules = invariant_rules()
    return sp.factor(pu_g1.subs(rules)), sp.factor(pu_g2.subs(rules))


def falling(value, degree):
    return factorial(value) // factorial(value - degree)


def compositions(total, parts):
    if parts == 1:
        yield (total,)
        return
    for first in range(total + 1):
        for rest in compositions(total - first, parts - 1):
            yield (first, *rest)


def simplex_bernstein(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    power = dict(polynomial.terms())
    degree = max(sum(monomial) for monomial in power)
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
        yield degree, alpha, sp.factor(value)


def relaxed_certificate(expression, threshold, mode):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    q = sp.symbols(f"q_{mode}", nonnegative=True)
    t = sp.symbols(f"s_x_{mode} s_y_{mode} s_r_{mode}", nonnegative=True)
    sx, sy, sr = t
    total = threshold - 2 + q
    x, y, r = total * sx, total * sy, total * sr
    rows = []
    count = 0
    minimum = None
    for adjacent, zu, zv in itertools.product((0, 1), repeat=3):
        if adjacent and not (zu and zv):
            continue
        du, dv = zu + x, zv + y
        edges = 1 + x + y + r
        wedge_upper = choose(du, 2) + choose(dv, 2) + choose(r + 1, 2)
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
        if mode == "g2":
            substitutions.update({names["C_connected3_E"]: 0, names["C_connected3_U"]: 0, names["C_connected3_V"]: 0})
        lower = sp.cancel(expression.subs(substitutions))
        local_count = 0
        local_min = None
        degree_seen = None
        for degree, alpha, coefficient in simplex_bernstein(lower, t):
            degree_seen = degree
            assert all(value >= 0 for value in sp.Poly(sp.expand(coefficient), q).all_coeffs())
            at_zero = sp.factor(coefficient.subs(q, 0))
            local_min = at_zero if local_min is None else min(local_min, at_zero)
            minimum = at_zero if minimum is None else min(minimum, at_zero)
            local_count += 1
            count += 1
        rows.append({
            "branch_adj_zu_zv": [adjacent, zu, zv],
            "simplex_degree": degree_seen,
            "coefficients": local_count,
            "minimum_at_threshold": str(local_min),
        })
    return {
        "basis": "total-degree Bernstein on sum(s_x,s_y,s_r)<=1",
        "threshold": threshold,
        "branches": len(rows),
        "coefficients": count,
        "minimum_at_threshold": str(minimum),
        "all_q_power_coefficients_nonnegative": True,
        "rows": rows,
    }


def exact_evaluator(expression):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    names = tuple(map(str, symbols))
    polynomial = sp.Poly(sp.expand(expression), *symbols)
    denominator = 1
    for coefficient in polynomial.coeffs():
        denominator = sp.ilcm(denominator, int(coefficient.q))
    terms = [(monomial, int(coefficient * denominator)) for monomial, coefficient in polynomial.terms()]

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


def low_data(graph, u, v):
    degree = dict(graph.degree())
    neighbors = {vertex: set(graph.neighbors(vertex)) for vertex in graph}
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
    }


def finite_g1_audit(residual):
    evaluate = exact_evaluator(residual)
    forests_total = 0
    cells = 0
    minimum = None
    for order, expected in FOREST_COUNTS.items():
        forests = list(unlabeled_forests(order))
        assert len(forests) == expected
        for graph in forests:
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.permutations(graph.nodes(), 2):
                value = evaluate(low_data(graph, u, v))
                assert value >= 0
                record = {"value": value, "order": order, "graph6": graph6, "u": u, "v": v}
                if minimum is None or value < minimum["value"]:
                    minimum = record
                cells += 1
        forests_total += len(forests)
    assert forests_total == 307 and cells == 17720 and minimum["value"] == 2
    return {"orders": [2, 9], "forest_types": forests_total, "ordered_cells": cells, "minimum": minimum, "negative": 0}


def finite_g2_order2(expression):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    rows = []
    for graph0 in nx.graph_atlas_g():
        if len(graph0) != 2 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        degree = dict(graph.degree())
        for u, v in itertools.permutations(graph.nodes(), 2):
            data = low_data(graph, u, v)
            data.update({
                "C_connected3_E": 0,
                "C_connected3_U": 0,
                "C_connected3_V": 0,
            })
            value = sp.factor(expression.subs({names[key]: item for key, item in data.items()}))
            assert value.is_Integer and value >= 0
            rows.append({
                "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                "u": u,
                "v": v,
                "g2": int(value),
            })
    assert len(rows) == 4 and min(row["g2"] for row in rows) == 20
    return {"cells": 4, "minimum": 20, "negative": 0, "rows": rows}


def main():
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    g1_report = json.loads(G1_REPORT.read_text(encoding="utf-8"))
    g2_report = json.loads(G2_REPORT.read_text(encoding="utf-8"))
    high = json.loads(HIGH_MOTIF.read_text(encoding="utf-8"))
    assert config["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_CONFIGURATION_AGENT"
    assert g1_report["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_ENDPOINT_PARENT_AGENT"
    assert g2_report["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G2_ENDPOINT_PARENT_AGENT"
    assert high["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_HIGH_MOTIF_PAYMENT_AGENT"

    rebuilt_g1, rebuilt_g2 = endpoint_reconstruction()
    recorded_g1 = sp.sympify(config["forest_invariant_forms"]["g1"])
    recorded_g2 = sp.sympify(config["forest_invariant_forms"]["g2"])
    assert sp.expand(rebuilt_g1 - recorded_g1) == 0
    assert sp.expand(rebuilt_g2 - recorded_g2) == 0
    motif = sp.sympify(config["g1_high_motif_part"])
    residual = sp.sympify(config["g1_residual_without_high_motifs"])
    assert sp.expand(rebuilt_g1 - motif - residual) == 0

    g1_certificate = relaxed_certificate(residual, 10, "g1")
    g2_certificate = relaxed_certificate(rebuilt_g2, 3, "g2")
    assert g1_certificate["branches"] == 5 and g1_certificate["coefficients"] == 100
    assert g1_certificate["minimum_at_threshold"] == "309"
    assert g2_certificate["branches"] == 5 and g2_certificate["coefficients"] == 50
    assert g2_certificate["minimum_at_threshold"] == "13"
    finite = finite_g1_audit(residual)
    g2_order2 = finite_g2_order2(rebuilt_g2)

    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_AUDIT_AGENT",
        "algebra": {
            "raw_rederived": True,
            "p_u_rows": "(C_U,C_U,C_W,C_W)",
            "p_v_rows": "(C_V,C_W,C_V,C_W)",
            "p_v_equals_p_u_after_u_v_swap": True,
            "forest_invariant_forms_match": True,
        },
        "g1": {
            "high_motif_dependency": high["theorem"],
            "simplex_certificate": g1_certificate,
            "finite_census": finite,
        },
        "g2": {"simplex_certificate_n_ge_3": g2_certificate, "order2_boundary": g2_order2},
        "cone_proof": (
            "For e>=1, total positive-degree excess is e-c. With the two "
            "selected excesses removed, r=e-1-x-y is unselected excess plus "
            "c-1. Convex concentration gives W<=C(d_u,2)+C(d_v,2)+C(r+1,2)."
        ),
        "dependencies": {
            path.name: hashlib.sha256(path.read_bytes()).hexdigest().upper()
            for path in (CONFIG, G1_REPORT, G2_REPORT, HIGH_MOTIF)
        },
        "scope": (
            "Independent exact audit of canonical deepest singleton endpoint-parent "
            "g1 and g2. No no-parent/root-star or arbitrary-support claim."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key not in ("g1", "g2")}, indent=2, sort_keys=True))
    print(json.dumps({"g1_simplex": g1_certificate, "g1_finite": finite, "g2_simplex": g2_certificate}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
