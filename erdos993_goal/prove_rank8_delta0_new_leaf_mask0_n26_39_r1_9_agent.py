#!/usr/bin/env python3
"""Exact finite mask-0 registry for 26<=N<=39 and 1<=r<=9."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import prove_rank8_delta0_new_leaf_mask0_19_diagonal_agent as diagonal


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_n26_39_r1_9_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask0_19_diagonal_agent.py":
        "FB0A422F3E601B9C5757F8D740C1C17576322D46196B882D7141016804CE3338",
    "rank8_delta0_new_leaf_mask0_19_diagonal_exact_agent_20260823.json":
        "C7AD3BEB20A543F7D06EE84D6501F33454EEC2265C541570B42F0DE7CCBAC3B2",
    "rank8_delta0_new_leaf_mask0_19_diagonal_independent_audit_agent_20260823.json":
        "264DF9A4D588E0EF8779D4F1F7FFC9596F72B324C93CCE9A9C5829D82D83D0D8",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    base = diagonal.base_polynomial()
    rows = []
    for N in range(26, 40):
        for r in range(1, 10):
            result = diagonal.sign_row(base, N, r, False)
            assert result["negative"] == 0
            rows.append(
                {
                    "N": N,
                    "r": r,
                    "m": N - r,
                    "status": "SEALED_MASK0_FINITE_LOW_R",
                    "bernstein": result,
                }
            )
    expected_coordinates = [
        (N, r, N - r) for N in range(26, 40) for r in range(1, 10)
    ]
    assert [(row["N"], row["r"], row["m"]) for row in rows] == expected_coordinates
    assert len(rows) == 126
    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-n26-39-r1-9-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK0_N26_39_R1_9_ALL_126",
        "scope": (
            "26<=N=|D|<=39, 1<=r=deg_A(v)<=9, m=N-r>=17, "
            "selected-lower c8/d7 mask0."
        ),
        "exact_inputs": [
            "d5-f5>=sum_{j=0}^4 C(m-j+1,j)C(r-j,5-j)",
            "d6<=C(N-1,6)+C(r-1,5) by the edge-concentration induction",
            "6/(m-5)<=f5/f6<=6m/(m^2-15m+10), valid here because m>=17",
        ],
        "counts": {"N_values": 14, "r_values_per_N": 9, "cells": 126, "open": 0},
        "rows": rows,
        "hashes": hashes,
        "proof_boundary": (
            "This seals exactly the 126 finite low-r cells for Delta0/new-leaf/"
            "mask0.  It does not cover the 224 finite m<=15 wing, masks1..3, "
            "q=v, Delta1..3, connected Q8, or Problem 993."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 126 OPEN 0")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
