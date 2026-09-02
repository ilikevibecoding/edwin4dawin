#!/usr/bin/env python3
"""Large deterministic random test of g2 box monotonicity under leaf deletion."""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import networkx as nx
import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import (
    partition_substitution,
    structural_substitution,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_box_leaf_monotonicity_random_search_root_20260831.json"
MARKER = "SEARCH_EXACT_ISO_N6_BUNDLE_G2_BOX_LEAF_MONOTONICITY_RANDOM_ROOT"
MAXIMUM = 7


def add(left, right):
    return [
        (left[i] if i < len(left) else 0) + (right[i] if i < len(right) else 0)
        for i in range(min(MAXIMUM + 1, max(len(left), len(right))))
    ]


def mul(left, right):
    result = [0] * min(MAXIMUM + 1, len(left) + len(right) - 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            if i + j > MAXIMUM:
                break
            result[i + j] += x * y
    return result


def row(graph: nx.Graph):
    total = [1]
    seen = set()
    for root in graph:
        if root in seen:
            continue
        parent = {root: None}
        order = [root]
        seen.add(root)
        for vertex in order:
            for child in graph.neighbors(vertex):
                if child == parent[vertex]:
                    continue
                if child in parent:
                    raise ValueError("not a forest")
                parent[child] = vertex
                seen.add(child)
                order.append(child)
        excluded = {}
        included = {}
        for vertex in reversed(order):
            exc = [1]
            inc = [0, 1]
            for child in graph.neighbors(vertex):
                if parent.get(child) != vertex:
                    continue
                exc = mul(exc, add(excluded[child], included[child]))
                inc = mul(inc, excluded[child])
            excluded[vertex] = exc
            included[vertex] = inc
        total = mul(total, add(excluded[root], included[root]))
    return total + [0] * (MAXIMUM + 1 - len(total))


def categories(graph: nx.Graph, u: int, v: int):
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        rows.append(row(reduced))
    ce, cu, cv, cw = rows
    values = {"n": len(graph)}
    for rank in range(2, 8):
        values.update({
            f"CW{rank}": cw[rank],
            f"CA{rank}": cu[rank] - cw[rank],
            f"CB{rank}": cv[rank] - cw[rank],
            f"CZ{rank}": ce[rank] - cu[rank] - cv[rank] + cw[rank],
        })
    return values


def make_evaluator():
    structural, _ = structural_substitution()
    cp, _ = partition_substitution("C", "c", 7)
    dp, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(reconstruct().subs(structural).subs(cp).subs(dp))
    dvars = tuple(sorted((x for x in expression.free_symbols if str(x).startswith("D")), key=str))
    base = expression.subs({x: 0 for x in dvars})
    derivatives = tuple(sp.diff(expression, x) for x in dvars)
    cvars = tuple(sorted(expression.free_symbols - set(dvars), key=str))
    names = tuple(map(str, cvars))
    base_fn = sp.lambdify(cvars, base, "math")
    derivative_fns = tuple(sp.lambdify(cvars, x, "math") for x in derivatives)

    def evaluate(values):
        arguments = tuple(values[name] for name in names)
        result = int(base_fn(*arguments))
        for dvar, fn in zip(dvars, derivative_fns):
            coefficient = int(fn(*arguments))
            if coefficient < 0:
                result += coefficient * values["C" + str(dvar)[1:]]
        return result
    return evaluate


def random_forest(rng, order):
    graph = nx.Graph()
    graph.add_nodes_from(range(order))
    for vertex in range(1, order):
        if rng.random() < 0.9:
            graph.add_edge(vertex, rng.randrange(vertex))
    return graph


def main():
    evaluate = make_evaluator()
    rng = random.Random(993622)
    trials = 100000
    negative = 0
    minimum = None
    witness = None
    stream = hashlib.sha256()
    for trial in range(trials):
        order = rng.randrange(3, 401)
        graph = random_forest(rng, order)
        u, v = rng.sample(list(graph), 2)
        candidates = [x for x in graph if x not in (u, v) and graph.degree(x) <= 1]
        if not candidates:
            continue
        leaf = rng.choice(candidates)
        before = evaluate(categories(graph, u, v))
        reduced = graph.copy()
        reduced.remove_node(leaf)
        after = evaluate(categories(reduced, u, v))
        delta = before - after
        stream.update(f"{trial}|{order}|{u}|{v}|{leaf}|{before}|{after}|{delta};".encode())
        if minimum is None or delta < minimum:
            minimum = delta
            witness = {
                "trial": trial, "order": order, "marks": [u, v], "leaf": leaf,
                "leaf_parent": next(iter(graph.neighbors(leaf)), None),
                "before": before, "after": after, "delta": delta,
                "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
            }
        if delta < 0:
            negative += 1
            break
    report = {
        "marker": MARKER, "seed": 993622, "planned_trials": trials,
        "completed_trials": trial + 1, "orders": [3, 400],
        "negative_delta": negative, "minimum_delta": minimum, "witness": witness,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "status": "diagnostic random exact-arithmetic search; no theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({k: report[k] for k in ("marker", "completed_trials", "negative_delta", "minimum_delta", "witness")}, indent=2))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
