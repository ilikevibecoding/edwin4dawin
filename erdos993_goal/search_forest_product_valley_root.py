#!/usr/bin/env python3
"""Search products of exact n=28 tree independence polynomials for a valley.

The public exhaustive census saved the graph6 strings of every n=28
log-concavity failure but omitted their coefficient rows.  This script
reconstructs those rows exactly and performs deterministic pair, power, and
beam searches for a non-unimodal product.  A hit would be an explicit forest
counterexample; a clean run is search evidence only.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import networkx as nx


HERE = Path(__file__).resolve().parent
PUBLIC = HERE / "external_brettrey_erdos993"
sys.path.insert(0, str(PUBLIC))

from indpoly import independence_poly  # noqa: E402


SOURCE = PUBLIC / "results" / "analysis_n28_modal_lc_nm.json"
OUTPUT = HERE / "forest_product_valley_search_root_20260829.json"


def multiply(a: tuple[int, ...], b: tuple[int, ...]) -> tuple[int, ...]:
    out = [0] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return tuple(out)


def valleys(p: tuple[int, ...]) -> list[dict[str, int]]:
    return [
        {
            "rank": i,
            "left": p[i - 1],
            "middle": p[i],
            "right": p[i + 1],
        }
        for i in range(1, len(p) - 1)
        if p[i - 1] > p[i] < p[i + 1]
    ]


def rebound_score(p: tuple[int, ...]) -> tuple[float, int]:
    """Largest post-descent ratio; a value above one is a literal valley."""
    best = 0.0
    best_i = -1
    for i in range(1, len(p) - 1):
        if p[i - 1] <= p[i]:
            continue
        score = p[i + 1] / p[i]
        if score > best:
            best = score
            best_i = i
    return best, best_i


def graph_poly(code: str) -> tuple[int, ...]:
    graph = nx.from_graph6_bytes(code.encode("ascii"))
    assert nx.is_tree(graph)
    adjacency = [list(graph.neighbors(v)) for v in range(len(graph))]
    return tuple(independence_poly(len(graph), adjacency))


def main() -> None:
    payload = json.loads(SOURCE.read_text(encoding="utf-8"))
    lc_items = payload["top_lc_failures"]
    lc_rows = [graph_poly(item["graph6"]) for item in lc_items]
    # The near-miss rows were already saved exactly.  Deduplicate identical
    # coefficient rows because product behavior depends only on the row.
    near_rows = [tuple(item["poly"]) for item in payload["top_near_misses"]]
    pool: list[tuple[int, ...]] = []
    labels: list[str] = []
    seen: set[tuple[int, ...]] = set()
    for label, row in [
        *[(f"lc_{i}", row) for i, row in enumerate(lc_rows)],
        *[(f"near_{i}", row) for i, row in enumerate(near_rows)],
    ]:
        if row not in seen:
            seen.add(row)
            labels.append(label)
            pool.append(row)

    hits: list[dict[str, object]] = []
    best: list[tuple[float, int, tuple[int, ...], tuple[str, ...]]] = []

    def record(row: tuple[int, ...], factors: tuple[str, ...]) -> None:
        found = valleys(row)
        if found:
            hits.append({"factors": factors, "valleys": found, "poly": row})
        score, rank = rebound_score(row)
        best.append((score, rank, row, factors))

    # Exact all-pairs, including squares.
    for i, a in enumerate(pool):
        for j in range(i, len(pool)):
            record(multiply(a, pool[j]), (labels[i], labels[j]))

    # Powers of each severe log-concavity failure through 32 components.
    for i, base in enumerate(lc_rows):
        row = (1,)
        for exponent in range(1, 33):
            row = multiply(row, base)
            if exponent >= 2:
                record(row, (f"lc_{i}",) * exponent)

    # Beam search over multisets.  Keep the most valley-prone exact rows at
    # every component count and extend by each n=28 source row.
    beam: list[tuple[tuple[int, ...], tuple[str, ...]]] = [((1,), ())]
    beam_width = 300
    for depth in range(1, 9):
        candidates: dict[tuple[int, ...], tuple[str, ...]] = {}
        for row, factors in beam:
            start = labels.index(factors[-1]) if factors else 0
            for j in range(start, len(pool)):
                product = multiply(row, pool[j])
                candidates.setdefault(product, factors + (labels[j],))
        ranked = sorted(
            candidates.items(),
            key=lambda item: rebound_score(item[0])[0],
            reverse=True,
        )
        beam = [(row, factors) for row, factors in ranked[:beam_width]]
        if depth >= 2:
            for row, factors in beam:
                record(row, factors)
        if hits:
            break

    best.sort(key=lambda item: item[0], reverse=True)
    report = {
        "marker": (
            "FOUND_EXACT_NONUNIMODAL_FOREST_PRODUCT"
            if hits
            else "NO_EXACT_FOREST_PRODUCT_VALLEY_IN_SEARCH"
        ),
        "source_sha_scope": "public complete n=28 census top LC failures and near misses",
        "lc_rows_reconstructed": len(lc_rows),
        "unique_pool_rows": len(pool),
        "hits": hits[:10],
        "best_rebound": [
            {
                "score": score,
                "rank": rank,
                "factors": factors,
                "triple": row[max(0, rank - 1) : rank + 2],
            }
            for score, rank, row, factors in best[:20]
        ],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["marker"])
    print(json.dumps(report["best_rebound"][:5], indent=2))


if __name__ == "__main__":
    main()
