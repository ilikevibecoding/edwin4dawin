#!/usr/bin/env python3
"""Prove g1 when a canonical deepest singleton parent equals a mark.

By symmetry take p=u.  The endpoint row identity D=(C_U,C_U,C_W,C_W)
gives the exact configuration form in the dependency report.  Its high-motif
part is paid by the already proved universal containment theorem.  The
remaining low-motif polynomial is proved by a two-vertex degree-excess cone,
an exact Bernstein certificate for n>=10, and a complete forest census for
2<=n<=9.
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
CONFIG = HERE / "iso_n4_bundle_g12_endpoint_parent_exact_agent_20260829.json"
HIGH_MOTIF = HERE / "iso_n4_bundle_g1_high_motif_payment_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_endpoint_parent_exact_agent_20260829.json"
FOREST_COUNTS = {2: 2, 3: 3, 4: 6, 5: 10, 6: 20, 7: 37, 8: 76, 9: 153}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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


def finite_census(residual):
    evaluate = exact_evaluator(residual)
    total_forests = 0
    total_cells = 0
    minimum = None
    negative = 0
    zero = 0
    by_order = {}
    for order, expected in FOREST_COUNTS.items():
        forests = list(unlabeled_forests(order))
        assert len(forests) == expected
        local_cells = 0
        local_minimum = None
        for graph in forests:
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.permutations(graph.nodes(), 2):
                value = evaluate(low_data(graph, u, v))
                record = {
                    "value": value,
                    "order": order,
                    "graph6": graph6,
                    "parent_mark_u": u,
                    "other_mark_v": v,
                }
                if minimum is None or value < minimum["value"]:
                    minimum = record
                if local_minimum is None or value < local_minimum["value"]:
                    local_minimum = record
                negative += int(value < 0)
                zero += int(value == 0)
                total_cells += 1
                local_cells += 1
        assert local_cells == expected * order * (order - 1)
        by_order[str(order)] = {
            "forest_types": len(forests),
            "ordered_endpoint_cells": local_cells,
            "minimum": local_minimum,
        }
        total_forests += len(forests)
        print(json.dumps({"order": order, **by_order[str(order)]}, sort_keys=True), flush=True)
    assert negative == 0
    return {
        "orders": [2, 9],
        "forest_types": total_forests,
        "ordered_endpoint_cells": total_cells,
        "negative": negative,
        "zero": zero,
        "minimum": minimum,
        "by_order": by_order,
    }


def main():
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    high = json.loads(HIGH_MOTIF.read_text(encoding="utf-8"))
    assert config["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G12_ENDPOINT_PARENT_CONFIGURATION_AGENT"
    assert high["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_HIGH_MOTIF_PAYMENT_AGENT"
    assert high["theorem"].startswith("For every forest G")
    g1 = sp.sympify(config["forest_invariant_forms"]["g1"])
    motif = sp.sympify(config["g1_high_motif_part"])
    residual = sp.sympify(config["g1_residual_without_high_motifs"])
    assert sp.expand(g1 - motif - residual) == 0
    names = {str(symbol): symbol for symbol in residual.free_symbols}
    n, e = names["n"], names["edge_count"]
    du, dv = names["degree_u"], names["degree_v"]
    adjacent = names["adjacent"]
    wedges = names["C_wedges_E"]
    xu, xv = names["C_neighbor_excess_u"], names["C_neighbor_excess_v"]
    common = names["C_common_neighbor"]

    # The endpoint motif block is the same universal core already proved,
    # plus nonnegative deletion terms.
    re = next(symbol for symbol in motif.free_symbols if str(symbol) == "C_connected3_E")
    ru = next(symbol for symbol in motif.free_symbols if str(symbol) == "C_connected3_U")
    rv = next(symbol for symbol in motif.free_symbols if str(symbol) == "C_connected3_V")
    q35 = next(symbol for symbol in motif.free_symbols if str(symbol) == "C_three_edge_five")
    r4 = next(symbol for symbol in motif.free_symbols if str(symbol) == "C_connected4_E")
    core = 2 * (n - 4) * re + 5 * q35 - 5 * r4
    assert sp.expand(motif - core - (5 * n + 1) * ru - (5 * n - 4) * rv) == 0

    # Exact monotonicity coefficients and elementary forest floors for n>=10.
    derivatives = {
        "neighbor_u": sp.factor(sp.diff(residual, xu)),
        "neighbor_v": sp.factor(sp.diff(residual, xv)),
        "common": sp.factor(sp.diff(residual, common)),
        "wedges": sp.factor(sp.diff(residual, wedges)),
    }
    assert derivatives["neighbor_u"] == -3 * dv - 2 * e + 6 * n**2 - 13 * n - 10
    assert derivatives["neighbor_v"] == -3 * du - 2 * e + 6 * n**2 - 15 * n + 8
    assert sp.expand(derivatives["common"] + (-10 * e + 5 * n**2 + 9 * n - 12) / 2) == 0
    wedge_bracket = sp.factor(-2 * derivatives["wedges"])
    assert sp.expand(
        wedge_bracket
        - (6 * adjacent - 12 * du - 12 * dv + 8 * e + 15 * n**2 - 67 * n + 30)
    ) == 0
    m = sp.symbols("m", nonnegative=True)
    sign_floors = {
        "neighbor_u": (6 * n**2 - 18 * n - 5).subs(n, 10 + m),
        "neighbor_v": (6 * n**2 - 20 * n + 13).subs(n, 10 + m),
        "negative_twice_common": (5 * n**2 - n - 2).subs(n, 10 + m),
        "negative_twice_wedges": (15 * n**2 - 79 * n + 30).subs(n, 10 + m),
    }
    assert all(
        all(coefficient >= 0 for coefficient in sp.Poly(sp.expand(value), m).all_coeffs())
        for value in sign_floors.values()
    )
    assert sp.expand(
        derivatives["neighbor_u"]
        - (6 * n**2 - 18 * n - 5)
        - 3 * (n - 1 - dv)
        - 2 * (n - 1 - e)
    ) == 0
    assert sp.expand(
        derivatives["neighbor_v"]
        - (6 * n**2 - 20 * n + 13)
        - 3 * (n - 1 - du)
        - 2 * (n - 1 - e)
    ) == 0
    assert sp.expand(
        -2 * derivatives["common"]
        - (5 * n**2 - n - 2)
        - 10 * (n - 1 - e)
    ) == 0
    assert sp.expand(
        wedge_bracket
        - (15 * n**2 - 79 * n + 30)
        - 6 * adjacent
        - 12 * (n - du - dv)
        - 8 * e
    ) == 0

    # Edgeless branch, outside the e-1 cone.
    edgeless = sp.factor(
        residual.subs({symbol: 0 for symbol in residual.free_symbols if symbol != n})
    )
    expected_edgeless = sp.factor(
        (n - 1) * (65 * n**3 - 101 * n**2 - 82 * n + 144) / 24
    )
    assert sp.expand(edgeless - expected_edgeless) == 0
    cubic = 65 * n**3 - 101 * n**2 - 82 * n + 144
    assert cubic.subs(n, 2) == 96
    assert sp.diff(cubic, n).subs(n, 2) == 294
    assert sp.diff(cubic, n, 2).subs(n, 2) > 0

    # Large-order two-vertex degree-excess cone.  If c is the number of
    # nontrivial components, the total excess is e-c.  Thus
    # r=e-1-x-y is unselected excess plus c-1, and convex concentration gives
    # W<=C(du,2)+C(dv,2)+C(r+1,2).
    q = sp.symbols("q", nonnegative=True)
    box = sp.symbols("a b c", nonnegative=True)
    a, b, c = box
    total = 8 + q  # n-2 for n=10+q
    x = total * a
    y = total * (1 - a) * b
    r = total * (1 - a) * (1 - b) * c
    branch_count = 0
    coefficient_count = 0
    profiles = set()
    minimum_q0 = None
    minimum_record = None
    ordered_stream = []
    for auv, zu, zv in itertools.product((0, 1), repeat=3):
        if auv and not (zu and zv):
            continue
        d_u, d_v = zu + x, zv + y
        edge_count = 1 + x + y + r
        wedge_upper = d_u * (d_u - 1) / 2 + d_v * (d_v - 1) / 2 + r * (r + 1) / 2
        lower = sp.cancel(
            residual.subs(
                {
                    n: total + 2,
                    e: edge_count,
                    du: d_u,
                    dv: d_v,
                    adjacent: auv,
                    xu: 0,
                    xv: 0,
                    common: 1,
                    wedges: wedge_upper,
                }
            )
        )
        branch_count += 1
        for degrees, index, coefficient in tensor_bernstein(lower, box):
            profiles.add(degrees)
            qcoefficients = sp.Poly(sp.expand(coefficient), q).all_coeffs()
            assert all(value >= 0 for value in qcoefficients)
            at_zero = sp.factor(coefficient.subs(q, 0))
            record = {
                "branch_adj_zu_zv": [auv, zu, zv],
                "index": list(index),
                "coefficient": str(coefficient),
            }
            ordered_stream.append(record)
            if minimum_q0 is None or at_zero < minimum_q0:
                minimum_q0 = at_zero
                minimum_record = {**record, "q0": str(at_zero)}
            coefficient_count += 1
    assert branch_count == 5
    assert coefficient_count == 320
    assert profiles == {(3, 3, 3)}
    assert minimum_q0 == 309
    stream_sha = hashlib.sha256(
        json.dumps(ordered_stream, separators=(",", ":"), sort_keys=True).encode()
    ).hexdigest().upper()

    census = finite_census(residual)
    assert census["forest_types"] == 307
    assert census["ordered_endpoint_cells"] == 17720
    assert census["minimum"]["value"] == 2

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G1_ENDPOINT_PARENT_AGENT",
        "theorem": (
            "For every forest G with distinct marks u,v, if the unique parent "
            "of the canonical deepest singleton support is u or v, then g1>=0."
        ),
        "symmetry": "The certificate takes p=u; swap u and v for p=v.",
        "row_identity": config["endpoint_row_identity"],
        "high_motif_payment": {
            "core_dependency": high["theorem"],
            "endpoint_extra": "(5n+1)R3(G-u)+(5n-4)R3(G-v)>=0 for n>=2",
        },
        "monotonicity": {
            "exact_derivatives": {key: str(value) for key, value in derivatives.items()},
            "n10_plus_m_sign_floors": {key: str(sp.expand(value)) for key, value in sign_floors.items()},
        },
        "degree_excess_cone": {
            "parameters": "x=d_u-1[d_u>0], y=d_v-1[d_v>0], r=e-1-x-y",
            "proof": (
                "Total positive-degree excess is e-c for c nontrivial components; "
                "r is unselected excess plus c-1. Convex concentration of the "
                "unselected excess proves W<=C(d_u,2)+C(d_v,2)+C(r+1,2)."
            ),
            "edgeless_residual": str(edgeless),
        },
        "large_order_certificate": {
            "orders": "n>=10",
            "branches": branch_count,
            "bernstein_coefficients": coefficient_count,
            "degree_profiles": [list(profile) for profile in sorted(profiles)],
            "minimum_at_n10": str(minimum_q0),
            "minimum_record": minimum_record,
            "ordered_stream_sha256": stream_sha,
            "sign_check": "all q-power coefficients are nonnegative for q=n-10>=0",
        },
        "finite_census": census,
        "dependencies": {CONFIG.name: sha256(CONFIG), HIGH_MOTIF.name: sha256(HIGH_MOTIF)},
        "scope": (
            "Exact theorem for canonical deepest singleton endpoint-parent g1 only. "
            "It does not prove a no-parent/root-star mode, arbitrary supports, g2, "
            "all N4, or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "finite_census"}, indent=2, sort_keys=True))
    print(json.dumps({key: value for key, value in census.items() if key != "by_order"}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
