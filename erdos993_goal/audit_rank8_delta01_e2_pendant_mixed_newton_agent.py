#!/usr/bin/env python3
"""Independent literal replay of every pendant-root mixed e=2 ray."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23_independent import delta0, delta1


HERE = Path(__file__).resolve().parent
PRIMARY_SOURCE = HERE / "scan_rank8_delta01_e2_pendant_mixed_newton_agent.py"
PRIMARY_REPORT = HERE / "rank8_delta01_e2_pendant_mixed_newton_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta01_e2_pendant_mixed_newton_independent_audit_agent_20260823.json"
MAX_RANK = 8
SAMPLES = 29
EXPECTED = {
    "audit_rank8_delta013_e2_double_claws_n23_independent.py":
        "B28D1264C8A80F711F68E5DDDC88CDAACEF8FE1C9D1AD812882F3E6782BFF6D8",
    "rank8_delta01_e2_mixed_newton_reduction_exact_agent_20260823.json":
        "70A4A2425768F77376086B1F0E96925FF08CDB555E7D25653DD2BA904081C690",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json":
        "AD5AE4EEF6DEB576DD2B0EC46CAFA9EF8BC6AC2D4F08231C4837CFBC7991EC61",
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
    near, tail, sibling, c, d, bridge = values
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
    for start, length, capture in ((0, selected, True), (0, sibling, False), (right, c, False), (right, d, False)):
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
            child0, child1 = visit(neighbor, vertex)
            absent = multiply(absent, add(child0, child1))
            present = multiply(present, child0)
        return absent, shifted(present)
    deleted, present = visit(root, -1)
    return add(deleted, present), deleted


def keys():
    # Independent literal state enumeration.  The only nontrivial rooted
    # automorphism is exchange of the two far pendant arms.
    gaps = (*range(0, 7), "L")
    arms = (*range(1, 7), "L")
    bridges = (*range(1, 8), "L")
    far_pairs = tuple(itertools.combinations_with_replacement(arms, 2))
    for near, tail, sibling, far, bridge in itertools.product(gaps, gaps, arms, far_pairs, bridges):
        flat = (near, tail, sibling, *far, bridge)
        flags = tuple(value == "L" for value in flat)
        if any(flags) and not all(flags):
            yield (near, tail, sibling, far, bridge), flat, flags


def resolve(flat, flags, extra):
    values = [8 if i == 5 and value == "L" else 7 if value == "L" else value for i, value in enumerate(flat)]
    values[flags.index(True)] += extra
    return tuple(values)


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
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA01_E2_PENDANT_MIXED_ALL_RAYS"

    stream = hashlib.sha256()
    count = 0
    unseen_checks = 0
    minima = {"0": {"d0": None, "d1": None, "higher": None}, "1": {"d0": None, "d1": None, "higher": None}}
    for key, flat, flags in keys():
        baseline = 2 + sum(8 if i == 5 and value == "L" else 7 if value == "L" else value for i, value in enumerate(flat))
        shift_amount = max(0, 31 - baseline)
        values = [[], []]
        unseen = None
        for s in range(SAMPLES + 1):
            resolved = resolve(flat, flags, shift_amount + s)
            adjacency, root = literal_tree(resolved)
            core, deleted = rooted_polys(adjacency, root)
            pair = (delta0(core, deleted), delta1(core, deleted))
            if s < SAMPLES:
                values[0].append(pair[0])
                values[1].append(pair[1])
            else:
                unseen = pair
        coefficients = tuple(finite_differences(row) for row in values)
        for rank in (0, 1):
            row = coefficients[rank]
            assert row[0] > 0 and row[1] > 0 and min(row[2:]) >= 0
            stats = minima[str(rank)]
            stats["d0"] = row[0] if stats["d0"] is None else min(stats["d0"], row[0])
            stats["d1"] = row[1] if stats["d1"] is None else min(stats["d1"], row[1])
            stats["higher"] = min(row[2:]) if stats["higher"] is None else min(stats["higher"], min(row[2:]))
            reconstructed = sum(value * math.comb(29, power) for power, value in enumerate(row))
            assert reconstructed == unseen[rank]
            unseen_checks += 1
        line = json.dumps([key, baseline, shift_amount, coefficients[0], coefficients[1]], separators=(",", ":")) + "\n"
        stream.update(line.encode())
        count += 1
        if count % 5000 == 0:
            print("AUDIT_PROGRESS", count, flush=True)

    stream_hex = stream.hexdigest().upper()
    assert count == primary["rays"] == 57133
    assert stream_hex == primary["coefficient_stream_sha256"]
    assert minima == {
        rank: {name: primary["minimum_coefficients"][rank][name] for name in ("d0", "d1", "higher")}
        for rank in ("0", "1")
    }
    payload = {
        "schema": "rank8-delta01-e2-pendant-mixed-newton-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA01_E2_PENDANT_MIXED_ALL_RAYS_AUDIT",
        "method": "independent rooted-coordinate enumeration, bridge-first literal tree construction, generic root-centered forest DP, all 29 samples on every ray, and direct unseen S=29",
        "rays_rebuilt": count,
        "literal_values_rebuilt": 2 * count * SAMPLES,
        "unseen_literal_checks": unseen_checks,
        "minimum_coefficients": minima,
        "coefficient_stream_sha256": stream_hex,
        "primary_source_sha256": sha256(PRIMARY_SOURCE),
        "primary_report_sha256": sha256(PRIMARY_REPORT),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Independent audit of pendant mixed e=2 only; e>=4 is not touched.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("RAYS", count, "VALUES", payload["literal_values_rebuilt"], "UNSEEN", unseen_checks)
    print("STREAM", stream_hex)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
