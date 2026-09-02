#!/usr/bin/env python3
"""Hash-pinned scope audit for exact e=1 Delta2/Delta3 old-root results."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_e1_old_root_coverage_through_near3_exact_audit_agent_20260825.json"
PINNED = {
    "RANK8_DELTA2_E1_SUBDIVIDED_CLAW_ALL_ORDER_THEOREM_2026-08-20.md":
        "D374C2FCD30AA4D6D7C1E2CF5A400843CDE5F362C60AB239FF28EB022BC01489",
    "rank8_delta2_e1_all_order_exact_20260820.json":
        "755DBEBDF4D0F43E6C7C6FD4A999443BAB5410F977F4741933FF63DC3B8D1F3E",
    "audit_rank8_delta2_e1_all_order.py":
        "7F2D9FEB80138E36491D0133CDFD78C27690B4DA3C1FEF65D244315F14AB587C",
    "rank8_delta2_e1_all_order_independent_audit_exact_20260820.json":
        "6E51683EB933CAD94B2E1EFA4E054476FAC097B2F0E99A4FC47D8EB0B2035FE3",
    "rank8_delta2_e1_old_root_near1_complete_exact_agent_20260825.json":
        "744FA3670F7573592E1C30171ED4E5BF8472B99ED2F688C8E11B9FF8EE666F9F",
    "rank8_delta2_e1_old_root_near1_complete_independent_audit_agent_20260825.json":
        "65BB63C3B89438C5E37B37E945718E2EB6C335A76BE17EAE50AE5CAE1463DC12",
    "rank8_delta2_e1_old_root_near2_complete_exact_agent_20260825.json":
        "3EA6C013BFFA1BD91DAB4471B710482AE92F3B0737C021E9280D9DF16DDD009D",
    "rank8_delta2_e1_old_root_near2_complete_independent_audit_agent_20260825.json":
        "68F2A137EE7BF9253F4B964C52E3E7A45D683960D3C631997A9170D549D770FE",
    "rank8_delta3_e1_old_root_near0_complete_exact_agent_20260825.json":
        "AA4661167937F5D5FA484132C0D3739449D9AB261685534BE6FA181C9218618B",
    "rank8_delta3_e1_old_root_near0_complete_independent_audit_agent_20260825.json":
        "B286E8EACF9008DD5AEB193FEE264004F2FFC0CF3C8B0E9066EF281712CDEE77",
    "rank8_delta3_e1_old_root_near1_complete_exact_agent_20260825.json":
        "B3E98DE6989AC6D8F22401F420604AA6673E67606B69381BFD11F7C29A7D4888",
    "rank8_delta3_e1_old_root_near1_complete_independent_audit_agent_20260825.json":
        "B5E110EDC937A5AB33DC2722B32F42537EA3981D77C4A07F350A95DE471A760B",
    "rank8_delta3_e1_old_root_near2_complete_exact_agent_20260825.json":
        "2985B3459E40621A41033FA8CA53C24C01BBAA5E2A5891997040369187DB8B49",
    "rank8_delta3_e1_old_root_near2_complete_independent_audit_agent_20260825.json":
        "4C6F900F3F335AD10020C1A235133C5DEE0658A60DF204290EBF9C90597993F9",
    "RANK8_DELTA3_E1_OLD_ROOT_NEAR3_COMPLETE_THEOREM_2026-08-25.md":
        "DF4C7238759788E903B2D38C93989A16DDC206F17601F1756CACADB241B4B78C",
    "rank8_delta3_e1_old_root_near3_complete_exact_agent_20260825.json":
        "4645E5CC3DD9BCED94B7A91DCC71A093E97558A0D7A9DDAB3A865B3A19A6125C",
    "rank8_delta3_e1_old_root_near3_complete_independent_audit_agent_20260825.json":
        "9B84888691E652D7FB0A2E4E687CB513CF6B46D27699119610BC2374B6B7110F",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict[str, object]) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def main() -> None:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED, (actual, PINNED)

    delta2_all = load("rank8_delta2_e1_all_order_exact_20260820.json")
    delta2_all_audit = load(
        "rank8_delta2_e1_all_order_independent_audit_exact_20260820.json"
    )
    assert delta2_all["status"] == "PASS_EXACT_RANK8_DELTA2_E1_ALL_ORDER_N23_PLUS"
    assert delta2_all_audit["status"] == (
        "PASS_INDEPENDENT_STRUCTURAL_AUDIT_RANK8_DELTA2_E1_ALL_ORDER"
    )
    assert "every rooted tree core" in delta2_all["theorem"]

    delta2_increment = {}
    for near in (1, 2):
        certificate = load(
            f"rank8_delta2_e1_old_root_near{near}_complete_exact_agent_20260825.json"
        )
        audit = load(
            f"rank8_delta2_e1_old_root_near{near}_complete_independent_audit_agent_20260825.json"
        )
        assert certificate["near"] == near and certificate["rank"] == 2
        assert certificate["status"] == (
            f"PASS_EXACT_DELTA2_E1_OLD_ROOT_NEAR{near}_ALL_ORDER_ALL_EXTENSIONS"
        )
        assert audit["audited_theorem_status"] == certificate["status"]
        delta2_increment[str(near)] = {
            "certificate_status": certificate["status"],
            "audit_status": audit["status"],
        }

    delta3_increment = {}
    for near in (0, 1, 2, 3):
        certificate = load(
            f"rank8_delta3_e1_old_root_near{near}_complete_exact_agent_20260825.json"
        )
        audit = load(
            f"rank8_delta3_e1_old_root_near{near}_complete_independent_audit_agent_20260825.json"
        )
        if near == 0:
            assert "near=0" in certificate["theorem"]
        else:
            assert certificate["near"] == near and certificate["rank"] == 3
        assert certificate["status"] == (
            f"PASS_EXACT_DELTA3_E1_OLD_ROOT_NEAR{near}_ALL_ORDER_ALL_EXTENSIONS"
        )
        assert audit["audited_theorem_status"] == certificate["status"]
        delta3_increment[str(near)] = {
            "certificate_status": certificate["status"],
            "audit_status": audit["status"],
        }

    payload = {
        "schema": "rank8-e1-old-root-coverage-through-near3-exact-audit-agent-v1",
        "status": "PASS_EXACT_SCOPE_AUDIT_RANK8_E1_DELTA2_DELTA3_THROUGH_NEAR3",
        "delta2_value_theorem": {
            "coverage": (
                "Delta^2 R_1(A,q)>0 for every rooted e=1 tree core of order "
                "at least 23; includes the center and every arm-root distance"
            ),
            "primary_status": delta2_all["status"],
            "audit_status": delta2_all_audit["status"],
            "scope_warning": (
                "This is a value theorem.  It does not by itself assert strict "
                "arm-extension increment monotonicity."
            ),
        },
        "delta2_strict_increment_theorems": delta2_increment,
        "delta2_increment_scope_warning": (
            "Only near=1,2 have separate strict-increment packages in this ledger; "
            "near=0 and other distances are not inferred from the value theorem."
        ),
        "delta3_strict_increment_theorems": delta3_increment,
        "lane_selection_before_this_run": (
            "Delta3 near=0,1,2 were sealed, so near=3 was the nearest unsealed "
            "Delta3 arm-extension increment gate."
        ),
        "nearest_unsealed_delta3_increment_after_this_run": "near=4",
        "dependency_sha256": actual,
        "proof_boundary": (
            "This ledger records exact existing scopes only.  It does not extend "
            "any theorem to arbitrary trees, inserted-new-leaf gates, Q8/PGC, "
            "forest unimodality, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
