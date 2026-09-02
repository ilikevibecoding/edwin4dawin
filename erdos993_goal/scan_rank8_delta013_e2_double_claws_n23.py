#!/usr/bin/env python3
"""Exact n=23 scan of the degree-surplus-two double-claw layer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from scan_rank8_delta23_e1_subdivided_claws_n23_n28 import evaluator
from scan_rank8_delta3_n28_e1_subdivided_claws import forest_poly


ORDER = 23
RANKS = (0, 1, 2, 3)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def canonical_lengths():
    total = ORDER - 1
    for left_a in range(1, total + 1):
        for left_b in range(left_a, total + 1):
            for bridge in range(1, total + 1):
                for right_a in range(1, total + 1):
                    right_b = total - left_a - left_b - bridge - right_a
                    if right_b < right_a:
                        continue
                    left_pair = (left_a, left_b)
                    right_pair = (right_a, right_b)
                    if left_pair > right_pair:
                        continue
                    yield (left_a, left_b, bridge, right_a, right_b)


def attach_path(adjacency: list[list[int]], start: int, length: int) -> int:
    previous = start
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    return previous


def build_graph(lengths: tuple[int, int, int, int, int]) -> list[list[int]]:
    left_a, left_b, bridge, right_a, right_b = lengths
    adjacency = [[], []]
    attach_path(adjacency, 0, left_a)
    attach_path(adjacency, 0, left_b)

    previous = 0
    for step in range(bridge):
        vertex = 1 if step == bridge - 1 else len(adjacency)
        if vertex == len(adjacency):
            adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex

    attach_path(adjacency, 1, right_a)
    attach_path(adjacency, 1, right_b)
    assert len(adjacency) == ORDER
    assert sum(len(row) for row in adjacency) == 2 * (ORDER - 1)
    assert sorted(len(row) for row in adjacency).count(3) == 2
    return adjacency


def main() -> None:
    evaluators = {rank: evaluator(rank, ORDER)[0] for rank in RANKS}
    term_counts = {rank: evaluator(rank, ORDER)[1] for rank in RANKS}
    rows = {
        rank: {
            "negative": 0,
            "zero": 0,
            "positive": 0,
            "minimum": None,
            "witness": None,
        }
        for rank in RANKS
    }
    core_count = 0
    root_count = 0
    profile_count = set()
    for lengths in canonical_lengths():
        adjacency = build_graph(lengths)
        core = forest_poly(adjacency)
        degree_surplus = sum((len(neighbors) - 1) * (len(neighbors) - 2) // 2 for neighbors in adjacency)
        assert degree_surplus == 2
        core_count += 1
        for root in range(ORDER):
            deletion = forest_poly(adjacency, root)
            values = (*core[3:9], deletion[6], deletion[7])
            profile_count.add(values)
            root_count += 1
            for rank in RANKS:
                value = evaluators[rank](values)
                label = "negative" if value < 0 else "zero" if value == 0 else "positive"
                rows[rank][label] += 1
                if rows[rank]["minimum"] is None or value < rows[rank]["minimum"]:
                    rows[rank]["minimum"] = value
                    rows[rank]["witness"] = {
                        "lengths_leftA_leftB_bridge_rightA_rightB": list(lengths),
                        "root": root,
                        "c3_through_c8": core[3:9],
                        "H6": deletion[6],
                        "H7": deletion[7],
                        f"Delta{rank}": value,
                    }
    assert core_count > 0 and root_count == core_count * ORDER
    assert all(rows[rank]["negative"] == 0 and rows[rank]["zero"] == 0 for rank in RANKS)

    payload = {
        "schema": "rank8-delta013-e2-double-claw-n23-v1",
        "status": "PASS_EXACT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23",
        "scope": "every order-23 tree with degree surplus e=2, represented by two degree-3 branch vertices, five positive suppressed-edge lengths, and every root",
        "classification": "e=2 forces exactly two degree-3 vertices and no higher degree; suppressing degree-2 vertices gives the unique double-claw skeleton",
        "canonicalization": "pendant lengths are ordered within each branch pair and the left pair is lexicographically no larger than the right pair; the bridge is distinguished",
        "suppressed_length_sum": ORDER - 1,
        "canonical_cores": core_count,
        "rooted_cases": root_count,
        "unique_coefficient_root_profiles": len(profile_count),
        "expression_terms": {str(rank): term_counts[rank] for rank in RANKS},
        "rank_results": {str(rank): rows[rank] for rank in RANKS},
        "warning": "This is an exact order-23 boundary theorem, not an all-order e=2 theorem.",
    }
    output = Path(__file__).with_name(
        "rank8_delta013_e2_double_claws_n23_exact_20260820.json"
    )
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("cores", core_count, "roots", root_count, "profiles", len(profile_count))
    print("minima", {rank: rows[rank]["minimum"] for rank in RANKS})
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
