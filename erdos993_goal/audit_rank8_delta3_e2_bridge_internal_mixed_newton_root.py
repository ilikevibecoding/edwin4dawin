#!/usr/bin/env python3
"""Independent literal replay of every bridge-internal mixed e=2 Delta3 ray."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23_independent import delta3


ROOT = Path(__file__).resolve().parent
PRIMARY_SOURCE = ROOT / "scan_rank8_delta3_e2_bridge_internal_mixed_newton_root.py"
PRIMARY_REPORT = ROOT / "rank8_delta3_e2_bridge_internal_mixed_newton_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta3_e2_bridge_internal_mixed_newton_independent_audit_root_20260823.json"
MAX_RANK = 8
SAMPLES = 27
EXPECTED = {
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
    "rank8_delta3_e2_mixed_newton_reduction_exact_root_20260823.json":
        "8A4ACC45A27DF1394440EE7326F5404B444444F523A5FCE68712B7D112D1F7F1",
    PRIMARY_SOURCE.name:
        "ECBB4110689E2EC007AAE1FD678616B4276EF7339AE59BE2294CDADD390679BD",
    PRIMARY_REPORT.name:
        "17F42A1949352FBD9A0C2E48529F02730ABE772335E2235412D44D935A99291F",
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
    left_gap, left_a, left_b, right_gap, right_a, right_b = values
    bridge = left_gap + right_gap + 2
    adjacency = [[]]
    central = []
    previous = 0
    for _ in range(bridge):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        central.append(vertex)
        previous = vertex
    right = previous
    for start, length in (
        (0, left_a), (0, left_b), (right, right_a), (right, right_b)
    ):
        previous = start
        for _ in range(length):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
    return adjacency, central[left_gap]


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


def quotient_keys():
    gap_states = (*range(0, 7), "L")
    arm_states = (*range(1, 7), "L")
    gap_index = {value: index for index, value in enumerate(gap_states)}
    arm_index = {value: index for index, value in enumerate(arm_states)}
    modules = set()
    for gap, arm_a, arm_b in itertools.product(gap_states, arm_states, arm_states):
        modules.add((gap, tuple(sorted((arm_a, arm_b), key=arm_index.get))))
    ordered_modules = sorted(
        modules,
        key=lambda row: (
            gap_index[row[0]], arm_index[row[1][0]], arm_index[row[1][1]]
        ),
    )
    module_index = {module: index for index, module in enumerate(ordered_modules)}
    keys = set()
    for left, right in itertools.product(ordered_modules, repeat=2):
        key = (left, right) if module_index[left] <= module_index[right] else (right, left)
        flat = (key[0][0], *key[0][1], key[1][0], *key[1][1])
        flags = [value == "L" for value in flat]
        if any(flags) and not all(flags):
            keys.add(key)
    return keys, ordered_modules


def resolve(key, extra):
    flat = (key[0][0], *key[0][1], key[1][0], *key[1][1])
    flags = [value == "L" for value in flat]
    values = [7 if value == "L" else value for value in flat]
    values[flags.index(True)] += extra
    return tuple(values), flat


def finite_differences(values):
    out = []
    row = list(values)
    while row:
        out.append(row[0])
        row = [right - left for left, right in zip(row, row[1:])]
    return tuple(out)


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA3_E2_BRIDGE_INTERNAL_MIXED_ALL_RAYS"
    keys, modules = quotient_keys()
    assert len(modules) == 224 and len(keys) == primary["rays"] == 14321

    lines = []
    minima = {"d0": None, "d1": None, "higher": None}
    unseen_checks = 0
    for key in keys:
        _, flat = resolve(key, 0)
        baseline = 3 + sum(7 if value == "L" else value for value in flat)
        shift_amount = max(0, 31 - baseline)
        values = []
        unseen = None
        for sample in range(SAMPLES + 1):
            resolved, _ = resolve(key, shift_amount + sample)
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

    stream = hashlib.sha256(
        ("\n".join(sorted(lines)) + "\n").encode()
    ).hexdigest().upper()
    assert stream == primary["coefficient_stream_sha256"]
    assert {
        name: primary["minimum_coefficients"][name]
        for name in ("d0", "d1", "higher")
    } == minima
    payload = {
        "schema": "rank8-delta3-e2-bridge-internal-mixed-newton-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA3_E2_BRIDGE_INTERNAL_MIXED_ALL_RAYS_AUDIT",
        "method": "independent oriented-module quotient, bridge-first literal trees rooted at the split vertex, generic rooted DP, all 27 samples, and unseen S=27 checks",
        "modules_rebuilt": len(modules),
        "rays_rebuilt": len(keys),
        "literal_values_rebuilt": len(keys) * SAMPLES,
        "unseen_literal_checks": unseen_checks,
        "minimum_coefficients": minima,
        "coefficient_stream_sha256": stream,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Independent audit of bridge-internal mixed e=2 Delta3 only.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("RAYS", len(keys), "VALUES", payload["literal_values_rebuilt"], "UNSEEN", unseen_checks)
    print("STREAM", stream)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
