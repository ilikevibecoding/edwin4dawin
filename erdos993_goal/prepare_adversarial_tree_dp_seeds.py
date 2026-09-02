#!/usr/bin/env python3
"""Build a deterministic edge-list seed bank for the exact tree-DP search.

The source corpus contains certified 60-vertex trees as one-based Pruefer
codes.  Seeds are ranked by the same finite, direct target used by the
search: a descent followed by the strongest possible ratio recovery before
the known decreasing-tail boundary.  This script only prepares seeds; it
does not make a counterexample claim.
"""

from __future__ import annotations

import argparse
import heapq
import json
from pathlib import Path


def adjacency_from_prufer(code_one_based: list[int]) -> list[list[int]]:
    code = [value - 1 for value in code_one_based]
    n = len(code) + 2
    degree = [1] * n
    for value in code:
        degree[value] += 1
    leaves = [vertex for vertex, value in enumerate(degree) if value == 1]
    heapq.heapify(leaves)
    adjacency = [[] for _ in range(n)]
    for value in code:
        leaf = heapq.heappop(leaves)
        adjacency[leaf].append(value)
        adjacency[value].append(leaf)
        degree[leaf] -= 1
        degree[value] -= 1
        if degree[value] == 1:
            heapq.heappush(leaves, value)
    left = heapq.heappop(leaves)
    right = heapq.heappop(leaves)
    adjacency[left].append(right)
    adjacency[right].append(left)
    return adjacency


def edge_list(adjacency: list[list[int]]) -> list[tuple[int, int]]:
    return [
        (left, right)
        for left, neighbors in enumerate(adjacency)
        for right in neighbors
        if left < right
    ]


def ratio_score(coefficients: list[int]) -> tuple:
    alpha = len(coefficients) - 1
    tail_start = (2 * alpha + 1) // 3
    first_descent = next(
        (
            index
            for index in range(alpha)
            if coefficients[index + 1] < coefficients[index]
        ),
        alpha,
    )
    trough = None
    legal = None
    any_rebound = None
    for index in range(first_descent, alpha):
        current = (coefficients[index + 1], coefficients[index], index)
        if trough is None:
            trough = current
            continue
        if current[0] * trough[1] > trough[0] * current[1]:
            item = (*current, trough[2])
            if any_rebound is None or (
                item[0] * any_rebound[1]
                > any_rebound[0] * item[1]
            ):
                any_rebound = item
            if index < tail_start and (
                legal is None
                or item[0] * legal[1] > legal[0] * item[1]
            ):
                legal = item
        if current[0] * trough[1] < trough[0] * current[1]:
            trough = current
    best_post = (0, 1, -1)
    for index in range(first_descent + 1, min(tail_start, alpha)):
        item = (coefficients[index + 1], coefficients[index], index)
        if item[0] * best_post[1] > best_post[0] * item[1]:
            best_post = item
    gap = (
        alpha + 1
        if any_rebound is None
        else max(0, any_rebound[2] - (tail_start - 1))
    )
    any_factor = 0.0
    any_ratio = 0.0
    if any_rebound is not None:
        any_ratio = any_rebound[0] / any_rebound[1]
        trough_index = any_rebound[3]
        any_factor = (
            any_rebound[0] * coefficients[trough_index]
            / (any_rebound[1] * coefficients[trough_index + 1])
        )
    return (
        int(legal is not None),
        0.0 if legal is None else legal[0] / legal[1],
        -gap,
        any_ratio,
        any_factor,
        best_post[0] / best_post[1],
    )


def encode(label: str, adjacency: list[list[int]]) -> str:
    edges = edge_list(adjacency)
    encoded = ",".join(f"{left}-{right}" for left, right in edges)
    return f"{label}\t{len(adjacency)}\t{encoded}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--corpus",
        type=Path,
        default=Path("patternboost60_polynomial_corpus_20260726.json"),
    )
    parser.add_argument(
        "--evolved",
        type=Path,
        default=Path(
            "patternboost_rebound_evolution_g500_seed993260726_20260726.json"
        ),
    )
    parser.add_argument("--limit", type=int, default=96)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    source = json.loads(args.corpus.read_text(encoding="utf-8"))
    ranked = sorted(
        (
            (ratio_score(record["polynomial"]), index, record)
            for index, record in enumerate(source["records"])
        ),
        reverse=True,
    )[: args.limit]

    lines = [
        "# label<TAB>order<TAB>comma-separated zero-based edges",
        f"# corpus={args.corpus} records={len(source['records'])} limit={args.limit}",
    ]
    for rank, (_score, index, record) in enumerate(ranked):
        adjacency = adjacency_from_prufer(record["prufer_code_one_based"])
        lines.append(encode(f"corpus_rank_{rank}_index_{index}", adjacency))

    if args.evolved.exists():
        evolved = json.loads(args.evolved.read_text(encoding="utf-8"))
        champion = evolved["champion"]
        n = champion["order"]
        adjacency = [[] for _ in range(n)]
        for left, right in champion["edges"]:
            adjacency[left].append(right)
            adjacency[right].append(left)
        lines.append(encode("prior_evolved_champion", adjacency))

    args.output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "source_records_ranked": len(source["records"]),
                "retained_corpus_seeds": len(ranked),
                "included_evolved_champion": args.evolved.exists(),
                "output": str(args.output),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
