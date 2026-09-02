#!/usr/bin/env python3
"""Fresh canonical-import audit of the corrected all-forest m=2 census.

This file deliberately does not import the forest producer.  It rebuilds the
zero-edge/one-edge rows, calls the pinned canonical ``terminal_rows`` routine
on every finite cell, and independently reconstructs the same terminal-q3
payment from explicitly fixed low and target-dependent high fields.
"""

from __future__ import annotations

from functools import lru_cache
import hashlib
import json
from math import comb
from pathlib import Path

import networkx as nx
import audit_terminal_q3_low_newton_adversarial_agent as canonical


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m2_forest_canonical_import_audit_20260829.json"
PRODUCER = HERE / "audit_terminal_q3_low_newton_m2_forest_base_agent.py"
PRODUCER_REPORT = HERE / "terminal_q3_low_newton_m2_forest_base_audit_20260829.json"
CANONICAL = HERE / "audit_terminal_q3_low_newton_adversarial_agent.py"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    return tuple(
        (left[k] if k < len(left) else 0)
        + (right[k] if k < len(right) else 0)
        for k in range(max(len(left), len(right)))
    )


def multiply(left: tuple[int, ...], right: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * (len(left) + len(right) - 1)
    for p, x in enumerate(left):
        for q, y in enumerate(right):
            out[p + q] += x * y
    return tuple(out)


def union_pair(left, right):
    li, lo = left
    ri, ro = right
    return multiply(li, ri), add(multiply(lo, ri), multiply(li, ro))


def coeff(row, rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def one_edge_actual(residual: tuple[int, ...]) -> list[int]:
    return [0, 0, *residual]


def type_data(graph: nx.Graph) -> dict[str, object]:
    graph = nx.convert_node_labels_to_integers(graph, ordering="sorted")
    n = len(graph)
    adjacency = [0] * n
    for u, v in graph.edges():
        adjacency[u] |= 1 << v
        adjacency[v] |= 1 << u
    full = (1 << n) - 1

    @lru_cache(maxsize=None)
    def independent(mask: int) -> tuple[int, ...]:
        if not mask:
            return (1,)
        bit = mask & -mask
        v = bit.bit_length() - 1
        return add(
            independent(mask ^ bit),
            (0,) + independent(mask & ~bit & ~adjacency[v]),
        )

    @lru_cache(maxsize=None)
    def residual(mask: int) -> tuple[int, ...]:
        out = (0,)
        for u, v in graph.edges():
            if not ((mask >> u) & 1 and (mask >> v) & 1):
                continue
            forbidden = (1 << u) | (1 << v) | adjacency[u] | adjacency[v]
            out = add(out, independent(mask & ~forbidden))
        return out

    roots = []
    for w in range(n):
        fmask = full & ~(1 << w)
        hmask = full & ~((1 << w) | adjacency[w])
        roots.append({
            "marked": w,
            "F": (independent(fmask), residual(fmask)),
            "H": (independent(hmask), residual(hmask)),
        })
    return {
        "order": n,
        "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
        "pair": (independent(full), residual(full)),
        "roots": roots,
    }


def component_multisets(types, total: int):
    chosen = []

    def recurse(remaining: int, lower: int):
        if remaining == 0:
            yield tuple(chosen)
            return
        for index in range(lower, len(types)):
            size = int(types[index]["order"])
            if size > remaining:
                break
            chosen.append(index)
            yield from recurse(remaining - size, index)
            chosen.pop()

    yield from recurse(total, 0)


class Adapter:
    def __init__(self, f_pair, h_pair):
        self.f_pair = f_pair
        self.h_pair = h_pair

    def forest_after_deleting_root(self, _root):
        zero, residual = self.f_pair
        return list(zero), one_edge_actual(residual)

    def forest_after_closed_neighborhood(self, _root):
        zero, residual = self.h_pair
        return list(zero), one_edge_actual(residual)


def local_m2(g_pair, f_pair, h_pair, target: int) -> tuple[int, int]:
    gi, gc = g_pair
    fi, fc = f_pair
    hi, _hc = h_pair
    g0, g1 = list(gi), one_edge_actual(gc)
    f0, f1, h0 = list(fi), one_edge_actual(fc), list(hi)

    # Fixed terminal-q3 fields.
    a2 = coeff(fi, 2)
    z2 = coeff(fc, 1)
    h2 = coeff(hi, 2)
    assert a2 == canonical.coeff(f0, 2)
    assert z2 == canonical.coeff(f1, 3)
    assert h2 == canonical.coeff(h0, 2)

    # Target-j fields.
    b = coeff(fi, target)
    zj = coeff(fc, target - 1)
    hj = coeff(hi, target)
    assert b == canonical.coeff(f0, target)
    assert zj == canonical.coeff(f1, target + 1)
    assert hj == canonical.coeff(h0, target)

    values = []
    for s in range(3):
        t = s + 1
        P = canonical.with_isolates(g0, 3, t)
        R = canonical.with_isolates(g1, 4, t)
        U = canonical.with_isolates(g0, target + 1, t)
        c = z2 + h2 + t * a2
        e = zj + hj + t * b
        M = (target + 1) * b * c - 3 * a2 * e
        A = P * c - a2 * R
        W = P * b - a2 * U
        original = P * (P + a2) * M - (target + 1) * A * W
        Q = (target + 1) * b * (c + R) - 3 * (P + a2) * e
        split = (target + 1) * a2 * A * U + a2 * P * Q
        assert original == split
        values.append(original)
    return values[2] - 2 * values[1] + values[0], b


def census(max_order: int = 13) -> dict[str, object]:
    types = []
    for order in range(1, max_order + 1):
        graphs = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        types.extend(type_data(graph) for graph in graphs)

    @lru_cache(maxsize=None)
    def forest_pair(components):
        pair = ((1,), (0,))
        for index in components:
            pair = union_pair(pair, types[index]["pair"])
        return pair

    forests = roots = supported = identities = positive = zero = 0
    minimum = None
    minimum_cell = ""
    by_target = {}
    stream = hashlib.sha256()
    for order in range(4, max_order + 1):
        for components in component_multisets(types, order):
            if len(components) < 2:
                continue
            forests += 1
            g_pair = forest_pair(components)
            seen = set()
            for position, type_index in enumerate(components):
                if type_index in seen:
                    continue
                seen.add(type_index)
                rest = components[:position] + components[position + 1:]
                rest_pair = forest_pair(rest)
                root_type = types[type_index]
                for root in root_type["roots"]:
                    roots += 1
                    f_pair = union_pair(root["F"], rest_pair)
                    h_pair = union_pair(root["H"], rest_pair)
                    adapter = Adapter(f_pair, h_pair)
                    canonical_rows = {
                        row[0]: row
                        for row in canonical.terminal_rows(
                            nx.Graph(), 0, list(g_pair[0]),
                            one_edge_actual(g_pair[1]), adapter,
                        )
                    }
                    for target in range(3, len(f_pair[0])):
                        m2, b = local_m2(g_pair, f_pair, h_pair, target)
                        if not b:
                            continue
                        supported += 1
                        by_target[str(target)] = by_target.get(str(target), 0) + 1
                        assert target in canonical_rows
                        assert m2 == canonical_rows[target][1][2]
                        assert m2 >= 0
                        identities += 1
                        positive += m2 > 0
                        zero += m2 == 0
                        cell = (
                            f"order={order},components={components},"
                            f"type={root_type['graph6']},w={root['marked']},j={target}"
                        )
                        stream.update(f"{cell}|{m2}\n".encode())
                        if minimum is None or m2 < minimum:
                            minimum, minimum_cell = m2, cell
    return {
        "maximum_G_order": max_order,
        "disconnected_forest_multisets": forests,
        "rooted_component_cells": roots,
        "supported_cells_all_j": supported,
        "supported_cells_by_target": by_target,
        "canonical_terminal_rows_equalities": identities,
        "positive_m2_cells": positive,
        "zero_m2_cells": zero,
        "minimum_m2": minimum,
        "minimum_cell": minimum_cell,
        "ordered_cell_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    producer_report = json.loads(PRODUCER_REPORT.read_text())
    assert producer_report["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_FOREST_BASE_TERMINAL_Q3_LOW_NEWTON_M2"
    )
    assert sha256(CANONICAL) == (
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D"
    )
    result = census(13)
    expected = producer_report["finite_disconnected_census"]
    for key in (
        "maximum_G_order", "disconnected_forest_multisets",
        "rooted_component_cells", "supported_cells_all_j",
        "supported_cells_by_target", "positive_m2_cells",
        "zero_m2_cells", "minimum_m2", "minimum_cell",
    ):
        assert result[key] == expected[key]
    assert result["zero_m2_cells"] == 0
    report = {
        "schema": "terminal-q3-low-newton-m2-forest-canonical-import-audit-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_CANONICAL_IMPORT_ALL_FOREST_M2_FINITE",
        "claim": (
            "Every disconnected finite census cell through order 13 agrees "
            "with the pinned canonical terminal_rows implementation after "
            "explicit fixed-low/target-high field assertions."
        ),
        "canonical_source": CANONICAL.name,
        "canonical_sha256": sha256(CANONICAL),
        "producer_source": PRODUCER.name,
        "producer_sha256": sha256(PRODUCER),
        "producer_report": PRODUCER_REPORT.name,
        "producer_report_sha256": sha256(PRODUCER_REPORT),
        "finite_census": result,
        "scope": (
            "This independently audits the finite disconnected partition. "
            "The all-order symbolic branch remains in the separately pinned "
            "producer; no claim is made about m=0 or m=1."
        ),
        "source": Path(__file__).name,
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"supported={result['supported_cells_all_j']} minimum={result['minimum_m2']}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
