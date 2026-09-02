#!/usr/bin/env python3
"""Independent enumeration and literal-minimum audit of e=4 at n=27."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from collections import Counter
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRIMARY = HERE / "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json"
EXPECTED = {
    "verify_rank8_delta03_e4_skeletons_order27_i256_agent.rs": "5C80FB8E23AF04BFFC7F4B6BCDAACC1A6A2F8071E7E7A65C56262B058149D1CB",
    "verify_rank8_delta03_e4_skeletons_order27_i256_agent.exe": "B4CD42C7F15D8B115FB50D0891A35CB5891E47BFC485BA283B4CB010E7F1F239",
    "rank8_delta01_e3_cubic_exact_i256_core_agent.rs": "B9A7398612EC8A77378CEB6CFE42FA461E45AB34381F978621608417677763E0",
    "run_rank8_delta03_e4_skeletons_order27_i256_agent.py": "E2A97F37BD94268DA198FD39458058D76AC3AF62B5995D10D6B8B8174881F512",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
}
MAX_RANK = 8
ORDER = 27


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


SKELETONS = {
    "four_cubic_star": {
        "nodes": 10,
        "edges": ((0, 1), (1, 4), (1, 5), (0, 2), (2, 6), (2, 7), (0, 3), (3, 8), (3, 9)),
        "node_orbits": (0, 1, 1, 1, 2, 2, 2, 2, 2, 2),
        "edge_orbits": (3, 4, 4, 3, 4, 4, 3, 4, 4),
        "orbit_names": ("center_branch", "outer_branch", "leaf", "center_outer_spine_internal", "pendant_internal"),
    },
    "four_cubic_path": {
        "nodes": 10,
        "edges": ((0, 1), (1, 2), (2, 3), (0, 4), (0, 5), (1, 6), (2, 7), (3, 8), (3, 9)),
        "node_orbits": (0, 1, 1, 0, 2, 2, 3, 3, 2, 2),
        "edge_orbits": (4, 5, 4, 6, 6, 7, 7, 6, 6),
        "orbit_names": ("outer_branch", "inner_branch", "outer_leaf", "inner_leaf", "outer_spine_internal", "middle_spine_internal", "outer_pendant_internal", "inner_pendant_internal"),
    },
    "quartic_cubic_bistar": {
        "nodes": 7,
        "edges": ((0, 1), (0, 2), (0, 3), (0, 4), (1, 5), (1, 6)),
        "node_orbits": (0, 1, 2, 2, 2, 3, 3),
        "edge_orbits": (4, 5, 5, 5, 6, 6),
        "orbit_names": ("quartic_branch", "cubic_branch", "quartic_leaf", "cubic_leaf", "central_spine_internal", "quartic_pendant_internal", "cubic_pendant_internal"),
    },
}


def compositions(total: int, parts: int):
    for cuts in itertools.combinations(range(1, total), parts - 1):
        points = (0, *cuts, total)
        yield tuple(points[i + 1] - points[i] for i in range(parts))


def canonical(name: str, row: tuple[int, ...]) -> bool:
    if name == "four_cubic_star":
        if row[1] > row[2] or row[4] > row[5] or row[7] > row[8]:
            return False
        return (row[1], row[2], row[0]) <= (row[4], row[5], row[3]) <= (row[7], row[8], row[6])
    if name == "four_cubic_path":
        if row[3] > row[4] or row[7] > row[8]:
            return False
        forward = (row[3], row[4], row[0], row[5], row[1], row[6], row[2], row[7], row[8])
        reverse = (row[7], row[8], row[2], row[6], row[1], row[5], row[0], row[3], row[4])
        return forward <= reverse
    return row[1] <= row[2] <= row[3] and row[4] <= row[5]


def subdivision(config, lengths):
    order = config["nodes"] + sum(lengths) - len(lengths)
    assert order == ORDER
    adjacency = [[] for _ in range(order)]
    root_orbits = list(config["node_orbits"])
    next_vertex = config["nodes"]
    for index, ((left, right), length) in enumerate(zip(config["edges"], lengths, strict=True)):
        previous = left
        for _ in range(1, length):
            vertex = next_vertex
            next_vertex += 1
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            root_orbits.append(config["edge_orbits"][index])
            previous = vertex
        adjacency[previous].append(right)
        adjacency[right].append(previous)
    assert next_vertex == order and len(root_orbits) == order
    return adjacency, root_orbits


def multiply(left, right):
    out = [0] * (MAX_RANK + 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right[: MAX_RANK + 1 - i]):
            out[i + j] += a * b
    return out


def forest_polynomial(adjacency, removed=None):
    seen = {removed} if removed is not None else set()
    def visit(vertex, parent):
        seen.add(vertex)
        absent = [1] + [0] * MAX_RANK
        present = [1] + [0] * MAX_RANK
        for neighbor in adjacency[vertex]:
            if neighbor == parent or neighbor == removed:
                continue
            child0, child1 = visit(neighbor, vertex)
            absent = multiply(absent, [a + b for a, b in zip(child0, child1)])
            present = multiply(present, child0)
        return absent, [0] + present[:MAX_RANK]
    out = [1] + [0] * MAX_RANK
    for vertex in range(len(adjacency)):
        if vertex in seen:
            continue
        absent, present = visit(vertex, -1)
        out = multiply(out, [a + b for a, b in zip(absent, present)])
    return out


def residual(core, deleted, siblings):
    p7 = sum(math.comb(siblings, i) * core[7 - i] for i in range(8)) + deleted[6]
    p8 = sum(math.comb(siblings, i) * core[8 - i] for i in range(9)) + deleted[7]
    p9_open = sum(math.comb(siblings, i) * core[9 - i] for i in range(1, 10))
    q8 = 16 * p8 * p8 - p7 * p8 - 18 * p7 * p9_open
    core_q = 16 * core[8] * core[8] - core[7] * core[8]
    deleted_q = 14 * deleted[7] * deleted[7] - deleted[6] * deleted[7]
    return 8 * core[7] * deleted[6] * q8 - 8 * deleted[6] * p7 * core_q - 9 * core[7] * p7 * deleted_q


def deltas(core, deleted):
    rows = [residual(core, deleted, siblings) for siblings in range(1, 5)]
    return rows[0], rows[1] - rows[0], rows[2] - 2 * rows[1] + rows[0], rows[3] - 3 * rows[2] + 3 * rows[1] - rows[0]


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E4_SKELETONS_ALL_ROOTS_ORDER27"
    primary_skeletons = {row["skeleton"]: row for row in primary["skeletons"]}

    enumeration = {}
    witness_replays = []
    for name, config in SKELETONS.items():
        core_count = 0
        orbit_counts = Counter()
        for lengths in compositions(ORDER - 1, len(config["edges"])):
            if not canonical(name, lengths):
                continue
            core_count += 1
            orbit_counts.update(config["node_orbits"])
            for edge_index, length in enumerate(lengths):
                orbit_counts[config["edge_orbits"][edge_index]] += length - 1
        report = primary_skeletons[name]
        assert core_count == report["canonical_subdivisions"]
        assert sum(orbit_counts.values()) == report["literal_root_checks"] == core_count * ORDER
        report_orbits = {row["root_orbit"].split(":", 1)[1]: row for row in report["root_orbits"]}
        for index, orbit_name in enumerate(config["orbit_names"]):
            row = report_orbits[orbit_name]
            assert orbit_counts[index] == row["literal_root_checks"]
            assert row["nonpositive"] == [0, 0, 0, 0]
            for rank in range(4):
                witness = row["minima"][str(rank)]
                lengths = tuple(witness["lengths"])
                assert sum(lengths) == ORDER - 1 and canonical(name, lengths)
                adjacency, root_orbits = subdivision(config, lengths)
                root = witness["root"]
                assert root_orbits[root] == index
                core = forest_polynomial(adjacency)
                deleted = forest_polynomial(adjacency, root)
                values = deltas(core, deleted)
                assert core == witness["core"] and deleted == witness["deleted"]
                assert values[rank] == int(witness["value"]) > 0
                witness_replays.append({
                    "skeleton": name, "root_orbit": orbit_name, "rank": rank,
                    "lengths": list(lengths), "root": root, "value": values[rank],
                })
        enumeration[name] = {"canonical_subdivisions": core_count, "literal_root_checks": sum(orbit_counts.values()), "root_orbit_checks": {config["orbit_names"][i]: orbit_counts[i] for i in range(len(config["orbit_names"]))}}
        print("AUDIT", name, core_count, sum(orbit_counts.values()), flush=True)

    assert sum(row["canonical_subdivisions"] for row in enumeration.values()) == primary["canonical_subdivisions"] == 234696
    assert sum(row["literal_root_checks"] for row in enumeration.values()) == primary["literal_root_checks"] == 6336792
    assert len(witness_replays) == 80
    payload = {
        "schema": "rank8-delta03-e4-skeletons-order27-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E4_SKELETONS_ALL_ROOTS_ORDER27_AUDIT",
        "methods": [
            "independent positive-composition enumeration with three separately transcribed automorphism quotients",
            "independent per-root-orbit literal count reconstruction",
            "independent Python forest DP and arbitrary-integer residual replay of all 80 exact minima",
        ],
        "enumeration": enumeration,
        "totals": {"canonical_subdivisions": 234696, "literal_root_checks": 6336792, "minimum_replays": 80},
        "minimum_replays": witness_replays,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Independent audit of finite n=27 e=4 only; no all-order or higher-surplus claim.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
