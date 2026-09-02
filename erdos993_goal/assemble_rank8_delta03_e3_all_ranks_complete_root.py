#!/usr/bin/env python3
"""Combine the audited e=3 theorems for all four pending residual ranks."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e3_all_ranks_complete_exact_root_20260823.json"
EXPECTED = {
    "rank8_delta01_e3_complete_exact_agent_20260823.json":
        "155638908E41D9CD8122F5E8BFFAD76708992A8701D70C2CB539AAA2CDA27EE3",
    "rank8_delta01_e3_complete_independent_audit_agent_20260823.json":
        "48AFCC77A0A096857CDA09D66AC390C3BD52DCAE19EA43B06B6FDFB507B63967",
    "rank8_delta23_e3_complete_exact_root_20260823.json":
        "95F0F20308D7D0CE5B479623F225D4E34D366EDD15853CD1F5F8BE1C4974EAF0",
    "rank8_delta23_e3_complete_independent_audit_root_20260823.json":
        "139A0432E3E13292E8FF56B8C13338DB5E47778C27D2D39DEEEC86CA8AA7262D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    d01 = load("rank8_delta01_e3_complete_exact_agent_20260823.json")
    d01_audit = load("rank8_delta01_e3_complete_independent_audit_agent_20260823.json")
    d23 = load("rank8_delta23_e3_complete_exact_root_20260823.json")
    d23_audit = load("rank8_delta23_e3_complete_independent_audit_root_20260823.json")
    assert d01["status"] == "PASS_EXACT_RANK8_DELTA01_E3_ALL_SKELETONS_N27_PLUS"
    assert d01_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA01_E3_ALL_SKELETONS_AUDIT"
    assert d23["status"] == "PASS_EXACT_RANK8_DELTA23_E3_COMPLETE_N27_PLUS"
    assert d23_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA23_E3_COMPLETE_AUDIT"
    assert d01["classification"]["degree_surplus_definition"] == (
        "e(A)=sum_v binom(deg(v)-1,2)"
    )
    assert d01["classification"]["unrooted_reduced_skeletons"] == 2
    assert len(d23["classification"]["solutions"]) == 2

    payload = {
        "schema": "rank8-delta03-e3-all-ranks-complete-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E3_ALL_RANKS_COMPLETE_N27_PLUS",
        "theorem": (
            "For every rooted tree core (A,q) of order n>=27 with degree surplus "
            "e(A)=sum_v binom(deg(v)-1,2)=3, all four terminal residual Newton "
            "coefficients Delta0, Delta1, Delta2, and Delta3 are strictly positive."
        ),
        "classification": {
            "reduced_skeletons": 2,
            "families": [
                "one degree-four branch vertex: four-arm star",
                "three degree-three branch vertices: five-leaf cubic skeleton",
            ],
            "root_scope": "every subdivision vertex",
            "order_scope": "every n>=27",
        },
        "closed_residual_ranks": [0, 1, 2, 3],
        "connected_remainder_after_e3": {
            "Delta0_Delta1": "e=2 short-boundary cells at n>=31, and e>=4 at n>=27",
            "Delta2": (
                "e=2 residual short-boundary/non-pendant cells, including pendant "
                "central bridges 2..7 and bridge one with a far arm <=6; and e>=4 at n>=27"
            ),
            "Delta3": "e=2 short-boundary cells at n>=31, and e>=4 at n>=27",
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "The connected remainder displayed above is nonempty. This does not yet "
            "prove connected Q8, forest Q8, rank-eight PGC, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
