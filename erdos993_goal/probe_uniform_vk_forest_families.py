#!/usr/bin/env python3
"""Low-memory exact probes for the proposed uniform forest V_k inequality.

This is exploratory evidence only.  It scans deterministic structured forests
and reproducible random trees using exact integer independence polynomials.
"""

from __future__ import annotations

from math import comb
from random import Random
import json
from pathlib import Path
import networkx as nx


def add(a: list[int], b: list[int]) -> list[int]:
    n = max(len(a), len(b))
    return [(a[i] if i < len(a) else 0) + (b[i] if i < len(b) else 0)
            for i in range(n)]


def mul(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return out


def tree_poly(adj: list[list[int]]) -> list[int]:
    """Exact independence polynomial of one tree."""
    n = len(adj)
    parent = [-2] * n
    parent[0] = -1
    order = [0]
    for v in order:
        for w in adj[v]:
            if parent[w] == -2:
                parent[w] = v
                order.append(w)
    exc: list[list[int] | None] = [None] * n
    inc: list[list[int] | None] = [None] * n
    for v in reversed(order):
        ev = [1]
        iv = [0, 1]
        for w in adj[v]:
            if parent[w] == v:
                assert exc[w] is not None and inc[w] is not None
                ev = mul(ev, add(exc[w], inc[w]))
                iv = mul(iv, exc[w])
        exc[v], inc[v] = ev, iv
    assert exc[0] is not None and inc[0] is not None
    return add(exc[0], inc[0])


def tree_poly_and_selected_degree_sum(
        adj: list[list[int]]) -> tuple[list[int], list[int]]:
    """Return I(T) and total selected-degree sum in every size layer."""
    n = len(adj)
    parent = [-2] * n
    parent[0] = -1
    order = [0]
    for v in order:
        for w in adj[v]:
            if parent[w] == -2:
                parent[w] = v
                order.append(w)

    def pair_mul(left: tuple[list[int], list[int]],
                 right: tuple[list[int], list[int]]) -> tuple[list[int], list[int]]:
        a, aw = left
        b, bw = right
        return mul(a, b), add(mul(aw, b), mul(a, bw))

    exc: list[tuple[list[int], list[int]] | None] = [None] * n
    inc: list[tuple[list[int], list[int]] | None] = [None] * n
    for v in reversed(order):
        ev = ([1], [0])
        iv = ([0, 1], [0, len(adj[v])])
        for w in adj[v]:
            if parent[w] == v:
                assert exc[w] is not None and inc[w] is not None
                child_any = (add(exc[w][0], inc[w][0]),
                             add(exc[w][1], inc[w][1]))
                ev = pair_mul(ev, child_any)
                iv = pair_mul(iv, exc[w])
        exc[v], inc[v] = ev, iv
    assert exc[0] is not None and inc[0] is not None
    return add(exc[0][0], inc[0][0]), add(exc[0][1], inc[0][1])


def prufer_tree(code: list[int]) -> list[list[int]]:
    n = len(code) + 2
    degree = [1] * n
    for v in code:
        degree[v] += 1
    adj = [[] for _ in range(n)]
    for v in code:
        leaf = next(i for i, d in enumerate(degree) if d == 1)
        adj[leaf].append(v)
        adj[v].append(leaf)
        degree[leaf] -= 1
        degree[v] -= 1
    u, v = [i for i, d in enumerate(degree) if d == 1]
    adj[u].append(v)
    adj[v].append(u)
    return adj


def path_poly(n: int) -> list[int]:
    if n == 0:
        return [1]
    if n == 1:
        return [1, 1]
    a, b = [1], [1, 1]
    for _ in range(2, n + 1):
        a, b = b, add(b, [0] + a)
    return b


def star_poly(leaves: int) -> list[int]:
    out = [comb(leaves, j) for j in range(leaves + 1)]
    if len(out) < 2:
        out.append(0)
    out[1] += 1
    return out


def double_star_poly(a: int, b: int) -> list[int]:
    # Central edge; a and b pendant leaves at its two endpoints.
    base = [comb(a + b, j) for j in range(a + b + 1)]
    return add(base, add([0] + [comb(a, j) for j in range(a + 1)],
                         [0] + [comb(b, j) for j in range(b + 1)]))


def spider_poly(arms: tuple[int, ...], paths: list[list[int]] | None = None) -> list[int]:
    """Independence polynomial of a one-center spider with positive arms."""
    if paths is None:
        paths = [path_poly(n) for n in range(max(arms) + 1)]
    center_out = [1]
    center_in_tail = [1]
    for length in arms:
        center_out = mul(center_out, paths[length])
        center_in_tail = mul(center_in_tail, paths[length - 1])
    return add(center_out, [0] + center_in_tail)


def vk(poly: list[int], k: int) -> int:
    bm2, bm1, b0 = poly[k - 2:k + 1]
    return ((k + 2) * bm2 * bm1 + k * (2 * k + 1) * bm2 * b0
            - 2 * (k - 1) ** 2 * bm1 * bm1)


def check(poly: list[int], label: str, record: dict) -> None:
    alpha = len(poly) - 1
    while alpha and poly[alpha] == 0:
        alpha -= 1
    for k in range(2, (alpha + 2) // 2 + 1):
        if alpha < 2 * k - 2:
            continue
        value = vk(poly, k)
        record["tests"] += 1
        key = (value, label, k, alpha, poly[k - 2:k + 1])
        if record["minimum"] is None or value < record["minimum"][0]:
            record["minimum"] = key
        if value < 0:
            print("COUNTEREXAMPLE", key)
            raise SystemExit(1)


def main() -> int:
    record = {"tests": 0, "minimum": None}

    # Exhaustive small-tree check of the auxiliary selected-degree inequality
    # E[sum_{v in S} d(v)] <= 2|S|, which would yield mu_s >= n-3s.
    auxiliary_trees = 0
    auxiliary_layers = 0
    for n in range(2, 17):
        for tree in nx.nonisomorphic_trees(n):
            adj = [list(tree.neighbors(v)) for v in range(n)]
            poly, degree_sums = tree_poly_and_selected_degree_sum(adj)
            auxiliary_trees += 1
            for s in range(len(poly)):
                auxiliary_layers += 1
                assert degree_sums[s] <= 2 * s * poly[s]

    # Single paths, stars, and double stars.
    for n in range(2, 121):
        check(path_poly(n), f"P{n}", record)
        check(star_poly(n - 1), f"K1,{n-1}", record)
    for a in range(0, 41):
        for b in range(a, 41):
            check(double_star_poly(a, b), f"DS({a},{b})", record)

    # Exhaustive three-arm spiders through order 140.  The known alpha=11
    # rank-seven obstructions are close to this low-branching regime.
    spider_order = 140
    path_cache = [path_poly(n) for n in range(spider_order)]
    for a in range(1, spider_order):
        for b in range(a, spider_order):
            for c in range(b, spider_order):
                if 1 + a + b + c > spider_order:
                    break
                check(spider_poly((a, b, c), path_cache),
                      f"spider({a},{b},{c})", record)

    # Deterministic four-arm slice (all short-arm triples, arbitrary tail).
    for a in range(1, 8):
        for b in range(a, 10):
            for c in range(b, 13):
                for d in range(c, spider_order - a - b - c):
                    if 1 + a + b + c + d > spider_order:
                        break
                    check(spider_poly((a, b, c, d), path_cache),
                          f"spider4({a},{b},{c},{d})", record)

    # Unions of up to four structured components.
    atoms: list[tuple[str, list[int]]] = []
    for m in range(1, 21):
        atoms.append((f"S{m}", star_poly(m)))
    for n in range(2, 31):
        atoms.append((f"P{n}", path_poly(n)))
    for i, (li, pi) in enumerate(atoms):
        for j in range(i, len(atoms)):
            lj, pj = atoms[j]
            pair = mul(pi, pj)
            check(pair, f"{li}+{lj}", record)
            # A sparse deterministic sample of triples/four-tuples.
            if (17 * i + 31 * j) % 19 == 0:
                for q in (0, 7, 19, 31, 43):
                    if q < len(atoms):
                        lq, pq = atoms[q]
                        triple = mul(pair, pq)
                        check(triple, f"{li}+{lj}+{lq}", record)
                        if (i + j + q) % 5 == 0:
                            lr, pr = atoms[(i + 2 * j + q) % len(atoms)]
                            check(mul(triple, pr),
                                  f"{li}+{lj}+{lq}+{lr}", record)

    # Products and low-order extensions of the 15 exact rank-seven alpha=11
    # negative rows.  These are natural near-boundary seeds for a failure at
    # a higher rank, even though they are ineligible at rank seven itself.
    boundary_report = Path(__file__).with_name(
        "rank7_alpha11_boundary_theorem_exact_20260813.json")
    if boundary_report.exists():
        payload = json.loads(boundary_report.read_text(encoding="utf-8"))
        seeds = payload["classification"]["negative_V7_polynomials"]
        multipliers = [("K1", [1, 1]), ("K2", [1, 2])]
        multipliers += [(f"P{n}", path_poly(n)) for n in range(2, 21)]
        multipliers += [(f"S{m}", star_poly(m)) for m in range(1, 16)]
        for index, seed in enumerate(seeds):
            power = [1]
            for exponent in range(1, 9):
                power = mul(power, seed)
                check(power, f"exceptional[{index}]^{exponent}", record)
                for label, factor in multipliers:
                    check(mul(power, factor),
                          f"exceptional[{index}]^{exponent}+{label}", record)

    # Reproducible random labelled trees, kept intentionally modest in RAM.
    rng = Random(993_2026_08_16)
    for n in range(8, 81):
        for sample in range(250):
            code = [rng.randrange(n) for _ in range(n - 2)]
            adj = prufer_tree(code)
            poly, degree_sums = tree_poly_and_selected_degree_sum(adj)
            assert all(degree_sums[s] <= 2 * s * poly[s]
                       for s in range(len(poly)))
            check(poly, f"random_tree(n={n},sample={sample})", record)

    result = {
        "status": "PASS_NO_NEGATIVE_VK_STRUCTURED_PROBE",
        "eligible_rank_checks": record["tests"],
        "minimum": record["minimum"],
        "auxiliary_selected_degree_trees": auxiliary_trees,
        "auxiliary_selected_degree_layers": auxiliary_layers,
        "scope": (
            "structured families including all three-arm spiders through "
            "order 140, a four-arm slice, exact rank-seven obstruction "
            "products/extensions, and reproducible random trees; evidence only"),
    }
    output = Path(__file__).with_name(
        "uniform_vk_forest_family_probe_exact_20260816.json")
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print("PASS_NO_NEGATIVE_VK", result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
