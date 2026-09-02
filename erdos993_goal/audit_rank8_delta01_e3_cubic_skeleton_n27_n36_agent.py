#!/usr/bin/env python3
"""Independent structural and witness audit of the cubic e=3 finite census."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

from audit_rank8_delta01_e3_quartic_stars_n27_n36_agent import (
    deltas,
    forest_polynomial,
)


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json"
OUTPUT = ROOT / "rank8_delta01_e3_cubic_skeleton_n27_n36_independent_audit_agent_20260822.json"
EXPECTED = {
    "verify_rank8_delta01_e3_cubic_skeleton_order_agent.rs":
        "8C964E7AC0A760702AFED818481B8560EDCAAC865C9A81239FB0750772EBEA12",
    "scan_rank8_delta01_e3_cubic_skeleton_n27_n36_agent.py":
        "5C4895513D3668AD28A1B0127656229F0588961011E503C3E0C3D2277C3FAB71",
    PRIMARY.name:
        "81DF2C8EA2B8BD8EEED04F1C4C25A8101174B67DA44D255D2C6F9DB5632527D8",
    "audit_rank8_delta01_e3_quartic_stars_n27_n36_agent.py":
        "94A14B56E224EEF5136B3756AD0C4652F0FECC1A68BB46E932FB3B949F56C201",
    "rank7_rooted_cross_b2_2_3_exact_20260816.json":
        "E8620BCEC42815ED305459A65CF8B4E6559D4332B2539F662B875C2898283946",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def compositions(total: int, parts: int, minimum: int = 1):
    shifted = total - minimum * parts
    for cuts in itertools.combinations(range(shifted + parts - 1), parts - 1):
        previous = -1
        values = []
        for cut in (*cuts, shifted + parts - 1):
            values.append(cut - previous - 1 + minimum)
            previous = cut
        yield tuple(values)


def canonical(lengths: tuple[int, ...]) -> bool:
    u, v, a1, a2, _, b1, b2 = lengths
    return a1 <= a2 and b1 <= b2 and (a1, a2, u) <= (b1, b2, v)


def subdivision(lengths: tuple[int, ...]):
    edges = ((0, 1), (1, 2), (0, 3), (0, 4), (1, 5), (2, 6), (2, 7))
    order = 1 + sum(lengths)
    adjacency = [[] for _ in range(order)]
    next_vertex = 8
    for (left, right), length in zip(edges, lengths):
        previous = left
        for _ in range(1, length):
            vertex = next_vertex
            next_vertex += 1
            adjacency[previous].append(vertex)
            adjacency[vertex].append(previous)
            previous = vertex
        adjacency[previous].append(right)
        adjacency[right].append(previous)
    assert next_vertex == order
    return adjacency


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY.read_text(encoding="utf-8"))
    rank7 = json.loads((ROOT / "rank7_rooted_cross_b2_2_3_exact_20260816.json").read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_SKELETON_ALL_ROOTS_N27_N36"
    assert rank7["status"] == "PASS_EXACT_RANK7_ROOTED_CROSS_ALL_TREES_B2_2_OR_3_N23_THROUGH_N38"
    rank7_by_order = {row["order"]: row for row in rank7["orders"]}
    enumeration_counts = {}
    witness_rows = []
    for row in primary["orders"]:
        order = row["order"]
        count = sum(
            1 for lengths in compositions(order - 1, 7) if canonical(lengths)
        )
        assert count == row["trees"]
        assert count == rank7_by_order[order]["B2_3"]["degree3_chain_skeletons"]
        assert row["roots"] == order * count
        enumeration_counts[str(order)] = count
        for rank in (0, 1):
            witness = row[f"witness{rank}"]
            lengths = tuple(witness["lengths"])
            assert sum(lengths) + 1 == order and canonical(lengths)
            adjacency = subdivision(lengths)
            core = forest_polynomial(adjacency)
            deletion = forest_polynomial(adjacency, witness["root"])
            values = deltas(core, deletion)
            assert core == witness["core"]
            assert deletion == witness["deleted"]
            assert str(values[rank]) == row[f"minimum{rank}"]
            assert values[rank] > 0
            witness_rows.append({
                "order": order,
                "rank": rank,
                "lengths": list(lengths),
                "root": witness["root"],
                "value": values[rank],
            })
        print("AUDIT_ORDER", order, count, flush=True)

    assert sum(enumeration_counts.values()) == primary["totals"]["canonical_cores"] == 953954
    assert sum(order * count for order, count in map(lambda item: (int(item[0]), item[1]), enumeration_counts.items())) == primary["totals"]["rooted_rows"] == 31601571
    payload = {
        "schema": "rank8-delta01-e3-cubic-skeleton-n27-n36-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_SKELETON_N27_N36_AUDIT",
        "methods": [
            "independent seven-part composition enumeration with the exact automorphism quotient",
            "cross-check of every per-order skeleton count against the prior rank-seven census",
            "independent Python tree DP and separately transcribed Delta formulas for all 20 minimum witnesses",
        ],
        "enumeration_counts": enumeration_counts,
        "totals": primary["totals"],
        "witness_replays": witness_rows,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This audits the finite n=27..36 theorem only; no all-order claim is made.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
