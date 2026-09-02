#!/usr/bin/env python3
"""Exact assembler for the rooted-C7 excess-degree-partition reduction."""

from __future__ import annotations

from collections import Counter
from fractions import Fraction
import hashlib
import json
from pathlib import Path

import probe_rank7_rooted_c7_degree_partition_cone as cone


HERE = Path(__file__).resolve().parent
OLD = HERE / "rank7_rooted_cross_residual_after_b2_4_exact_20260816.json"
OUTPUT = HERE / "rank7_rooted_c7_degree_partition_reduction_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def fraction_text(value: Fraction) -> str:
    return f"{value.numerator}/{value.denominator}"


def main() -> int:
    old = json.loads(OLD.read_text(encoding="utf-8"))
    assert old["status"] == "PASS_EXACT_ROOTED_C7_COVERAGE_CUT_AFTER_B2_4"
    cells = {
        (cell["order"], cell["root_degree"]): (cell["B2_min"], cell["B2_max"])
        for cell in old["residual"]["cells"]
        if cell["order"] >= 24
    }
    assert len(cells) == 76

    residual: list[tuple[int, int, tuple[int, ...]]] = []
    by_order = []
    b2_histogram: Counter[int] = Counter()
    total_profiles = passed_profiles = 0
    for n in range(24, 39):
        partitions = list(cone.parts(n - 2))
        order_total = order_passed = 0
        order_worst: tuple[Fraction, int, tuple[int, ...]] | None = None
        for (order, root_degree), (lower, upper) in cells.items():
            if order != n:
                continue
            for partition in partitions:
                b2 = cone.stats(partition)[0]
                if not lower <= b2 <= upper:
                    continue
                if not cone.root_degree_possible(n, root_degree, partition):
                    continue
                value = cone.scalar(n, root_degree, partition)
                total_profiles += 1
                order_total += 1
                if value > 0:
                    passed_profiles += 1
                    order_passed += 1
                else:
                    residual.append((n, root_degree, partition))
                    b2_histogram[b2] += 1
                    candidate = (value, root_degree, partition)
                    if order_worst is None or candidate < order_worst:
                        order_worst = candidate
        assert order_worst is not None
        by_order.append(
            {
                "order": n,
                "old_residual_degree_partition_profiles": order_total,
                "newly_certified_profiles": order_passed,
                "remaining_profiles": order_total - order_passed,
                "worst_relaxed_scalar": fraction_text(order_worst[0]),
                "worst_root_degree": order_worst[1],
                "worst_excess_partition": list(order_worst[2]),
                "worst_B2_B3_B4": list(cone.stats(order_worst[2])),
            }
        )

    assert total_profiles == 214_467
    assert passed_profiles == 110_859
    assert len(residual) == 103_608
    assert max(b2_histogram) == 196
    assert min(b2_histogram) == 5
    canonical = json.dumps(residual, separators=(",", ":"))
    residual_digest = hashlib.sha256(canonical.encode("ascii")).hexdigest().upper()

    report = {
        "status": "PASS_EXACT_ROOTED_C7_DEGREE_PARTITION_REDUCTION_ORDERS_24_THROUGH_38",
        "theorem": (
            "Every old residual rooted-C7 tree whose exact positive excess-degree "
            "partition is not in the regenerated residual digest is certified C7>0."
        ),
        "exact_inputs_retained": [
            "B2=sum C(x_v,2), B3=sum C(x_v,3), B4=sum C(x_v,4)",
            "X=E-(n-3) bounded by both the Zagreb inequality and E<=m(n-2-m)",
            "W>=B2+B3+max(0,X) and W>=B3+B4-(n-4)",
            "the exact i4 motif identity with E>=number_of_positive_excess_vertices-1",
            "the sharp piecewise transfer mu5>=2*Phi(mu4)/mu4",
        ],
        "coverage": {
            "old_residual_order_root_cells_after_order23_closure": 76,
            "old_residual_degree_partition_profiles": total_profiles,
            "newly_certified_profiles": passed_profiles,
            "remaining_profiles": len(residual),
            "certified_fraction": fraction_text(Fraction(passed_profiles, total_profiles)),
            "remaining_B2_min": min(b2_histogram),
            "remaining_B2_max": max(b2_histogram),
        },
        "by_order": by_order,
        "remaining_B2_histogram": {str(k): b2_histogram[k] for k in sorted(b2_histogram)},
        "canonical_remaining_profile_encoding": "JSON tuples [n,root_degree,[positive excess parts descending]]",
        "canonical_remaining_profile_sha256": residual_digest,
        "prerequisites": {
            OLD.name: sha256(OLD),
            "TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md": sha256(HERE / "TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md"),
            "probe_rank7_rooted_c7_degree_partition_cone.py": sha256(HERE / "probe_rank7_rooted_c7_degree_partition_cone.py"),
        },
        "scope_warning": (
            "The 103,608 listed-by-digest degree-partition/root profiles still need "
            "root-neighborhood placement coupling; this is not a universal rooted-C7 theorem."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"profiles {total_profiles} -> {len(residual)}; newly certified {passed_profiles}")
    print(f"residual digest {residual_digest}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
