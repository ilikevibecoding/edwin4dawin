#!/usr/bin/env python3
"""Fail-closed assembly of the new Delta0/Delta1 e=3 quartic-star reduction."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_quartic_star_reduction_exact_agent_20260822.json"
EXPECTED = {
    "probe_rank8_delta01_e3_quartic_star_all_long_compressed_agent.py":
        "E99684BB7F42C00DC797A60B430BC1CBABFE8E9903F5C6A5F47E212D756464D9",
    "rank8_delta01_e3_quartic_star_center_all_long_compressed_agent_20260822.json":
        "B85734614D101BB6E83B4BA73DDEFF782597DB755F33EE033BD035F1D09A95AD",
    "rank8_delta01_e3_quartic_star_arm_all_long_compressed_agent_20260822.json":
        "B4532D4B1D4B9714DC29D6454812D554B4721687338AD497B2DB6D7617770ED5",
    "audit_rank8_delta01_e3_quartic_star_all_long_agent.py":
        "F47B67DE61C3D0D252E4F70FF3554EB1DA48C115AEFA0DA76583205CB8F4FFEA",
    "rank8_delta01_e3_quartic_star_all_long_independent_audit_agent_20260822.json":
        "721591B0D2D65E067D184117EEFC4BE76BA13757C3AF2BB0E0FA71702ACC4F97",
    "verify_rank8_delta01_e3_quartic_star_center_all_order_agent.py":
        "F1281058A018ADDFE11F26700BEF14EC6C96A79E461BE19EBD86D2EB40AA1F11",
    "rank8_delta01_e3_quartic_star_center_all_order_exact_agent_20260822.json":
        "BECC0BD392E70EF54CAE44155C334C79A669379CAB3EC578D45C0C317DFB1A34",
    "audit_rank8_delta01_e3_quartic_star_center_all_order_agent.py":
        "3D4DCEF28CE8F547A8F6093C8A4820B682E458F2C139C3E6B56A7C114CA596FE",
    "rank8_delta01_e3_quartic_star_center_all_order_independent_audit_agent_20260822.json":
        "75BDB708CA1F1D3BDF13EB18E8A712F54E1989B943F7668216007C7B14BD937F",
    "scan_rank8_delta01_e3_quartic_stars_n27_n36_agent.py":
        "12269BCEA8F1BDF1FEECAB00E8622D5FD4F5BE19BACAB5F6804032B91A10B416",
    "rank8_delta01_e3_quartic_stars_n27_n36_exact_agent_20260822.json":
        "0BD25498A6C35D33B4109D5AB674239A80426B2F1FC2E653F2E40B852E531879",
    "audit_rank8_delta01_e3_quartic_stars_n27_n36_agent.py":
        "94A14B56E224EEF5136B3756AD0C4652F0FECC1A68BB46E932FB3B949F56C201",
    "rank8_delta01_e3_quartic_stars_n27_n36_independent_audit_agent_20260822.json":
        "FA3795E985077B76B6B6EB6C8CB32D97371BBABBD79947F0BF782FB1AB8D14AB",
    "rank8_connected_q8_integration_readonly_20260820.json":
        "440B5783DAB918BBF1DBAAC49D24166ADACFA38740399D7AC4E03EF1D02E4BC6",
    "rank8_connected_integration_bridge1_refresh_exact_20260821.json":
        "C70B0D45C5FAA46D1755A6ADA14B035CCE47DBE233EE5CA714CB4C8C29AC7316",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    center = load(
        "rank8_delta01_e3_quartic_star_center_all_long_compressed_agent_20260822.json"
    )
    arm = load(
        "rank8_delta01_e3_quartic_star_arm_all_long_compressed_agent_20260822.json"
    )
    long_audit = load(
        "rank8_delta01_e3_quartic_star_all_long_independent_audit_agent_20260822.json"
    )
    center_all = load(
        "rank8_delta01_e3_quartic_star_center_all_order_exact_agent_20260822.json"
    )
    center_all_audit = load(
        "rank8_delta01_e3_quartic_star_center_all_order_independent_audit_agent_20260822.json"
    )
    finite = load(
        "rank8_delta01_e3_quartic_stars_n27_n36_exact_agent_20260822.json"
    )
    finite_audit = load(
        "rank8_delta01_e3_quartic_stars_n27_n36_independent_audit_agent_20260822.json"
    )
    connected = load("rank8_connected_q8_integration_readonly_20260820.json")
    refresh = load("rank8_connected_integration_bridge1_refresh_exact_20260821.json")

    for report, expected_cell, terms in ((center, "center", 406), (arm, "arm", 4060)):
        assert report["status"] == "PASS_EXACT_POSITIVE_COMPRESSED_COEFFICIENT_CELL"
        assert report["cell"] == expected_cell
        assert report["degree_surplus"] == 3
        for rank in ("0", "1"):
            row = report["ranks"][rank]
            assert row["terms"] == terms
            assert row["negative_coefficients"] == 0
            assert row["zero_coefficients"] == 0
            assert row["positive_coefficients"] == terms
    assert long_audit["status"] == "PASS_INDEPENDENT_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_ALL_LONG_AUDIT"
    assert long_audit["remaining_exact_e3_scope"] == [
        "all short-boundary quartic-star root cells",
        "the distinct e=3 skeleton with three degree-three vertices",
    ]
    assert center_all["status"] == "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS"
    assert center_all["no_gap_short_long_partition"]["total_cells"] == 84
    assert center_all["rank_totals"]["0"]["coefficients"] == 4998
    assert center_all["rank_totals"]["1"]["coefficients"] == 4998
    assert center_all_audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_DELTA01_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS"
    assert center_all_audit["independent_literal_constants"]["rank_constants"] == 168
    assert finite["status"] == "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STARS_ALL_ROOTS_N27_N36"
    assert finite["totals"] == {"canonical_cores": 2208, "rooted_rows": 71257}
    assert finite["negative_rows"] == {"0": 0, "1": 0}
    assert finite_audit["status"] == "PASS_INDEPENDENT_LITERAL_DP_RANK8_DELTA01_E3_QUARTIC_STARS_N27_N36"
    assert finite_audit["totals"] == finite["totals"]
    assert finite_audit["global_minimum_values"] == finite["global_minimum_values"]
    assert connected["status"] == "PENDING_EXACT_RANK8_CONNECTED_Q8_INTEGRATION_DELTA0_3_N27_PLUS"
    assert connected["connected_Q8_complete"] is False
    assert connected["exact_connected_Q8_gap"]["coefficient_ranks"] == [0, 1, 2, 3]
    assert refresh["connected_Q8_complete"] is False

    payload = {
        "schema": "rank8-delta01-e3-quartic-star-reduction-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_CENTER_ALL_ORDER_AND_ARM_REDUCTION",
        "theorem": {
            "finite_band": (
                "For every rooted subdivision of the four-arm star of order "
                "27<=n<=36, Delta0>0 and Delta1>0."
            ),
            "all_order_center": (
                "For the degree-four center root of every subdivided four-arm "
                "star of order n>=27, Delta0>0 and Delta1>0, with no arm-length restriction."
            ),
            "all_long_arm": (
                "For a root internal to a pendant arm, Delta0>0 and Delta1>0 "
                "whenever at least seven vertices lie strictly on each side "
                "of the root along that arm and each of the other three arms "
                "has length at least seven."
            ),
        },
        "classification": {
            "degree_surplus_definition": "e(A)=sum_v binom(deg(v)-1,2)",
            "e3_skeletons": [
                "one degree-four vertex: the quartic-star skeleton closed here on the stated scopes",
                "three degree-three vertices: a distinct five-leaf cubic skeleton, still open",
            ],
        },
        "exact_counts": {
            "finite_orders": [27, 36],
            "finite_canonical_cores": 2208,
            "finite_rooted_rows": 71257,
            "finite_negative_Delta0": 0,
            "finite_negative_Delta1": 0,
            "all_order_center_cells": 84,
            "all_order_center_coefficients": {"Delta0": 4998, "Delta1": 4998},
            "all_order_center_negative_coefficients": 0,
            "all_long_center_coefficients": {"Delta0": 406, "Delta1": 406},
            "all_long_arm_coefficients": {"Delta0": 4060, "Delta1": 4060},
            "all_long_negative_coefficients": 0,
            "minimum_symbolic_coefficients": {
                "Delta0": center["ranks"]["0"]["minimum_coefficient"],
                "Delta1": center["ranks"]["1"]["minimum_coefficient"],
            },
            "finite_global_minimum_values": finite["global_minimum_values"],
        },
        "sharp_remaining_quartic_star_scope": {
            "orders": "n>=37",
            "center_root": "none; the center orbit is complete for every n>=27",
            "arm_root": (
                "at least one of: near segment <=6, tail segment <=6, or one "
                "of the other three arms has length <=6"
            ),
            "meaning": "the remaining quartic-star obligation is purely a short-boundary problem",
        },
        "remaining_Delta01_connected_scope": [
            "only the stated quartic-star arm-root short-boundary cells for n>=37",
            "all rooted cells of the e=3 three-degree-three-vertex skeleton not covered elsewhere",
            "the previously identified e=2 short-boundary cells from order 31",
            "all e>=4 rooted-core families not covered by existing special theorems",
        ],
        "integration": {
            "base_connected_report_sha256": EXPECTED[
                "rank8_connected_q8_integration_readonly_20260820.json"
            ],
            "previous_gap": connected["exact_connected_Q8_gap"]["remaining_structural_layer_after_exact_faces"],
            "new_effect": (
                "removes the complete n=27..36 quartic-star finite band and "
                "the complete all-order center-root orbit, plus the all-long "
                "arm-root orbit, from the Delta0/Delta1 remainder"
            ),
            "connected_Q8_complete": False,
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This proves a new exact Delta0/Delta1 subtheorem and reduction. "
            "It does not close Delta0/Delta1 generally, Delta2/Delta3 on e=3, "
            "connected Q8, forest Q8, rank-eight PGC, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
