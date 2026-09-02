#!/usr/bin/env python3
"""Assemble the complete degree-surplus e=3 Delta2/Delta3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta23_e3_complete_exact_root_20260823.json"
EXPECTED = {
    "rank8_delta23_e3_quartic_star_complete_exact_root_20260823.json":
        "7A004AD9255E60207AB43617F8EC48D476158FB175DA50A9A8D4AB3465CC670F",
    "rank8_delta23_e3_quartic_star_complete_independent_audit_root_20260823.json":
        "A439299F06B22B9BE764AB46634AB6F43B1B9B203A723B62198EF3CCCDFBA177",
    "rank8_delta23_e3_cubic_complete_exact_root_20260823.json":
        "441531A91303774942BB78368228AD31FCC694C2DCCAB4DE86E7634802EC16A9",
    "rank8_delta23_e3_cubic_complete_independent_audit_root_20260823.json":
        "56BB9AFD621C60FC79C066FD37D29CE0134A8EAACCA6AE692DC9EBEED7AFE577",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    quartic = load("rank8_delta23_e3_quartic_star_complete_exact_root_20260823.json")
    quartic_audit = load("rank8_delta23_e3_quartic_star_complete_independent_audit_root_20260823.json")
    cubic = load("rank8_delta23_e3_cubic_complete_exact_root_20260823.json")
    cubic_audit = load("rank8_delta23_e3_cubic_complete_independent_audit_root_20260823.json")
    assert quartic["status"] == "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_COMPLETE_N27_PLUS"
    assert quartic_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA23_E3_QUARTIC_STAR_COMPLETE_AUDIT"
    assert cubic["status"] == "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_COMPLETE_N27_PLUS"
    assert cubic_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA23_E3_CUBIC_COMPLETE_AUDIT"

    payload = {
        "schema": "rank8-delta23-e3-complete-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA23_E3_COMPLETE_N27_PLUS",
        "theorem": (
            "For every rooted tree core A of order n>=27 with degree surplus "
            "e=sum_v binom(deg(v)-1,2)=3, Delta2(A,q)>0 and Delta3(A,q)>0."
        ),
        "classification": {
            "surplus_equation": "sum_{d>=3} b_d*binom(d-1,2)=3",
            "solutions": [
                {
                    "branch_degrees": "one degree-four vertex",
                    "suppressed_skeleton": "four-arm star",
                    "certificate": "quartic-star complete theorem and independent audit",
                },
                {
                    "branch_degrees": "three degree-three vertices",
                    "suppressed_skeleton": "unique three-branch cubic tree with five leaves",
                    "certificate": "cubic complete theorem and independent audit",
                },
            ],
            "no_other_solution": (
                "The positive contributions binom(d-1,2) begin 1,3,6; hence total "
                "three is either 3 or 1+1+1. Suppression of degree-two vertices gives "
                "the stated unique skeleton in each case."
            ),
        },
        "order_scope": "n>=27 in both disjoint skeleton families",
        "root_scope": "every vertex in every subdivision",
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes Delta2/Delta3 only at degree surplus e=3. Delta0/Delta1, "
            "e=2 short boundaries, e>=4, forest transfer, and Problem 993 remain."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
