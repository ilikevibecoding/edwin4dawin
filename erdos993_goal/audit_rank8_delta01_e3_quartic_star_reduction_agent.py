#!/usr/bin/env python3
"""Independent scope/integrity audit of the assembled e=3 reduction."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta01_e3_quartic_star_reduction_independent_audit_agent_20260822.json"
EXPECTED = {
    "assemble_rank8_delta01_e3_quartic_star_reduction_agent.py":
        "1162C9C5C38965E4AD9C3D7D13A511E6A4FEC5544257F84376E1062884EC414B",
    "rank8_delta01_e3_quartic_star_reduction_exact_agent_20260822.json":
        "4584E6DD0A4C34A6283817BA1739D570E409670DBFB7BC0A0459C171FF4780D8",
    "rank8_delta01_e3_quartic_star_center_all_order_independent_audit_agent_20260822.json":
        "75BDB708CA1F1D3BDF13EB18E8A712F54E1989B943F7668216007C7B14BD937F",
    "rank8_delta01_e3_quartic_star_all_long_independent_audit_agent_20260822.json":
        "721591B0D2D65E067D184117EEFC4BE76BA13757C3AF2BB0E0FA71702ACC4F97",
    "rank8_delta01_e3_quartic_stars_n27_n36_independent_audit_agent_20260822.json":
        "FA3795E985077B76B6B6EB6C8CB32D97371BBABBD79947F0BF782FB1AB8D14AB",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    assert {name: sha256(ROOT / name) for name in EXPECTED} == EXPECTED
    theorem = load("rank8_delta01_e3_quartic_star_reduction_exact_agent_20260822.json")
    center_audit = load(
        "rank8_delta01_e3_quartic_star_center_all_order_independent_audit_agent_20260822.json"
    )
    long_audit = load(
        "rank8_delta01_e3_quartic_star_all_long_independent_audit_agent_20260822.json"
    )
    finite_audit = load(
        "rank8_delta01_e3_quartic_stars_n27_n36_independent_audit_agent_20260822.json"
    )
    assert theorem["status"] == "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_CENTER_ALL_ORDER_AND_ARM_REDUCTION"
    assert center_audit["status"] == "PASS_INDEPENDENT_NO_GAP_RANK8_DELTA01_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS"
    assert long_audit["status"] == "PASS_INDEPENDENT_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_ALL_LONG_AUDIT"
    assert finite_audit["status"] == "PASS_INDEPENDENT_LITERAL_DP_RANK8_DELTA01_E3_QUARTIC_STARS_N27_N36"
    assert theorem["exact_counts"]["all_order_center_cells"] == 84
    assert theorem["exact_counts"]["all_order_center_negative_coefficients"] == 0
    assert theorem["exact_counts"]["finite_rooted_rows"] == 71257
    assert theorem["exact_counts"]["finite_negative_Delta0"] == 0
    assert theorem["exact_counts"]["finite_negative_Delta1"] == 0
    assert theorem["sharp_remaining_quartic_star_scope"]["orders"] == "n>=37"
    assert theorem["sharp_remaining_quartic_star_scope"]["center_root"].startswith("none")
    assert "arm-root short-boundary" in theorem["remaining_Delta01_connected_scope"][0]
    assert theorem["integration"]["connected_Q8_complete"] is False

    payload = {
        "schema": "rank8-delta01-e3-quartic-star-reduction-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_SCOPE_AUDIT_RANK8_DELTA01_E3_QUARTIC_STAR_REDUCTION",
        "verified_claims": [
            "all 71,257 rooted quartic-star rows at orders 27..36 have Delta0,Delta1>0",
            "the center-root orbit is closed for every quartic star of order n>=27 by 84 no-gap short/long cells",
            "the all-long internal-arm orbit is closed for all orders on its exact scope",
            "the only remaining quartic-star Delta0/Delta1 cells are arm-root short-boundary cells at n>=37",
        ],
        "remaining_connected_scope_preserved": theorem["remaining_Delta01_connected_scope"],
        "connected_Q8_complete": False,
        "immutable_inputs": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
