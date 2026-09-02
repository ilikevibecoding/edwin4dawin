#!/usr/bin/env python3
"""Independent exact audit of the universal rank-six bundle g7 theorem.

The raw coefficient is rebuilt from eleven direct Gamma values and forward
differences, not from the producer derivation.  The marked-set partition,
four counting slacks, exact decomposition, and strict lower bound are checked
fail-closed.  The scope is g7 only.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n6_bundle_algebra_finite_g2_transfer_audit import (
    add_xd,
    forward_differences,
    independence_row,
    isolate_multiply,
    nested,
    sha256,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
PRODUCER_SOURCE = HERE / "prove_iso_n6_bundle_g7_root.py"
PRODUCER_REPORT = HERE / "iso_n6_bundle_g7_exact_root_20260830.json"
INDEPENDENT_ALGEBRA_SOURCE = HERE / "audit_iso_n6_bundle_algebra_finite_g2_transfer_audit.py"
INDEPENDENT_ALGEBRA_REPORT = HERE / "iso_n6_bundle_algebra_finite_independent_audit_exact_g2_transfer_audit_20260830.json"
OUTPUT = HERE / "iso_n6_bundle_g7_independent_audit_exact_g2_transfer_audit_20260830.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G7_G2_TRANSFER_AUDIT"
EXPECTED = {
    "producer_source": "047016067AD2E941AA488F248CC6F0A450A5BDB8776E9357F891812EAF5FF198",
    "producer_report": "7C457382F29BA910D68282CD34ECA8CF770515C3447DC27C341D33485669D830",
    "independent_algebra_source": "443271843C72AE45D7CB3594664034DE64507D500017AA958EEDE6AD03F792B2",
    "independent_algebra_report": "C08ED6BB86ADCB6F4F49726C7F1C2E436DCCBDFF1343FA12EFD1EA399613BEEC",
}


def reconstruct_g7():
    crows = tuple(tuple(sp.symbols(f"c{name}0:8")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:8")) for name in "EUVW")
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(11):
        bundled = add_xd(isolate_multiply(crows, amount, 7), drows)
        payment = sum(nested(isolate_multiply(crows, offset, 7), 5) for offset in range(amount))
        gamma.append(sp.expand(nested(bundled, 6) - nested(base, 6) - payment))
    coefficients = forward_differences(gamma)
    assert len(coefficients) == 11 and coefficients[0] == 0
    m = sp.symbols("M", integer=True, nonnegative=True)
    reconstruction = sum(coefficients[index] * sp.binomial(m, index) for index in range(11))
    for amount, value in enumerate(gamma):
        assert sp.expand(reconstruction.subs(m, amount) - value) == 0
    return coefficients[7]


def marked_partition_census():
    """Literal set-category replay on every atlas forest through order seven."""
    cells = set_counts = slack_checks = 0
    minima = {"S_W": None, "S_A": None, "S_B": None}
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        nodes = tuple(graph)
        for u, v in itertools.combinations(nodes, 2):
            cells += 1
            rows = []
            for removed in ((), (u,), (v,), (u, v)):
                reduced = graph.copy()
                reduced.remove_nodes_from(removed)
                rows.append(independence_row(reduced, 7))
            e, ru, rv, w = rows
            categories = {}
            for rank in (2, 3):
                categories[("W", rank)] = w[rank]
                categories[("A", rank)] = ru[rank] - w[rank]
                categories[("B", rank)] = rv[rank] - w[rank]
                categories[("Z", rank)] = e[rank] - ru[rank] - rv[rank] + w[rank]
                assert all(categories[(name, rank)] >= 0 for name in "WABZ")
                assert e[rank] == sum(categories[(name, rank)] for name in "WABZ")

                literal = {name: 0 for name in "WABZ"}
                for chosen in itertools.combinations(nodes, rank):
                    if any(graph.has_edge(a, b) for a, b in itertools.combinations(chosen, 2)):
                        continue
                    has_u, has_v = u in chosen, v in chosen
                    label = "Z" if has_u and has_v else "B" if has_u else "A" if has_v else "W"
                    literal[label] += 1
                assert all(categories[(name, rank)] == literal[name] for name in "WABZ")
                set_counts += 1

            n = len(graph)
            sw = (n - 4) * categories[("W", 2)] - 3 * categories[("W", 3)]
            sa = (n - 3) * categories[("A", 2)] - 2 * categories[("A", 3)]
            sb = (n - 3) * categories[("B", 2)] - 2 * categories[("B", 3)]
            assert sw >= 0 and sa >= 0 and sb >= 0
            for name, value in (("S_W", sw), ("S_A", sa), ("S_B", sb)):
                minima[name] = value if minima[name] is None else min(minima[name], value)
            slack_checks += 3
    assert cells == 1224
    return {
        "atlas_orders": [2, 7],
        "unordered_marked_cells": cells,
        "literal_rank2_rank3_partition_checks": set_counts,
        "W_A_B_slack_checks": slack_checks,
        "slack_minima": minima,
        "role": "supplementary finite replay; the double-counting arguments are all-order",
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
    assert producer["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G7_ROOT"
    assert producer["rank"] == 6 and producer["coefficient"] == "g7"

    g7_generic = reconstruct_g7()
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
    raw = sp.factor(g7_generic.subs(structural))
    producer_symbols = {str(symbol): symbol for symbol in raw.free_symbols}
    assert sp.expand(raw - sp.sympify(producer["raw_first_face"], locals=producer_symbols)) == 0

    w2, w3, a2, a3, b2, b3, z2, z3, d2 = sp.symbols(
        "W2 W3 A2 A3 B2 B3 Z2 Z3 D2", integer=True, nonnegative=True
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
        sp.Symbol("dW2"): d2,
    }
    partitioned = sp.factor(raw.subs(marked_partition))
    partition_symbols = {str(symbol): symbol for symbol in partitioned.free_symbols}
    assert sp.expand(
        partitioned - sp.sympify(producer["partitioned_coefficient"], locals=partition_symbols)
    ) == 0

    slack_w = (n - 4) * w2 - 3 * w3
    slack_a = (n - 3) * a2 - 2 * a3
    slack_b = (n - 3) * b2 - 2 * b3
    slack_d = n * (n - 1) / 2 - d2
    lower_bound = (413 * n**2 + 959 * n + 1526) / 2
    decomposition = sp.expand(
        lower_bound
        + 14 * w2
        + 42 * slack_w
        + (49 * n + 133) * (a2 + b2)
        + 7 * (slack_a + slack_b)
        + (28 * n + 134) * z2
        + 28 * z3
        + 7 * slack_d
    )
    assert sp.expand(partitioned - decomposition) == 0
    assert sp.expand(
        lower_bound - sp.sympify(producer["strict_lower_bound"], locals={"n": n})
    ) == 0
    assert sp.expand(lower_bound.subs(n, 2)) == 2548

    all_order_slacks = {
        "S_W": (
            "W has m=n-2 vertices. Count pairs (independent triple, chosen pair): "
            "there are 3W3, while each independent pair has at most m-2=n-4 extensions."
        ),
        "S_A": (
            "Removing v from an A-set identifies A2 with the vertex count a and A3 "
            "with independent pairs of an induced graph. Thus 2A3<=a(a-1), and "
            "a=A2<=n-2 gives 2A3<=(n-3)A2."
        ),
        "S_B": "The identical induced-graph argument with u and v exchanged.",
        "S_D": (
            "The D-W row is an induced simple graph on at most n vertices, so its "
            "independent-pair count D2 is at most C(n,2)."
        ),
        "partition": (
            "W,A,B,Z are the four disjoint categories according to whether an "
            "independent set contains neither mark, only v, only u, or both."
        ),
    }
    census = marked_partition_census()
    report = {
        "marker": MARKER,
        "theorem_audited": (
            "For every forest-realizable marked rank-six sibling-bundle cell, g7 is "
            "strictly positive, with the displayed lower bound."
        ),
        "raw_g7_matches": True,
        "marked_partition_identity": True,
        "decomposition_identity": True,
        "strict_lower_bound": str(sp.factor(lower_bound)),
        "minimum_bound_at_n_equals_2": 2548,
        "all_order_slack_proofs": all_order_slacks,
        "finite_partition_replay": census,
        "dependencies_sha256": EXPECTED,
        "scope_guard": (
            "Universal exact nonnegativity only for rank-six bundle g7. Coefficients "
            "g1..g6, the complete bundle lemma, all-N6, higher ranks, and Problem 993 "
            "remain outside this audit."
        ),
        "source_sha256": sha256(SOURCE),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "strict_lower_bound": report["strict_lower_bound"],
        "minimum_bound_at_n_equals_2": 2548,
        "partition_cells": census["unordered_marked_cells"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
