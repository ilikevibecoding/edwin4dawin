#!/usr/bin/env python3
"""Independent no-gap audit of the complete cubic e=3 Delta2/Delta3 assembly."""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRIMARY = ROOT / "rank8_delta23_e3_cubic_complete_exact_root_20260823.json"
OUTPUT = ROOT / "rank8_delta23_e3_cubic_complete_independent_audit_root_20260823.json"
EXPECTED = {
    PRIMARY.name: "441531A91303774942BB78368228AD31FCC694C2DCCAB4DE86E7634802EC16A9",
    "assemble_rank8_delta23_e3_cubic_complete_root.py":
        "64BD61C57A38F943EADCE3054189053D6ED7360E5A6CE8A337F8812E2E0A78D7",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def states(short_start: int, short_stop: int, long_base: int):
    return [(value, 0) for value in range(short_start, short_stop)] + [(long_base, 1)]


def unordered_pairs(items):
    return [
        (left[0] + right[0], left[1] + right[1])
        for index, left in enumerate(items)
        for right in items[index:]
    ]


def multiply_distribution(distribution, component):
    result = Counter()
    for (order, longs), multiplicity in distribution.items():
        for extra_order, extra_longs in component:
            result[(order + extra_order, longs + extra_longs)] += multiplicity
    return result


def independent_partition():
    pendant = states(1, 8, 8)
    spine = states(1, 10, 10)
    incident = states(1, 9, 9)
    near = states(0, 8, 8)
    tail = states(0, 7, 7)
    outer_pair = unordered_pairs(pendant)
    module = [
        (edge[0] + pair[0], edge[1] + pair[1])
        for edge in spine for pair in outer_pair
    ]
    module_pair = unordered_pairs(module)
    definitions = {
        "outer_branch": ([outer_pair, pendant, outer_pair, spine, spine], 1, 7),
        "middle_branch": ([pendant, module_pair], 1, 7),
        "outer_leaf": ([incident, pendant, pendant, outer_pair, spine, spine], 1, 7),
        "middle_leaf": ([incident, module_pair], 1, 7),
        "outer_pendant_internal": ([near, tail, pendant, pendant, outer_pair, spine, spine], 2, 8),
        "middle_pendant_internal": ([near, tail, module_pair], 2, 8),
        "spine_internal": ([near, near, outer_pair, pendant, module], 3, 8),
    }
    rows = {}
    for label, (components, constant, coordinate_count) in definitions.items():
        distribution = Counter({(constant, 0): 1})
        for component in components:
            distribution = multiply_distribution(distribution, component)
        total = sum(distribution.values())
        all_long = sum(count for (_, longs), count in distribution.items() if longs == coordinate_count)
        mixed = sum(count for (_, longs), count in distribution.items() if 0 < longs < coordinate_count)
        all_short_n37 = sum(
            count for (order, longs), count in distribution.items()
            if longs == 0 and order >= 37
        )
        rows[label] = {
            "coordinate_patterns": total,
            "all_long": all_long,
            "mixed": mixed,
            "all_short_n37_plus": all_short_n37,
        }
    return rows


def main() -> None:
    assert all("TO_FILL" not in value for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = load(PRIMARY.name)
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_COMPLETE_N27_PLUS"

    # Recheck every hash transitively pinned by the assembly.
    transitive_actual = {
        name: sha256(ROOT / name) for name in primary["immutable_inputs"]
    }
    assert transitive_actual == primary["immutable_inputs"]

    rows = independent_partition()
    assert set(rows) == {
        "outer_branch", "middle_branch", "outer_leaf", "middle_leaf",
        "outer_pendant_internal", "middle_pendant_internal", "spine_internal",
    }
    assert sum(row["mixed"] for row in rows.values()) == 20_899_091
    assert sum(row["all_short_n37_plus"] for row in rows.values()) == 4_670_546
    assert sum(row["all_long"] for row in rows.values()) == 7
    assert primary["partition_totals"] == {
        "root_location_orbits": 7,
        "all_short_n37_plus": 4_670_546,
        "mixed_quotient_rays": 20_899_091,
        "all_long_base_patterns": 7,
    }

    mixed_rows = {
        row["root_location_orbit"]: row
        for row in primary["sectors"]["mixed_n37_plus"]["rows"]
    }
    assert set(mixed_rows) == set(rows)
    assert all(mixed_rows[label]["quotient_rays"] == rows[label]["mixed"] for label in rows)
    assert all(
        int(mixed_rows[label][key]) > 0
        for label in rows
        for key in (
            "minimum_Delta2_base", "minimum_Delta3_base",
            "minimum_Delta2_first_difference", "minimum_Delta3_first_difference",
        )
    )

    finite = load("rank8_delta23_e3_cubic_skeleton_n27_n36_exact_root_20260823.json")
    short = load("rank8_delta23_e3_cubic_all_short_complete_exact_root_20260823.json")
    stable = load("rank8_delta23_e3_cubic_stable_edge_extension_exact_root_20260823.json")
    bases = load("rank8_delta03_e3_cubic_all_long_bases_exact_root_20260823.json")
    assert [row["order"] for row in finite["orders"]] == list(range(27, 37))
    assert all(row["negative2"] == row["negative3"] == 0 for row in finite["orders"])
    assert short["coverage"]["patterns"] == 4_670_546
    assert short["coverage"]["negative_or_zero_Delta2"] == 0
    assert short["coverage"]["negative_or_zero_Delta3"] == 0
    assert stable["totals"]["extension_edge_orbits"] == 34
    assert stable["totals"]["negative_coefficients"] == 0
    assert stable["totals"]["zero_coefficients"] == 0
    assert len(bases["base_cells"]) == 7
    assert all(int(row[f"Delta{rank}"]) > 0 for row in bases["base_cells"] for rank in (2, 3))

    payload = {
        "schema": "rank8-delta23-e3-cubic-complete-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA23_E3_CUBIC_COMPLETE_AUDIT",
        "methods": [
            "independent reconstruction of all seven short/mixed/long quotient partitions",
            "transitive SHA-256 replay of every finite, endpoint, mixed, and audit input",
            "explicit order-27-through-36 continuity check",
            "strict base, Newton-base, Newton-first-difference, and extension-sign checks",
        ],
        "independent_partition": rows,
        "totals": {
            "all_short_n37_plus": 4_670_546,
            "mixed_quotient_rays": 20_899_091,
            "all_long_base_patterns": 7,
            "finite_orders": 10,
            "root_location_orbits": 7,
        },
        "immutable_inputs": actual,
        "transitive_inputs_replayed": len(transitive_actual),
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This independently audits only the cubic e=3 Delta2/Delta3 theorem. "
            "It does not close other connected or forest obligations."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
