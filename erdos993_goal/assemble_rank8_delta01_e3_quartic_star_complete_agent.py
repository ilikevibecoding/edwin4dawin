#!/usr/bin/env python3
"""Fail-closed assembly of the complete Delta0/Delta1 quartic-star theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_quartic_star_complete_exact_agent_20260822.json"
EXPECTED = {
    "scan_rank8_delta01_e3_quartic_stars_n27_n36_agent.py":
        "12269BCEA8F1BDF1FEECAB00E8622D5FD4F5BE19BACAB5F6804032B91A10B416",
    "rank8_delta01_e3_quartic_stars_n27_n36_exact_agent_20260822.json":
        "0BD25498A6C35D33B4109D5AB674239A80426B2F1FC2E653F2E40B852E531879",
    "audit_rank8_delta01_e3_quartic_stars_n27_n36_agent.py":
        "94A14B56E224EEF5136B3756AD0C4652F0FECC1A68BB46E932FB3B949F56C201",
    "rank8_delta01_e3_quartic_stars_n27_n36_independent_audit_agent_20260822.json":
        "FA3795E985077B76B6B6EB6C8CB32D97371BBABBD79947F0BF782FB1AB8D14AB",
    "verify_rank8_delta01_e3_quartic_star_center_all_order_agent.py":
        "F1281058A018ADDFE11F26700BEF14EC6C96A79E461BE19EBD86D2EB40AA1F11",
    "rank8_delta01_e3_quartic_star_center_all_order_exact_agent_20260822.json":
        "BECC0BD392E70EF54CAE44155C334C79A669379CAB3EC578D45C0C317DFB1A34",
    "audit_rank8_delta01_e3_quartic_star_center_all_order_agent.py":
        "3D4DCEF28CE8F547A8F6093C8A4820B682E458F2C139C3E6B56A7C114CA596FE",
    "rank8_delta01_e3_quartic_star_center_all_order_independent_audit_agent_20260822.json":
        "75BDB708CA1F1D3BDF13EB18E8A712F54E1989B943F7668216007C7B14BD937F",
    "verify_rank8_delta01_e3_quartic_star_arm_short_boundary_flint_agent.py":
        "56EFD77C357C6225C99B0CBA2B6BAA75ED014E4D6E6BA15E22E037A552965753",
    "rank8_delta01_e3_quartic_star_arm_short_boundary_exact_agent_20260822.json":
        "F9F20951F5B8566EADE765853CEBD20E70C33F8D2E784D2A8E7724027E9B0310",
    "audit_rank8_delta01_e3_quartic_star_arm_short_boundary_agent.py":
        "46EEBDA2C449062D805F65989032B8337CDC5AC2874A8C955FC564DBB2AC2CE1",
    "rank8_delta01_e3_quartic_star_arm_short_boundary_independent_audit_agent_20260822.json":
        "235DA88F4B6EDCFE910D5723CABFC1F4B5867AB69A281507A966DE3DB0CF4D09",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    finite = load("rank8_delta01_e3_quartic_stars_n27_n36_exact_agent_20260822.json")
    finite_audit = load("rank8_delta01_e3_quartic_stars_n27_n36_independent_audit_agent_20260822.json")
    center = load("rank8_delta01_e3_quartic_star_center_all_order_exact_agent_20260822.json")
    center_audit = load("rank8_delta01_e3_quartic_star_center_all_order_independent_audit_agent_20260822.json")
    arm = load("rank8_delta01_e3_quartic_star_arm_short_boundary_exact_agent_20260822.json")
    arm_audit = load("rank8_delta01_e3_quartic_star_arm_short_boundary_independent_audit_agent_20260822.json")
    assert finite["status"] == "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STARS_ALL_ROOTS_N27_N36"
    assert finite_audit["status"] == "PASS_INDEPENDENT_LITERAL_DP_RANK8_DELTA01_E3_QUARTIC_STARS_N27_N36"
    assert center["status"] == "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS"
    assert center_audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_DELTA01_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS"
    assert arm["status"] == "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_ARM_ALL_N37_PLUS"
    assert arm_audit["status"] == "PASS_INDEPENDENT_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_ARM_ALL_N37_PLUS"
    assert finite["orders"][0]["order"] == 27 and finite["orders"][-1]["order"] == 36
    assert arm["no_gap_cover"]["computed_shifted_cells"] == 3133
    assert arm["no_gap_cover"]["inherited_all_long_cells"] == 1
    assert arm_audit["all_cell_literal_dp"]["exact_matches"] == 6266
    assert arm_audit["second_engine_full_polynomials"]["full_polynomial_hash_matches"] == 50
    for rank in ("0", "1"):
        assert arm["rank_totals"][rank]["negative_coefficients"] == 0
        assert arm["rank_totals"][rank]["zero_coefficients"] == 0

    payload = {
        "schema": "rank8-delta01-e3-quartic-star-complete-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_COMPLETE_N27_PLUS",
        "theorem": (
            "For every rooted subdivision A of the four-arm star with |A|>=27, "
            "Delta0(A)>0 and Delta1(A)>0."
        ),
        "exhaustive_root_order_partition": [
            {
                "orders": "27<=n<=36",
                "roots": "all roots",
                "certificate": "exact finite all-root census",
            },
            {
                "orders": "n>=37",
                "roots": "unique degree-four center",
                "certificate": "no-gap all-order center coefficient theorem (valid already from n=27)",
            },
            {
                "orders": "n>=37",
                "roots": "every noncenter arm vertex",
                "certificate": "3,133 computed short/long cells plus one inherited all-long cell",
            },
        ],
        "exact_evidence": {
            "finite_canonical_cores_n27_n36": finite["totals"]["canonical_cores"],
            "finite_rooted_rows_n27_n36": finite["totals"]["rooted_rows"],
            "center_all_order_cells": center["no_gap_short_long_partition"]["total_cells"],
            "arm_n37_plus_computed_cells": arm["no_gap_cover"]["computed_shifted_cells"],
            "arm_n37_plus_inherited_cells": arm["no_gap_cover"]["inherited_all_long_cells"],
            "arm_coefficients": {
                "Delta0": arm["rank_totals"]["0"]["coefficients"],
                "Delta1": arm["rank_totals"]["1"]["coefficients"],
            },
            "arm_negative_coefficients": {"Delta0": 0, "Delta1": 0},
            "arm_minimum_coefficients": {
                "Delta0": arm["rank_totals"]["0"]["minimum_coefficient"],
                "Delta1": arm["rank_totals"]["1"]["minimum_coefficient"],
            },
            "independent_arm_literal_constant_matches": 6266,
            "independent_second_engine_polynomial_hash_matches": 50,
        },
        "classification_effect": (
            "The e=3 skeleton with one degree-four vertex is completely removed "
            "from the connected Delta0/Delta1 remainder for n>=27."
        ),
        "remaining_e3_Delta01_skeleton": (
            "the distinct five-leaf skeleton with exactly three degree-three vertices"
        ),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes one e=3 skeleton only for Delta0/Delta1. It does not "
            "close the cubic e=3 skeleton, Delta2/Delta3, connected Q8, forest Q8, "
            "rank-eight PGC, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
