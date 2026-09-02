#!/usr/bin/env python3
"""Independent exact audit of the rank-seven bundle coefficients g7..g12.

All six coefficients are rebuilt from the thirteen defining Gamma values and
Newton forward differences.  The marked W/A/B/Z partitions, the g10 forest
degree reduction, every all-order slack, both n=2 boundary formulas, and the
three positive shifted polynomials are checked independently.  A supplementary
atlas replay exhausts literal forest-preserving support neighbourhoods through
order seven and all induced D minors; it is used only for falsification.

Strict scope: g7,...,g12.  Nothing here proves g1,...,g6 or all-N7.
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
SOURCE = Path(__file__).resolve()
TOP_SOURCE = HERE / "prove_iso_n7_bundle_top_g9_g12_root.py"
TOP_REPORT = HERE / "iso_n7_bundle_top_g9_g12_exact_root_20260830.json"
G8_SOURCE = HERE / "prove_iso_n7_bundle_g8_root.py"
G8_REPORT = HERE / "iso_n7_bundle_g8_exact_root_20260830.json"
G7_SOURCE = HERE / "prove_iso_n7_bundle_g7_root.py"
G7_REPORT = HERE / "iso_n7_bundle_g7_exact_root_20260830.json"
OUTPUT = HERE / (
    "iso_n7_bundle_g7_g12_independent_audit_exact_rank5_g2_alt_20260830.json"
)
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N7_BUNDLE_G7_G12_RANK5_G2_ALT"
EXPECTED = {
    "top_source": "ED82AAA863A013567D84A4B50415D263EF5C04B433C442B2684D9C8296D6D5D5",
    "top_report": "FA87562DB050D8BFCDCC2391BF53A7AA3E508D65D22F736AC076F053D72A6386",
    "g8_source": "6896222A14A78095CA3799C99A417595F4AAAD9FA2BAA3786D6C1EBABC2CC294",
    "g8_report": "1D40D96DAF13FB19C809E7505A777A5E88D5090A8857592B4E8C8453AC8250A8",
    "g7_source": "EAEC7529572514FDCE5658C7ACFCCA77BD88D13DFE0A37CB63E6A12ACD17B1AF",
    "g7_report": "48CB9EF1C42F3EBBAB7017CF30C57F2897F3CE8B7067DAB81D5DECD8B412E67F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
        + at(u, r - 2)
        * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def isolate_multiply(rows, amount, maximum=8):
    return tuple(
        tuple(
            sp.expand(sum(
                comb(amount, index) * at(row, rank - index)
                for index in range(rank + 1)
            ))
            for rank in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(crows, drows):
    return tuple(
        tuple(
            sp.expand(at(crow, rank) + at(drow, rank - 1))
            for rank in range(len(crow))
        )
        for crow, drow in zip(crows, drows)
    )


def forward_differences(values):
    row = list(values)
    coefficients = []
    while row:
        coefficients.append(sp.expand(row[0]))
        row = [
            sp.expand(row[index + 1] - row[index])
            for index in range(len(row) - 1)
        ]
    return coefficients


def reconstruct_coefficients():
    """Direct thirteen-node reconstruction, independent of producer algebra."""
    crows = tuple(tuple(sp.symbols(f"c{name}0:9")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:9")) for name in "EUVW")
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(13):
        bundled = add_xd(isolate_multiply(crows, amount), drows)
        lower = sum(
            nested(isolate_multiply(crows, offset, maximum=7), 6)
            for offset in range(amount)
        )
        gamma.append(sp.expand(nested(bundled, 7) - nested(base, 7) - lower))
    coefficients = forward_differences(gamma)
    assert len(coefficients) == 13 and coefficients[0] == 0
    m = sp.symbols("M", integer=True, nonnegative=True)
    interpolation = sum(coefficients[index] * sp.binomial(m, index)
                        for index in range(13))
    for amount, value in enumerate(gamma):
        assert sp.expand(interpolation.subs(m, amount) - value) == 0
    return coefficients


def independence_row(graph: nx.Graph, maximum=8):
    nodes = tuple(graph)
    counts = [1]
    for rank in range(1, maximum + 1):
        counts.append(sum(
            1
            for chosen in itertools.combinations(nodes, rank)
            if not any(
                graph.has_edge(left, right)
                for left, right in itertools.combinations(chosen, 2)
            )
        ))
    return tuple(counts)


def four_rows(graph: nx.Graph, u: int, v: int):
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        rows.append(independence_row(reduced))
    return tuple(rows)


def literal_categories(graph: nx.Graph, u: int, v: int):
    nodes = tuple(graph)
    category = {}
    for rank in range(2, 6):
        literal = {name: 0 for name in "WABZ"}
        for chosen in itertools.combinations(nodes, rank):
            if any(graph.has_edge(x, y) for x, y in itertools.combinations(chosen, 2)):
                continue
            has_u, has_v = u in chosen, v in chosen
            label = (
                "Z" if has_u and has_v else
                "B" if has_u else
                "A" if has_v else
                "W"
            )
            literal[label] += 1
        for name, value in literal.items():
            category[(name, rank)] = value
    e, ru, rv, w = four_rows(graph, u, v)
    for rank in range(2, 6):
        recovered = {
            "W": w[rank],
            "A": ru[rank] - w[rank],
            "B": rv[rank] - w[rank],
            "Z": e[rank] - ru[rank] - rv[rank] + w[rank],
        }
        assert all(category[(name, rank)] == recovered[name] for name in "WABZ")
    assert category[("Z", 2)] in (0, 1)
    return category


def numeric_coefficients(crows, drows):
    def n_at(row, rank):
        return row[rank] if 0 <= rank < len(row) else 0

    def n_nested(rows, rank):
        e, u, v, w = rows
        r = rank
        return (
            2 * r * n_at(e, r) * n_at(w, r - 2)
            - (r + 1) * n_at(e, r + 1) * n_at(w, r - 3)
            + n_at(e, r - 1) * (2 * n_at(w, r - 3) - (r + 1) * n_at(w, r - 1))
            + n_at(u, r) * (-(r + 1) * n_at(v, r - 2) - n_at(w, r - 3))
            + n_at(u, r - 1) * (2 * r * n_at(v, r - 1) + 2 * n_at(w, r - 2))
            + n_at(u, r - 2)
            * (-(r + 1) * n_at(v, r) + 2 * n_at(v, r - 2) - n_at(w, r - 1))
            - n_at(v, r) * n_at(w, r - 3)
            + 2 * n_at(v, r - 1) * n_at(w, r - 2)
            - n_at(v, r - 2) * n_at(w, r - 1)
        )

    def n_isolates(rows, amount, maximum=8):
        return tuple(
            tuple(
                sum(comb(amount, index) * n_at(row, rank - index)
                    for index in range(rank + 1))
                for rank in range(maximum + 1)
            )
            for row in rows
        )

    def n_add_xd(left_rows, right_rows):
        return tuple(
            tuple(n_at(left, rank) + n_at(right, rank - 1)
                  for rank in range(len(left)))
            for left, right in zip(left_rows, right_rows)
        )

    base = n_add_xd(crows, drows)
    gamma = []
    for amount in range(13):
        bundled = n_add_xd(n_isolates(crows, amount), drows)
        lower = sum(n_nested(n_isolates(crows, offset, maximum=7), 6)
                    for offset in range(amount))
        gamma.append(n_nested(bundled, 7) - n_nested(base, 7) - lower)
    row = gamma
    coefficients = []
    while row:
        coefficients.append(row[0])
        row = [row[index + 1] - row[index] for index in range(len(row) - 1)]
    return coefficients


def c_slacks(n_value, category):
    w2, w3, w4, w5 = (category[("W", rank)] for rank in range(2, 6))
    a2, a3, a4, a5 = (category[("A", rank)] for rank in range(2, 6))
    b2, b3, b4, b5 = (category[("B", rank)] for rank in range(2, 6))
    z2, _z3, z4, z5 = (category[("Z", rank)] for rank in range(2, 6))
    values = {
        "W2_floor_twice": 2 * w2 - (n_value - 3) * (n_value - 4),
        "W3": (n_value - 4) * w2 - 3 * w3,
        "W4": (n_value - 5) * w3 - 4 * w4,
        "W5": (n_value - 6) * w4 - 5 * w5,
        "A3": (n_value - 3) * a2 - 2 * a3,
        "B3": (n_value - 3) * b2 - 2 * b3,
        "A4": (n_value - 4) * a3 - 3 * a4,
        "A5": (n_value - 5) * a4 - 4 * a5,
        "B4": (n_value - 4) * b3 - 3 * b4,
        "B5": (n_value - 5) * b4 - 4 * b5,
        "Z5": (n_value - 4) * z4 - 3 * z5,
        "Z2_low": z2,
        "Z2_high": 1 - z2,
    }
    return values if n_value >= 3 else {
        "Z2_low": z2, "Z2_high": 1 - z2,
    }


def atlas_replay(expressions):
    evaluators = {}
    for label, (expression, names) in expressions.items():
        symbols = {str(symbol): symbol for symbol in expression.free_symbols}
        evaluators[label] = (
            sp.lambdify(
                tuple(symbols.get(name, sp.Symbol(name)) for name in names),
                expression,
                modules="math",
            ),
            names,
        )

    marked_cells = induced_d_cells = support_cells = direct_checks = 0
    slack_checks = partition_checks = n2_cells = 0
    minima = {f"g{index}": None for index in range(7, 13)}
    witnesses = {f"g{index}": None for index in range(7, 13)}

    def update(label, value, witness=None):
        if minima[label] is None or value < minima[label]:
            minima[label] = int(value)
            if witness is not None:
                witnesses[label] = witness

    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        cgraph = nx.convert_node_labels_to_integers(graph0)
        nodes = tuple(cgraph)
        n_value = len(nodes)
        for u, v in itertools.combinations(nodes, 2):
            marked_cells += 1
            category = literal_categories(cgraph, u, v)
            partition_checks += 16
            cs = c_slacks(n_value, category)
            assert all(value >= 0 for value in cs.values())
            slack_checks += len(cs)

            for retained_mask in range(1 << n_value):
                retained = [node for index, node in enumerate(nodes)
                            if retained_mask & (1 << index)]
                dgraph = cgraph.subgraph(retained).copy()
                drows = four_rows(dgraph, u, v)
                dchecks = {
                    "DU4": comb(n_value, 4) - drows[1][4],
                    "DV4": comb(n_value, 4) - drows[2][4],
                    "DW3": comb(n_value, 3) - drows[3][3],
                }
                assert all(value >= 0 for value in dchecks.values())
                slack_checks += len(dchecks)
                induced_d_cells += 1

            for neighbor_mask in range(1 << n_value):
                support = n_value
                base = cgraph.copy()
                base.add_node(support)
                neighbors = [node for index, node in enumerate(nodes)
                             if neighbor_mask & (1 << index)]
                base.add_edges_from((support, node) for node in neighbors)
                if not nx.is_forest(base):
                    continue
                dgraph = cgraph.copy()
                dgraph.remove_nodes_from(neighbors)
                crows = four_rows(cgraph, u, v)
                drows = four_rows(dgraph, u, v)
                direct = numeric_coefficients(crows, drows)
                values = {
                    "n": n_value,
                    **{f"{name}{rank}": category[(name, rank)]
                       for name in "WABZ" for rank in range(2, 6)},
                    "DU4": drows[1][4], "DV4": drows[2][4],
                    "DW3": drows[3][3], "DW4": drows[3][4],
                    "edge_count": cgraph.number_of_edges(),
                    "degree_u": cgraph.degree[u], "degree_v": cgraph.degree[v],
                    "adjacent": int(cgraph.has_edge(u, v)),
                }
                for index in range(7, 13):
                    label = f"g{index}"
                    evaluate, names = evaluators[label]
                    symbolic = int(evaluate(*(values[name] for name in names)))
                    assert direct[index] == symbolic, (
                        label, n_value, u, v, neighbors, direct[index], symbolic
                    )
                    assert direct[index] >= 0
                    if index != 12:
                        assert direct[index] > 0
                    witness = {
                        "order_C": n_value,
                        "graph6_C": nx.to_graph6_bytes(cgraph, header=False).decode().strip(),
                        "u": u, "v": v, "support_neighbors": neighbors,
                    }
                    update(label, direct[index], witness)
                    direct_checks += 1
                if n_value == 2:
                    z2 = category[("Z", 2)]
                    assert direct[7] == 3370 + 700 * z2
                    assert direct[8] == 9345 + 1050 * z2
                    n2_cells += 1
                support_cells += 1

    assert marked_cells == 1224
    assert n2_cells == 7
    return {
        "atlas_C_orders": [2, 7],
        "unordered_marked_C_cells": marked_cells,
        "literal_partition_checks": partition_checks,
        "all_induced_D_minor_cells": induced_d_cells,
        "all_slack_checks": slack_checks,
        "forest_preserving_realized_support_cells": support_cells,
        "direct_Gamma_coefficient_checks": direct_checks,
        "n_equals_2_realized_support_cells": n2_cells,
        "minima": minima,
        "minimum_witnesses": witnesses,
        "role": (
            "supplementary exact falsification replay only; all theorem credit "
            "comes from exact identities and all-order counting arguments"
        ),
    }


def main():
    actual = {
        "top_source": sha256(TOP_SOURCE), "top_report": sha256(TOP_REPORT),
        "g8_source": sha256(G8_SOURCE), "g8_report": sha256(G8_REPORT),
        "g7_source": sha256(G7_SOURCE), "g7_report": sha256(G7_REPORT),
    }
    assert actual == EXPECTED
    top = json.loads(TOP_REPORT.read_text(encoding="utf-8"))
    g8_report = json.loads(G8_REPORT.read_text(encoding="utf-8"))
    g7_report = json.loads(G7_REPORT.read_text(encoding="utf-8"))
    assert top["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_TOP_G9_G12_ROOT"
    assert g8_report["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G8_ROOT"
    assert g7_report["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G7_ROOT"

    coefficients = reconstruct_coefficients()
    n, q, eu, ev = sp.symbols(
        "n q epsilon_u epsilon_v", integer=True, nonnegative=True
    )
    structural = {}
    for name in "EUVW":
        structural[sp.Symbol(f"c{name}0")] = 1
        structural[sp.Symbol(f"d{name}0")] = 1
    structural.update({
        sp.Symbol("cE1"): n, sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1, sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q, sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev, sp.Symbol("dW1"): q - eu - ev,
    })
    raw = {index: sp.factor(coefficients[index].subs(structural))
           for index in range(7, 13)}
    top_rows = top["proved_coefficients"]
    comparisons = {
        7: g7_report["raw_first_face"],
        8: g8_report["raw_first_face"],
        9: top_rows["g9"]["first_face"],
        10: top_rows["g10"]["first_face"],
        11: top_rows["g11"],
        12: top_rows["g12"],
    }
    for index, expression in comparisons.items():
        locals_map = {str(symbol): symbol for symbol in raw[index].free_symbols}
        assert sp.expand(raw[index] - sp.sympify(expression, locals=locals_map)) == 0

    w2, w3, w4, w5 = sp.symbols("W2 W3 W4 W5", nonnegative=True)
    a2, a3, a4, a5 = sp.symbols("A2 A3 A4 A5", nonnegative=True)
    b2, b3, b4, b5 = sp.symbols("B2 B3 B4 B5", nonnegative=True)
    z2, z3, z4, z5 = sp.symbols("Z2 Z3 Z4 Z5", nonnegative=True)
    du4, dv4, dw3, dw4 = sp.symbols("DU4 DV4 DW3 DW4", nonnegative=True)
    partition = {}
    for rank, values in {
        2: (w2, a2, b2, z2), 3: (w3, a3, b3, z3),
        4: (w4, a4, b4, z4), 5: (w5, a5, b5, z5),
    }.items():
        w, a, b, z = values
        partition.update({
            sp.Symbol(f"cW{rank}"): w,
            sp.Symbol(f"cU{rank}"): w + a,
            sp.Symbol(f"cV{rank}"): w + b,
            sp.Symbol(f"cE{rank}"): w + a + b + z,
        })
    partition.update({
        sp.Symbol("dU4"): du4, sp.Symbol("dV4"): dv4,
        sp.Symbol("dW3"): dw3, sp.Symbol("dW4"): dw4,
    })
    p7 = sp.factor(raw[7].subs(partition))
    p8 = sp.factor(raw[8].subs(partition))
    p9 = sp.factor(raw[9].subs(partition))
    for p, expected in (
        (p7, g7_report["partitioned_coefficient"]),
        (p8, g8_report["partitioned_coefficient"]),
        (p9, top_rows["g9"]["partitioned"]),
    ):
        locals_map = {str(symbol): symbol for symbol in p.free_symbols}
        assert sp.expand(p - sp.sympify(expected, locals=locals_map)) == 0

    s_w2 = w2 - (n - 3) * (n - 4) / 2
    s_w3 = (n - 4) * w2 - 3 * w3
    s_w4 = (n - 5) * w3 - 4 * w4
    s_w5 = (n - 6) * w4 - 5 * w5
    s_a3 = (n - 3) * a2 - 2 * a3
    s_b3 = (n - 3) * b2 - 2 * b3
    s_a4 = (n - 4) * a3 - 3 * a4
    s_b4 = (n - 4) * b3 - 3 * b4
    s_a5 = (n - 5) * a4 - 4 * a5
    s_b5 = (n - 5) * b4 - 4 * b5
    s_z5 = (n - 4) * z4 - 3 * z5
    c_n3 = n * (n - 1) * (n - 2) / 6
    c_n4 = n * (n - 1) * (n - 2) * (n - 3) / 24

    lower7 = (273*n**4 - 1028*n**3 + 5565*n**2 - 9100*n + 30732) / 6
    k_a3 = 32*n**2 - 22*n + 342
    q_w2 = 242*n**2 - 722*n + 2556
    dec7 = sp.expand(
        lower7 + 250*a2*b2 + 42*(a2*b3 + a3*b2)
        + 280*(a2+b2)*w2 + (860*n-350)*(a2+b2)
        + (a3+b3)*(84*s_w2+k_a3)
        + 2*(5*n+24)*(s_a4+s_b4) + 30*(s_a5+s_b5)
        + 42*w3*(1-z2) + z2*(16*w2+400*n-100)
        + z3*(42*w2+250*n-100) + (28*n-12)*z4 + 14*s_z5
        + 84*s_w2*w3 + 2*(26*n+3)*s_w3
        + (42*n+114)*s_w4 + 48*s_w5
        + s_w2*(294*s_w2+q_w2)
        + 8*((c_n4-du4)+(c_n4-dv4)) + (8*n+2)*(c_n3-dw3)
        + 14*dw4
    )
    assert sp.expand(p7 - dec7) == 0

    lower8 = (608*n**3 + 861*n**2 + 4585*n + 14703) / 3
    dec8 = sp.expand(
        lower8 + 84*a2*b2 + 84*(a2+b2)*w2
        + (644*n+350)*(a2+b2) + (44*n+20)*(a3+b3)
        + 40*(s_a4+s_b4) + (308*n+434)*z2 + (84*n+140)*z3
        + 6*(7*n+30)*s_w3 + 90*s_w4
        + s_w2*(84*s_w2 + 42*n**2 + 114*n + 1070)
        + 8*(c_n3-dw3)
    )
    assert sp.expand(p8 - dec8) == 0

    lower9 = 2*(399*n**2 + 1302*n + 2226)
    dec9 = sp.expand(
        lower9 + 48*w2 + 132*s_w3
        + 2*(75*n+279)*(a2+b2) + 18*(s_a3+s_b3)
        + 2*(42*n+266)*z2 + 84*z3
    )
    assert sp.expand(p9 - dec9) == 0

    edge_count, degree_u, degree_v, adjacent = sp.symbols(
        "edge_count degree_u degree_v adjacent", nonnegative=True
    )
    pair_counts = {
        sp.Symbol("cE2"): n*(n-1)/2-edge_count,
        sp.Symbol("cU2"): (n-1)*(n-2)/2-(edge_count-degree_u),
        sp.Symbol("cV2"): (n-1)*(n-2)/2-(edge_count-degree_v),
        sp.Symbol("cW2"): (n-2)*(n-3)/2-(edge_count-degree_u-degree_v+adjacent),
    }
    forest_g10 = sp.factor(raw[10].subs(pair_counts))
    lower10 = 6*(308*n+715)
    dec10 = sp.expand(
        lower10 + 6*(44*edge_count + 66*(n-degree_u-degree_v) + 60*adjacent)
    )
    assert sp.expand(forest_g10 - dec10) == 0
    assert raw[11] == 2244 and raw[12] == 0

    r = sp.symbols("r", integer=True, nonnegative=True)
    shifted7 = sp.expand((6*lower7).subs(n, r+3))
    shifted8 = sp.expand((3*lower8).subs(n, r+3))
    shifted_k_a3 = sp.expand(k_a3.subs(n, r+3))
    shifted_q_w2 = sp.expand(q_w2.subs(n, r+3))
    assert shifted7 == 273*r**4 + 2248*r**3 + 11055*r**2 + 26018*r + 47874
    assert shifted8 == 608*r**3 + 6333*r**2 + 26167*r + 52623
    assert shifted_k_a3 == 32*r**2 + 170*r + 564
    assert shifted_q_w2 == 242*r**2 + 730*r + 2568

    n2_common = {
        n: 2, w2: 0, w3: 0, w4: 0, w5: 0,
        a2: 0, a3: 0, a4: 0, a5: 0,
        b2: 0, b3: 0, b4: 0, b5: 0,
        z3: 0, z4: 0, z5: 0,
        du4: 0, dv4: 0, dw3: 0, dw4: 0,
    }
    n2_g7 = sp.factor(p7.subs(n2_common))
    n2_g8 = sp.factor(p8.subs(n2_common))
    assert sp.expand(n2_g7-(3370+700*z2)) == 0
    assert sp.expand(n2_g8-(9345+1050*z2)) == 0

    expressions = {
        "g7": (p7, (
            "n","W2","W3","W4","W5","A2","A3","A4","A5",
            "B2","B3","B4","B5","Z2","Z3","Z4","Z5",
            "DU4","DV4","DW3","DW4",
        )),
        "g8": (p8, (
            "n","W2","W3","W4","A2","A3","A4","B2","B3","B4",
            "Z2","Z3","Z4","DW3",
        )),
        "g9": (p9, (
            "n","W2","W3","A2","A3","B2","B3","Z2","Z3",
        )),
        "g10": (forest_g10, (
            "n","edge_count","degree_u","degree_v","adjacent",
        )),
        "g11": (sp.Integer(2244), ()),
        "g12": (sp.Integer(0), ()),
    }
    replay = atlas_replay(expressions)

    proofs = {
        "marked_partition": (
            "W,A,B,Z partition independent sets by membership in the two marks; "
            "literal inclusion-exclusion recovers every row."
        ),
        "consecutive_counts": (
            "For independent k-sets in an h-vertex graph, double-counting an "
            "extension gives (k+1)i_(k+1)<=(h-k)i_k. Apply h=n-2 for W, "
            "h=A2 or B2 (both <=n-2) beside one mark, and the analogous "
            "available induced graph for Z."
        ),
        "forest_pair_floor": (
            "W is a forest on n-2>=1 vertices with at most n-3 edges, hence "
            "W2>=C(n-2,2)-(n-3)."
        ),
        "D_caps": (
            "Every D row is induced on at most n vertices; its independent "
            "k-sets inject into all k-subsets of an n-element set."
        ),
        "g10_degree_bound": (
            "If u,v are adjacent in a forest, their outside-neighbour sets are "
            "disjoint and degree_u+degree_v<=n. If nonadjacent, their neighbour "
            "sets lie among n-2 other vertices and intersect in at most one, so "
            "degree_u+degree_v<=n-1. Thus n-degree_u-degree_v>=0 in both cases."
        ),
        "multiplier_positivity": (
            "With n=r+3, the g7 lower numerator, g8 lower numerator, kA3, and "
            "qW2 have respectively the positive-coefficient expansions "
            f"{shifted7}; {shifted8}; {shifted_k_a3}; {shifted_q_w2}. All other "
            "multipliers are visibly nonnegative and Z2 is Boolean."
        ),
    }

    report = {
        "marker": MARKER,
        "theorem_audited": (
            "For every forest-realizable marked rank-seven sibling-bundle cell, "
            "the Newton coefficients g7,g8,g9,g10,g11,g12 are nonnegative."
        ),
        "independent_reconstruction": {
            "Gamma_nodes": 13,
            "degree": 12,
            "raw_coefficients_g7_g12_match": True,
            "marked_partitions_g7_g9_match": True,
            "decomposition_identities_g7_g10": True,
            "g11": 2244,
            "g12": 0,
        },
        "n_at_least_3": {
            "g7_strict_lower_bound": str(sp.factor(lower7)),
            "g7_shifted_numerator": str(shifted7),
            "g8_strict_lower_bound": str(sp.factor(lower8)),
            "g8_shifted_numerator": str(shifted8),
            "g9_strict_lower_bound": str(sp.factor(lower9)),
            "g10_strict_lower_bound": str(sp.factor(lower10)),
        },
        "n_equals_2": {
            "g7": str(n2_g7), "g7_minimum": 3370,
            "g8": str(n2_g8), "g8_minimum": 9345,
            "Z2_domain": [0, 1],
            "literal_realized_support_cases": replay["n_equals_2_realized_support_cells"],
        },
        "all_order_proofs": proofs,
        "hostile_finite_replay": replay,
        "dependencies_sha256": EXPECTED,
        "scope_guard": (
            "Universal exact rank-seven bundle signs only for g7..g12. The "
            "finite replay is supplementary. Coefficients g1..g6, the complete "
            "rank-seven bundle lemma, all-N7, and Erdos Problem 993 remain open."
        ),
        "source_sha256": sha256(SOURCE),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    summary = {
        "marker": MARKER,
        "minima_g7_g12": replay["minima"],
        "induced_D_minor_cells": replay["all_induced_D_minor_cells"],
        "realized_support_cells": replay["forest_preserving_realized_support_cells"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
