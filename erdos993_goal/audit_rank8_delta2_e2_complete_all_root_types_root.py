#!/usr/bin/env python3
"""Independent root-partition/provenance audit of the complete e=2 Delta2 package."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLER = "assemble_rank8_delta2_e2_complete_root.py"
ASSEMBLY = "rank8_delta2_e2_complete_all_root_types_exact_root_20260823.json"
BRANCH = "rank8_delta2_e2_branch_all_order_independent_audit_exact_20260820.json"
PENDANT = "rank8_delta2_e2_pendant_complete_exact_root_20260823.json"
BRIDGE = "rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_independent_audit_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta2_e2_complete_all_root_types_independent_audit_root_20260823.json"
EXPECTED = {
    "audit_rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_root.py":
        "DAF8DF5EFDF4C7C44ADD33831536864D15B769E08C2CCFE369674951EF42050F",
    "audit_rank8_delta2_e2_pendant_bridges1to7_all_nonlonglong_far_pairs_root.py":
        "B62A056C40264B6DC3CBF5216AB4BAF3A2A104C39AF99FE10BC4D715E5FAB867",
    "assemble_rank8_delta2_e2_pendant_complete_root.py":
        "161D68DA0C9E8F405DEB9696B3F4E989759B150197140F9D726B1220EF8C9936",
    ASSEMBLER: "E0FE3053DD6D82AADD617633DDB1C7C00090E3AF385DD0D3A594CAE240D4C8A2",
    ASSEMBLY: "5A8EC18A63D26F44A1706EF013ACC4A10CEB7BDE999D6D856FA89FDB155E27BF",
    BRANCH: "5A82B58361B66DF210BC3BF5341632D022003CD4E5A320A230490DAC8D579708",
    PENDANT: "39F5D12CBDD557EAF25817119AB9DD69E8CABDF34EFABDC62B9DE3F6D4DF2336",
    BRIDGE: "A2F43E5CFBAF5594DE62FE252FAE1F1A28F198181355077D741DE40B848A1BFE",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def attach(adjacency, start, length):
    previous = start
    created = []
    for _ in range(length):
        vertex = len(adjacency)
        adjacency.append([])
        adjacency[previous].append(vertex)
        adjacency[vertex].append(previous)
        created.append(vertex)
        previous = vertex
    return previous, created


def partition_literal(lengths):
    left_a, left_b, bridge_length, right_a, right_b = lengths
    adjacency = [[]]
    left = 0
    right, bridge_vertices = attach(adjacency, left, bridge_length)
    pendant = set()
    for start, length in ((left, left_a), (left, left_b), (right, right_a), (right, right_b)):
        _, created = attach(adjacency, start, length)
        pendant.update(created)
    branch = {left, right}
    bridge = set(bridge_vertices[:-1])
    assert branch.isdisjoint(pendant) and branch.isdisjoint(bridge) and pendant.isdisjoint(bridge)
    assert branch | pendant | bridge == set(range(len(adjacency)))
    assert len(branch) == 2
    assert len(pendant) == left_a + left_b + right_a + right_b
    assert len(bridge) == bridge_length - 1
    assert sorted(map(len, adjacency)).count(3) == 2
    return len(adjacency), len(branch), len(pendant), len(bridge)


def verify_provenance_graph(seed_names):
    """Rehash every reachable pinned file, including sweep child reports."""
    verified = set()

    def visit(name, expected=None):
        path_value = ROOT / name
        assert path_value.exists(), name
        actual_hash = sha256(path_value)
        if expected is not None:
            assert actual_hash == expected, name
        identity = (name, actual_hash)
        if identity in verified:
            return
        verified.add(identity)
        if path_value.suffix.lower() != ".json":
            return
        report = json.loads(path_value.read_text(encoding="utf-8"))
        for field in ("immutable_input_hashes", "immutable_inputs"):
            for child, child_hash in report.get(field, {}).items():
                visit(child, child_hash)
        for row in report.get("rows", []):
            child = row.get("report")
            child_hash = row.get("report_sha256")
            if child is not None and child_hash is not None:
                visit(child, child_hash)

    for seed in seed_names:
        visit(seed, EXPECTED[seed])
    return len(verified)


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    reports = {name: json.loads((ROOT / name).read_text(encoding="utf-8")) for name in (ASSEMBLY, BRANCH, PENDANT, BRIDGE)}
    assert reports[ASSEMBLY]["status"] == "PASS_EXACT_RANK8_DELTA2_E2_COMPLETE_ALL_ROOT_TYPES_N23_PLUS"
    assert reports[BRANCH]["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_BRANCH_ALL_ORDER"
    assert reports[PENDANT]["status"] == "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_COMPLETE_ALL_ORDERS_N23_PLUS"
    assert reports[BRIDGE]["status"] == "PASS_INDEPENDENT_LITERAL_NO_GAP_AUDIT_RANK8_DELTA2_E2_BRIDGE_ALL_ARM_PAIRS_ALL_ROOT_POSITIONS"
    assert reports[ASSEMBLY]["immutable_input_hashes"] == {
        BRANCH: EXPECTED[BRANCH], PENDANT: EXPECTED[PENDANT], BRIDGE: EXPECTED[BRIDGE]
    }

    embedded_files_rehashed = verify_provenance_graph((BRANCH, PENDANT, BRIDGE))
    rows = [partition_literal(lengths) for lengths in itertools.product(range(1, 5), repeat=5)]
    assert len(rows) == 1024

    payload = {
        "schema": "rank8-delta2-e2-complete-all-root-types-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA2_E2_COMPLETE_ALL_ROOT_TYPES_N23_PLUS_AUDIT",
        "audit_claim": "The audit independently rehashed the complete branch/pendant/bridge packages and their embedded immutable inputs, then rebuilt double claws and verified that the three root classes are pairwise disjoint and exhaustive.",
        "literal_partition_examples": len(rows),
        "literal_length_range_per_edge": "1..4",
        "embedded_files_rehashed": embedded_files_rehashed,
        "general_partition_identity": "two branch vertices, all vertices of four pendant paths, and all internal vertices of the branch-to-branch path form a disjoint exhaustive partition for arbitrary positive subdivision lengths",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Audit credits only e=2 Delta2 for n>=23.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("PARTITION_EXAMPLES", len(rows), "EMBEDDED_FILES", embedded_files_rehashed)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
