#!/usr/bin/env python3
"""Independent literal-tree audit of the seven all-long cubic base cells."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from audit_rank8_delta01_e3_quartic_stars_n27_n36_agent import (
    deltas,
    forest_polynomial,
)
from audit_rank8_delta23_e3_cubic_mixed_newton_i256_root import residual


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta03_e3_cubic_all_long_bases_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta03_e3_cubic_all_long_bases_independent_audit_root_20260823.json"
# Filled only after the primary report is sealed.
PRIMARY_EXPECTED_SHA256 = "DA06DECCE08E44B2DF815ABF363909BABDCDC9366086F5AF12BDAE1B9580B4BE"
EXPECTED = {
    "verify_rank8_delta03_e3_cubic_all_long_bases_root.py":
        "EAFCBE8902D5ACE8A13999F71172FE4FB26348B0E35CEBE81691DCD82CC7FD72",
    "audit_rank8_delta01_e3_quartic_stars_n27_n36_agent.py":
        "94A14B56E224EEF5136B3756AD0C4652F0FECC1A68BB46E932FB3B949F56C201",
    "audit_rank8_delta23_e3_cubic_mixed_newton_i256_root.py":
        "702244F51CBD3CEB500B4C935C06D10B8AA1AD5E0EC3BBF1EFB51015C8966B3E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def subdivision_with_keys(lengths: tuple[int, ...]):
    edges = ((0, 1), (1, 2), (0, 3), (0, 4), (1, 5), (2, 6), (2, 7))
    adjacency = [[] for _ in range(1 + sum(lengths))]
    keys = [("branch", vertex) for vertex in range(8)]
    next_vertex = 8
    for edge_index, ((left, right), length) in enumerate(zip(edges, lengths, strict=True)):
        previous = left
        for step in range(1, length):
            vertex = next_vertex
            next_vertex += 1
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
            keys.append(("edge", edge_index, step))
        adjacency[previous].append(right)
        adjacency[right].append(previous)
    assert next_vertex == len(adjacency) == len(keys)
    return adjacency, keys


def literal_values(lengths: tuple[int, ...], root_key: tuple) -> tuple[int, ...]:
    adjacency, keys = subdivision_with_keys(lengths)
    root = keys.index(root_key)
    core = forest_polynomial(adjacency)
    deleted = forest_polynomial(adjacency, root)
    d0, d1 = deltas(core, deleted)
    r1 = residual(core, deleted, 1)
    r2 = residual(core, deleted, 2)
    r3 = residual(core, deleted, 3)
    r4 = residual(core, deleted, 4)
    return d0, d1, r3 - 2 * r2 + r1, r4 - 3 * r3 + 3 * r2 - r1


def profiles():
    # Skeleton edge order is u,v,a1,a2,m,b1,b2.
    return {
        "outer_branch": ((10, 10, 8, 8, 8, 8, 8), ("branch", 0)),
        "middle_branch": ((10, 10, 8, 8, 8, 8, 8), ("branch", 1)),
        "outer_leaf": ((10, 10, 9, 8, 8, 8, 8), ("branch", 3)),
        "middle_leaf": ((10, 10, 8, 8, 9, 8, 8), ("branch", 5)),
        "outer_pendant_internal": ((10, 10, 16, 8, 8, 8, 8), ("edge", 2, 9)),
        "middle_pendant_internal": ((10, 10, 8, 8, 16, 8, 8), ("edge", 4, 9)),
        "spine_internal": ((18, 10, 8, 8, 8, 8, 8), ("edge", 0, 9)),
    }


def main() -> None:
    expected = dict(EXPECTED)
    expected[PRIMARY.name] = PRIMARY_EXPECTED_SHA256
    actual = {name: sha256(ROOT / name) for name in expected}
    assert actual == expected
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E3_CUBIC_ALL_LONG_BASES"
    by_label = {row["root_location_orbit"]: row for row in primary["base_cells"]}
    assert set(by_label) == set(profiles())

    replays = []
    for label, (lengths, root_key) in profiles().items():
        values = literal_values(lengths, root_key)
        expected_values = tuple(int(by_label[label][f"Delta{rank}"]) for rank in range(4))
        assert values == expected_values
        assert all(value > 0 for value in values)
        assert 1 + sum(lengths) == by_label[label]["base_order"]
        replays.append({
            "root_location_orbit": label,
            "literal_lengths_u_v_a1_a2_m_b1_b2": list(lengths),
            "literal_root_key": list(root_key),
            "Delta0": str(values[0]),
            "Delta1": str(values[1]),
            "Delta2": str(values[2]),
            "Delta3": str(values[3]),
        })
        print("PASS", label, flush=True)

    payload = {
        "schema": "rank8-delta03-e3-cubic-all-long-bases-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E3_CUBIC_ALL_LONG_BASE_AUDIT",
        "method": (
            "Construct each literal subdivided tree, compute its independence polynomial "
            "and the root-deleted polynomial by a separate integer tree DP, and replay all "
            "four residual finite differences."
        ),
        "literal_replays": replays,
        "coverage": {
            "root_location_orbits": len(replays),
            "ranks_per_orbit": 4,
            "exact_matches": 4 * len(replays),
            "negative_or_zero_values": 0,
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This independently audits only the seven all-long base cells. Other cubic, "
            "connected, and forest obligations remain separate."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
