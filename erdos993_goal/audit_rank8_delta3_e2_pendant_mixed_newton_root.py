#!/usr/bin/env python3
"""Independent literal replay of every pendant-root mixed e=2 Delta3 ray."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23_independent import delta3


ROOT = Path(__file__).resolve().parent
PRIMARY_SOURCE = ROOT / "scan_rank8_delta3_e2_pendant_mixed_newton_root.py"
PRIMARY_REPORT = ROOT / "rank8_delta3_e2_pendant_mixed_newton_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta3_e2_pendant_mixed_newton_independent_audit_root_20260823.json"
MAX_RANK = 8
SAMPLES = 27
EXPECTED = {
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
    "rank8_delta3_e2_mixed_newton_reduction_exact_root_20260823.json":
        "8A4ACC45A27DF1394440EE7326F5404B444444F523A5FCE68712B7D112D1F7F1",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json":
        "AD5AE4EEF6DEB576DD2B0EC46CAFA9EF8BC6AC2D4F08231C4837CFBC7991EC61",
    PRIMARY_SOURCE.name:
        "318D0B51DC1FFC05D2EE4B43D23E84D5BC22B194D78F2B7ECCEB08E12AB9B8EB",
    PRIMARY_REPORT.name:
        "AD7F2A669C7E6A4BAC2937D3C4E6A2B8BA52B8872D0C65B0C86899EC81B09D72",
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


def shifted(row):
    return (0,) + row[:MAX_RANK]


def literal_tree(values):
    near, tail, sibling, far_left, far_right, bridge = values
    selected = near + tail + 1
    adjacency = [[]]
    previous = 0
    for _ in range(bridge):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        previous = vertex
    right = previous
    selected_vertices = []
    for start, length, capture in (
        (0, selected, True),
        (0, sibling, False),
        (right, far_left, False),
        (right, far_right, False),
    ):
        previous = start
        for _ in range(length):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
            if capture:
                selected_vertices.append(vertex)
    return adjacency, selected_vertices[near]


def rooted_polys(adjacency, root):
    one = (1,) + (0,) * MAX_RANK

    def visit(vertex, parent):
        absent = one
        present = one
        for neighbor in adjacency[vertex]:
            if neighbor == parent:
                continue
            child_absent, child_present = visit(neighbor, vertex)
            absent = multiply(absent, add(child_absent, child_present))
            present = multiply(present, child_absent)
        return absent, shifted(present)

    deleted, present = visit(root, -1)
    return add(deleted, present), deleted


def keys():
    gaps = (*range(0, 7), "L")
    arms = (*range(1, 7), "L")
    bridges = (*range(1, 8), "L")
    far_pairs = tuple(itertools.combinations_with_replacement(arms, 2))
    for near, tail, sibling, far, bridge in itertools.product(
        gaps, gaps, arms, far_pairs, bridges
    ):
        flat = (near, tail, sibling, *far, bridge)
        flags = tuple(value == "L" for value in flat)
        if any(flags) and not all(flags):
            yield (near, tail, sibling, far, bridge), flat, flags


def resolve(flat, flags, extra):
    values = [
        8 if index == 5 and value == "L"
        else 7 if value == "L"
        else value
        for index, value in enumerate(flat)
    ]
    values[flags.index(True)] += extra
    return tuple(values)


def finite_differences(values):
    out = []
    row = list(values)
    while row:
        out.append(row[0])
        row = [right - left for left, right in zip(row, row[1:])]
    return tuple(out)


def main() -> None:
    assert EXPECTED[PRIMARY_SOURCE.name] != "FILL_AFTER_PRIMARY"
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA3_E2_PENDANT_MIXED_ALL_RAYS"

    count = 0
    unseen_checks = 0
    minima = {"d0": None, "d1": None, "higher": None}
    lines = []
    for key, flat, flags in keys():
        baseline = 2 + sum(
            8 if index == 5 and value == "L"
            else 7 if value == "L"
            else value
            for index, value in enumerate(flat)
        )
        shift_amount = max(0, 31 - baseline)
        values = []
        unseen = None
        for sample in range(SAMPLES + 1):
            resolved = resolve(flat, flags, shift_amount + sample)
            adjacency, root = literal_tree(resolved)
            core, deleted = rooted_polys(adjacency, root)
            value = delta3(core, deleted)
            if sample < SAMPLES:
                values.append(value)
            else:
                unseen = value
        coefficients = finite_differences(values)
        assert coefficients[0] > 0 and min(coefficients[1:]) >= 0
        minima["d0"] = coefficients[0] if minima["d0"] is None else min(minima["d0"], coefficients[0])
        minima["d1"] = coefficients[1] if minima["d1"] is None else min(minima["d1"], coefficients[1])
        minima["higher"] = min(coefficients[2:]) if minima["higher"] is None else min(minima["higher"], min(coefficients[2:]))
        reconstructed = sum(
            value * math.comb(27, power)
            for power, value in enumerate(coefficients)
        )
        assert reconstructed == unseen
        unseen_checks += 1
        lines.append(json.dumps(
            [key, baseline, shift_amount, coefficients], separators=(",", ":")
        ))
        count += 1
        if count % 5000 == 0:
            print("AUDIT_PROGRESS", count, flush=True)

    stream = hashlib.sha256(
        ("\n".join(sorted(lines)) + "\n").encode()
    ).hexdigest().upper()
    assert count == primary["rays"] == 57133
    assert stream == primary["coefficient_stream_sha256"]
    assert {
        name: primary["minimum_coefficients"][name]
        for name in ("d0", "d1", "higher")
    } == minima
    payload = {
        "schema": "rank8-delta3-e2-pendant-mixed-newton-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA3_E2_PENDANT_MIXED_ALL_RAYS_AUDIT",
        "method": "independent rooted-coordinate enumeration, bridge-first literal trees, generic root-centered forest DP, all 27 samples, and direct unseen S=27 checks",
        "rays_rebuilt": count,
        "literal_values_rebuilt": count * SAMPLES,
        "unseen_literal_checks": unseen_checks,
        "minimum_coefficients": minima,
        "coefficient_stream_sha256": stream,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Independent audit of pendant-root mixed e=2 Delta3 only.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("RAYS", count, "VALUES", payload["literal_values_rebuilt"], "UNSEEN", unseen_checks)
    print("STREAM", stream)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
