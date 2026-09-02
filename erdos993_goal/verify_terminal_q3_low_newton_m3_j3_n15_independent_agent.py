#!/usr/bin/env python3
"""Complete exact order-15 audit of the terminal Newton m=3, target j=3.

The verifier independently enumerates every unlabeled tree on 15 vertices,
every marked vertex, and reconstructs the coefficient directly from subset
counts and the Newton product kernel.  It imports no project producer.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m3_j3_n15_independent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def kappa(left: int, right: int, union: int) -> int:
    if not max(left, right) <= union <= left + right:
        return 0
    # Only the tiny degrees 0,...,4 occur, so the literal factorial formula
    # is clearest and exact.
    from math import factorial

    return factorial(union) // (
        factorial(union - left)
        * factorial(union - right)
        * factorial(left + right - union)
    )


def product(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for p, x in enumerate(left):
        for q, y in enumerate(right):
            for degree in range(max(p, q), p + q + 1):
                out[degree] += kappa(p, q, degree) * x * y
    return out


def add(left: list[int], right: list[int], scale: int = 1) -> list[int]:
    out = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        out[index] += value
    for index, value in enumerate(right):
        out[index] += scale * value
    return out


def scale(row: list[int], factor: int) -> list[int]:
    return [factor * value for value in row]


def masks_by_type(tree: nx.Graph) -> tuple[dict[int, list[int]], dict[int, list[int]]]:
    vertices = tuple(range(15))
    edge_masks = tuple((1 << u) | (1 << v) for u, v in tree.edges())
    independent = {rank: [] for rank in range(2, 5)}
    one_edge = {rank: [] for rank in range(2, 5)}
    for rank in range(2, 5):
        for chosen in itertools.combinations(vertices, rank):
            mask = sum(1 << vertex for vertex in chosen)
            induced = sum((mask & edge) == edge for edge in edge_masks)
            if induced == 0:
                independent[rank].append(mask)
            elif induced == 1:
                one_edge[rank].append(mask)
    return independent, one_edge


def incidence_counts(rows: list[int]) -> list[int]:
    return [sum(bool(mask & (1 << vertex)) for mask in rows) for vertex in range(15)]


def main() -> None:
    trees = roots = supported = coefficient_checks = 0
    minimum = None
    minimum_witness = None
    value_stream = hashlib.sha256()

    for tree_index, original in enumerate(nx.nonisomorphic_trees(15)):
        tree = nx.convert_node_labels_to_integers(original, ordering="sorted")
        trees += 1
        independent, one_edge = masks_by_type(tree)
        ind2_inc = incidence_counts(independent[2])
        ind3_inc = incidence_counts(independent[3])
        one3_inc = incidence_counts(one_edge[3])
        one4_inc = incidence_counts(one_edge[4])

        g1 = 15
        g2, g3, g4 = (len(independent[rank]) for rank in (2, 3, 4))
        p = [g3 + g2, g2 + g1, g1 + 1, 1]
        residual3 = len(one_edge[3])
        residual4 = len(one_edge[4])
        R = [residual4 + residual3, residual3 + 14, 14]
        U = [g4 + g3, p[0], p[1], p[2], 1]
        graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()

        closed = []
        for root in range(15):
            mask = 1 << root
            for neighbor in tree.neighbors(root):
                mask |= 1 << neighbor
            closed.append(mask)

        for root in range(15):
            roots += 1
            a = g2 - ind2_inc[root]
            b = g3 - ind3_inc[root]
            if not b:
                continue
            supported += 1
            z2 = len(one_edge[3]) - one3_inc[root]
            z3 = len(one_edge[4]) - one4_inc[root]
            h2 = sum((mask & closed[root]) == 0 for mask in independent[2])
            h3 = sum((mask & closed[root]) == 0 for mask in independent[3])
            c = [z2 + h2 + a, a]
            e = [z3 + h3 + b, b]

            A = add(product(p, c), scale(R, a), scale=-1)
            q = add(scale(add(c, R), 4 * b), scale(product(add(p, [a]), e), 3), scale=-1)
            delta3 = 4 * a * product(A, U)[3] + a * product(p, q)[3]
            coefficient_checks += 1
            assert delta3 > 0, (tree_index, graph6, root, delta3)
            item = (delta3, tree_index, root, graph6)
            if minimum is None or item < minimum:
                minimum = item
                minimum_witness = {
                    "coefficient": delta3,
                    "tree_index": tree_index,
                    "root": root,
                    "graph6": graph6,
                    "a": a,
                    "b": b,
                    "z2": z2,
                    "z3": z3,
                    "h2": h2,
                    "h3": h3,
                }
            value_stream.update(
                f"{tree_index},{graph6},{root},{delta3}\n".encode("ascii")
            )

        if trees % 500 == 0:
            print(f"trees={trees:,} roots={roots:,}", flush=True)

    assert trees == 7_741
    assert roots == 116_115
    assert supported == roots
    report = {
        "schema": "terminal-q3-low-newton-m3-j3-n15-independent-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_COMPLETE_N15_TERMINAL_Q3_LOW_NEWTON_M3_J3",
        "claim": (
            "For every tree base G of order exactly 15, every marked vertex, "
            "and target j=3, the binom(t-1,3) coefficient of the normalized "
            "untruncated terminal included-payment margin is strictly positive."
        ),
        "coverage": {
            "unlabeled_trees": trees,
            "marked_vertices": roots,
            "supported_cells": supported,
            "coefficient_checks": coefficient_checks,
        },
        "minimum_witness": minimum_witness,
        "ordered_value_stream_sha256": value_stream.hexdigest().upper(),
        "method": (
            "Complete nonisomorphic-tree enumeration; literal induced-edge "
            "classification of every subset through size four; independent "
            "Newton-kernel reconstruction of P,R,U,A,Q and delta_3."
        ),
        "scope": (
            "This is only the order-15, target-j=3, Newton-m=3 cell. It is "
            "a complete exact finite certificate, not an all-order proof and "
            "not a proof of Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["coverage"], indent=2))
    print(json.dumps(report["minimum_witness"], indent=2))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
