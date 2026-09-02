#!/usr/bin/env python3
"""Exact no-gap inventory of the cubic e=3 short-boundary complement.

This is a reduction artifact, not a positivity certificate.  It partitions
each root-location orbit into fixed short coordinates and stable long
coordinates, counts the quotient cells exactly, and identifies the finite
all-short bands and the unbounded mixed cells left after the sealed all-long
theorem.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_cubic_short_boundary_partition_exact_agent_20260822.json"
EXPECTED = {
    "rank8_delta01_e3_cubic_stable_34_to_7_reduction_exact_agent_20260822.json":
        "223675665029E5F5482D1855D85B7A04DBC376C587E62C457145C10777E46475",
    "rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json":
        "81DF2C8EA2B8BD8EEED04F1C4C25A8101174B67DA44D255D2C6F9DB5632527D8",
    "rank8_delta01_e3_cubic_skeleton_n27_n36_independent_audit_agent_20260822.json":
        "42DDF19A1AFB20C46C59B126F7D5D3614060F11AEB04C77E4E22D4CDB9CF03E4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def states(short_values: range, long_base: int):
    return [(value, 0, str(value)) for value in short_values] + [
        (long_base, 1, f"L{long_base}")
    ]


def unordered_pairs(items):
    return [
        (left[0] + right[0], left[1] + right[1], f"({left[2]},{right[2]})")
        for index, left in enumerate(items)
        for right in items[index:]
    ]


def product_distribution(components, order_constant: int):
    distribution = Counter({(order_constant, 0): 1})
    coordinate_count = 0
    for component, coordinates in components:
        next_distribution = Counter()
        for (total, longs), multiplicity in distribution.items():
            for value, component_longs, _ in component:
                next_distribution[(total + value, longs + component_longs)] += multiplicity
        distribution = next_distribution
        coordinate_count += coordinates
    return distribution, coordinate_count


def order_rows(distribution, predicate):
    result = Counter()
    for (order, longs), count in distribution.items():
        if predicate(longs):
            result[order] += count
    return {str(order): result[order] for order in sorted(result)}


def root_rows():
    pendant = states(range(1, 8), 8)
    spine = states(range(1, 10), 10)
    incident = states(range(1, 9), 9)
    near = states(range(0, 8), 8)
    tail = states(range(0, 7), 7)
    outer_pair = unordered_pairs(pendant)
    module = [
        (edge[0] + pair[0], edge[1] + pair[1], f"{edge[2]}:{pair[2]}")
        for edge in spine for pair in outer_pair
    ]
    module_pair = unordered_pairs(module)

    definitions = {
        "outer_branch": (
            [(outer_pair, 2), (pendant, 1), (outer_pair, 2), (spine, 1), (spine, 1)], 1,
            "two attached pendants unordered; middle pendant; two far pendants unordered; near and far spines",
        ),
        "middle_branch": (
            [(pendant, 1), (module_pair, 6)], 1,
            "middle pendant; unordered pair of (spine, unordered outer-pendant pair) side modules",
        ),
        "outer_leaf": (
            [(incident, 1), (pendant, 1), (pendant, 1), (outer_pair, 2), (spine, 1), (spine, 1)], 1,
            "incident pendant; sibling pendant; middle pendant; far pair unordered; near and far spines",
        ),
        "middle_leaf": (
            [(incident, 1), (module_pair, 6)], 1,
            "incident middle pendant; unordered pair of side modules",
        ),
        "outer_pendant_internal": (
            [(near, 1), (tail, 1), (pendant, 1), (pendant, 1), (outer_pair, 2), (spine, 1), (spine, 1)], 2,
            "near and tail root-edge components; sibling and middle pendants; far pair unordered; two spines",
        ),
        "middle_pendant_internal": (
            [(near, 1), (tail, 1), (module_pair, 6)], 2,
            "near and tail root-edge components; unordered pair of side modules",
        ),
        "spine_internal": (
            [(near, 1), (near, 1), (outer_pair, 2), (pendant, 1), (module, 3)], 3,
            "two root-side spine components; near outer pair; middle pendant; opposite side module",
        ),
    }

    rows = []
    for label, (components, order_constant, description) in definitions.items():
        distribution, coordinate_count = product_distribution(components, order_constant)
        total = sum(distribution.values())
        all_short = sum(count for (_, longs), count in distribution.items() if longs == 0)
        all_long = sum(count for (_, longs), count in distribution.items() if longs == coordinate_count)
        mixed = total - all_short - all_long
        assert all_long == 1
        all_short_orders = order_rows(distribution, lambda longs: longs == 0)
        mixed_baseline_orders = order_rows(distribution, lambda longs: 0 < longs < coordinate_count)
        stable_orders = order_rows(distribution, lambda longs: longs == coordinate_count)
        max_all_short = max(map(int, all_short_orders))
        finite_uncovered = sum(
            count for order, count in all_short_orders.items() if int(order) >= 37
        )
        rows.append({
            "root_location_orbit": label,
            "coordinate_count": coordinate_count,
            "quotient_description": description,
            "coordinate_patterns": total,
            "sealed_all_long_patterns": all_long,
            "mixed_long_short_patterns": mixed,
            "all_short_literal_patterns": all_short,
            "all_short_maximum_order": max_all_short,
            "all_short_order_distribution": all_short_orders,
            "all_short_patterns_in_uncovered_n37_plus_band": finite_uncovered,
            "mixed_baseline_order_distribution": mixed_baseline_orders,
            "stable_baseline_order": int(next(iter(stable_orders))),
        })
    return rows


def main():
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    stable = json.loads((ROOT / next(name for name in EXPECTED if "34_to_7" in name)).read_text(encoding="utf-8"))
    finite = json.loads((ROOT / "rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json").read_text(encoding="utf-8"))
    audit = json.loads((ROOT / "rank8_delta01_e3_cubic_skeleton_n27_n36_independent_audit_agent_20260822.json").read_text(encoding="utf-8"))
    assert stable["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_STABLE_34_ORBITS_TO_7_CELLS"
    assert finite["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_SKELETON_ALL_ROOTS_N27_N36"
    assert audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_SKELETON_N27_N36_AUDIT"

    rows = root_rows()
    totals = {
        "root_location_orbits": len(rows),
        "coordinate_patterns": sum(row["coordinate_patterns"] for row in rows),
        "sealed_all_long_patterns": sum(row["sealed_all_long_patterns"] for row in rows),
        "mixed_long_short_patterns": sum(row["mixed_long_short_patterns"] for row in rows),
        "all_short_literal_patterns": sum(row["all_short_literal_patterns"] for row in rows),
        "all_short_patterns_in_uncovered_n37_plus_band": sum(
            row["all_short_patterns_in_uncovered_n37_plus_band"] for row in rows
        ),
    }
    assert totals == {
        "root_location_orbits": 7,
        "coordinate_patterns": 33880500,
        "sealed_all_long_patterns": 7,
        "mixed_long_short_patterns": 20899091,
        "all_short_literal_patterns": 12981402,
        "all_short_patterns_in_uncovered_n37_plus_band": totals["all_short_patterns_in_uncovered_n37_plus_band"],
    }
    assert totals["sealed_all_long_patterns"] + totals["mixed_long_short_patterns"] + totals["all_short_literal_patterns"] == totals["coordinate_patterns"]
    assert max(row["all_short_maximum_order"] for row in rows) == 61

    payload = {
        "schema": "rank8-delta01-e3-cubic-short-boundary-partition-exact-agent-v1",
        "status": "PASS_EXACT_NO_GAP_PARTITION_REMAINING_OBLIGATIONS_EXPLICIT",
        "coordinate_convention": {
            "ordinary_pendant": "exactly 1..7 (short) or 8+offset (long)",
            "ordinary_spine": "exactly 1..9 (short) or 10+offset (long)",
            "root_leaf_incident_pendant": "exactly 1..8 (short) or 9+offset (long)",
            "root_internal_pendant_near": "exactly 0..7 (short) or 8+offset (long)",
            "root_internal_pendant_tail": "exactly 0..6 (short) or 7+offset (long)",
            "root_internal_spine_sides": "exactly 0..7 (short) or 8+offset (long)",
            "offset_domain": "every long offset is an arbitrary nonnegative integer",
        },
        "no_gap_reason": (
            "Each nonnegative or positive integer coordinate belongs to exactly one listed short value "
            "or to exactly one long base-plus-offset state.  The stated unordered pairs/modules are "
            "precisely the residual automorphisms for that root orbit."
        ),
        "root_location_partitions": rows,
        "totals": totals,
        "proved_parts": {
            "all_long": "the seven all-long patterns are sealed by the exact 34-orbit-to-7-cell theorem and its independent audit",
            "finite_orders_27_through_36": "all cubic subdivisions and every literal root are positive in both ranks",
        },
        "exact_remaining_obligations": {
            "mixed_unbounded": (
                "20,899,091 quotient patterns have at least one long and at least one short coordinate. "
                "Within each fixed pattern, path-offset transfer collapses all long offsets to their total S; "
                "the required exact object is therefore a one-variable Delta0/Delta1 extension cell."
            ),
            "finite_all_short": (
                "All-short rooted patterns have order at most 61.  Only their n=37..61 portion remains "
                "after the pinned n=27..36 theorem."
            ),
            "base_seed": (
                "An extension proof inside each long-status pattern also needs one exact Delta0/Delta1 base value. "
                "The largest mixed baseline is one below the corresponding all-long baseline (at most 68); "
                "the seven all-long bases occur at orders 61, 62, or 69."
            ),
        },
        "induction_guard": (
            "Because an all-short rooted pattern has order at most 61, every order at least 62 has a long coordinate. "
            "At order at least 63 one can contract a long coordinate while retaining a long coordinate in the source; "
            "the first-crossing order 62 is finite."
        ),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This report proves an exhaustive partition and pins the already proved sectors.  It deliberately "
            "does not mark the mixed cells or finite n=37..61 bands positive.  Thus the cubic-skeleton theorem, "
            "connected Q8, forest Q8, and Problem 993 are not yet proved here."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TOTALS", totals)
    for row in rows:
        print(row["root_location_orbit"], row["coordinate_patterns"], row["mixed_long_short_patterns"], row["all_short_literal_patterns"], row["all_short_maximum_order"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
