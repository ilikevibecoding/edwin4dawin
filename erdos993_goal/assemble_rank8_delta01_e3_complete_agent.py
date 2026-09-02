#!/usr/bin/env python3
"""Fail-closed assembly of the full degree-surplus e=3 Delta0/Delta1 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "rank8_delta01_e3_quartic_star_reduction_exact_agent_20260822.json": "4584E6DD0A4C34A6283817BA1739D570E409670DBFB7BC0A0459C171FF4780D8",
    "rank8_delta01_e3_quartic_star_reduction_independent_audit_agent_20260822.json": "ACF88386C30C0FFECAC3505CDD5EBAAB9558993A62E0C0B76276F56E354F4199",
    "rank8_delta01_e3_quartic_star_complete_exact_agent_20260822.json": "BDF3E713D926E622AE725BA9ABD8D472B8C500E175D66506AA9CECF0FB363C10",
    "rank8_delta01_e3_cubic_complete_exact_agent_20260823.json": "3A51CDECE37E0F74DC147F034B6EFCBE3BA72907E1655DA6FA8D6C122F54C339",
    "rank8_delta01_e3_cubic_complete_independent_audit_agent_20260823.json": "C87471EC0153C0C4CF386861204BC57F3F15CB8E48927A25E653E8EC352BF024",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    reduction = load("rank8_delta01_e3_quartic_star_reduction_exact_agent_20260822.json")
    reduction_audit = load("rank8_delta01_e3_quartic_star_reduction_independent_audit_agent_20260822.json")
    quartic = load("rank8_delta01_e3_quartic_star_complete_exact_agent_20260822.json")
    cubic = load("rank8_delta01_e3_cubic_complete_exact_agent_20260823.json")
    cubic_audit = load("rank8_delta01_e3_cubic_complete_independent_audit_agent_20260823.json")

    assert reduction["status"] == "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_CENTER_ALL_ORDER_AND_ARM_REDUCTION"
    assert reduction_audit["status"] == "PASS_INDEPENDENT_SCOPE_AUDIT_RANK8_DELTA01_E3_QUARTIC_STAR_REDUCTION"
    assert reduction["classification"]["degree_surplus_definition"] == "e(A)=sum_v binom(deg(v)-1,2)"
    assert reduction["classification"]["e3_skeletons"] == [
        "one degree-four vertex: the quartic-star skeleton closed here on the stated scopes",
        "three degree-three vertices: a distinct five-leaf cubic skeleton, still open",
    ]
    assert quartic["status"] == "PASS_EXACT_RANK8_DELTA01_E3_QUARTIC_STAR_COMPLETE_N27_PLUS"
    assert cubic["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_COMPLETE_N27_PLUS"
    assert cubic_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_COMPLETE_AUDIT"
    assert quartic["classification_effect"] == "The e=3 skeleton with one degree-four vertex is completely removed from the connected Delta0/Delta1 remainder for n>=27."
    assert quartic["remaining_e3_Delta01_skeleton"] == "the distinct five-leaf skeleton with exactly three degree-three vertices"
    assert cubic["partition_accounting"]["mixed_quotient_rays"] == 20_899_091
    assert cubic["partition_accounting"]["no_gaps_or_duplicates"] is True

    payload = {
        "schema": "rank8_delta01_e3_complete_exact_agent_v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_ALL_SKELETONS_N27_PLUS",
        "theorem": "For every rooted tree core A with degree surplus e(A)=3 and |A|>=27, Delta0(A)>0 and Delta1(A)>0.",
        "classification": {
            "degree_surplus_definition": "e(A)=sum_v binom(deg(v)-1,2)",
            "unrooted_reduced_skeletons": 2,
            "skeletons": [
                {
                    "type": "one degree-four vertex",
                    "name": "four-arm star",
                    "certificate": "rank8_delta01_e3_quartic_star_complete_exact_agent_20260822.json",
                    "sha256": EXPECTED["rank8_delta01_e3_quartic_star_complete_exact_agent_20260822.json"],
                    "orders": "n>=27",
                    "roots": "all",
                },
                {
                    "type": "exactly three degree-three vertices",
                    "name": "five-leaf cubic skeleton",
                    "certificate": "rank8_delta01_e3_cubic_complete_exact_agent_20260823.json",
                    "sha256": EXPECTED["rank8_delta01_e3_cubic_complete_exact_agent_20260823.json"],
                    "independent_audit_sha256": EXPECTED["rank8_delta01_e3_cubic_complete_independent_audit_agent_20260823.json"],
                    "orders": "n>=27",
                    "roots": "all",
                },
            ],
            "exhaustive": True,
        },
        "connected_ledger_effect": {
            "closed": "all degree-surplus e=3 rooted cores for Delta0 and Delta1 at every order n>=27",
            "remaining_Delta0": "degree-surplus e=2 double-claw short-boundary cells at n>=31 outside finite n<=30/thin/all-long closures, and all e>=4 rooted-core families at n>=27",
            "remaining_Delta1": "degree-surplus e=2 double-claw short-boundary cells at n>=31 outside finite n<=30/thin/all-long closures, and all e>=4 rooted-core families at n>=27",
            "remaining_Delta2": "degree-surplus e=2 residual short-boundary/non-pendant cells (including pendant central bridges 2..7 and bridge one with at least one far arm <=6), plus all e>=3 rooted-core families at n>=27",
            "remaining_Delta3": "degree-surplus e=2 short-boundary cells at n>=31 outside finite n<=30/thin/all-long closures, plus all e>=3 rooted-core families at n>=27",
            "already_closed_common_base": "orders n<=26 and degree-surplus e=0,1 for Delta0..3; e=2 orders through 30 plus stated all-order subfamilies",
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This is the full e=3 theorem only for Delta0 and Delta1. The enumerated Delta0..3 connected remainder is nonempty; connected Q8, forest Q8, rank-eight PGC, and Erdos Problem 993 are not solved here.",
    }
    output = ROOT / "rank8_delta01_e3_complete_exact_agent_20260823.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(output))


if __name__ == "__main__":
    main()

