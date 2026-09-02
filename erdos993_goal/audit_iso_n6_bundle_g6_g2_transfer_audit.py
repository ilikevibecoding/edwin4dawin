#!/usr/bin/env python3
"""Independent exact audit of the universal rank-six bundle g6 theorem.

The raw coefficient is reconstructed from eleven literal Gamma values and
forward differences, without importing the producer derivation.  The marked
set partition, every all-order counting slack, the n>=3 decomposition, and the
n=2 boundary are then checked exactly.  An atlas replay is supplementary; the
claim itself rests on the all-order inequalities.
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
PRODUCER_SOURCE = HERE / "prove_iso_n6_bundle_g6_root.py"
PRODUCER_REPORT = HERE / "iso_n6_bundle_g6_exact_root_20260830.json"
INDEPENDENT_ALGEBRA_SOURCE = (
    HERE / "audit_iso_n6_bundle_algebra_finite_g2_transfer_audit.py"
)
INDEPENDENT_ALGEBRA_REPORT = HERE / (
    "iso_n6_bundle_algebra_finite_independent_audit_exact_"
    "g2_transfer_audit_20260830.json"
)
OUTPUT = HERE / "iso_n6_bundle_g6_independent_audit_exact_g2_transfer_audit_20260830.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G6_G2_TRANSFER_AUDIT"
EXPECTED = {
    "producer_source": "2ECF76862B1FB6C6C84DBD393C41601369F31506DA2AA4A44267FE37FC2594BD",
    "producer_report": "2304848451FB6A2E6740EDCFA080452141A70692939AC2E2477520786574B77A",
    "independent_algebra_source": "443271843C72AE45D7CB3594664034DE64507D500017AA958EEDE6AD03F792B2",
    "independent_algebra_report": "C08ED6BB86ADCB6F4F49726C7F1C2E436DCCBDFF1343FA12EFD1EA399613BEEC",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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


def isolate_multiply(rows, amount, maximum=7):
    return tuple(
        tuple(
            sp.expand(
                sum(
                    sp.Integer(comb(amount, index)) * at(row, rank - index)
                    for index in range(rank + 1)
                )
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


def reconstruct_g6():
    """Rebuild g6 directly at the eleven defining Newton nodes."""
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
    return coefficients[6]


def independence_row(graph, maximum=4):
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


def atlas_partition_replay(partitioned, lower_bound):
    """Check literal categories and many genuine induced D minors."""
    symbols = {str(symbol): symbol for symbol in partitioned.free_symbols}
    ordered = tuple(
        symbols[name]
        for name in (
            "n", "W2", "W3", "W4", "A2", "A3", "A4", "B2", "B3", "B4",
            "Z2", "Z3", "Z4", "DU3", "DV3", "DW2", "DW3",
        )
    )
    evaluate = sp.lambdify(ordered, partitioned, modules="math")
    cells = partition_checks = slack_checks = induced_d_checks = 0
    minima = {
        "S_A4": None, "S_B4": None, "S_Z4": None,
        "S_W4": None, "S_W3": None, "S_W2": None,
        "S_DU3": None, "S_DV3": None, "S_DW2": None,
        "g6": None,
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
                crows.append(independence_row(reduced))
            e, ru, rv, w = crows
            category = {}
            for rank in (2, 3, 4):
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
                    "S_A4": (n_value - 4) * category[("A", 3)] - 3 * category[("A", 4)],
                    "S_B4": (n_value - 4) * category[("B", 3)] - 3 * category[("B", 4)],
                    "S_Z4": (n_value - 3) * category[("Z", 3)] - 2 * category[("Z", 4)],
                    "S_W4": (n_value - 5) * category[("W", 3)] - 4 * category[("W", 4)],
                    "S_W3": (n_value - 4) * category[("W", 2)] - 3 * category[("W", 3)],
                    "S_W2": 2 * category[("W", 2)] - (n_value - 3) * (n_value - 4),
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
                    drows.append(independence_row(reduced))
                _de, du, dv, dw = drows
                d_slacks = {
                    "S_DU3": comb(n_value, 3) - du[3],
                    "S_DV3": comb(n_value, 3) - dv[3],
                    "S_DW2": comb(n_value, 2) - dw[2],
                }
                assert all(value >= 0 for value in d_slacks.values())
                for label, value in d_slacks.items():
                    update(label, value)
                    slack_checks += 1
                arguments = (
                    n_value,
                    category[("W", 2)], category[("W", 3)], category[("W", 4)],
                    category[("A", 2)], category[("A", 3)], category[("A", 4)],
                    category[("B", 2)], category[("B", 3)], category[("B", 4)],
                    category[("Z", 2)], category[("Z", 3)], category[("Z", 4)],
                    du[3], dv[3], dw[2], dw[3],
                )
                value = int(evaluate(*arguments))
                if n_value == 2:
                    assert value == 1400 + 220 * category[("Z", 2)]
                else:
                    assert 6 * value >= int(6 * lower_bound.subs(symbols["n"], n_value))
                update("g6", value)
                induced_d_checks += 1
    assert cells == 1224
    return {
        "atlas_orders": [2, 7],
        "unordered_marked_cells": cells,
        "literal_rank2_through_rank4_partition_checks": partition_checks,
        "induced_D_minor_cells": induced_d_checks,
        "slack_checks": slack_checks,
        "minima": minima,
        "role": (
            "supplementary exact replay only; the decomposition and all-order "
            "double-counting arguments prove the theorem"
        ),
    }


def main():
    actual = {
        "producer_source": sha256(PRODUCER_SOURCE),
        "producer_report": sha256(PRODUCER_REPORT),
        "independent_algebra_source": sha256(INDEPENDENT_ALGEBRA_SOURCE),
        "independent_algebra_report": sha256(INDEPENDENT_ALGEBRA_REPORT),
    }
    assert actual == EXPECTED
    producer = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert producer["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G6_ROOT"
    assert producer["rank"] == 6 and producer["coefficient"] == "g6"

    g6_generic = reconstruct_g6()
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
    raw = sp.factor(g6_generic.subs(structural))
    raw_symbols = {str(symbol): symbol for symbol in raw.free_symbols}
    assert sp.expand(
        raw - sp.sympify(producer["raw_first_face"], locals=raw_symbols)
    ) == 0

    w2, w3, w4 = sp.symbols("W2 W3 W4", integer=True, nonnegative=True)
    a2, a3, a4 = sp.symbols("A2 A3 A4", integer=True, nonnegative=True)
    b2, b3, b4 = sp.symbols("B2 B3 B4", integer=True, nonnegative=True)
    z2, z3, z4 = sp.symbols("Z2 Z3 Z4", integer=True, nonnegative=True)
    du3, dv3, dw2, dw3 = sp.symbols(
        "DU3 DV3 DW2 DW3", integer=True, nonnegative=True
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
        sp.Symbol("dU3"): du3,
        sp.Symbol("dV3"): dv3,
        sp.Symbol("dW2"): dw2,
        sp.Symbol("dW3"): dw3,
    }
    partitioned = sp.factor(raw.subs(marked_partition))
    partition_symbols = {str(symbol): symbol for symbol in partitioned.free_symbols}
    assert sp.expand(
        partitioned
        - sp.sympify(producer["partitioned_coefficient"], locals=partition_symbols)
    ) == 0

    slack_a4 = (n - 4) * a3 - 3 * a4
    slack_b4 = (n - 4) * b3 - 3 * b4
    slack_z4 = (n - 3) * z3 - 2 * z4
    slack_w4 = (n - 5) * w3 - 4 * w4
    slack_w3 = (n - 4) * w2 - 3 * w3
    slack_w2 = w2 - (n - 3) * (n - 4) / 2
    slack_du3 = n * (n - 1) * (n - 2) / 6 - du3
    slack_dv3 = n * (n - 1) * (n - 2) / 6 - dv3
    slack_dw2 = n * (n - 1) / 2 - dw2
    lower_bound = (259 * n**3 + 123 * n**2 + 1088 * n + 5448) / 6
    decomposition = sp.expand(
        lower_bound
        + 30 * a2 * b2
        + 28 * (a2 + b2) * w2
        + (170 * n + 10) * (a2 + b2)
        + (14 * n - 4) * (a3 + b3)
        + 14 * (slack_a4 + slack_b4)
        + (80 * n + 60) * z2
        + (29 * n + 23) * z3
        + slack_z4
        + 2 * w2 * (1 - z2)
        + 14 * (n + 3) * slack_w3
        + 28 * slack_w4
        + slack_w2 * (28 * slack_w2 + 14 * n**2 + 286)
        + 7 * (slack_du3 + slack_dv3)
        + (7 * n + 2) * slack_dw2
        + 12 * dw3
    )
    assert sp.expand(partitioned - decomposition) == 0
    assert sp.expand(
        lower_bound
        - sp.sympify(producer["n_at_least_3"]["strict_lower_bound"], locals={"n": n})
    ) == 0

    n2_rules = {
        n: 2, w2: 0, w3: 0, w4: 0,
        a2: 0, a3: 0, a4: 0, b2: 0, b3: 0, b4: 0,
        z3: 0, z4: 0, du3: 0, dv3: 0, dw2: 0, dw3: 0,
    }
    n2_value = sp.factor(partitioned.subs(n2_rules))
    assert sp.expand(n2_value - (1400 + 220 * z2)) == 0

    slack_proofs = {
        "S_A4": (
            "Deleting v from an A-set identifies A3 and A4 with independent "
            "pairs and triples in an induced graph on A2<=n-2 available vertices. "
            "Counting (triple, contained pair) gives 3A4<=(A2-2)A3<=(n-4)A3."
        ),
        "S_B4": "The identical argument with u and v exchanged.",
        "S_Z4": (
            "If {u,v} is independent, deleting both marks identifies Z3 with the "
            "available vertex count h<=n-2 and Z4 with independent pairs there, "
            "so 2Z4<=h(h-1)<=(n-3)Z3; if not, both counts vanish."
        ),
        "S_W4_S_W3": (
            "W is a graph on n-2 vertices. Counting extensions of independent "
            "triples and pairs gives 4W4<=(n-5)W3 and 3W3<=(n-4)W2."
        ),
        "S_W2": (
            "W is a forest on n-2>=1 vertices, hence has at most n-3 edges; "
            "therefore W2=C(n-2,2)-e(W)>=(n-3)(n-4)/2."
        ),
        "S_D": (
            "D-U, D-V, and D-W are induced simple graphs on at most n vertices, "
            "so DU3,DV3<=C(n,3) and DW2<=C(n,2)."
        ),
        "remaining_terms": (
            "For n>=3 every displayed multiplier is nonnegative, all category "
            "counts and DW3 are nonnegative, and Z2 is the 0/1 indicator for "
            "whether the two marked vertices form an independent pair."
        ),
    }
    census = atlas_partition_replay(partitioned, lower_bound)
    report = {
        "marker": MARKER,
        "theorem_audited": (
            "For every forest-realizable marked rank-six sibling-bundle cell, "
            "g6 is strictly positive; n>=3 obeys the displayed cubic lower "
            "bound and n=2 has value 1400+220Z2."
        ),
        "raw_g6_matches": True,
        "marked_partition_identity": True,
        "decomposition_identity": True,
        "n_at_least_3_strict_lower_bound": str(sp.factor(lower_bound)),
        "n_equals_2": {
            "exact_value": str(n2_value),
            "minimum": 1400,
            "Z2_domain": [0, 1],
        },
        "all_order_slack_proofs": slack_proofs,
        "finite_partition_and_D_replay": census,
        "dependencies_sha256": EXPECTED,
        "scope_guard": (
            "Universal exact nonnegativity only for rank-six bundle g6. "
            "Coefficients g1..g5, the complete bundle lemma, all-N6, higher "
            "ranks, and Erdos Problem 993 remain outside this audit."
        ),
        "source_sha256": sha256(SOURCE),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "n_at_least_3_strict_lower_bound": report["n_at_least_3_strict_lower_bound"],
        "n_equals_2_minimum": 1400,
        "partition_cells": census["unordered_marked_cells"],
        "induced_D_minor_cells": census["induced_D_minor_cells"],
        "global_atlas_minimum": census["minima"]["g6"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
