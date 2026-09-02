#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.103."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_FULL_FULL_SPLIT_VARIANCE_REDUCTION_2026-08-20.md": "7DDB25FAC1744C82E8742816FB4A886EEC0084D1924613F01F54BC7FDA414118",
    "verify_rank8_full_full_split_variance_identity.py": "A6106579E3AC231C963076E9241C723195F48F17666B9315BF35F7B1C2C4F534",
    "rank8_full_full_split_variance_identity_exact_20260820.json": "2E4CA923474B953EBB2029D6DFE848A6F4320767BD5AE7A0F07B860B51AF1D6F",
    "audit_rank8_full_full_split_variance_identity.py": "0F9FBF795905A645AFFEFCB6156762C9659483596B873730C424651578C04F5B",
    "rank8_full_full_split_variance_identity_independent_audit_exact_20260820.json": "70277B30539365BC8AAA78A102DA5129D9C2285869991FBA988B2B8EB8632E8A",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads((ROOT / "rank8_full_full_split_variance_identity_exact_20260820.json").read_text(encoding="utf-8"))
    independent = json.loads((ROOT / "rank8_full_full_split_variance_identity_independent_audit_exact_20260820.json").read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_FULL_FULL_SPLIT_VARIANCE_IDENTITY_NOT_CONE_THEOREM"
    assert independent["status"] == "PASS_INDEPENDENT_EXACT_RANK8_FULL_FULL_SPLIT_VARIANCE_IDENTITY"
    assert primary["identity"] == "c8^2-c7*c9-h*c7*c8 = c7^2*(E[P]-Var(S))"
    assert primary["equivalent_cone_target"] == independent["equivalent_cone_target"] == "Var(S)<=E[P]"
    assert set(primary["symbolic_replay"].values()) == {"0", 8}
    assert independent["first_derivative_remainder"] == "0"
    assert independent["second_derivative_remainder"] == "0"
    assert independent["cleared_margin_remainder"] == "0"
    assert independent["full_full_cones_proved"] is False

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.103 The rank-eight full/full cones reduce to an eight-state split-variance inequality"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "Pr(J=j)=C(7,j)a_j b_(7-j)/c_7",
        "c_8/c_7=E[S]",
        "c_8^2-c_7 c_9-h c_7 c_8 = c_7^2(E[P]-Var(S))",
        "Var(S)<=E[P]",
        "12,813,915 terms",
        "7.553 GiB",
        "not a proof of high/high, low/high, or low/low",
        "Problem 993 remain\nopen",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_103",
        "immutable_inputs": actual,
        "rank": 8,
        "split_total_rank": 7,
        "split_states": 8,
        "identity_remainders_zero": True,
        "equivalent_cone_target": "Var(S)<=E[P]",
        "high_high_complete": False,
        "low_high_complete": False,
        "low_low_complete": False,
        "forest_q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_103_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
