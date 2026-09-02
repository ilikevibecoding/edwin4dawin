#!/usr/bin/env python3
"""Verify the maximum-set/Hall-excess reduction of WR and pointed BP."""

from __future__ import annotations

import itertools
import json
from fractions import Fraction
from math import comb
from pathlib import Path

import networkx as nx


def choose(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def independent(graph: nx.Graph, vertices: frozenset[int]) -> bool:
    return all(not (u in vertices and v in vertices) for u, v in graph.edges())


def independent_sets(graph: nx.Graph, allowed: list[int] | None = None):
    vertices = sorted(graph) if allowed is None else sorted(allowed)
    for size in range(len(vertices) + 1):
        for subset in itertools.combinations(vertices, size):
            frozen = frozenset(subset)
            if independent(graph, frozen):
                yield frozen


def maximum_set(graph: nx.Graph, forbidden: int | None = None) -> frozenset[int]:
    allowed = [v for v in graph if v != forbidden]
    return max(independent_sets(graph, allowed), key=lambda s: (len(s), tuple(-v for v in sorted(s))))


def polynomial(graph: nx.Graph) -> list[int]:
    counts = [0] * (len(graph) + 1)
    for subset in independent_sets(graph):
        counts[len(subset)] += 1
    while len(counts) > 1 and counts[-1] == 0:
        counts.pop()
    return counts


def containing_count(graph: nx.Graph, point: int, rank: int) -> int:
    if rank < 0:
        return 0
    return sum(1 for s in independent_sets(graph) if len(s) == rank and point in s)


def audit_row(
    graph: nx.Graph,
    maximum: frozenset[int],
    rank: int,
    point: int | None,
) -> tuple[int, int, int, int]:
    alpha = len(maximum)
    cover = sorted(set(graph) - set(maximum))
    literal = 0
    slack = 0
    boundary = 0
    rows = 0
    for yset in independent_sets(graph, cover):
        y = len(yset)
        neighbors = {a for v in yset for a in graph.neighbors(v) if a in maximum}
        d = len(neighbors)
        excess = d - y
        if excess < 0:
            raise AssertionError("maximum-set Hall excess became negative")
        free = alpha - d
        top = alpha - excess
        current = choose(free, rank - y)
        previous = choose(free, rank - 1 - y)
        term = rank * current - (previous if point is None or point in yset else 0)
        literal += term
        rows += 1

        if top <= rank - 2:
            if term != 0:
                raise AssertionError("short interval contributed")
            continue
        if top == rank - 1:
            expected_negative = point is None or point in yset
            if expected_negative:
                if term != -1:
                    raise AssertionError("boundary interval was not minus one")
                boundary += 1
            elif term != 0:
                raise AssertionError("unpointed-free boundary interval contributed")
            continue

        if term < 0:
            raise AssertionError("long interval had negative slack")
        if point is None or point in yset:
            if y <= rank:
                closed = Fraction(
                    choose(free, rank - y) * (rank * (top - rank) + y),
                    top - rank + 1,
                )
                if closed.denominator != 1 or closed.numerator != term:
                    raise AssertionError("closed Hall-excess slack formula failed")
            elif term != 0:
                raise AssertionError("rank below fixed cover part contributed")
        elif term != rank * current:
            raise AssertionError("point-free row formula failed")
        slack += term

    if literal != slack - boundary:
        raise AssertionError("slack-minus-boundary decomposition failed")
    return literal, slack, boundary, rows


def main() -> None:
    atlas_forests = 0
    ordinary_rows = 0
    pointed_rows = 0
    interval_rows = 0
    pointed_instances = 0
    for graph0 in nx.graph_atlas_g():
        if len(graph0) == 0 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
        atlas_forests += 1
        poly = polynomial(graph)
        maximum = maximum_set(graph)
        alpha = len(maximum)
        if alpha != len(poly) - 1:
            raise AssertionError("maximum-set size mismatch")

        for rank in range(1, alpha + 1):
            literal, _, _, rows = audit_row(graph, maximum, rank, None)
            actual = rank * poly[rank] - poly[rank - 1]
            if literal != actual:
                raise AssertionError("ordinary coefficient identity failed")
            ordinary_rows += 1
            interval_rows += rows

        for point in graph:
            pointed_maximum = maximum_set(graph, forbidden=point)
            if len(pointed_maximum) != alpha:
                continue
            if point in pointed_maximum:
                raise AssertionError("forbidden point entered maximum set")
            pointed_instances += 1
            for rank in range(1, alpha + 1):
                literal, _, _, rows = audit_row(graph, pointed_maximum, rank, point)
                actual = rank * poly[rank] - containing_count(graph, point, rank - 1)
                if literal != actual:
                    raise AssertionError("pointed coefficient identity failed")
                pointed_rows += 1
                interval_rows += rows

    report = {
        "status": "PASS_EXACT_MAXSET_HALL_EXCESS_WR_POINTED_REDUCTION",
        "atlas_forests": atlas_forests,
        "ordinary_rank_rows": ordinary_rows,
        "pointed_instances": pointed_instances,
        "pointed_rank_rows": pointed_rows,
        "boolean_interval_rows": interval_rows,
        "scope": (
            "exact all-graph reduction; the Hall-excess boundary payment, WR, "
            "ISO, unimodality, and Erdos 993 remain open"
        ),
    }
    Path("maxset_hall_excess_wr_reduction_exact_root_20260829.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
