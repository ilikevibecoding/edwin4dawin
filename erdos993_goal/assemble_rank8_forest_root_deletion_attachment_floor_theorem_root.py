#!/usr/bin/env python3
"""Fail-closed gate for the all-forest root-deletion attachment theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_forest_root_deletion_attachment_floor_theorem_root_20260825.json"
EXPECTED = {
    "verify_rank8_root_deletion_attachment_floor_root.py":
        "A85C87DDF0106936BE3CDC699DA330F1EB4B0BE45BA711C2DA27956B65BD6AE8",
    "rank8_root_deletion_attachment_floor_exact_root_20260825.json":
        "257995DFA86E32A7E5B64F8315671E5D8DFED4ED502B642252362FB42500AA21",
    "audit_rank8_root_deletion_attachment_floor_root.py":
        "ED27ED3B9DB96131FE1C4551BFEE77D8729FE4D6E2685CD411D826212EAD648D",
    "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json":
        "9F691B70DB4240B056EE92D1424D2A9269DF0224C9CE9A22A2C2F00EA89B8C9D",
    "audit_rank8_forest_root_deletion_attachment_floor_root.py":
        "C88562683F5B3C13464B2560F623EF7445C86FEBE6ABE5C8551E21C7998B3AAD",
    "rank8_forest_root_deletion_attachment_floor_independent_audit_root_20260825.json":
        "81A2E3CE64F3CC2E35270078FB0CB6F5332AE35659DB2748D09E816F5BABFCA1",
    "RANK8_FOREST_ROOT_DELETION_ATTACHMENT_FLOOR_THEOREM_2026-08-25.md":
        "48183B709047D550B458F6B45D841B22C1F32724F65DBF0FEE23FB2EFE872602",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED

    tree_producer = load("rank8_root_deletion_attachment_floor_exact_root_20260825.json")
    tree_audit = load("rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json")
    forest_audit = load(
        "rank8_forest_root_deletion_attachment_floor_independent_audit_root_20260825.json"
    )
    assert tree_producer["status"] == "PASS_EXACT_ALL_ORDER_ROOT_DELETION_ATTACHMENT_FLOOR"
    assert tree_audit["status"] == "PASS_INDEPENDENT_ROOT_DELETION_ATTACHMENT_FLOOR_AUDIT"
    assert forest_audit["status"] == (
        "PASS_INDEPENDENT_ALL_FOREST_ROOT_DELETION_ATTACHMENT_FLOOR_AUDIT"
    )
    census = forest_audit["literal_census"]
    assert census["forests"] == 308
    assert census["roots"] == 2452
    assert census["selected_sets"] == 100855
    assert census["downward_sources"] == 69725
    assert census["attached_components"] > 0
    assert census["unattached_components"] > 0
    assert census["minimum_slack"] >= 0
    assert forest_audit["fresh_dp_large_rank7"]["checks"] == 1072
    assert forest_audit["fresh_dp_large_rank7"]["minimum_slack"] >= 0

    payload = {
        "schema": "rank8-forest-root-deletion-attachment-floor-theorem-root-v1",
        "status": "PASS_EXACT_AND_INDEPENDENT_ALL_FOREST_ROOT_DELETION_ATTACHMENT_FLOOR",
        "theorem": {
            "scope": "every finite forest F, every vertex q, every integer k>=2",
            "definitions": "H=F-N[q], a=i_(k-1)(H), h=i_k(F-q)",
            "inequality": "k*h >= (n-3*k+2)*a",
            "ratio_when_nonnegative": (
                "i_k(F-q)/i_k(F) >= (n-3*k+2)/(n-2*k+2)"
            ),
            "rank7_coordinate": "i_7(F-q)/i_7(F) >= (n-19)/(n-12) for n>=20",
            "n28_floor": "9/16",
        },
        "proof_extension": (
            "Each component of F-N[q] has zero or one boundary attachment. Root attached "
            "components at that endpoint and unattached components arbitrarily; unattached "
            "selected roots only strengthen the rooted-incidence bound."
        ),
        "independent_literal_audit": forest_audit["literal_census"],
        "independent_large_rank7_audit": forest_audit["fresh_dp_large_rank7"],
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "proof_boundary": (
            "This is an all-forest root-deletion coordinate theorem, not by itself connected "
            "Q8, forest Q8, rank-eight PGC, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
