#!/usr/bin/env python3
"""Independent raw-orientation audit of the rooted e=2 quotient partition."""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRIMARY_SOURCE = HERE / "assemble_rank8_delta01_e2_root_segment_partition_agent.py"
PRIMARY_REPORT = HERE / "rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def classify(row, long_markers):
    flags = [value in long_markers for value in row]
    return "all_long" if all(flags) else "mixed" if any(flags) else "all_short"


def main() -> None:
    primary = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA01_E2_ROOT_SEGMENT_NO_GAP_PARTITION"

    # Independent encodings: ordinary arms 1..6 plus 70, direct bridge 1..7
    # plus 80, and split gaps 0..6 plus 70.  Start from fully oriented raw
    # tuples and quotient only by literal rooted-graph automorphisms.
    arms = (*range(1, 7), 70)
    bridges = (*range(1, 8), 80)
    gaps = (*range(0, 7), 70)

    branch = set()
    for a, b, c, d, g in itertools.product(arms, arms, arms, arms, bridges):
        branch.add((tuple(sorted((a, b))), tuple(sorted((c, d))), g))

    pendant = set()
    for near, tail, sibling, c, d, g in itertools.product(gaps, gaps, arms, arms, arms, bridges):
        pendant.add((near, tail, sibling, tuple(sorted((c, d))), g))

    bridge_internal = set()
    for x, a, b, y, c, d in itertools.product(gaps, arms, arms, gaps, arms, arms):
        first = (x, tuple(sorted((a, b))))
        second = (y, tuple(sorted((c, d))))
        bridge_internal.add(tuple(sorted((first, second))))

    universes = {
        "branch": branch,
        "pendant": pendant,
        "bridge_internal": bridge_internal,
    }
    expected_totals = {"branch": 6272, "pendant": 100352, "bridge_internal": 25200}
    assert {name: len(rows) for name, rows in universes.items()} == expected_totals

    sector_counts = {}
    short_order_distributions = {}
    target_counts = {}
    for name, rows in universes.items():
        sectors = Counter()
        orders = Counter()
        for row in rows:
            if name == "branch":
                flat = (*row[0], *row[1], row[2])
                long = {70, 80}
                order = 1 + sum(7 if x == 70 else 8 if x == 80 else x for x in flat)
            elif name == "pendant":
                flat = (row[0], row[1], row[2], *row[3], row[4])
                long = {70, 80}
                order = 2 + sum(7 if x == 70 else 8 if x == 80 else x for x in flat)
            else:
                flat = (row[0][0], *row[0][1], row[1][0], *row[1][1])
                long = {70}
                order = 3 + sum(7 if x == 70 else x for x in flat)
            label = classify(flat, long)
            sectors[label] += 1
            if label == "all_short":
                orders[order] += 1
        sector_counts[name] = dict(sectors)
        short_order_distributions[name] = {str(k): v for k, v in sorted(orders.items())}
        target_counts[name] = sum(v for k, v in orders.items() if k >= 31)

    assert sector_counts == {name: primary["roots"][name]["sectors"] for name in universes}
    assert short_order_distributions == {
        name: primary["roots"][name]["all_short_order_distribution"] for name in universes
    }
    assert target_counts == {
        name: primary["roots"][name]["all_short_target_n31_plus_points"] for name in universes
    }

    # Reconstruct the ten thin quotient keys without importing primary logic.
    thin_branch = ((1, 1), (1, 1), 80)
    thin_pendant = (0, 0, 1, (1, 1), 80)
    assert thin_branch in branch and thin_pendant in pendant
    thin_bridge = set()
    for short in range(7):
        thin_bridge.add(tuple(sorted(((short, (1, 1)), (70, (1, 1))))))
    thin_bridge.add(((70, (1, 1)), (70, (1, 1))))
    assert thin_bridge <= bridge_internal and len(thin_bridge) == 8

    payload = {
        "schema": "rank8-delta01-e2-root-segment-partition-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA01_E2_ROOT_SEGMENT_NO_GAP_PARTITION_AUDIT",
        "method": "enumerate every oriented root-coordinate state, canonicalize only the literal rooted automorphisms, and independently rederive sector and order counts",
        "raw_orientation_counts": {
            "branch": 7**4 * 8,
            "pendant": 8 * 8 * 7**3 * 8,
            "bridge_internal": 8**2 * 7**4,
        },
        "quotient_counts": expected_totals,
        "sector_counts": sector_counts,
        "all_short_order_distributions": short_order_distributions,
        "all_short_target_n31_plus_counts": target_counts,
        "thin_mixed_keys": {"branch": 1, "pendant": 1, "bridge_internal": 8},
        "primary_source_sha256": sha256(PRIMARY_SOURCE),
        "primary_report_sha256": sha256(PRIMARY_REPORT),
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Count and no-gap audit only; no unresolved Delta sign is inferred.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("QUOTIENT", expected_totals)
    print("SECTORS", sector_counts)
    print("TARGET_SHORT", target_counts)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
