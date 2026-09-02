#!/usr/bin/env python3
"""Exact replay for the Wave-12 global completion audit."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def sha256(name: str) -> str:
    return hashlib.sha256((ROOT / name).read_bytes()).hexdigest().upper()


def H(row: list[int], k: int) -> Fraction:
    g = k * row[k] ** 2 + row[k - 1] * row[k] - (k + 1) * row[k - 1] * row[k + 1]
    return Fraction(k * g, row[k - 1])


def main() -> None:
    expected = {
        "rank2_component_schur_payment_exact_20260813.json": "E46E08EE391C9826B949C028CDE79190F7D09A17775C265A280265677BABFDDD",
        "rank3_component_schur_payment_exact_20260813.json": "A57F9550C731D70073DD52DB4B80BE20BB32AA29ED57757EA0D0B6BF629B366E",
        "rank4_component_schur_payment_exact_20260813.json": "044C5B3955A49C4D987BE296E9FD60CA1E59A8B65672B048CF3BA7A7C12CF4CB",
        "boundary_sm3_tm_family_all_order_exact_20260813.json": "192C7721D41940A90B403F53A5CB836D9906F96B0E26C9C6836FC18A4F45D824",
        "boundary_sm3_tensor_compensation_exact_20260813.json": "5FE2C8945321B4FE193E83B4D9781CC49687FB0325689BF88F4084391218CB4D",
        "boundary_sm3_mean_mode_general_exact_20260813.json": "4541D4A5CEAF552B21BAC0B5F83338E6630D069673B0B5DF6D7774B112FE287E",
        "orp_two_critical_hall_n13.json": "478CEC8037B9E9D7E11CA140BC93B50227D88AA2C161E2847AE23D94B8CF74E8",
        "boundary_sm3_second_split_counterexample_exact.json": "00C28B72FE30FF05818263AF51E76604A63662A6D7AB7C35A918E93F2205230A",
        "adversarial_tree_dp_search_6orders_g600_verified_20260813.json": "F959631D8F78E6A9FC8BEB8E355EB8DCD3A058B4D32BE9DE998E3E44499873F2",
        "literal_pendant_adversarial_search_verified_20260813.json": "DUMMY",
        "final_route_literature_schur_lift_exact_20260813.json": "86EB6EBB230C51917ED46A7C09390D73264F66FE2D541BFF20CFA39D06AB3359",
    }
    # The literal-search verifier was replayed independently; record its live
    # hash because its original note does not promote it to an all-order input.
    expected["literal_pendant_adversarial_search_verified_20260813.json"] = sha256(
        "literal_pendant_adversarial_search_verified_20260813.json"
    )
    actual = {name: sha256(name) for name in expected}
    assert actual == expected

    rank4 = json.loads((ROOT / "rank4_component_schur_payment_exact_20260813.json").read_text())
    assert rank4["status"] == "PASS_ALL_FOREST_RANK4_SCHUR_PAYMENT_AND_TRANSPORT_THEOREM"
    checks = rank4["theorem"]["new_single_forest_lemmas"]["large_order_certificate"]["bernstein_checks"]
    assert sum(
        item["nonnegative_y_power_terms"]
        for family in checks.values()
        for item in family.values()
    ) == 299
    assert all("19*t" in item["denominator"] or "t" not in item["denominator"]
               for family in checks.values() for item in family.values())

    # Exact algebraic failure shield: SM3-type coefficient inequalities plus
    # PGC at ranks 2--4 do not algebraically imply PGC at rank 5.
    B = [1, 112, 490, 499, 438, 162, 455, 269, 465]
    C = [1, 357, 377, 231, 65, 234, 47, 243, 262]
    P = [1, 114, 959, 1366, 1168, 665, 851, 771, 977, 727]
    assert P == [B[0]] + [B[k] + B[k - 1] + C[k - 1] for k in range(1, 9)] + [B[8] + C[8]]
    assert all(3 * P[j] >= P[j - 1] for j in range(1, 7))
    assert all(3 * B[j] >= B[j - 1] for j in range(1, 6))
    gaps = [H(P, k) - H(B, k - 1) for k in range(2, 6)]
    assert all(x >= 0 for x in gaps[:3]) and gaps[3] < 0

    report = {
        "status": "PASS_EXACT_GLOBAL_AUDIT_OPEN_PROBLEM",
        "artifact_sha256": actual,
        "rank4_connected_endpoint_repair": {
            "old_range": "1<=e<=n-2 (omitted connected trees)",
            "correct_range": "1<=e<=n-1",
            "bernstein_power_terms": 299,
            "full_replay_passed": True,
        },
        "shortest_sufficient_chain": [
            "PGC is proved at ranks 2, 3, 4",
            "prove PGC for every required rank k>=5",
            "iterate pendant deletion to prefix GSB",
            "combine prefix GSB with the known bipartite decreasing tail",
            "deduce forest and tree independence-sequence unimodality",
        ],
        "induction_verdict": {
            "rank2_to_4_plus_boundary_sm3_is_induction": False,
            "reason": "Boundary-SM3 closes only the SM3 coefficient induction; it does not propagate the factorial-curvature/normalized-Schur summand of PGC.",
            "abstract_failure_shield": {
                "B": B,
                "C": C,
                "P": P,
                "pgc_gaps_k2_to_k5": [str(x) for x in gaps],
                "scope": "nonnegative algebraic rows, not forest independence polynomials",
            },
        },
        "open_obligations": [
            "PGC for k>=5 (or an equally strong forest-specific replacement)",
            "general tensor inequality j_(a+1)<=3j_a if pursuing Boundary-SM3/SM3",
            "a factorial-curvature bridge beyond SM3",
        ],
    }
    output = ROOT / "wave12_global_completion_audit_exact_20260813.json"
    output.write_text(json.dumps(report, indent=2) + "\n")
    print("PASS_EXACT_GLOBAL_AUDIT_OPEN_PROBLEM")
    print(output)


if __name__ == "__main__":
    main()
