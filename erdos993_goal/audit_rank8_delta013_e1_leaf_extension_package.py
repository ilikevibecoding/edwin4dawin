#!/usr/bin/env python3
"""Independent low-memory audit of the rank-8 e=1 leaf-extension package.

This does not re-use the symbolic cell evaluators.  It checks artifact hashes,
finite-scout coverage counts, the no-gap coordinate partitions, and the claw /
root-deletion product identities against a generic tree independence-polynomial
dynamic program.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from scan_rank8_delta3_n28_e1_subdivided_claws import claw_poly, deletion_poly


HERE = Path(__file__).resolve().parent

EXPECTED = {
    "probe_rank8_delta013_e1_leaf_extension.py":
        "EA9B7EC1718A75BE998EB64D992B53259673894D52ED0162462F69DF528DE928",
    "rank8_delta013_e1_leaf_extension_scout_exact_20260820.json":
        "0A42BE021839AD377DCFAE8AC5E024A2E2D1B19AD02F777C8804ED76F22B8D10",
    "certify_rank8_delta013_e1_new_leaf_all_order.py":
        "9899FC2D687ADFE1DE8A60314563FE42AF24064D12E0F50870AC364E1E54903E",
    "rank8_delta013_e1_new_leaf_all_order_exact_20260820.json":
        "968F0DD84D0ABB95B9677FB1A33D6C4C6C39F60A8D10EBEBCE6D50F58B218960",
    "verify_rank8_delta013_e1_center_all_order.py":
        "40F17DC3985A0E81A7DCC1F96DF7D1D8512B096027409439EBE95B2DEE5B4EED",
    "rank8_delta013_e1_center_all_order_exact_20260820.json":
        "D269F04B7FD06A03072577BC95F282FFC2276BA024BF7EABE9B7C4E51EC79984",
    "verify_rank8_delta013_e1_arm_all_long.py":
        "1E2FD7901FBCC2447F627A80884DEE8032B787B5385C42F75BBD4D12CE7F8529",
    "rank8_delta013_e1_arm_all_long_exact_20260820.json":
        "1BEFA5608CFA0B622AEAFAD42C65C5A650A0AFBBEC9F439DCACA2498AF92584E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left: list[int], right: list[int]) -> list[int]:
    out = [0] * max(len(left), len(right))
    for i, value in enumerate(left):
        out[i] += value
    for i, value in enumerate(right):
        out[i] += value
    return out


def mul(left: list[int], right: list[int]) -> list[int]:
    out = [0] * (len(left) + len(right) - 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            out[i + j] += x * y
    return out


def build_claw(arms: tuple[int, int, int]):
    adjacency = [[] for _ in range(1 + sum(arms))]
    vertex = 1
    arm_vertices = []
    for length in arms:
        previous = 0
        vertices = []
        for _ in range(length):
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            vertices.append(vertex)
            previous = vertex
            vertex += 1
        arm_vertices.append(vertices)
    return adjacency, arm_vertices


def forest_poly(adjacency: list[list[int]], removed: int | None = None) -> list[int]:
    seen = set()

    def rooted(vertex: int, parent: int):
        seen.add(vertex)
        absent = [1]
        present = [0, 1]
        for child in adjacency[vertex]:
            if child == parent or child == removed:
                continue
            child_absent, child_present = rooted(child, vertex)
            absent = mul(absent, add(child_absent, child_present))
            present = mul(present, child_absent)
        return absent, present

    result = [1]
    for vertex in range(len(adjacency)):
        if vertex == removed or vertex in seen:
            continue
        absent, present = rooted(vertex, -1)
        result = mul(result, add(absent, present))
    return result


def partitions(order: int):
    total = order - 1
    for a in range(1, total + 1):
        for b in range(a, total + 1):
            c = total - a - b
            if c >= b:
                yield a, b, c


def audit_tree_identities() -> int:
    checks = 0
    samples = ((1, 1, 20), (2, 7, 13), (7, 7, 8), (8, 9, 10))
    for arms in samples:
        adjacency, arm_vertices = build_claw(arms)
        assert forest_poly(adjacency)[:9] == claw_poly(arms)
        checks += 1
        assert forest_poly(adjacency, 0)[:9] == deletion_poly(arms, None, None)
        checks += 1
        for arm, vertices in enumerate(arm_vertices):
            for distance in {1, len(vertices), (len(vertices) + 1) // 2}:
                vertex = vertices[distance - 1]
                assert forest_poly(adjacency, vertex)[:9] == deletion_poly(
                    arms, arm, distance
                )
                checks += 1
    # Literal check of the all-long arm-root factorization convention:
    # full arm = near + root + tail, hence root distance = near + 1.
    for near, tail, other_b, other_c in ((7, 7, 7, 7), (8, 10, 9, 11)):
        arms = (near + tail + 1, other_b, other_c)
        adjacency, arm_vertices = build_claw(arms)
        vertex = arm_vertices[0][near]
        assert forest_poly(adjacency, vertex)[:9] == deletion_poly(
            arms, 0, near + 1
        )
        checks += 1
    return checks


def audit_scout() -> dict:
    report = json.loads(
        (HERE / "rank8_delta013_e1_leaf_extension_scout_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert report["status"] == (
        "PASS_EXACT_SCOUT_RANK8_DELTA013_E1_LEAF_EXTENSION_ORDERS_23_35"
    )
    assert report["base_order_23"]["rooted_cases"] == 920
    assert all(int(value) > 0 for value in report["base_order_23"]["minimum_values"].values())
    for row in report["orders"]:
        order = row["source_order"]
        count = sum(1 for _ in partitions(order))
        assert row["old_root_comparisons"] == 3 * order * count
        assert row["inserted_roots"] == 3 * count
        assert all(int(value) > 0 for value in row["minimum_increments"].values())
        assert all(
            int(value) > 0 for value in row["minimum_inserted_root_values"].values()
        )
    return {"orders": len(report["orders"]), "base_roots": 920}


def new_leaf_cell(A: int, B: int, C: int):
    assert 3 * A + 2 * B + C >= 19
    if A >= 7:
        return ("A_bulk",)
    threshold = 19 - 3 * A
    bulk_B = (threshold + 1) // 2
    if B >= bulk_B:
        return ("B_bulk", A)
    assert C >= threshold - 2 * B
    return ("C_tail", A, B)


def audit_new_leaf() -> dict:
    report = json.loads(
        (HERE / "rank8_delta013_e1_new_leaf_all_order_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert report["status"] == "PASS_EXACT_RANK8_DELTA013_E1_NEW_LEAF_ROOTS_ALL_ORDER"
    assert report["totals"] == {
        "cells": 540,
        "coefficients": 350877,
        "negative": 0,
        "zero": 261267,
        "positive": 89610,
    }
    assert len(report["cases"]) == 12
    assert all(len(case["cells"]) == 45 for case in report["cases"])
    assert all(
        int(cell["positive_origin_coefficient"]) > 0
        and int(cell["minimum_sampled_value"]) > 0
        for case in report["cases"]
        for cell in case["cells"]
    )
    # Exhaust a large prefix to mechanically check the mutually exclusive split;
    # the branch inequalities themselves give the infinite no-gap conclusion.
    seen = set()
    tested = 0
    for A in range(31):
        for B in range(31):
            for C in range(61):
                if 3 * A + 2 * B + C < 19:
                    continue
                seen.add(new_leaf_cell(A, B, C))
                tested += 1
    assert len(seen) == 45
    return {"cells": 540, "prefix_points": tested, "partition_cells_seen": 45}


def center_covered(arms: tuple[int, int, int]) -> bool:
    short = [length for length in arms if length <= 6]
    long = [length for length in arms if length >= 7]
    if len(long) == 3:
        return True
    if len(long) == 2:
        s = short[0]
        offsets = [length - 7 for length in long]
        return max(offsets) >= (8 - s + 1) // 2
    if len(long) == 1:
        s1, s2 = sorted(short)
        return long[0] - 7 >= 15 - s1 - s2
    return False


def audit_center_and_all_long() -> dict:
    center = json.loads(
        (HERE / "rank8_delta013_e1_center_all_order_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    all_long = json.loads(
        (HERE / "rank8_delta013_e1_arm_all_long_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert center["status"] == "PASS_EXACT_RANK8_DELTA013_E1_CENTER_ROOT_ALL_N23_PLUS"
    assert len(center["cells"]) == 28
    assert all_long["status"] == (
        "PASS_EXACT_RANK8_DELTA013_E1_ARM_ALL_FOUR_SEGMENTS_LONG"
    )
    assert all(
        row["negative_coefficients"] == 0 and row["zero_coefficients"] == 0
        for row in all_long["ranks"].values()
    )
    tested = 0
    for order in range(23, 81):
        for arms in partitions(order):
            assert center_covered(arms)
            tested += 1
    return {"center_cells": 28, "center_prefix_claws": tested, "all_long_ranks": 3}


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    payload = {
        "schema": "rank8-delta013-e1-leaf-extension-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E1_SCOPED_PACKAGE",
        "hashes": actual,
        "scout": audit_scout(),
        "new_leaf_all_order": audit_new_leaf(),
        "center_all_order": audit_center_and_all_long(),
        "generic_tree_identity_checks": audit_tree_identities(),
        "scope": [
            "finite leaf-extension scout at source orders 23..35",
            "all-order new-leaf-root theorem for Delta0..Delta3",
            "all-order center-root theorem for Delta0,Delta1,Delta3",
            "all-long arm-root cell for Delta0,Delta1,Delta3",
        ],
        "nonclaim": (
            "This audit does not close old-root increments outside the all-long arm-root "
            "cell and therefore does not claim the full all-root e=1 theorem."
        ),
    }
    output = HERE / "rank8_delta013_e1_leaf_extension_independent_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TREE_CHECKS", payload["generic_tree_identity_checks"])
    print("SCRIPT", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
