#!/usr/bin/env python3
"""Exact lift of the terminal q3 anchor from tree bases to forest bases.

Let G be a forest with marked w.  Form T by adding the stem wv and t>=1
new leaves at v, and put Q=G disjoint union t isolated vertices.  This
verifier proves q3(T)>=q3(Q), using the all-forest q3<=q2 theorem plus one
exact auxiliary q2-gap.  The unique negative auxiliary cell is the leaf of
P4 at t=1; the pinned tree-base anchor theorem covers it directly.
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
OUT = HERE / "terminal_q3_forest_anchor_lift_exact_agent_20260829.json"

PINNED = {
    "prove_all_forest_q3_q2_component_lift_root.py":
        "6C9F956D8F37AFC462193E780284C24F995D90A644F6C6C2B129A0B9BE259B00",
    "all_forest_q3_q2_component_lift_exact_root_20260829.json":
        "71BA8A861714902FECC613150B2BA936A19100F0AB43DF5766CF8614C5E50442",
    "audit_all_forest_q3_q2_component_lift_independent_agent.py":
        "63C2FFE7432FE54BF197B2F6F89DFF737B280D7B2571D6B30692FF09227E9815",
    "all_forest_q3_q2_component_lift_independent_audit_20260829.json":
        "7465DCB4C62ACF76614003D42285B72CD559A27AB6F449804F3CC881B405695D",
    "ALL_FOREST_Q3_Q2_THEOREM_2026-08-29.md":
        "354323BF3E2EB4E60CD68441D1539B535C3A95D57F3E0DDF6B426AF99270C1B7",
    "prove_terminal_q3_anchor_ordering_root.py":
        "F37CCF78EAD0BEE367010FBD76A448FA7D3450226BE6FF6EC001F722A6B35D6B",
    "terminal_q3_anchor_ordering_exact_root_20260828.json":
        "AF84F93A2CCCCF9E733D6096E51DEDB0F07B3AE6A6D303327CAF77D558CE4023",
    "audit_terminal_q3_anchor_ordering_independent_agent.py":
        "C76F68266C3CE74B37096B37BBEF93C5F0AC5ED3005B70724DC15EB6C2FD531C",
    "terminal_q3_anchor_ordering_independent_audit_20260828.json":
        "E3011F623E97E289D6C21D20B2577ECB38AE3019C3A42481A28807F47AAA396C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank: int):
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def tensor_bernstein(expression, variables):
    """Return exact tensor Bernstein coefficients on the unit cube."""
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    output = {}
    for index in itertools.product(*[range(degree + 1) for degree in degrees]):
        value = sp.Integer(0)
        for powers in itertools.product(*[range(item + 1) for item in index]):
            coefficient = polynomial.coeff_monomial(
                sp.prod(variable**power for variable, power in zip(variables, powers))
            )
            multiplier = sp.prod(
                sp.binomial(index[j], powers[j]) / sp.binomial(degrees[j], powers[j])
                for j in range(len(variables))
            )
            value += coefficient * multiplier
        output[index] = sp.factor(value)
    return degrees, output


def power_coefficients_nonnegative(expression, variable):
    return all(value >= 0 for value in sp.Poly(sp.expand(expression), variable).all_coeffs())


def symbolic_reduction():
    n, m, A, d, R, t = sp.symbols(
        "n m A d R t", integer=True, nonnegative=True
    )
    f2 = choose(n - 1, 2) - (m - d)
    h2 = choose(n - d - 1, 2) - (m - d - R)
    z2 = (m - d) * (n - 3) - 2 * (A - choose(d, 2) - R)
    I2 = choose(n + t, 2) - m
    S2 = m * (n + t - 2) - 2 * A
    c1 = z2 + h2 + t * f2
    gap = sp.expand(2 * I2 * c1 - 3 * f2 * S2)

    # Newton expansion at t=1.  Only the constant term needs work.
    s = sp.symbols("s", integer=True, nonnegative=True)
    values = [sp.expand(gap.subs(t, rank)) for rank in range(1, 5)]
    differences = [values]
    for _ in range(3):
        differences.append([
            sp.expand(differences[-1][j + 1] - differences[-1][j])
            for j in range(len(differences[-1]) - 1)
        ])
    newton = [sp.factor(differences[j][0]) for j in range(4)]
    I1 = sp.expand(I2.subs(t, 1))
    S1 = sp.expand(S2.subs(t, 1))
    E1 = sp.expand(c1.subs(t, 1))
    expected = [
        2 * I1 * E1 - 3 * f2 * S1,
        2 * (I1 * f2 + (n + 1) * E1 + (n + 1) * f2) - 3 * f2 * m,
        2 * (E1 + 2 * (n + 2) * f2),
        6 * f2,
    ]
    assert all(sp.expand(newton[j] - expected[j]) == 0 for j in range(4))
    # The possibly adverse part in newton[1] is still positive for a forest:
    # 2I1+2(n+1)-3m=(n+1)(n+2)-5m and m<=n-1.
    assert sp.expand(2 * I1 + 2 * (n + 1) - 3 * m - (
        (n + 1) * (n + 2) - 5 * m
    )) == 0

    # The anchor/FQ32 bridge, with the normalization checked literally.
    i3, s3, anchor, forest_margin = sp.symbols("i3 s3 anchor forest_margin")
    anchor = c1 * i3 - f2 * s3
    forest_margin = 3 * i3 * S2 - 2 * I2 * s3
    assert sp.expand(
        3 * i3 * gap + 3 * f2 * forest_margin - 6 * I2 * anchor
    ) == 0
    return {
        "symbols": (n, m, A, d, R, t),
        "f2": f2,
        "gap": gap,
        "newton": newton,
    }


def large_order_certificate(data):
    n, m, A, d, R, t = data["symbols"]
    c, E = sp.symbols("c E", integer=True, nonnegative=True)
    constant = sp.expand(data["newton"][0])
    structural = sp.expand(constant.subs({m: n - c, A: choose(d, 2) + R + E}))
    alpha = sp.factor(sp.diff(structural, E))
    beta = sp.factor(sp.diff(structural, R))
    assert sp.expand(alpha - (n**2 - 13 * n + 6 + 2 * c + 6 * d)) == 0
    assert sp.expand(beta - 2 * (4 * c + 3 * d + 2 * n**2 - 8 * n + 3)) == 0
    assert sp.expand(beta - alpha - 3 * (n * (n - 1) + 2 * c)) == 0
    base = sp.factor(structural.subs({E: 0, R: 0}))

    # Disconnected case c>=2.  Relax the exact integer triangle to
    # c=2+(n-2)u, d=(n-c)v and certify eight v-strips.
    u, v, w, r = sp.symbols("u v w r", nonnegative=True)
    disconnected = sp.expand(
        2 * base.subs(
            {c: 2 + (n - 2) * u, d: (n - 2) * (1 - u) * v},
            simultaneous=True,
        ).subs(n, r + 13)
    )
    disconnected_cells = []
    disconnected_minimum = None
    for strip in range(8):
        cell = sp.expand(disconnected.subs(v, (strip + w) / 8))
        degrees, bernstein = tensor_bernstein(cell, (u, w))
        assert degrees == (3, 3)
        for index, coefficient in bernstein.items():
            assert power_coefficients_nonnegative(coefficient, r), (
                strip, index, coefficient
            )
            for value in sp.Poly(sp.expand(coefficient), r).all_coeffs():
                if disconnected_minimum is None or value < disconnected_minimum:
                    disconnected_minimum = value
        disconnected_cells.append(len(bernstein))
    assert disconnected_minimum > 0

    # Connected nonstar case.  If k is the number of nontrivial branches of
    # G-w, then E>=n-1-d-k and R>=k.  Since beta>alpha and k>=1,
    # alpha*E+beta*R >= alpha*(n-d-2)+beta.
    connected_lower = sp.factor(
        base.subs(c, 1)
        + alpha.subs(c, 1) * (n - d - 2)
        + beta.subs(c, 1)
    )
    connected = sp.expand(
        2 * connected_lower.subs(d, 1 + (n - 3) * u).subs(n, r + 13)
    )
    connected_cells = []
    connected_minimum = None
    for strip in range(8):
        cell = sp.expand(connected.subs(u, (strip + w) / 8))
        degrees, bernstein = tensor_bernstein(cell, (w,))
        assert degrees == (3,)
        for index, coefficient in bernstein.items():
            assert power_coefficients_nonnegative(coefficient, r), (
                strip, index, coefficient
            )
            for value in sp.Poly(sp.expand(coefficient), r).all_coeffs():
                if connected_minimum is None or value < connected_minimum:
                    connected_minimum = value
        connected_cells.append(len(bernstein))
    assert connected_minimum > 0

    star = sp.factor(base.subs({c: 1, d: n - 1}))
    assert star == (n - 2) * (n - 1) * (n**2 - 4 * n + 5) / 2
    return {
        "threshold": 13,
        "alpha": str(alpha),
        "beta_minus_alpha": str(sp.factor(beta - alpha)),
        "disconnected_bernstein_cells": sum(disconnected_cells),
        "disconnected_min_power_coefficient": str(disconnected_minimum),
        "connected_bernstein_cells": sum(connected_cells),
        "connected_min_power_coefficient": str(connected_minimum),
        "star_factor": str(star),
    }


def tree_component_states(max_order: int):
    unmarked = [set() for _ in range(max_order + 1)]
    marked = [dict() for _ in range(max_order + 1)]
    unmarked[1].add(0)
    marked[1][(0, 0, 0)] = ("@", 0)
    for order in range(2, max_order + 1):
        for tree in nx.nonisomorphic_trees(order):
            degrees = dict(tree.degree())
            wedges = sum(comb(value, 2) for value in degrees.values())
            graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
            unmarked[order].add(wedges)
            for root in tree:
                degree = degrees[root]
                neighbor_excess = sum(degrees[v] - 1 for v in tree.neighbors(root))
                marked[order].setdefault(
                    (wedges, degree, neighbor_excess), (graph6, root)
                )
    return unmarked, marked


def forest_states(max_order: int, unmarked):
    # Every attainable (component count, total wedge count) is enough because
    # the auxiliary gap depends on the common forest through just these data.
    states = [set() for _ in range(max_order + 1)]
    states[0].add((0, 0))
    for order in range(1, max_order + 1):
        for component_order in range(1, order + 1):
            for wedges in unmarked[component_order]:
                for components, rest_wedges in states[order - component_order]:
                    states[order].add((components + 1, wedges + rest_wedges))
    return states


def finite_certificate(data, max_order: int = 12):
    n, m, A, d, R, t = data["symbols"]
    constant = sp.lambdify(
        (n, m, A, d, R), data["newton"][0], modules="math"
    )
    unmarked, marked = tree_component_states(max_order)
    rests = forest_states(max_order, unmarked)
    global_states = {}
    for total in range(1, max_order + 1):
        for component_order in range(1, total + 1):
            rest_order = total - component_order
            for (component_wedges, degree, neighbor), witness in marked[component_order].items():
                for rest_components, rest_wedges in rests[rest_order]:
                    components = 1 + rest_components
                    edges = total - components
                    wedges = component_wedges + rest_wedges
                    key = (total, components, wedges, degree, neighbor)
                    global_states.setdefault(
                        key,
                        {
                            "marked_component_order": component_order,
                            "marked_component_graph6": witness[0],
                            "root": witness[1],
                        },
                    )
    negatives = []
    minimum = None
    for (order, components, wedges, degree, neighbor), witness in global_states.items():
        edges = order - components
        value = int(constant(order, edges, wedges, degree, neighbor))
        item = {
            "order": order,
            "components": components,
            "wedges": wedges,
            "degree": degree,
            "neighbor_excess": neighbor,
            "gap_t1": value,
            **witness,
        }
        if minimum is None or value < minimum[0]:
            minimum = (value, item)
        if value < 0:
            negatives.append(item)
    expected = [{
        "order": 4,
        "components": 1,
        "wedges": 2,
        "degree": 1,
        "neighbor_excess": 1,
        "gap_t1": -1,
    }]
    assert len(negatives) == 1
    for key, value in expected[0].items():
        assert negatives[0][key] == value
    # Direct exceptional anchor: Q has (i3,s3)=(3,2), T has (4,3).
    exceptional_anchor_cross = 3 * 3 - 2 * 4
    assert exceptional_anchor_cross == 1
    return {
        "orders": [1, max_order],
        "attainable_rooted_invariant_states": len(global_states),
        "forest_rest_state_counts": [len(rests[j]) for j in range(max_order + 1)],
        "minimum": minimum[1],
        "negative_auxiliary_states": negatives,
        "exceptional_anchor_cross": exceptional_anchor_cross,
    }


def main() -> int:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED
    forest_report = json.loads(
        (HERE / "all_forest_q3_q2_component_lift_independent_audit_20260829.json").read_text()
    )
    assert forest_report["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_FOREST_Q3_AT_MOST_Q2_COMPONENT_LIFT_AUDIT"
    )
    anchor_report = json.loads(
        (HERE / "terminal_q3_anchor_ordering_exact_root_20260828.json").read_text()
    )
    assert anchor_report["status"] == "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING"
    data = symbolic_reduction()
    large = large_order_certificate(data)
    finite = finite_certificate(data)
    report = {
        "schema": "terminal-q3-forest-anchor-lift-exact-agent-v1",
        "status": "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_FOREST_BASE_ANCHOR_LIFT",
        "claim": "For every finite forest G, marked w, and integer t>=1, q3(T)>=q3(G disjoint_union tK1) whenever supported.",
        "method": "FQ32 plus an exact included-block q2 gap; its Newton tail is automatic and its t=1 constant has one P4-leaf exception covered by the pinned tree-base theorem.",
        "pinned_sha256": actual,
        "large_order": large,
        "finite": finite,
        "normalization": "6*i2(Q)*U = 3*i3(Q)*G + 3*f2*M_Q",
        "scope": "This closes FA only. The forest-base positive-part payment FP, all-rank envelope, PGC, and unimodality remain open.",
    }
    report["source_sha256"] = sha256(Path(__file__).resolve())
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS_EXACT_ALL_ORDER_TERMINAL_Q3_FOREST_BASE_ANCHOR_LIFT")
    print("FINITE_STATES", finite["attainable_rooted_invariant_states"])
    print("DISCONNECTED_BERNSTEIN", large["disconnected_bernstein_cells"])
    print("CONNECTED_BERNSTEIN", large["connected_bernstein_cells"])
    print("SOURCE", report["source_sha256"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
