#!/usr/bin/env python3
"""Audit the published 60-vertex PatternBoost tree corpus exactly.

The input lines are Prüfer codes from Ramos--Sun's public repository.  This
script reconstructs each labelled tree without NetworkX, computes its
independence polynomial by rooted tree DP, verifies the advertised
log-concavity failure, and deduplicates equal coefficient sequences.

The output is a compact exact corpus for subsequent forest-product searches.
It retains one Prüfer certificate for every distinct polynomial and ranks
the polynomials by scale-free log-concavity defect.
"""

from __future__ import annotations

import argparse
import ast
import heapq
import json
import time
from pathlib import Path


def add(a: list[int], b: list[int]) -> list[int]:
    out = [0] * max(len(a), len(b))
    for i, value in enumerate(a):
        out[i] += value
    for i, value in enumerate(b):
        out[i] += value
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def mul(a: list[int], b: list[int]) -> list[int]:
    out = [0] * (len(a) + len(b) - 1)
    for i, left in enumerate(a):
        if left:
            for j, right in enumerate(b):
                if right:
                    out[i + j] += left * right
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def adjacency_from_prufer(code_one_based: list[int]) -> list[list[int]]:
    n = len(code_one_based) + 2
    code = [value - 1 for value in code_one_based]
    if any(value < 0 or value >= n for value in code):
        raise ValueError("Prüfer symbol outside the one-based vertex range")
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


def independence_polynomial(adjacency: list[list[int]]) -> list[int]:
    n = len(adjacency)
    parent = [-2] * n
    parent[0] = -1
    order = [0]
    for vertex in order:
        for neighbor in adjacency[vertex]:
            if neighbor == parent[vertex]:
                continue
            if parent[neighbor] != -2:
                raise ValueError("decoded graph is not a tree")
            parent[neighbor] = vertex
            order.append(neighbor)
    if len(order) != n:
        raise ValueError("decoded graph is disconnected")

    excluded: list[list[int] | None] = [None] * n
    total: list[list[int] | None] = [None] * n
    for vertex in reversed(order):
        e = [1]
        included_companions = [1]
        for neighbor in adjacency[vertex]:
            if parent[neighbor] != vertex:
                continue
            assert total[neighbor] is not None
            assert excluded[neighbor] is not None
            e = mul(e, total[neighbor])
            included_companions = mul(
                included_companions, excluded[neighbor]
            )
        excluded[vertex] = e
        total[vertex] = add(e, [0, *included_companions])
    assert total[0] is not None
    return total[0]


def first_descent(p: list[int]) -> int | None:
    return next(
        (k for k in range(len(p) - 1) if p[k + 1] < p[k]),
        None,
    )


def is_unimodal(p: list[int]) -> bool:
    descent = first_descent(p)
    return descent is None or all(
        p[k + 1] <= p[k] for k in range(descent, len(p) - 1)
    )


def failures(p: list[int]) -> list[dict]:
    out = []
    for k in range(1, len(p) - 1):
        defect = p[k - 1] * p[k + 1] - p[k] * p[k]
        if defect > 0:
            scale = p[k - 1] * p[k + 1]
            out.append(
                {
                    "k": k,
                    "defect": defect,
                    "relative_defect": defect / scale,
                }
            )
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    started = time.time()
    unique: dict[tuple[int, ...], dict] = {}
    lines = 0
    malformed = 0
    non_lc = 0
    nonunimodal = None
    for line_number, raw in enumerate(
        args.input.read_text(encoding="utf-8").splitlines(), start=1
    ):
        if args.limit and lines >= args.limit:
            break
        if not raw.strip():
            continue
        lines += 1
        try:
            code = ast.literal_eval(raw)
            if not isinstance(code, list):
                raise ValueError("line is not a list")
            adjacency = adjacency_from_prufer(code)
            polynomial = independence_polynomial(adjacency)
        except Exception as error:
            malformed += 1
            print(f"malformed line {line_number}: {error}", flush=True)
            continue
        defects = failures(polynomial)
        if defects:
            non_lc += 1
        if not is_unimodal(polynomial) and nonunimodal is None:
            nonunimodal = {
                "line": line_number,
                "prufer_code_one_based": code,
                "polynomial": polynomial,
            }
        key = tuple(polynomial)
        if key not in unique:
            strongest = max(
                defects,
                key=lambda item: item["relative_defect"],
                default=None,
            )
            unique[key] = {
                "multiplicity": 1,
                "first_line": line_number,
                "prufer_code_one_based": code,
                "polynomial": polynomial,
                "order": len(adjacency),
                "alpha": len(polynomial) - 1,
                "mode": max(
                    range(len(polynomial)),
                    key=polynomial.__getitem__,
                ),
                "first_descent": first_descent(polynomial),
                "log_concavity_failures": defects,
                "strongest_relative_defect": (
                    strongest["relative_defect"] if strongest else 0.0
                ),
            }
        else:
            unique[key]["multiplicity"] += 1
        if lines % 5_000 == 0:
            print(
                f"lines={lines:,} unique_polynomials={len(unique):,} "
                f"non_LC={non_lc:,}",
                flush=True,
            )

    records = sorted(
        unique.values(),
        key=lambda item: item["strongest_relative_defect"],
        reverse=True,
    )
    payload = {
        "status": (
            "CORPUS_CONTAINS_NONUNIMODAL_TREE"
            if nonunimodal is not None
            else "AUDITED_NO_TREE_COUNTEREXAMPLE"
        ),
        "source": str(args.input),
        "exact_integer_arithmetic": True,
        "lines_processed": lines,
        "malformed_lines": malformed,
        "non_log_concave_lines": non_lc,
        "unique_polynomials": len(records),
        "first_nonunimodal": nonunimodal,
        "records": records,
        "elapsed_seconds": time.time() - started,
    }
    args.output.write_text(
        json.dumps(payload, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                key: payload[key]
                for key in (
                    "status",
                    "lines_processed",
                    "malformed_lines",
                    "non_log_concave_lines",
                    "unique_polynomials",
                    "elapsed_seconds",
                )
            },
            indent=2,
        ),
        flush=True,
    )
    return 1 if nonunimodal is not None else 0


if __name__ == "__main__":
    raise SystemExit(main())
