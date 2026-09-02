#!/usr/bin/env python3
"""Assemble the exact rooted-C7 root-neighbour-profile reduction."""

from __future__ import annotations

from collections import Counter
from fractions import Fraction
import hashlib
import json
from pathlib import Path

import probe_rank7_rooted_c7_degree_partition_cone as old_cone
import probe_rank7_rooted_c7_neighbor_profile_reduction as profile_cone


HERE = Path(__file__).resolve().parent
INPUT = HERE / "rank7_rooted_c7_middle_residual_exact_20260820.json"
OUTPUT = HERE / "rank7_rooted_c7_neighbor_profile_reduction_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def fraction_text(value: Fraction) -> str:
    return f"{value.numerator}/{value.denominator}"


class CanonicalDigest:
    def __init__(self):
        self.hash = hashlib.sha256()
        self.hash.update(b"[")
        self.first = True

    def add(self, row) -> None:
        if not self.first:
            self.hash.update(b",")
        self.first = False
        self.hash.update(json.dumps(row, separators=(",", ":")).encode("ascii"))

    def finish(self) -> str:
        self.hash.update(b"]")
        return self.hash.hexdigest().upper()


def main() -> int:
    old = json.loads(INPUT.read_text(encoding="utf-8"))
    assert old["status"] == "PASS_EXACT_ROOTED_C7_MIDDLE_RESIDUAL_AFTER_ORDER24_AND_B2_5_N26"
    cells = {
        (cell["order"], cell["root_degree"]): (cell["B2_min"], cell["B2_max"])
        for cell in old["live_coarse_cut"]["cells"]
    }

    partition_total = partition_full = partition_partial = partition_none = 0
    profile_total = profile_passed = profile_failed = profile_impossible = 0
    digest = CanonicalDigest()
    by_order = []
    by_root: Counter[int] = Counter()
    passed_by_root: Counter[int] = Counter()
    failed_b2: Counter[int] = Counter()
    first_survivor = None
    worst_survivor = None

    for n in range(25, 39):
        order_partitions = order_full = order_partial = 0
        order_profiles = order_passed = order_failed = order_impossible = 0
        partitions = list(old_cone.parts(n - 2))
        for (order, root_degree), (lower, upper) in cells.items():
            if order != n:
                continue
            for partition in partitions:
                b2 = old_cone.stats(partition)[0]
                if not lower <= b2 <= upper:
                    continue
                if not old_cone.root_degree_possible(n, root_degree, partition):
                    continue
                if old_cone.scalar(n, root_degree, partition) > 0:
                    continue

                partition_total += 1
                order_partitions += 1
                row_passed = row_failed = row_impossible = 0
                profiles = list(
                    profile_cone.positive_neighbour_profiles(partition, root_degree)
                )
                assert profiles
                for xs in profiles:
                    profile_total += 1
                    order_profiles += 1
                    by_root[root_degree] += 1
                    try:
                        value = profile_cone.scalar(n, root_degree, partition, xs)
                    except profile_cone.InfeasibleProfile:
                        profile_impossible += 1
                        order_impossible += 1
                        row_impossible += 1
                        continue
                    if value > 0:
                        profile_passed += 1
                        order_passed += 1
                        row_passed += 1
                        passed_by_root[root_degree] += 1
                    else:
                        profile_failed += 1
                        order_failed += 1
                        row_failed += 1
                        failed_b2[b2] += 1
                        canonical_row = (n, root_degree, partition, xs)
                        digest.add(canonical_row)
                        candidate = {
                            "order": n,
                            "root_degree": root_degree,
                            "B2": b2,
                            "positive_excess_partition": list(partition),
                            "root_neighbour_excess_multiset": list(xs),
                            "scalar": fraction_text(value),
                            "edge_correlation_lower": profile_cone.edge_correlation_lower(
                                partition, root_degree, xs
                            ),
                            "edge_correlation_slot_upper": profile_cone.edge_correlation_upper(
                                partition, root_degree, xs
                            ),
                            "forced_connected_four_lower": profile_cone.forced_connected_four(
                                partition, root_degree, xs
                            ),
                        }
                        smallest_key = (
                            n,
                            b2,
                            root_degree,
                            len(partition),
                            partition,
                            xs,
                        )
                        if (
                            first_survivor is None
                            or smallest_key
                            < (
                                first_survivor["order"],
                                first_survivor["B2"],
                                first_survivor["root_degree"],
                                len(first_survivor["positive_excess_partition"]),
                                tuple(first_survivor["positive_excess_partition"]),
                                tuple(first_survivor["root_neighbour_excess_multiset"]),
                            )
                        ):
                            first_survivor = candidate
                        if worst_survivor is None or value < Fraction(worst_survivor["scalar"]):
                            worst_survivor = candidate

                assert row_passed + row_failed + row_impossible == len(profiles)
                if row_failed == 0:
                    partition_full += 1
                    order_full += 1
                elif row_passed + row_impossible:
                    partition_partial += 1
                    order_partial += 1
                else:
                    partition_none += 1

        by_order.append({
            "order": n,
            "input_partition_profiles": order_partitions,
            "fully_certified_partition_profiles": order_full,
            "partially_certified_partition_profiles": order_partial,
            "literal_neighbour_profiles": order_profiles,
            "certified_neighbour_profiles": order_passed,
            "structurally_impossible_neighbour_profiles": order_impossible,
            "remaining_neighbour_profiles": order_failed,
        })

    assert partition_total == 100_199
    assert partition_full + partition_partial + partition_none == partition_total
    assert profile_passed + profile_failed + profile_impossible == profile_total
    assert first_survivor is not None and worst_survivor is not None
    remaining_digest = digest.finish()

    report = {
        "status": "PASS_EXACT_ROOTED_C7_LITERAL_ROOT_NEIGHBOUR_PROFILE_REDUCTION",
        "theorem": (
            "Every live rooted-C7 tree whose exact positive excess partition, "
            "root degree, and literal root-neighbour excess multiset is not in "
            "the regenerated residual digest is either structurally impossible "
            "or has C7>0."
        ),
        "coverage": {
            "input_partition_profiles": partition_total,
            "fully_certified_partition_profiles": partition_full,
            "partially_certified_partition_profiles": partition_partial,
            "uncertified_partition_profiles": partition_none,
            "literal_neighbour_profiles": profile_total,
            "certified_neighbour_profiles": profile_passed,
            "structurally_impossible_neighbour_profiles": profile_impossible,
            "remaining_neighbour_profiles": profile_failed,
            "remaining_B2_min": min(failed_b2),
            "remaining_B2_max": max(failed_b2),
        },
        "by_order": by_order,
        "neighbour_profiles_by_root_degree": {
            str(root): {
                "total": by_root[root],
                "certified": passed_by_root[root],
            }
            for root in sorted(by_root)
        },
        "remaining_B2_histogram": {
            str(value): failed_b2[value] for value in sorted(failed_b2)
        },
        "smallest_surviving_formal_profile": first_survivor,
        "worst_surviving_formal_profile": worst_survivor,
        "canonical_remaining_encoding": (
            "JSON tuples [n,root_degree,[positive excess parts descending],"
            "[root-neighbour excesses descending, then zeros]]"
        ),
        "canonical_remaining_sha256": remaining_digest,
        "prerequisite_hashes": {
            INPUT.name: sha256(INPUT),
            "probe_rank7_rooted_c7_degree_partition_cone.py": sha256(
                HERE / "probe_rank7_rooted_c7_degree_partition_cone.py"
            ),
            "probe_rank7_rooted_c7_neighbor_profile_reduction.py": sha256(
                HERE / "probe_rank7_rooted_c7_neighbor_profile_reduction.py"
            ),
        },
        "scope_warning": (
            "This is an exact structural reduction, not a full-tree census and "
            "not a universal rooted-C7 proof.  A surviving formal profile need "
            "not be realised by a tree."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(
        f"partitions {partition_total} -> full {partition_full}, partial {partition_partial}, "
        f"none {partition_none}"
    )
    print(
        f"neighbour profiles {profile_total} -> certified {profile_passed}, "
        f"impossible {profile_impossible}, remaining {profile_failed}"
    )
    print(f"remaining digest {remaining_digest}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
