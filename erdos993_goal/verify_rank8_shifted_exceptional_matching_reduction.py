#!/usr/bin/env python3
"""Exact matching reduction for rank-eight shifted exceptional cores 21--26.

No tree stream is run.  The verifier derives the twelve possible
(order,alpha) cells, maps their first required terminal member to the
already-exhausted alpha-14 matching-quotient boundary, and audits which
entire terminal families are already paid by the residual/Q7 decomposition.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
BOUNDARY = ROOT / "rank8_pgc_matching_quotient_boundary_exact_20260817.json"
BASE = ROOT / "rank8_pgc_census_wave23_exact_20260817.json"
FINITE = ROOT / "rank8_terminal_delta04_finite_n1_n22_exact_20260820.json"
HIGH = ROOT / "rank8_q8_terminal_delta5_all_order_replay_20260817.json"
OUTPUT = ROOT / "rank8_shifted_exceptional_matching_reduction_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    boundary = json.loads(BOUNDARY.read_text(encoding="utf-8"))
    base = json.loads(BASE.read_text(encoding="utf-8"))
    finite = json.loads(FINITE.read_text(encoding="utf-8"))
    high = json.loads(HIGH.read_text(encoding="utf-8"))
    assert boundary["status"] == "PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS"
    assert finite["status"] == "PASS_EXACT_RANK8_TERMINAL_DELTA0_4_FINITE_CENSUS_N1_N22"
    assert base["status"] == "PASS_EXACT_FINITE_RANK8_PGC_CENSUS_THROUGH_ORDER_18_NOT_THEOREM"
    assert base["forest_functionals"]["negative_required_rows"]["Q8_alpha_at_least_14"] == 0
    assert high["status"] == "PASS"
    assert high["remaining_terminal_coefficients"] == [0, 1, 2, 3, 4]
    cells = {(row["order"], row["alpha"]): row for row in boundary["cells"]}
    finite_rows = {row["order"]: row for row in finite["rows"]}

    rows = []
    for order in range(21, 27):
        for alpha in range((order + 1) // 2, 14):
            matching = order - alpha
            t0 = 14 - alpha
            threshold_order = order + t0 + 1
            threshold_matching = threshold_order - 14
            threshold_unmatched = 2 * 14 - threshold_order
            assert threshold_matching == matching + 1
            assert 23 <= threshold_order <= 28
            threshold_cell = cells[(threshold_order, 14)]
            assert threshold_cell["matching"] == threshold_matching
            assert threshold_cell["unmatched"] == threshold_unmatched
            assert threshold_cell["q_negative"] == 0

            core_q8_paid = False
            q7_deleted_paid_conditionally = False
            residual_paid = False
            family_closed_conditionally = False
            if alpha == 13:
                core_cell = cells[(order, 13)]
                assert core_cell["matching"] == matching
                assert core_cell["q_negative"] == 0
                core_q8_paid = True
                q7_deleted_paid_conditionally = True  # alpha(A-q)>=12
                if order <= 22:
                    low = finite_rows[order]["minima_Delta0_through_Delta4"]
                    assert all(value >= 0 for value in low)
                    residual_paid = True
                    family_closed_conditionally = True

            rows.append(
                {
                    "core_order": order,
                    "core_alpha": alpha,
                    "core_matching": matching,
                    "first_required_t": t0,
                    "threshold_order": threshold_order,
                    "threshold_alpha": 14,
                    "threshold_matching": threshold_matching,
                    "threshold_unmatched": threshold_unmatched,
                    "threshold_Q8_negative_states": threshold_cell["q_negative"],
                    "threshold_matching_valid_expansions": threshold_cell["valid_expansions"],
                    "threshold_pendant_support_states": threshold_cell["support_states"],
                    "Q8_core_paid_by_alpha13_boundary": core_q8_paid,
                    "Q7_deleted_paid_conditional_on_rank7_theorem": q7_deleted_paid_conditionally,
                    "all_residual_coefficients_paid": residual_paid,
                    "shifted_coefficients_C8_through_C15_paid": True,
                    "whole_terminal_family_closed_conditional_on_Q7": family_closed_conditionally,
                }
            )

    assert len(rows) == 12
    closed = [row for row in rows if row["whole_terminal_family_closed_conditional_on_Q7"]]
    assert [(row["core_order"], row["core_alpha"]) for row in closed] == [(21, 13), (22, 13)]
    assert all(row["threshold_Q8_negative_states"] == 0 for row in rows)

    # The boundary report's Q8 statistic proves the threshold value C0 only.
    # If P is the threshold graph and H=A-q, adding one further sibling gives
    # p'_j=p_j+p_(j-1)-h_(j-2).  The exact first shifted coefficient therefore
    # depends on the support-deleted jet, not Q8(P) alone.
    p7, p8, p9, d7, d8, d9 = sp.symbols("p7 p8 p9 d7 d8 d9")
    q8 = 16 * p8**2 - p7 * p8 - 18 * p7 * p9
    q8_next = 16 * (p8 + d8) ** 2 - (p7 + d7) * (p8 + d8) - 18 * (p7 + d7) * (p9 + d9)
    first_shift = sp.factor(q8_next - q8)
    expected = (
        16 * (2 * p8 * d8 + d8**2)
        - (p7 * d8 + p8 * d7 + d7 * d8)
        - 18 * (p7 * d9 + p9 * d7 + d7 * d9)
    )
    assert sp.expand(first_shift - expected) == 0
    relaxed = {p7: 1, p8: 1, p9: 0, d7: 1, d8: 0, d9: 1}
    assert q8.subs(relaxed) == 15
    assert first_shift.subs(relaxed) == -37

    threshold_unique = {(row["threshold_order"], 14) for row in rows}
    threshold_state_total = sum(cells[key]["support_states"] for key in threshold_unique)
    payload = {
        "status": "PASS_EXACT_RANK8_SHIFTED_EXCEPTIONAL_MATCHING_REDUCTION",
        "matching_identity": "for every forest, alpha=n-nu; exceptional cores 21<=n<=26 and alpha<=13 give exactly the twelve listed cells",
        "threshold_map": "G_t has order n+t+1 and alpha(A)+t; at t0=14-alpha(A), its matching number is nu(A)+1",
        "Q8_boundary_corollary": {
            "statement": "Q8(F)>=0 for every forest with alpha(F)=14; in particular every first-required exceptional terminal member is paid",
            "reason": "a forest with alpha 14 has order at most 28, every non-edgeless forest has a pendant edge, and the complete matching-quotient cells through order 28 have q_negative=0",
            "threshold_orders_used": sorted(order for order, _ in threshold_unique),
            "distinct_boundary_support_states_behind_certificate": threshold_state_total,
        },
        "Q8_alpha13_corollary": "The same no-gap report has q_negative=0 through the maximum possible order 26, so Q8(F)>=0 for every forest with alpha(F)=13.",
        "new_whole_family_closure_conditional_on_rank7_Q7": [
            {"core_order": 21, "core_alpha": 13},
            {"core_order": 22, "core_alpha": 13},
        ],
        "closure_reason": "Q8(A)>=0 by the alpha-13 boundary, Q7(A-q)>=0 because alpha(A-q)>=12, Delta0--Delta4 by the exact order-21/22 census, and Delta5--Delta15 by the existing all-order packages.",
        "universal_high_shifted_cutoff": {
            "statement": "C8 through C15 are nonnegative in all twelve exceptional cells",
            "reason": "the two reserve terms are multiples of p7(t), which has degree 7, while every residual Delta5 through Delta15 is nonnegative; after any positive shift, residual coefficient C_j is a nonnegative binomial sum of Delta^k with k>=j",
        },
        "rows": rows,
        "precise_obstruction": {
            "first_shift_identity": str(first_shift),
            "increment_definition": "d_j=p_(j-1)-h_(j-2), because p'_j=p_j+p_(j-1)-h_(j-2)",
            "relaxed_non_graph_witness": {
                "jet": {"p7": 1, "p8": 1, "p9": 0, "d7": 1, "d8": 0, "d9": 1},
                "Q8_threshold": 15,
                "first_shift": -37,
            },
            "interpretation": "q_negative=0 certifies C0 but cannot algebraically certify C1; the witness is a relaxed jet, not a forest counterexample. Per-support full/reduced jets or a new structural inequality are required for the remaining alpha-11/12 cells.",
        },
        "remaining_cells": {
            "alpha13_orders23_26": "C0 and C5--C15 are paid; conditional Q7 and Q8(A) are paid; only residual Delta1--Delta4 remain",
            "alpha12_orders21_22": "C0 and C8--C15 are paid; residual Delta1--Delta15 is paid; only reserve-coupled C1--C7 remain",
            "alpha12_orders23_24": "C0 and C8--C15 are paid; C1--C7 remain, with residual Delta1--Delta4 also open",
            "alpha11_orders21_22": "C0 and C8--C15 are paid; residual Delta1--Delta15 is paid; only reserve-coupled C1--C7 remain",
        },
        "artifacts_sha256": {
            BOUNDARY.name: sha256(BOUNDARY),
            BASE.name: sha256(BASE),
            FINITE.name: sha256(FINITE),
            HIGH.name: sha256(HIGH),
            Path(__file__).name: sha256(Path(__file__)),
        },
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
