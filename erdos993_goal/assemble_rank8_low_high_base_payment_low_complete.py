#!/usr/bin/env python3
"""Fail-closed assembler for the low-complete base-payment subcone."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_low_high_base_payment_low_complete_exact_20260820.json"
EXPECTED = {
    "verify_rank8_low_high_base_payment_hard_face_amgm.py":
        "8D95452625F2458EE9942A39FD6B7FB93FA62F93B216670C8B802CAE19DEE572",
    "rank8_low_high_base_payment_hard_face_amgm_exact_20260820.json":
        "61A48385D356468133A1D08BDD2D585D28D0B027565ACF7207C467445DF0A6B6",
    "audit_rank8_low_high_base_payment_hard_face_amgm.py":
        "89F5652E16C766AB59F5D6016F03E4C9C857075C742AA950907BEDFE6562F808",
    "rank8_low_high_base_payment_hard_face_amgm_independent_audit_20260820.json":
        "B4093F32B8F11DC25A4FA17B99B91BBA2AC750E3053BD12F7DC037A30E2DABFD",
    "verify_rank8_low_high_base_payment_a0_extension.py":
        "966122844EE01DD8ACD263C41321805EC252AF5CB57E677AA3FAFE6572BA9EC4",
    "rank8_low_high_base_payment_a0_extension_exact_20260820.json":
        "714546657253E1864FE559CAE190B5B1AB168E422ED2422980E18D9DDA5A5587",
    "verify_rank8_low_high_base_payment_a2_extension.py":
        "2231949D32AD99E4982B68E649D81110CB131AD785CF74DC36458C311738E3D9",
    "rank8_low_high_base_payment_a2_extension_exact_20260820.json":
        "471BF01441B764ED78C7DF81FE6CC47433D73B126CB287EAC31007F9C4F92D12",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    hard = load("rank8_low_high_base_payment_hard_face_amgm_exact_20260820.json")
    audit = load("rank8_low_high_base_payment_hard_face_amgm_independent_audit_20260820.json")
    a0 = load("rank8_low_high_base_payment_a0_extension_exact_20260820.json")
    a2 = load("rank8_low_high_base_payment_a2_extension_exact_20260820.json")
    assert hard["status"] == "PASS_EXACT_BASE_PAYMENT_HARD_FACE_AMGM_NOT_FULL_CONE"
    assert audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_LOW_HIGH_BASE_PAYMENT_HARD_FACE_AMGM"
    assert a0["status"] == "PASS_EXACT_A0_EXTENSION_OF_BASE_PAYMENT_HARD_FACE"
    assert a0["linear"]["negative"] == a0["quadratic"]["negative"] == 0
    assert a2["status"] == "PASS_EXACT_A2_EXTENSION_WITH_A0_ARBITRARY"
    keys = {tuple(row["exponents_a0_a2"]) for row in a2["slices"]}
    assert keys == {(a0_power, a2_power) for a2_power in range(1, 7) for a0_power in range(3)}
    assert all(row["negative"] == 0 for row in a2["slices"])
    payload = {
        "schema": "rank8-low-high-base-payment-low-complete-v1",
        "status": "PASS_EXACT_BASE_PAYMENT_LOW_COMPLETE_HIGH_TAIL_ZERO",
        "theorem": (
            "M0>=7!*8!*h*p1*p2*K_q(1,2) for arbitrary a0,a2,a3..a7 and "
            "b0,b1,b2, with b3=...=b7=0"
        ),
        "coverage": [
            "hard face a0=a2=0 by uniform two-block AM-GM in X=ta+a3+...+a7",
            "all a0 powers 1,2 coefficientwise nonnegative",
            "all a2 powers 1..6 jointly with all a0 powers 0..2 coefficientwise nonnegative",
        ],
        "remaining_gap": "simultaneous high-tail slacks b3..b7",
        "immutable_inputs": actual,
        "scope_warning": (
            "This is not the full base-payment theorem until simultaneous b3..b7 are covered. "
            "It does not alone prove H_str, the low/high cone, Q8, PGC, or Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(REPORT))


if __name__ == "__main__":
    main()
