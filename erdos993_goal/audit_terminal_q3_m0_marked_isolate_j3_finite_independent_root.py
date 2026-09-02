#!/usr/bin/env python3
"""Independent finite audit of the marked-isolate terminal m=0,j=3 theorem.

This auditor counts independent and exactly-one-edge subsets directly.  It
does not import the theorem producer or its symbolic formulas.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx

from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m0_marked_isolate_j3_finite_independent_audit_root_20260831.json"
MARKER = "PASS_INDEPENDENT_FINITE_TERMINAL_Q3_M0_MARKED_ISOLATE_J3_ROOT"
THEOREM_SOURCE = "prove_terminal_q3_m0_marked_isolate_j3_all_order_root.py"
THEOREM_SOURCE_SHA256 = "8D39EE9ECDD3075053833C14B4A4ACCEADFB7174AC92C64D0F375826CCD6B558"
THEOREM_REPORT = "terminal_q3_m0_marked_isolate_j3_all_order_exact_root_20260831.json"
THEOREM_REPORT_SHA256 = "0E9D2C9F7338A87645D4EF3BE00008F6370C8B77084A823D451F84C0F08EDCBD"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(graph, header=False).decode().strip()


def subset_rows(graph: nx.Graph) -> tuple[dict[int, int], dict[int, int]]:
    independent = {}
    one_edge = {}
    vertices = tuple(graph.nodes())
    for rank in (2, 3, 4):
        independent[rank] = 0
        one_edge[rank] = 0
        for chosen in itertools.combinations(vertices, rank):
            edges = graph.subgraph(chosen).number_of_edges()
            independent[rank] += int(edges == 0)
            one_edge[rank] += int(edges == 1)
    return independent, one_edge


def main() -> None:
    assert sha256(HERE / THEOREM_SOURCE) == THEOREM_SOURCE_SHA256
    assert sha256(HERE / THEOREM_REPORT) == THEOREM_REPORT_SHA256
    theorem = json.loads((HERE / THEOREM_REPORT).read_text(encoding="utf-8"))
    assert theorem["status"] == "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_J3_ROOT"
    assert theorem["source_sha256"] == THEOREM_SOURCE_SHA256

    checked = supported = direct_subsets = 0
    minimum_delta = None
    minimum_cap_margin_three = None
    stream = hashlib.sha256()
    per_order = {}
    for order in range(2, 13):
        order_forests = order_supported = 0
        for graph in forest_graphs(order):
            if any(graph.degree(vertex) == 0 for vertex in graph):
                continue
            checked += 1
            order_forests += 1
            direct_subsets += sum(
                3 * len(list(itertools.combinations(range(order), rank)))
                for rank in (2, 3, 4)
            )
            independent, one_edge = subset_rows(graph)
            f2, f3, f4 = (independent[rank] for rank in (2, 3, 4))
            z3, z4 = one_edge[3], one_edge[4]
            edges = graph.number_of_edges()

            p0 = f3 + 2 * f2 + order
            r0 = z4 + 2 * z3 + edges
            c0 = z3 + 2 * f2
            determinant = p0 * c0 - f2 * r0
            u3 = f4 + 2 * f3 + f2
            e3 = z4 + 2 * f3
            delta = f2 * (
                4 * determinant * u3
                + p0 * (4 * f3 * (c0 + r0) - 3 * (p0 + f2) * e3)
            )

            components = nx.number_connected_components(graph)
            q = order - 2 * components
            excess = [graph.degree(vertex) - 1 for vertex in graph]
            pmax = max(excess, default=0)
            branching = sum(value * (value - 1) // 2 for value in excess)
            tau = sum(
                1
                for chosen in itertools.combinations(graph.nodes(), 4)
                if graph.subgraph(chosen).number_of_edges() == 3
                and nx.is_connected(graph.subgraph(chosen))
            )
            cap_margin_three = (
                (pmax + 1) * branching
                + 3 * pmax * (q - pmax)
                - 3 * tau
            )
            assert cap_margin_three >= 0
            if minimum_cap_margin_three is None or cap_margin_three < minimum_cap_margin_three[0]:
                minimum_cap_margin_three = (
                    cap_margin_three, order, graph6(graph), q, pmax, branching, tau
                )

            if f3 > 0:
                supported += 1
                order_supported += 1
                assert delta >= 0
                record = (
                    delta, order, graph6(graph), components, q, pmax,
                    branching, tau, f2, f3, f4, z3, z4,
                )
                if minimum_delta is None or record < minimum_delta:
                    minimum_delta = record
                stream.update(("|".join(map(str, record)) + "\n").encode())
        per_order[str(order)] = {
            "no_isolate_unlabeled_forests": order_forests,
            "supported_j3_rows": order_supported,
        }

    payload = {
        "status": MARKER,
        "scope": "Every no-isolate unlabeled forest through order 12; all f2,f3,f4,z3,z4 rows counted directly from vertex subsets.",
        "theorem_source_sha256": THEOREM_SOURCE_SHA256,
        "theorem_report_sha256": THEOREM_REPORT_SHA256,
        "no_isolate_unlabeled_forests": checked,
        "supported_j3_rows": supported,
        "direct_subset_edge_tests": direct_subsets,
        "negative_delta_rows": 0,
        "minimum_delta": {
            "value": minimum_delta[0],
            "order": minimum_delta[1],
            "graph6": minimum_delta[2],
            "components": minimum_delta[3],
            "Q": minimum_delta[4],
            "p": minimum_delta[5],
            "B": minimum_delta[6],
            "tau": minimum_delta[7],
        },
        "minimum_pmax_cap_cleared_margin": {
            "value": minimum_cap_margin_three[0],
            "order": minimum_cap_margin_three[1],
            "graph6": minimum_cap_margin_three[2],
            "Q": minimum_cap_margin_three[3],
            "p": minimum_cap_margin_three[4],
            "B": minimum_cap_margin_three[5],
            "tau": minimum_cap_margin_three[6],
        },
        "per_order": per_order,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": "This is an independent finite audit of the all-order analytic theorem, not the source of its unbounded proof and not a proof of any broader terminal-m0 lane.",
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps({
        "status": payload["status"],
        "forests": checked,
        "supported_rows": supported,
        "minimum_delta": minimum_delta[0],
        "minimum_cap_margin_three": minimum_cap_margin_three[0],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
