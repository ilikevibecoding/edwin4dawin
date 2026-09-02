#!/usr/bin/env python3
"""Hostile independent audit of the universal rank-six bundle g5 theorem.

The coefficient is rebuilt from the eleven defining Gamma values and Newton
forward differences.  The W/A/B/Z partition is reconstructed literally, the
claimed decomposition is checked as an exact polynomial identity, and every
inequality used by the certificate is proved from an explicit injection or
double count.  A supplementary atlas replay realizes the actual support
vertex and exhausts all of its forest-preserving neighbourhoods through order
seven; a larger induced-minor replay targets the D-W containment direction.

This audit proves only g5.  It does not promote the finite replay to theorem
status and does not assert g1,...,g4 or the full rank-six bundle lemma.
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
PRODUCER_SOURCE = HERE / "prove_iso_n6_bundle_g5_root.py"
PRODUCER_REPORT = HERE / "iso_n6_bundle_g5_exact_root_20260830.json"
PARTITION_SOURCE = HERE / "derive_iso_n6_bundle_g5_marked_partition_rank5_g2_alt.py"
PARTITION_REPORT = HERE / (
    "iso_n6_bundle_g5_marked_partition_exact_rank5_g2_alt_20260830.json"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g5_independent_audit_exact_rank5_g2_alt_20260830.json"
)
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G5_RANK5_G2_ALT"
EXPECTED = {
    "producer_source": "FFB710731946FD1C47E656EC52953A66E3F423960C95763F838AFC1159AB62FF",
    "producer_report": "5A66101180056A9B18F974E172D0699C02865FCBD3AF0F3A43D9D99C8B4D405E",
    "partition_source": "31C64AA0F60999F7BBFE648C9446D670E9D7F779AB99D7E3FBA769A0AC0E23B4",
    "partition_report": "C760D9B397B995A8508E2E4499A24748D8220CC6804EDBBBD1B040BA0FBB1B64",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def nested(rows, rank):
    """Independent transcription of the four-row nested Newton form."""
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


def isolate_multiply(rows, amount, maximum=7):
    return tuple(
        tuple(
            sp.expand(
                sum(comb(amount, index) * at(row, rank - index)
                    for index in range(rank + 1))
            )
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


def reconstruct_g5():
    """Rebuild g5 directly at the eleven Newton interpolation nodes."""
    crows = tuple(tuple(sp.symbols(f"c{name}0:8")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:8")) for name in "EUVW")
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(11):
        bundled = add_xd(isolate_multiply(crows, amount), drows)
        lower_payment = sum(
            nested(isolate_multiply(crows, offset, maximum=6), 5)
            for offset in range(amount)
        )
        gamma.append(sp.expand(nested(bundled, 6) - nested(base, 6) - lower_payment))
    coefficients = forward_differences(gamma)
    assert len(coefficients) == 11 and coefficients[0] == 0
    interpolation_variable = sp.symbols("M", integer=True, nonnegative=True)
    interpolation = sum(
        coefficients[index] * sp.binomial(interpolation_variable, index)
        for index in range(11)
    )
    for amount, value in enumerate(gamma):
        assert sp.expand(interpolation.subs(interpolation_variable, amount) - value) == 0
    return coefficients[5]


def independence_row(graph: nx.Graph, maximum=7):
    nodes = tuple(graph)
    counts = [1]
    for rank in range(1, maximum + 1):
        value = 0
        for chosen in itertools.combinations(nodes, rank):
            if not any(
                graph.has_edge(left, right)
                for left, right in itertools.combinations(chosen, 2)
            ):
                value += 1
        counts.append(value)
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
    categories = {}
    for rank in range(2, 6):
        literal = {name: 0 for name in "WABZ"}
        for chosen in itertools.combinations(nodes, rank):
            if any(
                graph.has_edge(left, right)
                for left, right in itertools.combinations(chosen, 2)
            ):
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
            categories[(name, rank)] = value

    e, ru, rv, w = four_rows(graph, u, v)
    for rank in range(2, 6):
        inclusion_exclusion = {
            "W": w[rank],
            "A": ru[rank] - w[rank],
            "B": rv[rank] - w[rank],
            "Z": e[rank] - ru[rank] - rv[rank] + w[rank],
        }
        assert all(
            categories[(name, rank)] == inclusion_exclusion[name]
            for name in "WABZ"
        )
    assert categories[("Z", 2)] in (0, 1)
    return categories


def numeric_g5(crows, drows):
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

    def n_isolates(rows, amount, maximum=7):
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
    for amount in range(11):
        bundled = n_add_xd(n_isolates(crows, amount), drows)
        lower_payment = sum(
            n_nested(n_isolates(crows, offset, maximum=6), 5)
            for offset in range(amount)
        )
        gamma.append(n_nested(bundled, 6) - n_nested(base, 6) - lower_payment)
    row = gamma
    coefficients = []
    while row:
        coefficients.append(row[0])
        row = [row[index + 1] - row[index] for index in range(len(row) - 1)]
    return coefficients[5]


def slack_values(n_value, category, drows):
    _de, du, dv, dw = drows
    w2, w3, w4, w5 = (category[("W", rank)] for rank in range(2, 6))
    a2, a3, a4, a5 = (category[("A", rank)] for rank in range(2, 6))
    b2, b3, b4, b5 = (category[("B", rank)] for rank in range(2, 6))
    z2, _z3, z4, z5 = (category[("Z", rank)] for rank in range(2, 6))
    values = {
        "S_W2_floor_twice": 2 * w2 - (n_value - 3) * (n_value - 4),
        "S_W3": (n_value - 4) * w2 - 3 * w3,
        "S_W4": (n_value - 5) * w3 - 4 * w4,
        "S_W5": (n_value - 6) * w4 - 5 * w5,
        "S_A4": (n_value - 4) * a3 - 3 * a4,
        "S_A5": (n_value - 5) * a4 - 4 * a5,
        "S_B4": (n_value - 4) * b3 - 3 * b4,
        "S_B5": (n_value - 5) * b4 - 4 * b5,
        "S_Z5": (n_value - 4) * z4 - 3 * z5,
        "S_W3_cap": comb(n_value - 2, 3) - w3,
        "S_DW_in_W": w2 - dw[2],
        "S_A2_cap": n_value - 2 - a2,
        "S_B2_cap": n_value - 2 - b2,
        "S_DE4": comb(n_value, 4) - drows[0][4],
        "S_DU3": comb(n_value, 3) - du[3],
        "S_DV3": comb(n_value, 3) - dv[3],
        "S_DW2_cap": comb(n_value, 2) - dw[2],
        "S_DW4": comb(n_value, 4) - dw[4],
        "Z2_boolean_low": z2,
        "Z2_boolean_high": 1 - z2,
    }
    if n_value == 2:
        # The producer explicitly separates this boundary; only containment,
        # binomial caps, order caps, and the Boolean marked face are invoked.
        keep = {
            "S_DW_in_W", "S_A2_cap", "S_B2_cap", "S_DE4", "S_DU3",
            "S_DV3", "S_DW2_cap", "S_DW4", "Z2_boolean_low",
            "Z2_boolean_high",
        }
        return {label: value for label, value in values.items() if label in keep}
    return values


def atlas_hostile_replay(partitioned):
    """Supplementary falsification replay; all-order proof is separate."""
    symbols = {str(symbol): symbol for symbol in partitioned.free_symbols}
    argument_names = (
        "n", "W2", "W3", "W4", "W5", "A2", "A3", "A4", "A5",
        "B2", "B3", "B4", "B5", "Z2", "Z3", "Z4", "Z5",
        "DE4", "DU3", "DU4", "DV3", "DV4", "DW2", "DW3", "DW4",
    )
    ordered = tuple(symbols[name] for name in argument_names)
    evaluate = sp.lambdify(ordered, partitioned, modules="math")

    marked_cells = induced_minor_cells = realized_support_cells = 0
    partition_checks = slack_checks = direct_gamma_checks = 0
    n2_realized_support_cells = 0
    minima = {"g5": None}
    first_witness = {"g5": None}

    def update(label, value, witness=None):
        if label not in minima or minima[label] is None or value < minima[label]:
            minima[label] = int(value)
            if witness is not None:
                first_witness[label] = witness

    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        cgraph = nx.convert_node_labels_to_integers(graph0)
        nodes = tuple(cgraph)
        n_value = len(nodes)
        for u, v in itertools.combinations(nodes, 2):
            marked_cells += 1
            category = literal_categories(cgraph, u, v)
            partition_checks += 4 * 4

            # Hostile containment check: every induced D subset, including more
            # subsets than can arise from one forest-preserving support vertex.
            for retained_mask in range(1 << n_value):
                retained = [
                    node for index, node in enumerate(nodes)
                    if retained_mask & (1 << index)
                ]
                dgraph = cgraph.subgraph(retained).copy()
                drows = four_rows(dgraph, u, v)
                slacks = slack_values(n_value, category, drows)
                assert all(value >= 0 for value in slacks.values()), (
                    n_value, nx.to_graph6_bytes(cgraph).decode().strip(), u, v,
                    retained_mask, slacks,
                )
                for label, value in slacks.items():
                    update(label, value)
                    slack_checks += 1
                induced_minor_cells += 1

            # Realize an actual support p, exhaust every neighbourhood whose
            # addition preserves the forest, and compare direct Gamma to the
            # symbolic W/A/B/Z expression.
            for neighbor_mask in range(1 << n_value):
                support = n_value
                base = cgraph.copy()
                base.add_node(support)
                neighbors = [
                    node for index, node in enumerate(nodes)
                    if neighbor_mask & (1 << index)
                ]
                base.add_edges_from((support, node) for node in neighbors)
                if not nx.is_forest(base):
                    continue
                dgraph = cgraph.copy()
                dgraph.remove_nodes_from(neighbors)
                crows = four_rows(cgraph, u, v)
                drows = four_rows(dgraph, u, v)
                direct = numeric_g5(crows, drows)
                values = {
                    "n": n_value,
                    **{
                        f"{name}{rank}": category[(name, rank)]
                        for name in "WABZ" for rank in range(2, 6)
                    },
                    "DE4": drows[0][4],
                    "DU3": drows[1][3], "DU4": drows[1][4],
                    "DV3": drows[2][3], "DV4": drows[2][4],
                    "DW2": drows[3][2], "DW3": drows[3][3],
                    "DW4": drows[3][4],
                }
                symbolic = int(evaluate(*(values[name] for name in argument_names)))
                assert direct == symbolic
                z2 = category[("Z", 2)]
                if n_value == 2:
                    assert direct == 323 + 100 * z2
                    n2_realized_support_cells += 1
                assert direct > 0
                witness = {
                    "order_C": n_value,
                    "graph6_C": nx.to_graph6_bytes(cgraph, header=False).decode().strip(),
                    "u": u,
                    "v": v,
                    "support_neighbors": neighbors,
                }
                update("g5", direct, witness)
                direct_gamma_checks += 1
                realized_support_cells += 1

    assert marked_cells == 1224
    assert n2_realized_support_cells == 7
    return {
        "atlas_C_orders": [2, 7],
        "unordered_marked_C_cells": marked_cells,
        "literal_partition_checks": partition_checks,
        "all_induced_D_minor_cells": induced_minor_cells,
        "all_slack_checks": slack_checks,
        "forest_preserving_realized_support_cells": realized_support_cells,
        "direct_Gamma_g5_checks": direct_gamma_checks,
        "n_equals_2_realized_support_cells": n2_realized_support_cells,
        "minima": minima,
        "minimum_g5_witness": first_witness["g5"],
        "role": (
            "supplementary exact falsification replay only; the polynomial "
            "identity and all-order injections/double counts prove the theorem"
        ),
    }


def main():
    actual = {
        "producer_source": sha256(PRODUCER_SOURCE),
        "producer_report": sha256(PRODUCER_REPORT),
        "partition_source": sha256(PARTITION_SOURCE),
        "partition_report": sha256(PARTITION_REPORT),
    }
    assert actual == EXPECTED
    producer = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    partition_report = json.loads(PARTITION_REPORT.read_text(encoding="utf-8"))
    assert producer["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G5_ROOT"
    assert partition_report["marker"] == (
        "DERIVED_EXACT_ISO_N6_BUNDLE_G5_MARKED_PARTITION_RANK5_G2_ALT"
    )

    generic_g5 = reconstruct_g5()
    n, q, epsilon_u, epsilon_v = sp.symbols(
        "n q epsilon_u epsilon_v", integer=True, nonnegative=True
    )
    structural = {}
    for name in "EUVW":
        structural[sp.Symbol(f"c{name}0")] = 1
        structural[sp.Symbol(f"d{name}0")] = 1
    structural.update({
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q,
        sp.Symbol("dU1"): q - epsilon_u,
        sp.Symbol("dV1"): q - epsilon_v,
        sp.Symbol("dW1"): q - epsilon_u - epsilon_v,
    })
    raw = sp.factor(generic_g5.subs(structural))
    raw_symbols = {str(symbol): symbol for symbol in raw.free_symbols}
    assert sp.expand(
        raw - sp.sympify(producer["raw_first_face"], locals=raw_symbols)
    ) == 0

    w2, w3, w4, w5 = sp.symbols("W2 W3 W4 W5", nonnegative=True)
    a2, a3, a4, a5 = sp.symbols("A2 A3 A4 A5", nonnegative=True)
    b2, b3, b4, b5 = sp.symbols("B2 B3 B4 B5", nonnegative=True)
    z2, z3, z4, z5 = sp.symbols("Z2 Z3 Z4 Z5", nonnegative=True)
    de4, du3, du4, dv3, dv4, dw2, dw3, dw4 = sp.symbols(
        "DE4 DU3 DU4 DV3 DV4 DW2 DW3 DW4", nonnegative=True
    )
    marked_partition = {}
    for rank, values in {
        2: (w2, a2, b2, z2),
        3: (w3, a3, b3, z3),
        4: (w4, a4, b4, z4),
        5: (w5, a5, b5, z5),
    }.items():
        w, a, b, z = values
        marked_partition.update({
            sp.Symbol(f"cW{rank}"): w,
            sp.Symbol(f"cU{rank}"): w + a,
            sp.Symbol(f"cV{rank}"): w + b,
            sp.Symbol(f"cE{rank}"): w + a + b + z,
        })
    marked_partition.update({
        sp.Symbol("dE4"): de4,
        sp.Symbol("dU3"): du3, sp.Symbol("dU4"): du4,
        sp.Symbol("dV3"): dv3, sp.Symbol("dV4"): dv4,
        sp.Symbol("dW2"): dw2, sp.Symbol("dW3"): dw3,
        sp.Symbol("dW4"): dw4,
    })
    partitioned = sp.factor(raw.subs(marked_partition))
    partition_symbols = {str(symbol): symbol for symbol in partitioned.free_symbols}
    assert sp.expand(
        partitioned
        - sp.sympify(producer["partitioned_coefficient"], locals=partition_symbols)
    ) == 0
    independent_partition_locals = dict(partition_symbols)
    independent_partition_locals.update({
        "dE4": de4,
        "dU3": du3, "dU4": du4,
        "dV3": dv3, "dV4": dv4,
        "dW2": dw2, "dW3": dw3, "dW4": dw4,
    })
    assert sp.expand(
        partitioned
        - sp.sympify(
            partition_report["partitioned_expression"],
            locals=independent_partition_locals,
        )
    ) == 0

    choose = lambda order, rank: sp.prod(order - offset for offset in range(rank)) / sp.factorial(rank)
    floor_w2 = (n - 3) * (n - 4) / 2
    s_w2 = w2 - floor_w2
    s_w3 = (n - 4) * w2 - 3 * w3
    s_w4 = (n - 5) * w3 - 4 * w4
    s_w5 = (n - 6) * w4 - 5 * w5
    s_a4 = (n - 4) * a3 - 3 * a4
    s_a5 = (n - 5) * a4 - 4 * a5
    s_b4 = (n - 4) * b3 - 3 * b4
    s_b5 = (n - 5) * b4 - 4 * b5
    s_z5 = (n - 4) * z4 - 3 * z5
    s_w3_cap = choose(n - 2, 3) - w3
    s_dw_in_w = w2 - dw2
    s_a2_cap = n - 2 - a2
    s_b2_cap = n - 2 - b2
    s_de4 = choose(n, 4) - de4
    s_du3 = choose(n, 3) - du3
    s_dv3 = choose(n, 3) - dv3
    s_dw2_cap = choose(n, 2) - dw2
    s_dw4 = choose(n, 4) - dw4

    k3 = 11 * n**2 - 30 * n + 113
    q_w2 = 53 * n**2 - 198 * n + 544
    lower_bound = (
        71 * n**4 - 332 * n**3 + 1759 * n**2 - 4174 * n + 10212
    ) / 12
    q_ab = 2 * w3 + 7 * dw2
    independently_grouped = sp.expand(
        lower_bound
        + 68 * a2 * b2 + 15 * a2 * b3 + 15 * a3 * b2
        + (a2 + b2) * (70 * w2 + 168 * n - 124)
        + (a3 + b3) * (30 * s_w2 + k3)
        + (4 * n + 11) * (s_a4 + s_b4)
        + 10 * (s_a5 + s_b5)
        + (s_a2_cap + s_b2_cap) * q_ab
        + 4 * (n - 2) * s_w3_cap
        + (14 * (n - 2) + 7 + 7 * w2) * s_dw_in_w
        + (3 * w2 + 17 * w3 + 7 * dw2) * (1 - z2)
        + (76 * n - 52) * z2
        + (15 * w2 + 68 * n - 60) * z3
        + (28 * n - 31) * z4 / 3 + 17 * s_z5 / 3
        + 28 * s_w2 * w3
        + (15 * n - 12) * s_w3
        + 7 * (2 * n + 3) * s_w4 + 14 * s_w5
        + s_w2 * (68 * s_w2 + q_w2)
        + 7 * (s_de4 + s_dw4)
        + (7 * n - 6) * (s_du3 + s_dv3)
        + (2 * n - 4) * s_dw2_cap
        + 12 * (du4 + dv4) + (12 * n + 4) * dw3
    )
    assert sp.expand(partitioned - independently_grouped) == 0

    r = sp.symbols("r", integer=True, nonnegative=True)
    shifted_lower_numerator = sp.expand((12 * lower_bound).subs(n, r + 3))
    shifted_k3 = sp.expand(k3.subs(n, r + 3))
    shifted_q_w2 = sp.expand(q_w2.subs(n, r + 3))
    assert shifted_lower_numerator == (
        71 * r**4 + 520 * r**3 + 2605 * r**2 + 5084 * r + 10308
    )
    assert shifted_k3 == 11 * r**2 + 36 * r + 122
    assert shifted_q_w2 == 53 * r**2 + 120 * r + 427

    n2_rules = {
        n: 2,
        w2: 0, w3: 0, w4: 0, w5: 0,
        a2: 0, a3: 0, a4: 0, a5: 0,
        b2: 0, b3: 0, b4: 0, b5: 0,
        z3: 0, z4: 0, z5: 0,
        de4: 0, du3: 0, du4: 0, dv3: 0, dv4: 0,
        dw2: 0, dw3: 0, dw4: 0,
    }
    n2_value = sp.factor(partitioned.subs(n2_rules))
    assert sp.expand(n2_value - (323 + 100 * z2)) == 0

    all_order_proofs = {
        "marked_partition": (
            "The four categories W,A,B,Z partition every independent set by "
            "membership in the two marked vertices; inclusion-exclusion gives "
            "the four displayed row identities rank by rank."
        ),
        "consecutive_W": (
            "W is the induced forest C-{u,v} on n-2 vertices. Counting pairs "
            "(independent (k+1)-set, contained k-set) gives "
            "(k+1)W_(k+1)<=(n-2-k)W_k for k=2,3,4."
        ),
        "consecutive_A_B": (
            "After deleting its fixed mark, A_(k+1) is i_k(H_A) for an induced "
            "forest H_A of order A2<=n-2. Thus 3A4<=(A2-2)A3<=(n-4)A3 "
            "and 4A5<=(A2-3)A4<=(n-5)A4; B is symmetric."
        ),
        "consecutive_Z": (
            "If Z2=0 then all Z rows vanish. If Z2=1, deleting both fixed "
            "marks makes Z_(k+2)=i_k(H_Z) for an induced forest of order at "
            "most n-2; hence 3Z5<=(n-4)Z4."
        ),
        "forest_W2_floor": (
            "A forest W on n-2>=1 vertices has at most n-3 edges, so its "
            "independent-pair count is at least C(n-2,2)-(n-3)."
        ),
        "W3_cap_and_marked_caps": (
            "W3<=C(n-2,3), while A2 and B2 are orders of induced available "
            "graphs on subsets of the n-2 unmarked vertices."
        ),
        "D_W_containment": (
            "For a support p, D=C-N_B(p) is an induced subgraph of C. Therefore "
            "D-{u,v} is induced on a vertex subset of W=C-{u,v}; the identity "
            "map injects every independent pair counted by DW2 into one counted "
            "by W2. The required direction is exactly W2-DW2>=0."
        ),
        "D_caps": (
            "Each D row is induced on at most n vertices, so its independent "
            "k-sets inject into all k-subsets of an n-element set. This proves "
            "the DE4,DU3,DV3,DW2,DW4 binomial caps."
        ),
        "multipliers": (
            "Writing n=r+3 gives positive-coefficient polynomials "
            "k3=11r^2+36r+122, qW2=53r^2+120r+427, and the lower-bound "
            "numerator 71r^4+520r^3+2605r^2+5084r+10308; every remaining "
            "multiplier is visibly nonnegative for r>=0, and Z2 is 0 or 1."
        ),
    }

    replay = atlas_hostile_replay(partitioned)
    report = {
        "marker": MARKER,
        "theorem_audited": (
            "For every forest-realizable marked rank-six sibling-bundle cell, "
            "g5 is strictly positive; for n>=3 it is at least the displayed "
            "positive quartic, and for n=2 it equals 323+100Z2."
        ),
        "independent_reconstruction": {
            "Gamma_nodes": 11,
            "Newton_coefficient": "g5",
            "raw_matches_producer": True,
            "marked_partition_matches_independent_reduction": True,
            "decomposition_identity": True,
        },
        "n_at_least_3": {
            "strict_lower_bound": str(sp.factor(lower_bound)),
            "positive_shifted_numerator": str(shifted_lower_numerator),
            "shifted_k3": str(shifted_k3),
            "shifted_qW2": str(shifted_q_w2),
        },
        "n_equals_2": {
            "exact_value": str(n2_value),
            "Z2_domain": [0, 1],
            "minimum": 323,
            "literal_realized_support_cases": replay["n_equals_2_realized_support_cells"],
        },
        "all_order_slack_proofs": all_order_proofs,
        "hostile_finite_replay": replay,
        "dependencies_sha256": EXPECTED,
        "scope_guard": (
            "Universal exact nonnegativity only for rank-six bundle g5. The "
            "finite replay is supplementary and supplies no theorem credit. "
            "Coefficients g1..g4, the full rank-six bundle lemma, all-N6, and "
            "Erdos Problem 993 remain outside this audit."
        ),
        "source_sha256": sha256(SOURCE),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    summary = {
        "marker": MARKER,
        "lower_bound": report["n_at_least_3"]["strict_lower_bound"],
        "n_equals_2_minimum": 323,
        "induced_D_minor_cells": replay["all_induced_D_minor_cells"],
        "realized_support_cells": replay["forest_preserving_realized_support_cells"],
        "minimum_replayed_g5": replay["minima"]["g5"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }
    print(json.dumps(summary, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
