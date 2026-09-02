#!/usr/bin/env python3
"""Independent literal-tree replay of all mixed branch-root e=2 Delta3 rays."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23_independent import delta3


ROOT = Path(__file__).resolve().parent
PRIMARY_SOURCE = ROOT / "scan_rank8_delta3_e2_branch_mixed_newton_root.py"
PRIMARY_REPORT = ROOT / "rank8_delta3_e2_branch_mixed_newton_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta3_e2_branch_mixed_newton_independent_audit_root_20260823.json"
MAX_RANK = 8
SAMPLES = 27
EXPECTED = {
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
    "rank8_delta3_e2_mixed_newton_reduction_exact_root_20260823.json":
        "8A4ACC45A27DF1394440EE7326F5404B444444F523A5FCE68712B7D112D1F7F1",
    PRIMARY_SOURCE.name:
        "A2DAF299AEB60F6401504CC022309BD49C882CFD1ADE8B7B5D00F1B3140EE4E4",
    PRIMARY_REPORT.name:
        "385DC3711FDF369C45C91AF19866C351C26A52352A551C3AF7D16C89EEF3E518",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def add(left, right):
    return tuple(left[index] + right[index] for index in range(MAX_RANK + 1))


def multiply(left, right):
    out = [0] * (MAX_RANK + 1)
    for left_rank, left_value in enumerate(left):
        if left_value:
            for right_rank, right_value in enumerate(right[: MAX_RANK + 1 - left_rank]):
                if right_value:
                    out[left_rank + right_rank] += left_value * right_value
    return tuple(out)


def shift(row):
    return (0,) + row[:MAX_RANK]


def build_bridge_first(lengths):
    left_a, left_b, bridge, right_a, right_b = lengths
    adjacency = [[]]
    previous = 0
    for _ in range(bridge):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    right = previous
    for start, length in ((0, left_a), (0, left_b), (right, right_a), (right, right_b)):
        previous = start
        for _ in range(length):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
    assert len(adjacency) == 1 + sum(lengths)
    return adjacency


def rooted_polys(adjacency):
    one = (1,) + (0,) * MAX_RANK

    def visit(vertex, parent):
        absent = one
        present_base = one
        for neighbor in adjacency[vertex]:
            if neighbor == parent:
                continue
            child_absent, child_present = visit(neighbor, vertex)
            absent = multiply(absent, add(child_absent, child_present))
            present_base = multiply(present_base, child_absent)
        return absent, shift(present_base)

    deleted, present = visit(0, -1)
    return add(deleted, present), deleted


def raw_quotient_keys():
    arm_states = (*range(1, 7), "L")
    bridge_states = (*range(1, 8), "L")
    order_index = {value: index for index, value in enumerate(arm_states)}
    keys = set()
    for left_a, left_b, right_a, right_b, bridge in itertools.product(
        arm_states, arm_states, arm_states, arm_states, bridge_states
    ):
        left = tuple(sorted((left_a, left_b), key=order_index.get))
        right = tuple(sorted((right_a, right_b), key=order_index.get))
        flat = (*left, *right, bridge)
        flags = tuple(value == "L" for value in flat)
        if any(flags) and not all(flags):
            keys.add((left, right, bridge))
    return keys


def lengths_for(key, extra):
    left, right, bridge = key
    flat = (*left, *right, bridge)
    flags = [value == "L" for value in flat]
    values = [
        7 if index < 4 and value == "L"
        else 8 if index == 4 and value == "L"
        else value
        for index, value in enumerate(flat)
    ]
    values[flags.index(True)] += extra
    return values[0], values[1], values[4], values[2], values[3]


def finite_differences(values):
    first = []
    row = list(values)
    while row:
        first.append(row[0])
        row = [right - left for left, right in zip(row, row[1:])]
    return tuple(first)


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA3_E2_BRANCH_MIXED_ALL_RAYS"
    keys = raw_quotient_keys()
    assert len(keys) == primary["rays"] == 3184

    lines = []
    minima = {"d0": None, "d1": None, "higher": None}
    unseen_checks = 0
    for key in keys:
        left, right, bridge = key
        flat = (*left, *right, bridge)
        baseline = 1 + sum(
            7 if index < 4 and value == "L"
            else 8 if index == 4 and value == "L"
            else value
            for index, value in enumerate(flat)
        )
        shift_amount = max(0, 31 - baseline)
        values = []
        for sample in range(SAMPLES):
            core, deleted = rooted_polys(build_bridge_first(lengths_for(key, shift_amount + sample)))
            values.append(delta3(core, deleted))
        coefficients = finite_differences(values)
        assert coefficients[0] > 0 and min(coefficients[1:]) >= 0
        minima["d0"] = coefficients[0] if minima["d0"] is None else min(minima["d0"], coefficients[0])
        minima["d1"] = coefficients[1] if minima["d1"] is None else min(minima["d1"], coefficients[1])
        minima["higher"] = min(coefficients[2:]) if minima["higher"] is None else min(minima["higher"], min(coefficients[2:]))

        unseen = sum(value * math.comb(27, power) for power, value in enumerate(coefficients))
        core, deleted = rooted_polys(build_bridge_first(lengths_for(key, shift_amount + 27)))
        assert unseen == delta3(core, deleted)
        unseen_checks += 1
        lines.append(json.dumps([key, baseline, shift_amount, coefficients], separators=(",", ":")))

    stream = hashlib.sha256(("\n".join(sorted(lines)) + "\n").encode()).hexdigest().upper()
    assert stream == primary["coefficient_stream_sha256"]
    assert {
        name: primary["minimum_coefficients"][name]
        for name in ("d0", "d1", "higher")
    } == minima

    payload = {
        "schema": "rank8-delta3-e2-branch-mixed-newton-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA3_E2_BRANCH_MIXED_ALL_RAYS_AUDIT",
        "method": "independent raw-orientation quotient, bridge-first literal trees, one-pass rooted forest DP, all 27 samples, and unseen S=27 checks",
        "rays_rebuilt": len(keys),
        "literal_values_rebuilt": len(keys) * SAMPLES,
        "unseen_literal_checks": unseen_checks,
        "minimum_coefficients": minima,
        "coefficient_stream_sha256": stream,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Independent audit of branch-root mixed e=2 Delta3 only.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("RAYS", len(keys), "VALUES", payload["literal_values_rebuilt"], "UNSEEN", unseen_checks)
    print("STREAM", stream)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
