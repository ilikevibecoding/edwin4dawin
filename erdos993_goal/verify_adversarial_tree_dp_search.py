#!/usr/bin/env python3
"""Independent exact verifier for the adversarial tree-DP campaign report."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


def multiply(left: list[int], right: list[int]) -> list[int]:
    output = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            output[i + j] += a * b
    return output


def add(left: list[int], right: list[int]) -> list[int]:
    output = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        output[index] += value
    for index, value in enumerate(right):
        output[index] += value
    return output


def polynomial(order: int, edges: list[list[int]]) -> list[int]:
    adjacency = [[] for _ in range(order)]
    assert len(edges) == order - 1
    for left, right in edges:
        assert 0 <= left < order and 0 <= right < order and left != right
        adjacency[left].append(right)
        adjacency[right].append(left)

    parent = [-2] * order
    parent[0] = -1
    traversal = [0]
    for vertex in traversal:
        for neighbor in adjacency[vertex]:
            if neighbor == parent[vertex]:
                continue
            assert parent[neighbor] == -2, "cycle in certificate"
            parent[neighbor] = vertex
            traversal.append(neighbor)
    assert len(traversal) == order, "disconnected certificate"

    excluded = [None] * order
    total = [None] * order
    for vertex in reversed(traversal):
        e = [1]
        selected_children = [1]
        for child in adjacency[vertex]:
            if parent[child] != vertex:
                continue
            e = multiply(e, total[child])
            selected_children = multiply(selected_children, excluded[child])
        excluded[vertex] = e
        total[vertex] = add(e, [0, *selected_children])
    return total[0]


def profile(coefficients: list[int]) -> dict:
    alpha = len(coefficients) - 1
    first_descent = next(
        (
            index
            for index in range(alpha)
            if coefficients[index + 1] < coefficients[index]
        ),
        alpha,
    )
    first_reascent = next(
        (
            index
            for index in range(first_descent + 1, alpha)
            if coefficients[index + 1] > coefficients[index]
        ),
        None,
    )
    tail_start = (2 * alpha + 1) // 3
    best = (0, 1, -1)
    for index in range(first_descent + 1, min(tail_start, alpha)):
        candidate = (coefficients[index + 1], coefficients[index], index)
        if candidate[0] * best[1] > best[0] * candidate[1]:
            best = candidate
    return {
        "alpha": alpha,
        "first_descent": first_descent,
        "first_reascent": first_reascent,
        "tail_start": tail_start,
        "unimodal": first_reascent is None,
        "best_legal_post_descent": {
            "index": best[2],
            "numerator": best[0],
            "denominator": best[1],
        },
    }


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    report = json.loads(args.report.read_text(encoding="utf-8"))
    checked = []
    for order_item in report["orders"]:
        champion = order_item["champion"]
        coefficients = polynomial(champion["order"], champion["edges"])
        stored = [int(value) for value in champion["polynomial"]]
        assert coefficients == stored
        result = profile(coefficients)
        assert result["alpha"] == champion["alpha"]
        assert result["first_descent"] == champion["first_descent"]
        assert (
            -1 if result["first_reascent"] is None else result["first_reascent"]
        ) == champion["first_reascent"]
        assert result["tail_start"] == champion["tail_start"]
        best = result["best_legal_post_descent"]
        stored_best = champion["best_legal_post_descent_ratio"]
        assert best["index"] == stored_best["index"]
        assert best["numerator"] == int(stored_best["numerator"])
        assert best["denominator"] == int(stored_best["denominator"])
        checked.append(
            {
                "order": champion["order"],
                "tree_edges": len(champion["edges"]),
                "alpha": result["alpha"],
                "unimodal": result["unimodal"],
                "best_legal_post_descent": best,
            }
        )

    assert report["status"] == "NO_COUNTEREXAMPLE"
    assert all(item["unimodal"] for item in checked)
    payload = {
        "status": "PASS_INDEPENDENT_EXACT_ADVERSARIAL_TREE_DP_CHAMPION_VERIFICATION",
        "scope": "Independent Python-integer reconstruction of every per-order champion; campaign coverage is read from the search report, not independently rerun.",
        "search_report": str(args.report),
        "search_report_sha256": sha256(args.report),
        "reported_unique_labeled_topologies": report[
            "total_unique_labeled_topologies"
        ],
        "champions_checked": checked,
    }
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
