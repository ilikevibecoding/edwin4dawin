#!/usr/bin/env python3
"""Independent exact audit of the bounded n=23, e=2 double-claw scan."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXPECTED = {
    "scan_rank8_delta013_e2_double_claws_n23.py":
        "3FD0FCB77E1A3B09E30AA3E00DBA904D446B83E6502944EB4DA5B0404FCFEF5C",
    "rank8_delta013_e2_double_claws_n23_exact_20260820.json":
        "A2CA7228A172D5C8E1A1747014691F38A49BC0DE07C59D82400A80ED245A7AC9",
}
ORDER = 23
MAX_RANK = 8
RANKS = (0, 1, 2, 3)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[int], right: list[int]) -> list[int]:
    return [left[i] + right[i] for i in range(MAX_RANK + 1)]


def multiply(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (MAX_RANK + 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right[: MAX_RANK + 1 - i]):
            out[i + j] += x * y
    return out


def shift(poly: list[int]) -> list[int]:
    return [0] + poly[:MAX_RANK]


def forest_poly(adjacency: list[list[int]], removed: int | None = None) -> list[int]:
    seen = {removed} if removed is not None else set()

    def visit(vertex: int, parent: int):
        seen.add(vertex)
        absent = [1] + [0] * MAX_RANK
        present = [1] + [0] * MAX_RANK
        for neighbor in adjacency[vertex]:
            if neighbor == parent or neighbor == removed:
                continue
            child_absent, child_present = visit(neighbor, vertex)
            absent = multiply(absent, add(child_absent, child_present))
            present = multiply(present, child_absent)
        return absent, shift(present)

    result = [1] + [0] * MAX_RANK
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        absent, present = visit(vertex, -1)
        result = multiply(result, add(absent, present))
    return result


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
    # Independent numbering/construction: build the bridge first, then arms.
    adjacency = [[]]
    left = 0
    previous = left
    for _ in range(bridge):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    right = previous
    attach_path(adjacency, left, left_a)
    attach_path(adjacency, left, left_b)
    attach_path(adjacency, right, right_a)
    attach_path(adjacency, right, right_b)
    assert len(adjacency) == ORDER
    assert sum(map(len, adjacency)) == 2 * (ORDER - 1)
    assert sorted(map(len, adjacency)).count(3) == 2
    return adjacency


def normalize(lengths: tuple[int, int, int, int, int]):
    left_a, left_b, bridge, right_a, right_b = lengths
    left = tuple(sorted((left_a, left_b)))
    right = tuple(sorted((right_a, right_b)))
    if right < left:
        left, right = right, left
    return left[0], left[1], bridge, right[0], right[1]


def normalized_compositions():
    out = set()
    total = ORDER - 1
    for a in range(1, total):
        for b in range(1, total - a):
            for bridge in range(1, total - a - b):
                for cc in range(1, total - a - b - bridge):
                    d = total - a - b - bridge - cc
                    if d >= 1:
                        out.add(normalize((a, b, bridge, cc, d)))
    return out


def ordered_canonical_lengths():
    total = ORDER - 1
    out = set()
    for left_a in range(1, total):
        for left_b in range(left_a, total):
            for bridge in range(1, total):
                for right_a in range(1, total):
                    right_b = total - left_a - left_b - bridge - right_a
                    if right_b < right_a:
                        continue
                    left = (left_a, left_b)
                    right = (right_a, right_b)
                    if left <= right:
                        out.add((left_a, left_b, bridge, right_a, right_b))
    return out


def delta0(core: list[int], deleted: list[int]) -> int:
    c6, c7, c8 = core[6:9]
    h6, h7 = deleted[6:8]
    return (
        -8*c6*c7*c7*h6 - 144*c6*c7*c8*h6 + c6*c7*h6*h7
        - 126*c6*c7*h7*h7 - 128*c6*c8*c8*h6 + 120*c7*c7*c7*h6
        + 112*c7*c7*c8*h6 - 8*c7*c7*h6*h6 + 257*c7*c7*h6*h7
        - 126*c7*c7*h7*h7 - 144*c7*c8*h6*h6 + 256*c7*c8*h6*h7
        + c7*h6*h6*h7 + 2*c7*h6*h7*h7 - 128*c8*c8*h6*h6
    )


def delta1(core: list[int], deleted: list[int]) -> int:
    c5, c6, c7, c8 = core[5:9]
    h6, h7 = deleted[6:8]
    return (
        -8*c5*c6*c7*h6 - 160*c5*c7*c7*h6 - 288*c5*c7*c8*h6
        + c5*c7*h6*h7 - 126*c5*c7*h7*h7 - 128*c5*c8*c8*h6
        + 112*c6*c6*c7*h6 + 192*c6*c7*c7*h6 - 176*c6*c7*c8*h6
        - 8*c6*c7*h6*h6 + 257*c6*c7*h6*h7 - 126*c6*c7*h7*h7
        - 128*c6*c8*c8*h6 + 232*c7*c7*c7*h6 + 112*c7*c7*c8*h6
        - 152*c7*c7*h6*h6 + 256*c7*c7*h6*h7 - 144*c7*c8*h6*h6
    )


def delta2(core: list[int], deleted: list[int]) -> int:
    c4, c5, c6, c7, c8 = core[4:9]
    h6, h7 = deleted[6:8]
    return (
        -8*c4*c5*c7*h6 - 168*c4*c6*c7*h6 - 456*c4*c7*c7*h6
        - 432*c4*c7*c8*h6 + c4*c7*h6*h7 - 126*c4*c7*h7*h7
        - 128*c4*c8*c8*h6 + 104*c5*c5*c7*h6 + 256*c5*c6*c7*h6
        - 288*c5*c7*c7*h6 - 464*c5*c7*c8*h6 - 8*c5*c7*h6*h6
        + 257*c5*c7*h6*h7 - 126*c5*c7*h7*h7 - 128*c5*c8*c8*h6
        + 424*c6*c6*c7*h6 + 392*c6*c7*c7*h6 - 32*c6*c7*c8*h6
        - 152*c6*c7*h6*h6 + 256*c6*c7*h6*h7 + 112*c7*c7*c7*h6
        - 144*c7*c7*h6*h6
    )


def delta3(core: list[int], deleted: list[int]) -> int:
    c3, c4, c5, c6, c7, c8 = core[3:9]
    h6, h7 = deleted[6:8]
    return (
        -8*c3*c4*c7*h6 - 176*c3*c5*c7*h6 - 624*c3*c6*c7*h6
        - 896*c3*c7*c7*h6 - 576*c3*c7*c8*h6 + c3*c7*h6*h7
        - 126*c3*c7*h7*h7 - 128*c3*c8*c8*h6 + 96*c4*c4*c7*h6
        + 296*c4*c5*c7*h6 - 488*c4*c6*c7*h6 - 1200*c4*c7*c7*h6
        - 752*c4*c7*c8*h6 - 8*c4*c7*h6*h6 + 257*c4*c7*h6*h7
        - 126*c4*c7*h7*h7 - 128*c4*c8*c8*h6 + 680*c5*c5*c7*h6
        + 952*c5*c6*c7*h6 - 112*c5*c7*c7*h6 - 176*c5*c7*c8*h6
        - 152*c5*c7*h6*h6 + 256*c5*c7*h6*h7 + 504*c6*c6*c7*h6
        + 192*c6*c7*c7*h6 - 144*c6*c7*h6*h6
    )


DELTA = (delta0, delta1, delta2, delta3)


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual_hashes == EXPECTED
    primary = json.loads(
        (HERE / "rank8_delta013_e2_double_claws_n23_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23"

    # Classification: e=2 cannot contain degree >=4 because its single
    # contribution is already >=3; hence there are exactly two degree-3
    # vertices.  The handshake identity gives four leaves.  Suppression leaves
    # the unique tree with two degree-3 vertices, their bridge, and four leaves.
    surplus = {degree: (degree - 1) * (degree - 2) // 2 for degree in range(1, 9)}
    assert surplus == {1: 0, 2: 0, 3: 1, 4: 3, 5: 6, 6: 10, 7: 15, 8: 21}

    compositions = normalized_compositions()
    ordered = ordered_canonical_lengths()
    assert compositions == ordered
    assert len(ordered) == 920
    assert all(sum(lengths) == ORDER - 1 and min(lengths) >= 1 for lengths in ordered)

    minima = {rank: None for rank in RANKS}
    witnesses = {rank: None for rank in RANKS}
    signs = {rank: {"negative": 0, "zero": 0, "positive": 0} for rank in RANKS}
    profiles = set()
    roots = 0
    for lengths in sorted(ordered):
        adjacency = build_graph(lengths)
        degrees = list(map(len, adjacency))
        assert sum((degree - 1) * (degree - 2) // 2 for degree in degrees) == 2
        core = forest_poly(adjacency)
        for root in range(ORDER):
            deleted = forest_poly(adjacency, root)
            profile = (*core[3:9], deleted[6], deleted[7])
            profiles.add(profile)
            roots += 1
            for rank, evaluate in enumerate(DELTA):
                value = evaluate(core, deleted)
                label = "negative" if value < 0 else "zero" if value == 0 else "positive"
                signs[rank][label] += 1
                if minima[rank] is None or value < minima[rank]:
                    minima[rank] = value
                    witnesses[rank] = {
                        "lengths": lengths,
                        "root_in_independent_numbering": root,
                        "profile": profile,
                    }

    expected_minima = {
        0: 6570404611911847800,
        1: 21884430029308489796,
        2: 41490192594553419725,
        3: 63006870505707355076,
    }
    assert roots == 21160
    assert len(profiles) == 11395
    assert minima == expected_minima
    assert signs == {
        rank: {"negative": 0, "zero": 0, "positive": 21160}
        for rank in RANKS
    }
    assert primary["canonical_cores"] == 920
    assert primary["rooted_cases"] == roots
    assert primary["unique_coefficient_root_profiles"] == len(profiles)
    assert {
        rank: primary["rank_results"][str(rank)]["minimum"] for rank in RANKS
    } == minima

    payload = {
        "schema": "rank8-delta013-e2-double-claws-n23-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_AUDIT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23",
        "immutable_input_hashes": actual_hashes,
        "classification_rederived": (
            "e=2 forces exactly two degree-3 vertices and no higher degree; "
            "the handshake identity gives four leaves and the unique double-claw skeleton"
        ),
        "canonical_coverage": {
            "method_one": "normalize all positive five-part compositions of 22 under leaf-pair and side swaps",
            "method_two": "ordered leaf pairs with lexicographically ordered sides and distinguished bridge",
            "sets_identical": True,
            "canonical_length_tuples": len(ordered),
        },
        "independent_exact_scan": {
            "rooted_cases": roots,
            "unique_coefficient_root_profiles": len(profiles),
            "rank_signs": {str(rank): row for rank, row in signs.items()},
            "rank_minima": {str(rank): value for rank, value in minima.items()},
            "minimum_witnesses_independent_numbering": {
                str(rank): row for rank, row in witnesses.items()
            },
            "method": (
                "independent graph construction, generic tree independence-polynomial "
                "DP, and explicit Delta0/1/2/3 transcriptions"
            ),
        },
        "scope_guard": (
            "Exact only at order 23 on e=2; no all-order e=2 or global connected-Q8 claim."
        ),
    }
    output = HERE / "rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("cores", len(ordered), "roots", roots, "profiles", len(profiles))
    print("minima", minima)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
