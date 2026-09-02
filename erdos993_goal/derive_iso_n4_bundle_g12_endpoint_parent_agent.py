#!/usr/bin/env python3
"""Exact g1/g2 forms when the deepest singleton parent equals a mark.

By u/v symmetry take p=u.  If C is the four-minor tuple of the
support-deleted forest G, then D=G-u has the duplicated row tuple

    D=(C_U,C_U,C_W,C_W).

This script substitutes that identity directly into independent raw
binomial-coefficient derivations, then reduces the resulting endpoint forms
to exact forest invariants through independent five-sets.  It is an algebraic
reduction plus a small exact replay, not yet a sign theorem.
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
    add_xd,
    at,
    convolve_isolates,
    i2,
    i3,
    i4,
    independent_poly_bruteforce,
    independent_raw_g2,
    nested,
)
from derive_iso_leaf_bundle_telescope_agent import bundle_components
from derive_iso_n4_bundle_g1_deepest_configuration_agent import c5, i5, raw_g1


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_bundle_g12_endpoint_parent_exact_agent_20260829.json"


def endpoint_row_substitution():
    substitution = {}
    for rank in range(6):
        substitution[sp.Symbol(f"dE{rank}")] = sp.Symbol(f"cU{rank}")
        substitution[sp.Symbol(f"dU{rank}")] = sp.Symbol(f"cU{rank}")
        substitution[sp.Symbol(f"dV{rank}")] = sp.Symbol(f"cW{rank}")
        substitution[sp.Symbol(f"dW{rank}")] = sp.Symbol(f"cW{rank}")
    return substitution


def invariant_substitution():
    n, e, du, dv, adjacent = sp.symbols(
        "n edge_count degree_u degree_v adjacent", integer=True, nonnegative=True
    )
    common = sp.symbols("C_common_neighbor", integer=True, nonnegative=True)
    re, ru, rv = sp.symbols(
        "C_connected3_E C_connected3_U C_connected3_V",
        integer=True,
        nonnegative=True,
    )
    q35, r4 = sp.symbols(
        "C_three_edge_five C_connected4_E", integer=True, nonnegative=True
    )
    xu, xv, wedges = sp.symbols(
        "C_neighbor_excess_u C_neighbor_excess_v C_wedges_E",
        integer=True,
        nonnegative=True,
    )
    cue, cve = e - du, e - dv
    cwe = e - du - dv + adjacent
    cuw = wedges - du * (du - 1) / 2 - xu
    cvw = wedges - dv * (dv - 1) / 2 - xv
    cww = (
        wedges
        - du * (du - 1) / 2
        - dv * (dv - 1) / 2
        - xu
        - xv
        + adjacent * (du + dv - 2)
        + common
    )
    substitution = {
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
    return substitution, (re, ru, rv, q35, r4)


def endpoint_direct(graph: nx.Graph, u: int, v: int):
    support = max(graph.nodes(), default=-1) + 1
    base = graph.copy()
    base.add_edge(u, support)
    gamma = [0]
    for leaves in (1, 2):
        gamma.append(sum(bundle_components(base, (u, v), support, leaves, 4)))
    return gamma[1], gamma[2] - 2 * gamma[1]


def raw_from_polynomials(graph: nx.Graph, u: int, v: int):
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        polynomial = independent_poly_bruteforce(reduced)
        rows.append(tuple(at(polynomial, rank) for rank in range(6)))
    crows = tuple(rows)
    drows = (crows[1], crows[1], crows[3], crows[3])
    t0 = add_xd(crows, drows)
    t1 = add_xd(convolve_isolates(crows, 1, 5), drows)
    t2 = add_xd(convolve_isolates(crows, 2, 5), drows)
    gamma1 = nested(t1, 4) - nested(t0, 4) - nested(crows, 3)
    gamma2 = nested(t2, 4) - nested(t0, 4) - (
        nested(crows, 3) + nested(convolve_isolates(crows, 1, 4), 3)
    )
    return int(gamma1), int(gamma2 - 2 * gamma1)


def exact_evaluator(expression):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    names = tuple(map(str, symbols))
    polynomial = sp.Poly(sp.expand(expression), *symbols)
    denominator = 1
    for coefficient in polynomial.coeffs():
        denominator = sp.ilcm(denominator, int(coefficient.q))
    terms = [
        (powers, int(coefficient * denominator))
        for powers, coefficient in polynomial.terms()
    ]

    def evaluate(data):
        vector = tuple(data[name] for name in names)
        numerator = 0
        for powers, coefficient in terms:
            value = coefficient
            for base, power in zip(vector, powers):
                if power:
                    value *= base**power
            numerator += value
        assert numerator % denominator == 0
        return numerator // denominator

    return evaluate


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
    gu = graph.copy(); gu.remove_node(u)
    gv = graph.copy(); gv.remove_node(v)
    degree = dict(graph.degree())
    return {
        "n": len(graph),
        "edge_count": graph.number_of_edges(),
        "degree_u": degree[u],
        "degree_v": degree[v],
        "adjacent": int(graph.has_edge(u, v)),
        "C_common_neighbor": len(set(graph.neighbors(u)) & set(graph.neighbors(v))),
        "C_neighbor_excess_u": sum(degree[x] - 1 for x in graph.neighbors(u)),
        "C_neighbor_excess_v": sum(degree[x] - 1 for x in graph.neighbors(v)),
        "C_wedges_E": sum(comb(value, 2) for value in degree.values()),
        "C_connected3_E": connected_edges(graph, 3),
        "C_connected3_U": connected_edges(gu, 3),
        "C_connected3_V": connected_edges(gv, 3),
        "C_three_edge_five": three_edge_five(graph),
        "C_connected4_E": connected_edges(graph, 4),
    }


def main():
    row_rules = endpoint_row_substitution()
    endpoint_g1_raw = sp.factor(raw_g1().subs(row_rules))
    endpoint_g2_raw = sp.factor(independent_raw_g2().subs(row_rules))
    invariants, motif_symbols = invariant_substitution()
    g1 = sp.factor(endpoint_g1_raw.subs(invariants))
    g2 = sp.factor(endpoint_g2_raw.subs(invariants))
    motif = sp.factor(
        sum(sp.diff(g1, symbol) * symbol for symbol in motif_symbols)
    )
    residual = sp.factor(g1 - motif)

    eval_g1 = exact_evaluator(g1)
    eval_g2 = exact_evaluator(g2)
    cells = 0
    minima = {"g1": None, "g2": None, "residual_g1": None}
    negative = {key: 0 for key in minima}
    eval_residual = exact_evaluator(residual)
    for order in range(2, 8):
        for graph0 in nx.graph_atlas_g():
            if len(graph0) != order or not nx.is_forest(graph0):
                continue
            graph = nx.convert_node_labels_to_integers(graph0)
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.permutations(graph.nodes(), 2):
                data = invariant_data(graph, u, v)
                direct = endpoint_direct(graph, u, v)
                raw = raw_from_polynomials(graph, u, v)
                configured = (eval_g1(data), eval_g2(data))
                assert direct == raw == configured, {
                    "order": order,
                    "graph6": graph6,
                    "u": u,
                    "v": v,
                    "direct": direct,
                    "raw": raw,
                    "configured": configured,
                    "data": data,
                }
                values = {
                    "g1": configured[0],
                    "g2": configured[1],
                    "residual_g1": eval_residual(data),
                }
                for key, value in values.items():
                    negative[key] += int(value < 0)
                    record = {
                        "value": value,
                        "order": order,
                        "graph6": graph6,
                        "parent_mark_u": u,
                        "other_mark_v": v,
                    }
                    if minima[key] is None or value < minima[key]["value"]:
                        minima[key] = record
                cells += 1

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_CONFIGURATION_AGENT",
        "symmetry": "p=u; the p=v case follows by swapping u and v",
        "endpoint_row_identity": "D=(C_U,C_U,C_W,C_W)",
        "raw_forms": {
            "g1": str(endpoint_g1_raw),
            "g2": str(endpoint_g2_raw),
        },
        "forest_invariant_forms": {"g1": str(g1), "g2": str(g2)},
        "g1_high_motif_part": str(motif),
        "g1_residual_without_high_motifs": str(residual),
        "term_counts": {
            "g1_raw": len(sp.Poly(sp.expand(endpoint_g1_raw), *sorted(endpoint_g1_raw.free_symbols, key=str)).terms()),
            "g2_raw": len(sp.Poly(sp.expand(endpoint_g2_raw), *sorted(endpoint_g2_raw.free_symbols, key=str)).terms()),
            "g1_invariants": len(sp.Poly(sp.expand(g1), *sorted(g1.free_symbols, key=str)).terms()),
            "g2_invariants": len(sp.Poly(sp.expand(g2), *sorted(g2.free_symbols, key=str)).terms()),
            "g1_residual": len(sp.Poly(sp.expand(residual), *sorted(residual.free_symbols, key=str)).terms()),
        },
        "finite_replay": {
            "scope": "All graph-atlas forests orders 2..7, all ordered distinct endpoint-parent u and other mark v.",
            "cells": cells,
            "negative": negative,
            "minima": minima,
            "checks": "direct bundle components = raw independent polynomials = invariant forms",
        },
        "scope": (
            "Exact endpoint-parent configuration reduction and finite replay. "
            "No all-order sign theorem is asserted by this marker."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key not in ("raw_forms", "forest_invariant_forms", "g1_residual_without_high_motifs")}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
