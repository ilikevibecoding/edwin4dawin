#!/usr/bin/env python3
"""Exact no-gap rooted-coordinate partition for e=2 double claws.

This is a scope/count theorem.  It hash-pins the sealed e=2 endpoints but does
not infer signs for any mixed or finite boundary cell not explicitly covered
by those endpoints.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json"
TARGET_ORDER = 31

SEALED = {
    "rank8_delta013_e2_all_long_exact_20260820.json":
        "753DF4C499A78021C50E32C700B93FBCB16877003EF8265F4106D63C45AB5701",
    "rank8_delta013_e2_thin_bridge_extension_all_order_exact_20260820.json":
        "4308C23DC1EC19647B1B22F2D0FA21D1B3C243A72B0CF52F563F3550340DC4F5",
    "rank8_delta013_e2_length_extension_scout_exact_20260820.json":
        "49D5B53516C07B7DE085D5586158F3674B523F01B4167E8BA972AA61118F16C4",
    "rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json":
        "FC336F62A58EE4C2CFB7EF6F9AF6D3BE24FA689B89841A86D656A2547CCE63A2",
    "rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json":
        "BF988098870847459BD61B3B58C0ED8010C092130A0DFAC45735000B2FA4C027",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def state(short_values: range, long_base: int):
    return tuple(("S", value) for value in short_values) + (("L", long_base),)


ARM = state(range(1, 7), 7)
BRIDGE = state(range(1, 8), 8)
GAP = state(range(0, 7), 7)


def pair_states(values):
    return tuple(itertools.combinations_with_replacement(values, 2))


ARM_PAIRS = pair_states(ARM)


def is_long(value) -> bool:
    return value[0] == "L"


def baseline(value) -> int:
    return value[1]


def sector(values) -> str:
    flags = [is_long(value) for value in values]
    if all(flags):
        return "all_long"
    if any(flags):
        return "mixed"
    return "all_short"


def branch_keys():
    for left in ARM_PAIRS:
        for right in ARM_PAIRS:
            for bridge in BRIDGE:
                flat = (*left, *right, bridge)
                yield (left, right, bridge), flat, 1 + sum(map(baseline, flat))


def pendant_keys():
    for near in GAP:
        for tail in GAP:
            for paired in ARM:
                for far in ARM_PAIRS:
                    for bridge in BRIDGE:
                        flat = (near, tail, paired, *far, bridge)
                        yield (near, tail, paired, far, bridge), flat, 2 + sum(map(baseline, flat))


def bridge_internal_keys():
    modules = tuple((gap, arms) for gap in GAP for arms in ARM_PAIRS)
    for left, right in itertools.combinations_with_replacement(modules, 2):
        flat = (left[0], *left[1], right[0], *right[1])
        yield (left, right), flat, 3 + sum(map(baseline, flat))


GENERATORS = {
    "branch": branch_keys,
    "pendant": pendant_keys,
    "bridge_internal": bridge_internal_keys,
}


def summarize(generator):
    counts = Counter()
    all_short_orders = Counter()
    mixed_baseline_orders = Counter()
    keys_by_sector = {name: set() for name in ("all_short", "mixed", "all_long")}
    for key, flat, order in generator():
        label = sector(flat)
        counts[label] += 1
        keys_by_sector[label].add(key)
        if label == "all_short":
            all_short_orders[order] += 1
        elif label == "mixed":
            mixed_baseline_orders[order] += 1
    assert sum(counts.values()) == sum(len(rows) for rows in keys_by_sector.values())
    return counts, all_short_orders, mixed_baseline_orders, keys_by_sector


def main() -> None:
    actual = {name: sha256(HERE / name) for name in SEALED}
    assert actual == SEALED

    root_rows = {}
    all_sets = {}
    for label, generator in GENERATORS.items():
        counts, short_orders, mixed_orders, keys = summarize(generator)
        all_sets[label] = keys
        target_short = {order: count for order, count in sorted(short_orders.items()) if order >= TARGET_ORDER}
        root_rows[label] = {
            "quotient_patterns": sum(counts.values()),
            "sectors": dict(counts),
            "all_short_order_distribution": {str(k): v for k, v in sorted(short_orders.items())},
            "all_short_target_n31_plus_distribution": {str(k): v for k, v in target_short.items()},
            "all_short_target_n31_plus_points": sum(target_short.values()),
            "mixed_baseline_order_minimum": min(mixed_orders),
            "mixed_baseline_order_maximum": max(mixed_orders),
            "mixed_ray_shift_rule": "K=max(0,31-baseline_order), then total long offset is K+S for unique S>=0",
        }

    assert root_rows["branch"]["quotient_patterns"] == 6272
    assert root_rows["pendant"]["quotient_patterns"] == 100352
    assert root_rows["bridge_internal"]["quotient_patterns"] == 25200
    assert [root_rows[name]["sectors"]["mixed"] for name in GENERATORS] == [3184, 57133, 14321]
    assert [root_rows[name]["sectors"]["all_short"] for name in GENERATORS] == [3087, 43218, 10878]
    assert all(root_rows[name]["sectors"]["all_long"] == 1 for name in GENERATORS)

    # Exact quotient rays already contained in the sealed thin family
    # (1,1,g,1,1), g>=18.  At n>=31 its bridge is automatically >=26.
    s1 = ("S", 1)
    l7 = ("L", 7)
    l8 = ("L", 8)
    thin_branch = (((s1, s1), (s1, s1), l8),)
    thin_pendant = ((("S", 0), ("S", 0), s1, (s1, s1), l8),)
    thin_bridge = []
    long_module = (l7, (s1, s1))
    for short_gap in GAP[:-1]:
        short_module = (short_gap, (s1, s1))
        # GAP is ordered short 0..6 followed by long, which is also the
        # canonical module order used by combinations_with_replacement.
        thin_bridge.append((short_module, long_module))
    thin_bridge.append((long_module, long_module))
    thin = {
        "branch": set(thin_branch),
        "pendant": set(thin_pendant),
        "bridge_internal": set(thin_bridge),
    }
    assert {name: len(rows) for name, rows in thin.items()} == {
        "branch": 1, "pendant": 1, "bridge_internal": 8
    }
    for name in GENERATORS:
        assert thin[name] <= all_sets[name]["mixed"]

    totals = {
        "quotient_patterns": sum(row["quotient_patterns"] for row in root_rows.values()),
        "all_long_rays_sealed": sum(row["sectors"]["all_long"] for row in root_rows.values()),
        "mixed_rays": sum(row["sectors"]["mixed"] for row in root_rows.values()),
        "mixed_rays_sealed_by_thin_theorem": sum(map(len, thin.values())),
        "mixed_rays_remaining": sum(row["sectors"]["mixed"] for row in root_rows.values()) - sum(map(len, thin.values())),
        "all_short_patterns": sum(row["sectors"]["all_short"] for row in root_rows.values()),
        "all_short_target_n31_plus_points": sum(row["all_short_target_n31_plus_points"] for row in root_rows.values()),
    }
    assert totals == {
        "quotient_patterns": 131824,
        "all_long_rays_sealed": 3,
        "mixed_rays": 74638,
        "mixed_rays_sealed_by_thin_theorem": 10,
        "mixed_rays_remaining": 74628,
        "all_short_patterns": 57183,
        "all_short_target_n31_plus_points": totals["all_short_target_n31_plus_points"],
    }

    payload = {
        "schema": "rank8-delta01-e2-root-segment-partition-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E2_ROOT_SEGMENT_NO_GAP_PARTITION",
        "classification": "e=2 means exactly two degree-3 vertices joined by a positive bridge, with two positive pendant arms at each branch",
        "root_orbits": {
            "branch": "root is a degree-3 vertex; each local arm pair is unordered, but root and far sides are ordered",
            "pendant": "root lies on a pendant arm (leaf included); near=d-1 and tail=a-d are ordered, the sibling arm is distinguished, and the far arm pair is unordered",
            "bridge_internal": "root lies strictly inside the central bridge; each side module is (gap, unordered arm pair), and the two modules are unordered",
        },
        "state_partition": {
            "ordinary_arm": "literal 1..6 or long 7+A",
            "central_bridge_for_branch_or_pendant_root": "literal 1..7 or long 8+G",
            "root_split_near_or_tail": "literal 0..6 or long 7+N",
            "bridge_reconstruction": "for an internal bridge root, bridge=left_gap+right_gap+2",
            "pendant_reconstruction": "for a pendant root, selected_arm=near+tail+1",
        },
        "stable_offset_corollary": "within a fixed mixed short/long quotient key, all nonnegative long offsets transfer to one distinguished long path and enter through their total S",
        "target": "Delta0 and Delta1 on every rooted e=2 double claw of order n>=31",
        "roots": root_rows,
        "thin_mixed_keys": {name: len(rows) for name, rows in thin.items()},
        "totals": totals,
        "sealed_before_new_cell_scans": {
            "all_long": "3/3 root-orbit rays, via rank8_delta013_e2_all_long_exact_20260820.json",
            "thin_mixed": "10/74638 mixed quotient rays at n>=31, via the exact thin-bridge theorem",
            "finite_orders": "all e=2 rooted double claws through n=30; outside the n>=31 target",
        },
        "remaining_before_new_cell_scans": {
            "all_short_finite_points_n31_plus": totals["all_short_target_n31_plus_points"],
            "mixed_univariate_rays": totals["mixed_rays_remaining"],
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This is a no-gap partition and exact ledger, not a sign certificate for the listed remaining cells. The separate connected e>=4 Delta0/1 layer is untouched.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(json.dumps(payload["roots"], indent=2))
    print("TOTALS", payload["totals"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
