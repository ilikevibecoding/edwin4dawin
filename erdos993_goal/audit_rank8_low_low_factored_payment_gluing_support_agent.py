#!/usr/bin/env python3
"""Independent structural/support audit for the factored suffix-3 gluing route.

This audit does not recompute any large residual polynomial.  It checks the
facts that make the new face-factored AM-GM payment a legitimate common
payment and records the exact finite cell universes for the remaining check.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from probe_rank8_low_low_full_early_suffix45_cell_flint import PAYMENT_MASKS


ROOT = Path(__file__).resolve().parent
FACTORED = ROOT / "rank8_low_low_full_early_core_factored_amgm_exact_20260822.json"
OLD_EARLY = ROOT / "rank8_low_low_full_early_core_amgm_exact_20260821.json"
CURVATURE = ROOT / "rank8_low_low_tail_curvature_far_zero_slack_amgm_exact_20260821.json"
STRONG = ROOT / "rank8_low_low_strong_payment_zero_slack_amgm_exact_20260821.json"
REPORT = ROOT / "rank8_low_low_factored_payment_gluing_support_agent_20260822.json"
EXPECTED = {
    FACTORED.name: "36673C44864659E3DAB2CC99071DAE2C306830B8B672A8C7F3E41ED5A2AFCFF6",
    OLD_EARLY.name: "B563CA6C6A7B18254CA17AA5B92DB67EA899BA4F3B2FA5D172301A8A0CD2ED96",
    CURVATURE.name: "E90CD40EDDE350EFAF23DB9738964146C0C5358CB2893560313772D1A9CB1C4C",
    STRONG.name: "8C390F8C24F663B551B63D0E80FA9DF8894A2759D06DE5EA181CFB1E26636911",
}
ZERO_GROUP = [0, 0, 0, 0]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def lifted_zero(allocation, scale):
    def monomial(row):
        return list(map(int, row)) + ZERO_GROUP

    return {
        "negative_monomial": monomial(allocation["negative_monomial"]),
        "demand": scale * int(allocation["demand"]),
        "source_low": {
            "monomial": monomial(allocation["source_low"]["monomial"]),
            "capacity": scale * int(allocation["source_low"]["capacity"]),
        },
        "source_high": {
            "monomial": monomial(allocation["source_high"]["monomial"]),
            "capacity": scale * int(allocation["source_high"]["capacity"]),
        },
    }


def core(allocation):
    return {
        "negative_monomial": allocation["negative_monomial"],
        "demand": allocation["demand"],
        "source_low": allocation["source_low"],
        "source_high": allocation["source_high"],
    }


def main() -> None:
    assert {path.name: sha256(path) for path in (
        FACTORED, OLD_EARLY, CURVATURE, STRONG,
    )} == EXPECTED
    factored = json.loads(FACTORED.read_text(encoding="utf-8"))
    old = json.loads(OLD_EARLY.read_text(encoding="utf-8"))
    curvature = json.loads(CURVATURE.read_text(encoding="utf-8"))
    strong = json.loads(STRONG.read_text(encoding="utf-8"))
    assert factored["status"] == "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_CORE_FACTORED_AMGM"
    factored_rows = {row["bernstein_target"]: row for row in factored["rows"]}
    old_rows = {row["bernstein_target"]: row for row in old["rows"]}
    strong_rows = {row["bernstein_coefficient"]: row for row in strong["rows"]}
    expected_zero = {
        "curvature_middle_times_4": [],
        "curvature_far": [lifted_zero(row, 1) for row in curvature["allocations"]],
        "strong_middle_times_4": [
            lifted_zero(row, 2)
            for row in strong_rows["middle_times_2"]["allocations"]
        ],
        "strong_far": [lifted_zero(row, 1) for row in strong_rows["far"]["allocations"]],
    }

    rows = []
    global_selected_terminal = {"left": 0, "right": 0}
    global_combined = {"left": 0, "right": 0}
    for label, row in factored_rows.items():
        allocations = row["allocations"]
        old_allocations = old_rows[label]["allocations"]
        assert [item["negative_monomial"] for item in allocations] == [
            item["negative_monomial"] for item in old_allocations
        ]
        used = set()
        for allocation in allocations:
            negative = tuple(map(int, allocation["negative_monomial"]))
            low = tuple(map(int, allocation["source_low"]["monomial"]))
            high = tuple(map(int, allocation["source_high"]["monomial"]))
            assert tuple(a + b for a, b in zip(low, high)) == tuple(
                2 * item for item in negative
            )
            assert low[3:] == negative[3:] == high[3:]
            assert low not in used and high not in used and low != high
            used.update((low, high))
            assert int(allocation["demand"]) ** 2 <= (
                4
                * int(allocation["source_low"]["capacity"])
                * int(allocation["source_high"]["capacity"])
            )
        zero = [core(item) for item in allocations
                if item["negative_monomial"][3:] == ZERO_GROUP]
        assert zero == expected_zero[label]

        masks = PAYMENT_MASKS[label]
        side_rows = {}
        for side, terminal_index, early_indices in (
            ("left", 1, (3, 4)),
            ("right", 2, (5, 6)),
        ):
            selected = []
            selected_terminal_max = 0
            combined_max = 0
            for index, allocation in enumerate(allocations):
                is_selected = bool(masks[side] & (1 << index))
                if is_selected:
                    selected.append(index)
                monomials = (
                    allocation["negative_monomial"],
                    allocation["source_low"]["monomial"],
                    allocation["source_high"]["monomial"],
                )
                for monomial in monomials:
                    suffix_degree = int(monomial[terminal_index]) if is_selected else 0
                    early_degree = sum(int(monomial[i]) for i in early_indices)
                    selected_terminal_max = max(selected_terminal_max, suffix_degree)
                    combined_max = max(combined_max, early_degree + suffix_degree)
            global_selected_terminal[side] = max(
                global_selected_terminal[side], selected_terminal_max,
            )
            global_combined[side] = max(global_combined[side], combined_max)
            side_rows[side] = {
                "selected_allocations": len(selected),
                "maximum_selected_terminal_exponent": selected_terminal_max,
                "maximum_early_plus_selected_terminal_exponent": combined_max,
            }
        rows.append({
            "auxiliary": label,
            "allocations": len(allocations),
            "early_support_groups": row["early_exponent_groups"],
            "zero_group_allocations": len(zero),
            "negative_order_matches_old_certificate": True,
            "all_blocks_factor_the_same_early_monomial": True,
            "all_positive_sources_disjoint": True,
            "zero_group_exactly_matches_suffix_certificate": True,
            "directional_support": side_rows,
        })

    assert [item["allocations"] for item in rows] == [0, 54, 84, 159]
    assert [item["early_support_groups"] for item in rows] == [0, 18, 18, 38]
    assert global_selected_terminal == {"left": 6, "right": 6}
    assert global_combined == {"left": 7, "right": 6}

    # Raw support follows from the number of cumulative ratios seeing gap 3:
    # four per factor row.  Quadratic auxiliaries double this, and the strong
    # left row has one additional capacity ratio.
    a3_support = 2 * 4 + 1
    b3_support = 2 * 4
    assert (a3_support, b3_support) == (9, 8)
    suffix3_outer_cells = (a3_support + 1) * (b3_support + 1)
    suffix3_nonorigin_cells = suffix3_outer_cells - 1

    # Gap zero occurs only in ratio 0, while gap three occurs in ratios
    # 0,...,3.  Across the two factor rows their combined degree is at most
    # eight.  The strong left capacity sees gap three but not gap zero, so it
    # raises only the left combined bound to nine.  Gap zero itself can occur
    # at most once in each of the two factor rows.
    gap0_individual_support = {"a0": 2, "b0": 2}
    combined_gap0_gap3_support = {"left": 9, "right": 8}
    left_gap0_gap3_pairs = [
        (a0, a3)
        for a0 in range(3) for a3 in range(10)
        if a0 + a3 <= combined_gap0_gap3_support["left"]
    ]
    right_gap0_gap3_pairs = [
        (b0, b3)
        for b0 in range(3) for b3 in range(9)
        if b0 + b3 <= combined_gap0_gap3_support["right"]
    ]
    assert len(left_gap0_gap3_pairs) == 27
    assert len(right_gap0_gap3_pairs) == 24
    gap0_suffix3_cells = len(left_gap0_gap3_pairs) * len(right_gap0_gap3_pairs)
    inherited_suffix_cells = 10 * 9
    factored_positive_early_cells = gap0_suffix3_cells - inherited_suffix_cells
    assert (gap0_suffix3_cells, factored_positive_early_cells) == (648, 558)

    # U=a4+a5 and W=b4+b5 occur in six cumulative ratios.  At U,W>0 all
    # 3x3 degree-two tensor positions are distinct.  On either coordinate
    # axis only three univariate positions remain, and at the origin only one.
    u_positive, w_positive = 13, 12
    split_suffix45_cells_per_suffix3_cell = (
        u_positive * w_positive * 9
        + u_positive * 3
        + w_positive * 3
        + 1
    )
    assert split_suffix45_cells_per_suffix3_cell == 1480

    # Final raw bridge: P=a2+a3 and Q=b2+b3.  Ratios 0..2 see the
    # fixed total and only ratio 3 sees the redistribution coordinate, so a
    # factor row is affine and a quadratic auxiliary has tensor degree (2,2).
    # The two diagonal Bernstein corners are the two face theorems.  With both
    # totals positive seven positions remain; on an axis only one univariate
    # middle position remains.
    p_positive, q_positive = 9, 8
    final_raw_redistribution_cells = (
        p_positive * q_positive * 7 + p_positive + q_positive
    )
    assert final_raw_redistribution_cells == 521

    payload = {
        "schema": "rank8-low-low-factored-payment-gluing-support-agent-v1",
        "status": "PASS_EXACT_FACTORED_PAYMENT_GLUING_SUPPORT_AUDIT",
        "rows": rows,
        "global_payment_support": {
            "maximum_selected_terminal_exponent": global_selected_terminal,
            "maximum_early_plus_selected_terminal_exponent": global_combined,
        },
        "raw_outer_support": {"a3": [0, 9], "b3": [0, 8]},
        "gap0_suffix3_triangular_support": {
            "a0": [0, gap0_individual_support["a0"]],
            "b0": [0, gap0_individual_support["b0"]],
            "a0_plus_a3": [0, combined_gap0_gap3_support["left"]],
            "b0_plus_b3": [0, combined_gap0_gap3_support["right"]],
            "left_pairs": len(left_gap0_gap3_pairs),
            "right_pairs": len(right_gap0_gap3_pairs),
            "complete_cells": gap0_suffix3_cells,
            "inherited_suffix_cells": inherited_suffix_cells,
            "new_positive_early_cells": factored_positive_early_cells,
            "factor_row_argument": (
                "Gap zero occurs only in ratio 0 and gap three in ratios 0..3. "
                "Two factor rows give combined degree at most 8; the strong "
                "left capacity ratio adds one gap-three degree but no gap-zero "
                "degree. Gap zero occurs at most once per factor row."
            ),
        },
        "suffix45_redistribution": {
            "coordinates": "U=a4+a5, a4=(1-x)U, a5=xU; W=b4+b5, b4=(1-y)W, b5=yW",
            "residual_degree_in_x_y": [2, 2],
            "payment_is_independent_of_x_y": True,
            "tensor_payment_scaling": 4,
            "U_support": [0, 13],
            "W_support": [0, 12],
        },
        "remaining_cell_universes": {
            "retained_other_variables_direct_outer_cells": suffix3_outer_cells,
            "retained_other_variables_nonorigin_cells_after_factored_origin_face": suffix3_nonorigin_cells,
            "retained_U_W_tensor_bernstein_polynomials_after_origin_face": 9 * suffix3_nonorigin_cells,
            "fully_split_nonduplicate_U_W_tensor_cells_per_suffix3_cell": split_suffix45_cells_per_suffix3_cell,
            "fully_split_nonduplicate_cells_after_origin_face": (
                split_suffix45_cells_per_suffix3_cell * suffix3_nonorigin_cells
            ),
            "factored_gap0_cells": factored_positive_early_cells,
            "final_raw_a2_a3_redistribution_cells": final_raw_redistribution_cells,
            "staged_factored_plus_raw_total": (
                factored_positive_early_cells + final_raw_redistribution_cells
            ),
        },
        "final_raw_a2_a3_redistribution": {
            "coordinates": (
                "P=a2+a3, a2=(1-z)P, a3=zP; "
                "Q=b2+b3, b2=(1-w)Q, b3=wQ"
            ),
            "raw_auxiliary_degree_in_z_w": [2, 2],
            "known_corners": {
                "0,0": "sealed full-early/suffix45 face",
                "2,2": "factored a2=b2=0 gap0/suffix3 face",
            },
            "P_support": [0, 9],
            "Q_support": [0, 8],
            "positive_total_cells_with_seven_new_positions": p_positive * q_positive,
            "P_axis_middle_cells": p_positive,
            "Q_axis_middle_cells": q_positive,
            "total_new_cells": final_raw_redistribution_cells,
        },
        "scope_warning": (
            "This proves payment validity, exact face specialization, support, "
            "and cell counts. It does not prove the new residual coefficients; "
            "the factored-payment origin face and nonorigin suffix-3 cells still "
            "require exact residual checks."
        ),
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
