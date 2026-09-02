#!/usr/bin/env python3
"""Independent exact audit of the universal rank-six bundle g5 theorem.

The coefficient is rebuilt at all eleven Gamma nodes with literal forward
differences, independently of the producer's Bernoulli/binomial conversion.
The W/A/B/Z partition, all counting/order/forest/containment slacks, the n>=3
quartic decomposition, and the n=2 face are then checked exactly.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import (
    add_xd,
    forward_differences,
    independence_row,
    isolate_multiply,
    nested,
    sha256,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
PRODUCER_SOURCE = HERE / "prove_iso_n6_bundle_g5_root.py"
PRODUCER_REPORT = HERE / "iso_n6_bundle_g5_exact_root_20260830.json"
G6_AUDIT_SOURCE = HERE / "audit_iso_n6_bundle_g6_g2_transfer_audit.py"
G6_AUDIT_REPORT = HERE / "iso_n6_bundle_g6_independent_audit_exact_g2_transfer_audit_20260830.json"
OUTPUT = HERE / "iso_n6_bundle_g5_independent_audit_exact_g2_transfer_audit_20260830.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G5_G2_TRANSFER_AUDIT"
EXPECTED = {
    "producer_source": "FFB710731946FD1C47E656EC52953A66E3F423960C95763F838AFC1159AB62FF",
    "producer_report": "5A66101180056A9B18F974E172D0699C02865FCBD3AF0F3A43D9D99C8B4D405E",
    "g6_audit_source": "A7C471704255D1705B5908D8940AF8DE0E9CB99EE74F9ED06E850A5F91C0783C",
    "g6_audit_report": "1284A8D96FB8F5E4A619EE5C60C5BD93DA67A06BB15F52DB4298B13D0C1E3F3A",
}


def choose_polynomial(order, rank):
    return sp.prod(order - offset for offset in range(rank)) / sp.factorial(rank)


def reconstruct_g5():
    crows = tuple(tuple(sp.symbols(f"c{name}0:8")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:8")) for name in "EUVW")
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(11):
        bundled = add_xd(isolate_multiply(crows, amount), drows)
        lower_payment = sum(
            nested(isolate_multiply(crows, offset), 5)
            for offset in range(amount)
        )
        gamma.append(
            sp.expand(nested(bundled, 6) - nested(base, 6) - lower_payment)
        )
    coefficients = forward_differences(gamma)
    assert len(coefficients) == 11 and coefficients[0] == 0
    m = sp.symbols("M", integer=True, nonnegative=True)
    interpolation = sum(
        coefficients[index] * sp.binomial(m, index)
        for index in range(11)
    )
    for amount, value in enumerate(gamma):
        assert sp.expand(interpolation.subs(m, amount) - value) == 0
    return coefficients[5]


def atlas_replay(partitioned, lower_bound):
    symbols = {str(symbol): symbol for symbol in partitioned.free_symbols}
    names = (
        "n", "W2", "W3", "W4", "W5", "A2", "A3", "A4", "A5",
        "B2", "B3", "B4", "B5", "Z2", "Z3", "Z4", "Z5",
        "DE4", "DU3", "DU4", "DV3", "DV4", "DW2", "DW3", "DW4",
    )
    evaluate = sp.lambdify(tuple(symbols[name] for name in names), partitioned, "math")
    cells = partition_checks = slack_checks = induced_d_checks = 0
    minima = {
        label: None for label in (
            "S_W2", "S_W3", "S_W4", "S_W5", "S_A4", "S_A5",
            "S_B4", "S_B5", "S_Z5", "S_W3_cap", "S_DW_in_W",
            "S_A2_cap", "S_B2_cap", "S_DE4", "S_DU3", "S_DV3",
            "S_DW2", "S_DW4", "g5",
        )
    }

    def update(label, value):
        minima[label] = value if minima[label] is None else min(minima[label], value)

    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        nodes = tuple(graph)
        n_value = len(graph)
        for u, v in itertools.combinations(nodes, 2):
            cells += 1
            crows = []
            for removed in ((), (u,), (v,), (u, v)):
                reduced = graph.copy()
                reduced.remove_nodes_from(removed)
                crows.append(independence_row(reduced, 5))
            e, ru, rv, w = crows
            category = {}
            for rank in (2, 3, 4, 5):
                category[("W", rank)] = w[rank]
                category[("A", rank)] = ru[rank] - w[rank]
                category[("B", rank)] = rv[rank] - w[rank]
                category[("Z", rank)] = e[rank] - ru[rank] - rv[rank] + w[rank]
                assert all(category[(name, rank)] >= 0 for name in "WABZ")
                assert e[rank] == sum(category[(name, rank)] for name in "WABZ")
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
                        "B" if has_u else "A" if has_v else "W"
                    )
                    literal[label] += 1
                assert all(
                    category[(name, rank)] == literal[name] for name in "WABZ"
                )
                partition_checks += 1
            assert category[("Z", 2)] in (0, 1)

            if n_value >= 3:
                c_slacks = {
                    "S_W2": 2 * category[("W", 2)] - (n_value - 3) * (n_value - 4),
                    "S_W3": (n_value - 4) * category[("W", 2)] - 3 * category[("W", 3)],
                    "S_W4": (n_value - 5) * category[("W", 3)] - 4 * category[("W", 4)],
                    "S_W5": (n_value - 6) * category[("W", 4)] - 5 * category[("W", 5)],
                    "S_A4": (n_value - 4) * category[("A", 3)] - 3 * category[("A", 4)],
                    "S_A5": (n_value - 5) * category[("A", 4)] - 4 * category[("A", 5)],
                    "S_B4": (n_value - 4) * category[("B", 3)] - 3 * category[("B", 4)],
                    "S_B5": (n_value - 5) * category[("B", 4)] - 4 * category[("B", 5)],
                    "S_Z5": (n_value - 4) * category[("Z", 4)] - 3 * category[("Z", 5)],
                    "S_W3_cap": comb(n_value - 2, 3) - category[("W", 3)],
                    "S_A2_cap": n_value - 2 - category[("A", 2)],
                    "S_B2_cap": n_value - 2 - category[("B", 2)],
                }
                assert all(value >= 0 for value in c_slacks.values())
                for label, value in c_slacks.items():
                    update(label, value)
                    slack_checks += 1

            for mask in range(1 << n_value):
                retained = [node for node in nodes if mask & (1 << node)]
                dgraph = graph.subgraph(retained).copy()
                drows = []
                for removed in ((), (u,), (v,), (u, v)):
                    reduced = dgraph.copy()
                    reduced.remove_nodes_from(removed)
                    drows.append(independence_row(reduced, 5))
                de, du, dv, dw = drows
                d_slacks = {
                    "S_DW_in_W": category[("W", 2)] - dw[2],
                    "S_DE4": comb(n_value, 4) - de[4],
                    "S_DU3": comb(n_value, 3) - du[3],
                    "S_DV3": comb(n_value, 3) - dv[3],
                    "S_DW2": comb(n_value, 2) - dw[2],
                    "S_DW4": comb(n_value, 4) - dw[4],
                }
                assert all(value >= 0 for value in d_slacks.values())
                for label, value in d_slacks.items():
                    update(label, value)
                    slack_checks += 1
                arguments = (
                    n_value,
                    category[("W", 2)], category[("W", 3)],
                    category[("W", 4)], category[("W", 5)],
                    category[("A", 2)], category[("A", 3)],
                    category[("A", 4)], category[("A", 5)],
                    category[("B", 2)], category[("B", 3)],
                    category[("B", 4)], category[("B", 5)],
                    category[("Z", 2)], category[("Z", 3)],
                    category[("Z", 4)], category[("Z", 5)],
                    de[4], du[3], du[4], dv[3], dv[4],
                    dw[2], dw[3], dw[4],
                )
                value = int(evaluate(*arguments))
                if n_value == 2:
                    assert value == 323 + 100 * category[("Z", 2)]
                else:
                    assert 12 * value >= int(12 * lower_bound.subs(symbols["n"], n_value))
                update("g5", value)
                induced_d_checks += 1
    assert cells == 1224
    return {
        "atlas_orders": [2, 7],
        "unordered_marked_cells": cells,
        "literal_rank2_through_rank5_partition_checks": partition_checks,
        "induced_D_minor_cells": induced_d_checks,
        "slack_checks": slack_checks,
        "minima": minima,
        "role": (
            "supplementary exact replay only; the all-order inequalities and "
            "symbolic decomposition prove the theorem"
        ),
    }


def main():
    actual = {
        "producer_source": sha256(PRODUCER_SOURCE),
        "producer_report": sha256(PRODUCER_REPORT),
        "g6_audit_source": sha256(G6_AUDIT_SOURCE),
        "g6_audit_report": sha256(G6_AUDIT_REPORT),
    }
    assert actual == EXPECTED
    producer = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert producer["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G5_ROOT"
    assert producer["rank"] == 6 and producer["coefficient"] == "g5"

    g5_generic = reconstruct_g5()
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
    raw = sp.factor(g5_generic.subs(structural))
    raw_symbols = {str(symbol): symbol for symbol in raw.free_symbols}
    assert sp.expand(
        raw - sp.sympify(producer["raw_first_face"], locals=raw_symbols)
    ) == 0

    w2, w3, w4, w5 = sp.symbols("W2 W3 W4 W5", integer=True, nonnegative=True)
    a2, a3, a4, a5 = sp.symbols("A2 A3 A4 A5", integer=True, nonnegative=True)
    b2, b3, b4, b5 = sp.symbols("B2 B3 B4 B5", integer=True, nonnegative=True)
    z2, z3, z4, z5 = sp.symbols("Z2 Z3 Z4 Z5", integer=True, nonnegative=True)
    de4, du3, du4, dv3, dv4, dw2, dw3, dw4 = sp.symbols(
        "DE4 DU3 DU4 DV3 DV4 DW2 DW3 DW4", integer=True, nonnegative=True
    )
    marked_partition = {
        sp.Symbol("cW2"): w2,
        sp.Symbol("cU2"): w2 + a2,
        sp.Symbol("cV2"): w2 + b2,
        sp.Symbol("cE2"): w2 + a2 + b2 + z2,
        sp.Symbol("cW3"): w3,
        sp.Symbol("cU3"): w3 + a3,
        sp.Symbol("cV3"): w3 + b3,
        sp.Symbol("cE3"): w3 + a3 + b3 + z3,
        sp.Symbol("cW4"): w4,
        sp.Symbol("cU4"): w4 + a4,
        sp.Symbol("cV4"): w4 + b4,
        sp.Symbol("cE4"): w4 + a4 + b4 + z4,
        sp.Symbol("cW5"): w5,
        sp.Symbol("cU5"): w5 + a5,
        sp.Symbol("cV5"): w5 + b5,
        sp.Symbol("cE5"): w5 + a5 + b5 + z5,
        sp.Symbol("dE4"): de4,
        sp.Symbol("dU3"): du3,
        sp.Symbol("dU4"): du4,
        sp.Symbol("dV3"): dv3,
        sp.Symbol("dV4"): dv4,
        sp.Symbol("dW2"): dw2,
        sp.Symbol("dW3"): dw3,
        sp.Symbol("dW4"): dw4,
    }
    partitioned = sp.factor(raw.subs(marked_partition))
    partition_symbols = {str(symbol): symbol for symbol in partitioned.free_symbols}
    assert sp.expand(
        partitioned
        - sp.sympify(producer["partitioned_coefficient"], locals=partition_symbols)
    ) == 0

    binom_w3 = choose_polynomial(n - 2, 3)
    binom_n2 = choose_polynomial(n, 2)
    binom_n3 = choose_polynomial(n, 3)
    binom_n4 = choose_polynomial(n, 4)
    slack_w2 = w2 - (n - 3) * (n - 4) / 2
    slack_w3 = (n - 4) * w2 - 3 * w3
    slack_w4 = (n - 5) * w3 - 4 * w4
    slack_w5 = (n - 6) * w4 - 5 * w5
    slack_a4 = (n - 4) * a3 - 3 * a4
    slack_a5 = (n - 5) * a4 - 4 * a5
    slack_b4 = (n - 4) * b3 - 3 * b4
    slack_b5 = (n - 5) * b4 - 4 * b5
    slack_z5 = (n - 4) * z4 - 3 * z5
    slack_w3_cap = binom_w3 - w3
    slack_dw_in_w = w2 - dw2
    slack_a2_cap = n - 2 - a2
    slack_b2_cap = n - 2 - b2
    slack_de4 = binom_n4 - de4
    slack_du3 = binom_n3 - du3
    slack_dv3 = binom_n3 - dv3
    slack_dw2 = binom_n2 - dw2
    slack_dw4 = binom_n4 - dw4
    k3 = 11 * n**2 - 30 * n + 113
    q_w2 = 53 * n**2 - 198 * n + 544
    lower_bound = (
        71 * n**4 - 332 * n**3 + 1759 * n**2 - 4174 * n + 10212
    ) / 12
    q_ab = 2 * w3 + 7 * dw2
    decomposition = sp.expand(
        lower_bound
        + 68 * a2 * b2 + 15 * a2 * b3 + 15 * a3 * b2
        + (a2 + b2) * (70 * w2 + 168 * n - 124)
        + (a3 + b3) * (30 * slack_w2 + k3)
        + (4 * n + 11) * (slack_a4 + slack_b4)
        + 10 * (slack_a5 + slack_b5)
        + (slack_a2_cap + slack_b2_cap) * q_ab
        + 4 * (n - 2) * slack_w3_cap
        + 14 * (n - 2) * slack_dw_in_w
        + 3 * w2 * (1 - z2) + 17 * w3 * (1 - z2)
        + 7 * slack_dw_in_w + 7 * dw2 * (1 - z2)
        + (76 * n - 52) * z2
        + (15 * w2 + 68 * n - 60) * z3
        + (28 * n - 31) * z4 / 3 + 17 * slack_z5 / 3
        + 7 * w2 * slack_dw_in_w + 28 * slack_w2 * w3
        + (15 * n - 12) * slack_w3
        + 7 * (2 * n + 3) * slack_w4 + 14 * slack_w5
        + slack_w2 * (68 * slack_w2 + q_w2)
        + 7 * (slack_de4 + slack_dw4)
        + (7 * n - 6) * (slack_du3 + slack_dv3)
        + (2 * n - 4) * slack_dw2
        + 12 * (du4 + dv4) + (12 * n + 4) * dw3
    )
    assert sp.expand(partitioned - decomposition) == 0
    assert sp.expand(
        lower_bound
        - sp.sympify(producer["n_at_least_3"]["strict_lower_bound"], locals={"n": n})
    ) == 0
    r = sp.symbols("r", integer=True, nonnegative=True)
    shifted_numerator = sp.expand((12 * lower_bound).subs(n, r + 3))
    assert shifted_numerator == (
        71 * r**4 + 520 * r**3 + 2605 * r**2 + 5084 * r + 10308
    )

    n2_rules = {
        n: 2, w2: 0, w3: 0, w4: 0, w5: 0,
        a2: 0, a3: 0, a4: 0, a5: 0,
        b2: 0, b3: 0, b4: 0, b5: 0,
        z3: 0, z4: 0, z5: 0,
        de4: 0, du3: 0, du4: 0, dv3: 0, dv4: 0,
        dw2: 0, dw3: 0, dw4: 0,
    }
    n2_value = sp.factor(partitioned.subs(n2_rules))
    assert sp.expand(n2_value - (323 + 100 * z2)) == 0

    slack_proofs = {
        "W_consecutive": (
            "W has n-2 vertices; extension double counts give 3W3<=(n-4)W2, "
            "4W4<=(n-5)W3, and 5W5<=(n-6)W4."
        ),
        "A_B_consecutive": (
            "After deleting the included mark, Ak (respectively Bk) is rank k-1 "
            "in an induced graph of order A2 (respectively B2), both at most n-2. "
            "The same extension count gives the displayed rank-4 and rank-5 slacks."
        ),
        "Z_consecutive": (
            "If the marks are nonadjacent, Zk is rank k-2 in an induced graph of "
            "order Z3<=n-2, giving 3Z5<=(n-4)Z4; otherwise all Z counts vanish."
        ),
        "forest_and_order_caps": (
            "W is a forest on n-2>=1 vertices, so W2>=(n-3)(n-4)/2; also "
            "W3<=C(n-2,3), and A2,B2<=n-2."
        ),
        "D_W_containment": (
            "In a genuine bundle cell D is an induced subgraph of C. Hence D-W "
            "is induced inside C-W and every independent D-W pair is a W pair."
        ),
        "D_caps": (
            "Each D row is an induced simple graph on at most n vertices, yielding "
            "DE4,DW4<=C(n,4), DU3,DV3<=C(n,3), and DW2<=C(n,2)."
        ),
        "positive_multipliers": (
            "For n>=3, k3=11n^2-30n+113 and qW2=53n^2-198n+544 "
            "are positive (negative discriminants), all other scalar multipliers "
            "are visibly nonnegative, and Z2 is in {0,1}."
        ),
        "strict_quartic": (
            "Writing n=r+3 turns twelve times the lower bound into a polynomial "
            "with coefficients 71,520,2605,5084,10308, all strictly positive."
        ),
    }
    census = atlas_replay(partitioned, lower_bound)
    report = {
        "marker": MARKER,
        "theorem_audited": (
            "For every forest-realizable marked rank-six sibling-bundle cell, "
            "g5 is strictly positive; n>=3 obeys the displayed quartic lower "
            "bound and n=2 has value 323+100Z2."
        ),
        "raw_g5_matches": True,
        "marked_partition_identity": True,
        "decomposition_identity": True,
        "n_at_least_3_strict_lower_bound": str(sp.factor(lower_bound)),
        "positive_shifted_numerator": str(shifted_numerator),
        "n_equals_2": {"exact_value": str(n2_value), "minimum": 323, "Z2_domain": [0, 1]},
        "all_order_slack_proofs": slack_proofs,
        "finite_partition_and_D_replay": census,
        "dependencies_sha256": EXPECTED,
        "scope_guard": (
            "Universal exact nonnegativity only for rank-six bundle g5. "
            "Coefficients g1..g4, the complete bundle lemma, all-N6, higher "
            "ranks, and Erdos Problem 993 remain outside this audit."
        ),
        "source_sha256": sha256(SOURCE),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "n_at_least_3_strict_lower_bound": report["n_at_least_3_strict_lower_bound"],
        "n_equals_2_minimum": 323,
        "partition_cells": census["unordered_marked_cells"],
        "induced_D_minor_cells": census["induced_D_minor_cells"],
        "global_atlas_minimum": census["minima"]["g5"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
