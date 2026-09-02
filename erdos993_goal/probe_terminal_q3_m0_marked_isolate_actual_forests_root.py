#!/usr/bin/env python3
"""Exact finite route probe for terminal-q3 m=0 with an isolated marked root.

This is deliberately a diagnostic, not a theorem.  It enumerates every
unlabeled no-isolate forest through a requested order, reconstructs both the
independence and exactly-one-induced-edge rows, and compares the actual m=0
payment with the retained-q3 certificate and two ordinary-shadow relaxations.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import json
from pathlib import Path

import networkx as nx

from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent import forest_graphs


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m0_marked_isolate_actual_forests_probe_root_20260831.json"


def at(row: list[int], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def add_shifted(target: list[int], source: list[int], shift: int) -> None:
    needed = len(source) + shift
    if len(target) < needed:
        target.extend([0] * (needed - len(target)))
    for rank, value in enumerate(source):
        target[rank + shift] += value


def one_edge_polynomial(graph: nx.Graph) -> list[int]:
    """Exactly-one-edge row via the unique induced edge."""
    output = [0] * (graph.number_of_nodes() + 1)
    for u, v in graph.edges():
        forbidden = set(graph.neighbors(u)) | set(graph.neighbors(v)) | {u, v}
        remainder = graph.copy()
        remainder.remove_nodes_from(forbidden)
        add_shifted(output, poly_forest(remainder), 2)
    while len(output) > 1 and output[-1] == 0:
        output.pop()
    return output


def choose(value: int, rank: int) -> int:
    if value < rank:
        return 0
    result = 1
    for offset in range(rank):
        result = result * (value - offset) // (offset + 1)
    return result


def graph6(graph: nx.Graph) -> str:
    return nx.to_graph6_bytes(graph, header=False).decode().strip()


def update_minimum(current, record):
    return record if current is None or record[0] < current[0] else current


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--maximum-order", type=int, default=13)
    args = parser.parse_args()
    assert 2 <= args.maximum_order <= 18

    forests = supported_cells = 0
    negative_actual = []
    negative_repaired = []
    negative_weak_shadow = []
    negative_coupled_shadow = []
    minima = {
        "actual_delta": None,
        "repaired_q3_clear": None,
        "weak_shadow_clear": None,
        "coupled_shadow_clear": None,
        "q3_minus_qj": None,
    }
    per_order = {}
    stream = hashlib.sha256()

    for order in range(2, args.maximum_order + 1):
        order_forests = order_cells = 0
        for graph in forest_graphs(order):
            if any(graph.degree(vertex) == 0 for vertex in graph):
                continue
            order_forests += 1
            forests += 1
            f = poly_forest(graph)
            z = one_edge_polynomial(graph)
            edges = graph.number_of_edges()
            wedges = sum(degree * (degree - 1) // 2 for _, degree in graph.degree())
            triples = sum(
                1
                for vertices in __import__("itertools").combinations(graph.nodes(), 4)
                if graph.subgraph(vertices).number_of_edges() == 3
                and nx.is_connected(graph.subgraph(vertices))
            )

            f2, f3 = at(f, 2), at(f, 3)
            z2, z3, z4 = at(z, 2), at(z, 3), at(z, 4)
            assert z2 == edges
            assert z3 == edges * (order - 2) - 2 * wedges
            assert f3 == choose(order, 3) - edges * (order - 2) + wedges
            assert z4 == (
                edges * choose(order - 2, 2)
                - 2 * choose(edges, 2)
                - 2 * wedges * (order - 4)
                + 3 * triples
            )

            # The isolated marked root and the one mandatory terminal leaf
            # together multiply the excluded block by (1+x)^2.
            P = f3 + 2 * f2 + order
            R = z4 + 2 * z3 + z2
            c = z3 + 2 * f2
            a = f2
            A = P * c - a * R
            assert A >= 0

            for j in range(3, len(f)):
                b = at(f, j)
                if b == 0:
                    continue
                order_cells += 1
                supported_cells += 1
                zj = at(z, j + 1)
                U = at(f, j + 1) + 2 * b + at(f, j - 1)
                e = zj + 2 * b
                delta = (
                    (j + 1) * a * A * U
                    + a * P * ((j + 1) * b * (c + R) - 3 * (P + a) * e)
                )
                qgap_numerator = j * z4 * b - 3 * f3 * zj
                reserve = a * P * (P + a) * qgap_numerator
                repaired = f3 * delta - reserve
                r = order - j
                weak_u = Fraction(2) + Fraction(j, r + 1)
                coupled_u = weak_u + max(Fraction(0), Fraction(order - 3 * j, j + 1))
                weak = Fraction(repaired) - (
                    f3 * (j + 1) * a * A * (Fraction(U) - b * weak_u)
                )
                coupled = Fraction(repaired) - (
                    f3 * (j + 1) * a * A * (Fraction(U) - b * coupled_u)
                )
                assert Fraction(U) >= b * weak_u
                assert Fraction(U) >= b * coupled_u
                witness = {
                    "order": order,
                    "graph6": graph6(graph),
                    "components": nx.number_connected_components(graph),
                    "edges": edges,
                    "wedges": wedges,
                    "three_edge_subtrees": triples,
                    "j": j,
                    "f_j": b,
                }
                records = {
                    "actual_delta": Fraction(delta),
                    "repaired_q3_clear": Fraction(repaired),
                    "weak_shadow_clear": weak,
                    "coupled_shadow_clear": coupled,
                    "q3_minus_qj": Fraction(qgap_numerator, 3 * j * f3 * b),
                }
                for label, value in records.items():
                    minima[label] = update_minimum(
                        minima[label], (value, witness)
                    )
                if delta < 0:
                    negative_actual.append((delta, witness))
                if repaired < 0:
                    negative_repaired.append((repaired, witness))
                if weak < 0 and len(negative_weak_shadow) < 40:
                    negative_weak_shadow.append((str(weak), witness))
                if coupled < 0 and len(negative_coupled_shadow) < 40:
                    negative_coupled_shadow.append((str(coupled), witness))
                stream.update(
                    (
                        f"{order}|{graph6(graph)}|{j}|{delta}|{repaired}|"
                        f"{weak}|{coupled}|{qgap_numerator}\n"
                    ).encode()
                )
        per_order[str(order)] = {
            "no_isolate_unlabeled_forests": order_forests,
            "supported_target_cells": order_cells,
        }
        print(
            f"order={order} forests={order_forests} cells={order_cells}",
            flush=True,
        )

    payload = {
        "status": "FINITE_ROUTE_PROBE_ONLY",
        "scope": (
            "Every unlabeled no-isolate forest through the requested order, with a "
            "new isolated marked root and every supported j>=3."
        ),
        "maximum_remainder_order": args.maximum_order,
        "unlabeled_no_isolate_forests": forests,
        "supported_target_cells": supported_cells,
        "negative_actual": len(negative_actual),
        "negative_repaired_q3": len(negative_repaired),
        "negative_weak_shadow_witnesses_stored": negative_weak_shadow,
        "negative_coupled_shadow_witnesses_stored": negative_coupled_shadow,
        "minima": {
            label: {"value": str(record[0]), "witness": record[1]}
            for label, record in minima.items()
        },
        "per_order": per_order,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "scope_guard": (
            "This is finite evidence and route diagnosis only. It is not an all-order "
            "certificate, does not prove the marked-isolate lane, terminal Newton m=0, "
            "the terminal payment, or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    OUTPUT.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps({
        "status": payload["status"],
        "forests": forests,
        "cells": supported_cells,
        "negative_actual": len(negative_actual),
        "negative_repaired_q3": len(negative_repaired),
        "negative_weak_shadow_stored": len(negative_weak_shadow),
        "negative_coupled_shadow_stored": len(negative_coupled_shadow),
        "minima": {key: value["value"] for key, value in payload["minima"].items()},
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(OUTPUT.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
