#!/usr/bin/env python3
"""Independent literal-tree replay of all mixed branch-root e=2 rays."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23_independent import delta0, delta1


HERE = Path(__file__).resolve().parent
PRIMARY_SOURCE = HERE / "scan_rank8_delta01_e2_branch_mixed_newton_agent.py"
PRIMARY_REPORT = HERE / "rank8_delta01_e2_branch_mixed_newton_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta01_e2_branch_mixed_newton_independent_audit_agent_20260823.json"
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


def shift(row):
    return (0,) + row[:MAX_RANK]


def build_bridge_first(lengths):
    a, b, bridge, c, d = lengths
    adjacency = [[]]
    previous = 0
    for _ in range(bridge):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
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
    # Begin with fully oriented arms, then quotient independently by sorting
    # only within each arm pair. Root and far sides remain ordered.
    arm_states = (*range(1, 7), "L")
    bridge_states = (*range(1, 8), "L")
    keys = set()
    for a, b, c, d, bridge in itertools.product(arm_states, arm_states, arm_states, arm_states, bridge_states):
        order_index = {value: i for i, value in enumerate(arm_states)}
        left = tuple(sorted((a, b), key=order_index.get))
        right = tuple(sorted((c, d), key=order_index.get))
        flat = (*left, *right, bridge)
        flags = tuple(value == "L" for value in flat)
        if any(flags) and not all(flags):
            keys.add((left, right, bridge))
    return keys


def lengths_for(key, extra):
    left, right, bridge = key
    flat = (*left, *right, bridge)
    flags = [value == "L" for value in flat]
    values = [7 if i < 4 and value == "L" else 8 if i == 4 and value == "L" else value for i, value in enumerate(flat)]
    values[flags.index(True)] += extra
    return values[0], values[1], values[4], values[2], values[3]


def finite_differences(values):
    first = []
    row = list(values)
    while row:
        first.append(row[0])
        row = [b - a for a, b in zip(row, row[1:])]
    return tuple(first)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA01_E2_BRANCH_MIXED_ALL_RAYS"
    keys = raw_quotient_keys()
    assert len(keys) == primary["rays"] == 3184

    lines = []
    minima = {"0": {"d0": None, "d1": None, "higher": None}, "1": {"d0": None, "d1": None, "higher": None}}
    unseen_checks = 0
    for key in keys:
        left, right, bridge = key
        flat = (*left, *right, bridge)
        baseline = 1 + sum(7 if i < 4 and value == "L" else 8 if i == 4 and value == "L" else value for i, value in enumerate(flat))
        shift_amount = max(0, 31 - baseline)
        values = [[], []]
        for s in range(SAMPLES):
            lengths = lengths_for(key, shift_amount + s)
            core, deleted = rooted_polys(build_bridge_first(lengths))
            values[0].append(delta0(core, deleted))
            values[1].append(delta1(core, deleted))
        coefficients = tuple(finite_differences(row) for row in values)
        for rank in (0, 1):
            row = coefficients[rank]
            assert row[0] > 0 and row[1] > 0 and min(row[2:]) >= 0
            minima[str(rank)]["d0"] = row[0] if minima[str(rank)]["d0"] is None else min(minima[str(rank)]["d0"], row[0])
            minima[str(rank)]["d1"] = row[1] if minima[str(rank)]["d1"] is None else min(minima[str(rank)]["d1"], row[1])
            minima[str(rank)]["higher"] = min(row[2:]) if minima[str(rank)]["higher"] is None else min(minima[str(rank)]["higher"], min(row[2:]))
            # Direct unseen point S=29, reconstructed from degree<=28 Newton coefficients.
            unseen = sum(value * __import__("math").comb(29, power) for power, value in enumerate(row))
            lengths = lengths_for(key, shift_amount + 29)
            core, deleted = rooted_polys(build_bridge_first(lengths))
            literal = (delta0(core, deleted), delta1(core, deleted))[rank]
            assert unseen == literal
            unseen_checks += 1
        lines.append(json.dumps([key, baseline, shift_amount, coefficients[0], coefficients[1]], separators=(",", ":")))

    stream = hashlib.sha256(("\n".join(sorted(lines)) + "\n").encode()).hexdigest().upper()
    assert stream == primary["coefficient_stream_sha256"]
    assert {
        rank: {name: primary["minimum_coefficients"][rank][name] for name in ("d0", "d1", "higher")}
        for rank in ("0", "1")
    } == minima

    payload = {
        "schema": "rank8-delta01-e2-branch-mixed-newton-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA01_E2_BRANCH_MIXED_ALL_RAYS_AUDIT",
        "method": "independent raw-orientation quotient, bridge-first literal trees, one-pass rooted forest DP, all 29 samples on every ray, and direct unseen S=29 checks",
        "rays_rebuilt": len(keys),
        "literal_values_rebuilt": 2 * len(keys) * SAMPLES,
        "unseen_literal_checks": unseen_checks,
        "minimum_coefficients": minima,
        "coefficient_stream_sha256": stream,
        "primary_source_sha256": sha256(PRIMARY_SOURCE),
        "primary_report_sha256": sha256(PRIMARY_REPORT),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Independent audit of branch-root mixed e=2 only.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("RAYS", len(keys), "VALUES", payload["literal_values_rebuilt"], "UNSEEN", unseen_checks)
    print("STREAM", stream)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
