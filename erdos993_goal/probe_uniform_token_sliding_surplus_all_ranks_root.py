#!/usr/bin/env python3
"""Exact diagnostic for the rank-uniform token-sliding surplus candidate.

For a tree T of order n, W=binom(n-2,2), e=sum_v binom(d(v)-1,2),
m2=W-e, and TS_r(T) the token-sliding graph on independent r-sets, test

    r*m2*i_r(T) >= W*|E(TS_r(T))|.

The identity |E(TS_r)|=sum_{uv in E(T)} i_{r-1}(T-(N[u] union N[v]))
lets the probe use exact tree dynamic programming rather than enumerate sets.
This file is evidence only; a PASS result is not an all-order theorem.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import random

import networkx as nx


ROOT = Path(__file__).resolve().parent


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[int], right: list[int], cap: int) -> list[int]:
    out = [0] * min(cap + 1, max(len(left), len(right)))
    for index in range(len(out)):
        out[index] = (left[index] if index < len(left) else 0) + (
            right[index] if index < len(right) else 0
        )
    return out


def multiply(left: list[int], right: list[int], cap: int) -> list[int]:
    out = [0] * min(cap + 1, len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right[: cap + 1 - i]):
            if i + j < len(out):
                out[i + j] += a * b
    return out


def forest_polynomial(adjacency: list[list[int]], active: list[bool], cap: int) -> list[int]:
    n = len(adjacency)
    seen = [False] * n

    def visit(vertex: int, parent: int) -> tuple[list[int], list[int]]:
        seen[vertex] = True
        excluded = [1]
        included = [0, 1]
        for child in adjacency[vertex]:
            if child == parent or not active[child] or seen[child]:
                continue
            child_excluded, child_included = visit(child, vertex)
            excluded = multiply(
                excluded, add(child_excluded, child_included, cap), cap
            )
            included = multiply(included, child_excluded, cap)
        return excluded, included

    total = [1]
    for vertex in range(n):
        if active[vertex] and not seen[vertex]:
            excluded, included = visit(vertex, -1)
            total = multiply(total, add(excluded, included, cap), cap)
    return total


def adjacency_from_edges(n: int, edges: list[tuple[int, int]]) -> list[list[int]]:
    adjacency = [[] for _ in range(n)]
    for left, right in edges:
        adjacency[left].append(right)
        adjacency[right].append(left)
    return adjacency


def evaluate_tree(n: int, edges: list[tuple[int, int]], rank_cap: int) -> dict:
    adjacency = adjacency_from_edges(n, edges)
    full = forest_polynomial(adjacency, [True] * n, rank_cap)
    slide_counts = [0] * (rank_cap + 1)
    edge_local_minimum = None
    edge_local_witness = None
    residual_binomial_sums = [0] * (rank_cap + 1)
    w = math.comb(n - 2, 2) if n >= 4 else 0

    for left, right in edges:
        deleted = {left, right, *adjacency[left], *adjacency[right]}
        active = [vertex not in deleted for vertex in range(n)]
        residual = forest_polynomial(adjacency, active, rank_cap - 1)
        h_edge = n - len(adjacency[left]) - len(adjacency[right])
        for rank in range(1, min(rank_cap, len(full) - 1) + 1):
            coefficient = residual[rank - 1] if rank - 1 < len(residual) else 0
            slide_counts[rank] += coefficient
            residual_binomial_sums[rank] += (
                math.comb(h_edge, rank - 1) if h_edge >= rank - 1 else 0
            )
            local = rank * h_edge * full[rank] - 2 * w * coefficient
            if edge_local_minimum is None or local < edge_local_minimum:
                edge_local_minimum = local
                edge_local_witness = (rank, left, right, h_edge, coefficient)

    surplus = sum(math.comb(len(neighbors) - 1, 2) for neighbors in adjacency)
    m2 = w - surplus
    margins = {}
    wingard_envelope_margins = {}
    for rank in range(1, min(rank_cap, len(full) - 1) + 1):
        if full[rank] == 0:
            continue
        margins[rank] = rank * m2 * full[rank] - w * slide_counts[rank]
        path_floor = (
            math.comb(n + 1 - rank, rank)
            if n + 1 - rank >= rank else 0
        )
        wingard_envelope_margins[rank] = (
            rank * m2 * path_floor - w * residual_binomial_sums[rank]
        )
    return {
        "polynomial": full,
        "slide_counts": slide_counts,
        "margins": margins,
        "wingard_envelope_margins": wingard_envelope_margins,
        "edge_local_minimum": edge_local_minimum,
        "edge_local_witness": edge_local_witness,
    }


def graph_edges(graph: nx.Graph) -> tuple[int, list[tuple[int, int]]]:
    mapping = {vertex: index for index, vertex in enumerate(graph.nodes())}
    return len(mapping), [(mapping[u], mapping[v]) for u, v in graph.edges()]


def structured_trees(maximum_order: int):
    for n in range(4, maximum_order + 1):
        yield f"path-{n}", nx.path_graph(n)
        yield f"star-{n}", nx.star_graph(n - 1)
        for left in range(1, n - 2):
            right = n - 2 - left
            graph = nx.Graph()
            graph.add_edge(0, 1)
            graph.add_edges_from((0, 2 + i) for i in range(left))
            graph.add_edges_from((1, 2 + left + i) for i in range(right))
            yield f"double-star-{n}-{left}-{right}", graph


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--random-cases", type=int, default=3000)
    parser.add_argument("--maximum-order", type=int, default=120)
    parser.add_argument("--rank-cap", type=int, default=32)
    parser.add_argument("--rank-floor", type=int, default=2)
    parser.add_argument("--seed", type=int, default=993_20260828)
    args = parser.parse_args()
    rng = random.Random(args.seed)

    minimum = None
    minimum_row = None
    local_minimum = None
    local_minimum_row = None
    failures = []
    cases = 0
    rank_checks = 0
    local_negative_cases = 0
    envelope_minimum = None
    envelope_minimum_row = None
    envelope_failures = []

    def consume(name: str, graph: nx.Graph) -> None:
        nonlocal minimum, minimum_row, local_minimum, local_minimum_row
        nonlocal cases, rank_checks, local_negative_cases
        nonlocal envelope_minimum, envelope_minimum_row
        n, edges = graph_edges(graph)
        result = evaluate_tree(n, edges, min(args.rank_cap, n))
        cases += 1
        if result["edge_local_minimum"] is not None:
            if local_minimum is None or result["edge_local_minimum"] < local_minimum:
                local_minimum = result["edge_local_minimum"]
                local_minimum_row = {
                    "name": name,
                    "order": n,
                    "witness": result["edge_local_witness"],
                    "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                }
            if result["edge_local_minimum"] < 0:
                local_negative_cases += 1
        for rank, margin in result["margins"].items():
            if rank < args.rank_floor:
                continue
            rank_checks += 1
            row = {
                "name": name,
                "order": n,
                "rank": rank,
                "margin": margin,
                "i_rank": result["polynomial"][rank],
                "slides": result["slide_counts"][rank],
                "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
            }
            if minimum is None or margin < minimum:
                minimum = margin
                minimum_row = row
            if margin < 0 and len(failures) < 25:
                failures.append(row)
            envelope_margin = result["wingard_envelope_margins"][rank]
            envelope_row = {
                "name": name,
                "order": n,
                "rank": rank,
                "margin": envelope_margin,
                "graph6": row["graph6"],
            }
            if envelope_minimum is None or envelope_margin < envelope_minimum:
                envelope_minimum = envelope_margin
                envelope_minimum_row = envelope_row
            if envelope_margin < 0 and len(envelope_failures) < 25:
                envelope_failures.append(envelope_row)

    for name, graph in structured_trees(min(args.maximum_order, 80)):
        consume(name, graph)
        if failures:
            break

    if not failures:
        for case in range(args.random_cases):
            n = rng.randint(4, args.maximum_order)
            # networkx uses the supplied deterministic seed for the Prufer code.
            graph = nx.random_labeled_tree(n, seed=rng.randrange(2**63))
            consume(f"random-{case}", graph)
            if failures:
                break

    output = ROOT / "uniform_token_sliding_surplus_all_ranks_probe_root_20260828.json"
    report = {
        "schema": "uniform-token-sliding-surplus-all-ranks-probe-root-v1",
        "status": (
            "COUNTEREXAMPLE_EXACT_UNIFORM_TOKEN_SLIDING_SURPLUS_CANDIDATE"
            if failures else
            "PASS_EXACT_DIAGNOSTIC_UNIFORM_TOKEN_SLIDING_SURPLUS_NO_COUNTEREXAMPLE"
        ),
        "candidate": "r*m2(T)*i_r(T) >= binom(n-2,2)*|E(TS_r(T))|",
        "cases": cases,
        "rank_checks": rank_checks,
        "random_seed": args.seed,
        "maximum_order": args.maximum_order,
        "rank_cap": args.rank_cap,
        "rank_floor": args.rank_floor,
        "minimum": minimum_row,
        "failures": failures,
        "pointwise_edge_local_candidate_negative_cases": local_negative_cases,
        "pointwise_edge_local_minimum": local_minimum,
        "pointwise_edge_local_minimum_row": local_minimum_row,
        "wingard_degree_envelope_candidate": (
            "r*m2*binom(n+1-r,r) >= binom(n-2,2)*sum_edges binom(n-d(u)-d(v),r-1)"
        ),
        "wingard_degree_envelope_minimum": envelope_minimum_row,
        "wingard_degree_envelope_failures": envelope_failures,
        "interpretation": (
            "The averaged token-sliding inequality is the live candidate. The stronger "
            "edge-local inequality may fail and is recorded separately. This probe is "
            "finite evidence only even when no averaged failure is found."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("cases", cases, "rank_checks", rank_checks)
    print("minimum", minimum_row)
    print("pointwise_edge_local_minimum", local_minimum_row)
    print("wingard_degree_envelope_minimum", envelope_minimum_row)
    print("wingard_degree_envelope_failures", len(envelope_failures))
    print("source_sha256", report["source_sha256"])
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
