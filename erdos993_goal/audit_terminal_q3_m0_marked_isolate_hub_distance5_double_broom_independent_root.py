#!/usr/bin/env python3
"""Independent scope/row/cap audit of the distance-five double-broom theorem."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from math import comb
from pathlib import Path


HERE = Path(__file__).resolve().parent
THEOREM_SOURCE = HERE / (
    "prove_terminal_q3_m0_marked_isolate_hub_distance5_double_broom_all_j_root.py"
)
THEOREM_REPORT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance5_double_broom_all_j_"
    "exact_root_20260831.json"
)
THEOREM_NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE5_DOUBLE_BROOM_ALL_J_ROOT_"
    "2026-08-31.md"
)
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance5_double_broom_"
    "independent_audit_root_20260831.json"
)
MARKER = (
    "PASS_INDEPENDENT_EXACT_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "HUB_DISTANCE5_DOUBLE_BROOM_ROOT"
)

PINNED = {
    "source_sha256": "0D8640CFAF63F22CAEE2338A31F196CB84F7E7370896B6BD1B9FD38E0758C3FD",
    "report_sha256": "694D5201FA4953F4378030679664C43BC69B194C51773D9D4389E86F725C33F8",
    "note_sha256": "CA9681F399E58246327000BBCB9FB96BBDFC70BC98E6949302C130EC75B0919B",
    "coefficient_stream_sha256": "BF17A86FB67BFBC4DC0408EA7B284D2ADD8421645FBBE8B01234E8686A7B9847",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def generic_rows(large: int, small: int) -> tuple[list[int], list[int]]:
    """Count by core masks and leaf multiplicities, not the theorem formulas."""
    order = large + small + 6
    independent = [0] * (order + 1)
    one_edge = [0] * (order + 1)
    for mask in range(1 << 6):
        core_size = mask.bit_count()
        core_edges = sum(
            bool(mask & (1 << vertex)) and bool(mask & (1 << (vertex + 1)))
            for vertex in range(5)
        )
        left_hub = bool(mask & 1)
        right_hub = bool(mask & (1 << 5))
        for left_leaves in range(large + 1):
            left_weight = comb(large, left_leaves)
            for right_leaves in range(small + 1):
                induced_edges = (
                    core_edges
                    + left_hub * left_leaves
                    + right_hub * right_leaves
                )
                if induced_edges > 1:
                    continue
                rank = core_size + left_leaves + right_leaves
                weight = left_weight * comb(small, right_leaves)
                if induced_edges == 0:
                    independent[rank] += weight
                else:
                    one_edge[rank] += weight
    return independent, one_edge


def margin(independent: list[int], one_edge: list[int], target: int) -> int:
    n = len(independent) - 7
    f2 = independent[2]
    p0 = independent[3] + 2 * f2 + n + 6
    r0 = one_edge[4] + 2 * one_edge[3] + one_edge[2]
    c0 = one_edge[3] + 2 * f2
    determinant = p0 * c0 - f2 * r0
    assert determinant > 0
    return (
        (target + 1) * f2 * determinant
        * (independent[target + 1] + 2 * independent[target] + independent[target - 1])
        + f2 * p0 * (
            (target + 1) * independent[target] * (c0 + r0)
            - 3 * (p0 + f2)
            * (one_edge[target + 1] + 2 * independent[target])
        )
    )


def classify_and_check_cap(large: int, small: int, target: int) -> str:
    n = large + small
    denominator = comb(n, target - 2)
    assert denominator > 0
    rho = Fraction(comb(large, target - 2), denominator)
    tau = Fraction(comb(small, target - 2), denominator)
    u_large = Fraction(large * (large - 1), n * (n - 1))
    u_small = Fraction(small * (small - 1), n * (n - 1))

    if target == 4 and small >= 2:
        assert rho == u_large and tau == u_small
        return "j4_exact_seam"

    if target >= 4 and target >= small + 3:
        assert tau == 0
        if rho == 0:
            return "tail_lower_zero"
        if (large, small, target) == (2, 1, 4):
            return "tail_degenerate_direct"
        selected = target - 4
        side = large - 2
        assert side >= selected
        cap = u_large * Fraction(side, side + selected * small)
        assert rho <= cap
        return "tail_upper_cap"

    if target >= 5 and small >= target - 2:
        selected = target - 4
        large_side = large - 2
        small_side = small - 2
        cap_large = u_large * Fraction(
            large_side, large_side + selected * small
        )
        cap_small = u_small * Fraction(
            small_side, small_side + selected * large
        )
        assert rho <= cap_large
        assert tau <= cap_small
        return "middle_rectangle"

    raise AssertionError((large, small, target, "unclassified supported cell"))


def main() -> None:
    assert sha256(THEOREM_SOURCE) == PINNED["source_sha256"]
    assert sha256(THEOREM_REPORT) == PINNED["report_sha256"]
    assert sha256(THEOREM_NOTE) == PINNED["note_sha256"]
    theorem = json.loads(THEOREM_REPORT.read_text(encoding="utf-8"))
    assert theorem["status"] == (
        "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
        "HUB_DISTANCE5_DOUBLE_BROOM_ROOT"
    )
    assert theorem["coverage_gap_within_scope"] is None
    assert theorem["coefficient_stream_sha256"] == PINNED["coefficient_stream_sha256"]
    assert set(theorem["charts"]) == {
        "j4_exact_seam", "tail_lower_zero", "middle_origin",
        "middle_large_cap", "middle_small_cap", "middle_both_caps",
        "tail_upper_cap",
    }
    for chart in theorem["charts"].values():
        assert chart["negative_numerator_coefficients"] == 0
        assert chart["negative_denominator_coefficients"] == 0
        assert Fraction(chart["minimum_numerator_coefficient"]) > 0
        assert Fraction(chart["minimum_denominator_coefficient"]) > 0

    # Audit the cap beyond the theorem producer's rectangular test range.
    cap_checks = 0
    cap_stream = hashlib.sha256()
    for side in range(1, 121):
        for complement in range(1, 61):
            for selected in range(1, side + 1):
                lhs = Fraction(comb(side, selected), comb(side + complement, selected))
                rhs = Fraction(side, side + selected * complement)
                assert lhs <= rhs
                cap_stream.update(
                    f"{side}|{complement}|{selected}|{lhs}|{rhs}\n".encode()
                )
                cap_checks += 1

    cells = 0
    classifications = {}
    minimum = None
    row_stream = hashlib.sha256()
    for small in range(1, 17):
        for large in range(small, 17):
            independent, one_edge = generic_rows(large, small)
            n = large + small
            for target in range(4, n + 3):
                assert independent[target] > 0
                value = margin(independent, one_edge, target)
                assert value > 0
                classification = classify_and_check_cap(large, small, target)
                classifications[classification] = classifications.get(classification, 0) + 1
                record = (value, large, small, target)
                if minimum is None or record < minimum:
                    minimum = record
                row_stream.update(
                    f"{large}|{small}|{target}|{classification}|"
                    f"{independent[target]}|{value}\n".encode()
                )
                cells += 1
    assert minimum == (10051860, 1, 1, 4)
    assert set(classifications) == {
        "j4_exact_seam", "tail_lower_zero", "tail_degenerate_direct",
        "tail_upper_cap", "middle_rectangle",
    }

    payload = {
        "status": MARKER,
        "pinned_theorem": PINNED,
        "independent_method": (
            "Core-mask plus leaf-multiplicity enumeration reconstructs F and Z "
            "without using the theorem's closed row formulas; every supported "
            "cell is classified into exactly one proof chart and its actual "
            "hypergeometric weights are checked against the cap."
        ),
        "cap_audit": {
            "checks": cap_checks,
            "ordered_stream_sha256": cap_stream.hexdigest().upper(),
        },
        "generic_graph_audit": {
            "maximum_side": 16,
            "cells": cells,
            "classifications": classifications,
            "minimum_delta": minimum[0],
            "minimum_witness": {
                "large": minimum[1], "small": minimum[2], "j": minimum[3]
            },
            "ordered_stream_sha256": row_stream.hexdigest().upper(),
        },
        "coverage_gap_within_theorem_scope": None,
        "scope_guard": (
            "This independently audits the stated distance-five double-broom "
            "family only; it does not promote the complete terminal payment or "
            "Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    OUTPUT.write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps({
        "status": MARKER,
        "cap_checks": cap_checks,
        "generic_cells": cells,
        "classifications": classifications,
        "minimum": minimum,
        "coverage_gap_within_theorem_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", payload["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
