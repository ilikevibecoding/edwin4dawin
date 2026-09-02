#!/usr/bin/env python3
"""Independent literal replay of every bridge-internal mixed e=2 ray."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23_independent import delta0, delta1


HERE = Path(__file__).resolve().parent
PRIMARY_SOURCE = HERE / "scan_rank8_delta01_e2_bridge_internal_mixed_newton_agent.py"
PRIMARY_REPORT = HERE / "rank8_delta01_e2_bridge_internal_mixed_newton_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta01_e2_bridge_internal_mixed_newton_independent_audit_agent_20260823.json"
MAX_RANK = 8
SAMPLES = 29
EXPECTED = {
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
    "rank8_delta01_e2_mixed_newton_reduction_exact_agent_20260823.json":
        "70A4A2425768F77376086B1F0E96925FF08CDB555E7D25653DD2BA904081C690",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left, right):
    return tuple(left[i] + right[i] for i in range(MAX_RANK + 1))


def multiply(left, right):
    out = [0] * (MAX_RANK + 1)
    for i, x in enumerate(left):
        if x:
            for j, y in enumerate(right[: MAX_RANK + 1 - i]):
                if y:
                    out[i + j] += x * y
    return tuple(out)


def shifted(row):
    return (0,) + row[:MAX_RANK]


def literal_tree(values):
    x, a, b, y, c, d = values
    bridge = x + y + 2
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
    for start, length in ((0, a), (0, b), (right, c), (right, d)):
        previous = start
        for _ in range(length):
            vertex = len(adjacency)
            adjacency.append([])
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
    return adjacency, central[x]


def rooted_polys(adjacency, root):
    one = (1,) + (0,) * MAX_RANK
    def visit(vertex, parent):
        absent = one
        present = one
        for neighbor in adjacency[vertex]:
            if neighbor == parent:
                continue
            child0, child1 = visit(neighbor, vertex)
            absent = multiply(absent, add(child0, child1))
            present = multiply(present, child0)
        return absent, shifted(present)
    deleted, present = visit(root, -1)
    return add(deleted, present), deleted


def quotient_keys():
    gap_states = (*range(0, 7), "L")
    arm_states = (*range(1, 7), "L")
    gap_index = {value: i for i, value in enumerate(gap_states)}
    arm_index = {value: i for i, value in enumerate(arm_states)}
    modules = set()
    for gap, a, b in itertools.product(gap_states, arm_states, arm_states):
        modules.add((gap, tuple(sorted((a, b), key=arm_index.get))))
    ordered_modules = sorted(modules, key=lambda row: (gap_index[row[0]], arm_index[row[1][0]], arm_index[row[1][1]]))
    keys = set()
    for left, right in itertools.product(ordered_modules, repeat=2):
        left_index = ordered_modules.index(left)
        right_index = ordered_modules.index(right)
        key = (left, right) if left_index <= right_index else (right, left)
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
        row = [b - a for a, b in zip(row, row[1:])]
    return tuple(out)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA01_E2_BRIDGE_INTERNAL_MIXED_ALL_RAYS"
    keys, modules = quotient_keys()
    assert len(modules) == 224 and len(keys) == primary["rays"] == 14321

    lines = []
    minima = {"0": {"d0": None, "d1": None, "higher": None}, "1": {"d0": None, "d1": None, "higher": None}}
    unseen_checks = 0
    for key in keys:
        _, flat = resolve(key, 0)
        baseline = 3 + sum(7 if value == "L" else value for value in flat)
        shift_amount = max(0, 31 - baseline)
        values = [[], []]
        unseen_values = None
        for s in range(SAMPLES + 1):
            resolved, _ = resolve(key, shift_amount + s)
            adjacency, root = literal_tree(resolved)
            core, deleted = rooted_polys(adjacency, root)
            pair = (delta0(core, deleted), delta1(core, deleted))
            if s < SAMPLES:
                values[0].append(pair[0])
                values[1].append(pair[1])
            else:
                unseen_values = pair
        coefficients = tuple(finite_differences(row) for row in values)
        for rank in (0, 1):
            row = coefficients[rank]
            assert row[0] > 0 and row[1] > 0 and min(row[2:]) >= 0
            stats = minima[str(rank)]
            stats["d0"] = row[0] if stats["d0"] is None else min(stats["d0"], row[0])
            stats["d1"] = row[1] if stats["d1"] is None else min(stats["d1"], row[1])
            stats["higher"] = min(row[2:]) if stats["higher"] is None else min(stats["higher"], min(row[2:]))
            reconstructed = sum(value * __import__("math").comb(29, power) for power, value in enumerate(row))
            assert reconstructed == unseen_values[rank]
            unseen_checks += 1
        lines.append(json.dumps([key, baseline, shift_amount, coefficients[0], coefficients[1]], separators=(",", ":")))

    stream = hashlib.sha256(("\n".join(sorted(lines)) + "\n").encode()).hexdigest().upper()
    assert stream == primary["coefficient_stream_sha256"]
    assert minima == {
        rank: {name: primary["minimum_coefficients"][rank][name] for name in ("d0", "d1", "higher")}
        for rank in ("0", "1")
    }
    payload = {
        "schema": "rank8-delta01-e2-bridge-internal-mixed-newton-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA01_E2_BRIDGE_INTERNAL_MIXED_ALL_RAYS_AUDIT",
        "method": "independent oriented-module quotient, bridge-first literal trees rooted at the split vertex, generic one-pass rooted DP, every Newton sample, and unseen S=29",
        "modules_rebuilt": len(modules),
        "rays_rebuilt": len(keys),
        "literal_values_rebuilt": 2 * len(keys) * SAMPLES,
        "unseen_literal_checks": unseen_checks,
        "minimum_coefficients": minima,
        "coefficient_stream_sha256": stream,
        "primary_source_sha256": sha256(PRIMARY_SOURCE),
        "primary_report_sha256": sha256(PRIMARY_REPORT),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Independent audit of bridge-internal mixed e=2 only.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("RAYS", len(keys), "VALUES", payload["literal_values_rebuilt"], "UNSEEN", unseen_checks)
    print("STREAM", stream)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
